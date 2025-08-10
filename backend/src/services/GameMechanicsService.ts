import { pool } from '../lib/database';

export interface PathPoint {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number;
  timestamp: Date;
  altitude?: number;
  heading?: number;
}

export interface WeatherCondition {
  temperature: number;
  condition: string;
}

export class GameMechanicsService {
  private static MIN_SPEED_KMH = 6; // Minimum speed in km/h
  private static MAX_SPEED_KMH = 25; // Maximum reasonable running speed
  private static ENERGY_COST_BASE = 10; // Base energy cost for capture
  private static MIN_COVERAGE_PERCENT = 60; // Minimum territory coverage required

  // Check and update user's energy
  static async checkEnergy(
    userId: string,
    energyCost: number
  ): Promise<boolean> {
    const client = await pool.connect();
    try {
      const energyQuery = `SELECT * FROM user_energy WHERE user_id = $1`;
      const energyResult = await client.query(energyQuery, [userId]);
      
      const today = new Date().toDateString();
      if (energyResult.rows.length === 0 || 
          new Date(energyResult.rows[0].last_reset_date).toDateString() !== today) {
        
        const upsertQuery = `
          INSERT INTO user_energy (user_id, energy_points, last_reset_date)
          VALUES ($1, 100, CURRENT_DATE)
          ON CONFLICT (user_id) 
          DO UPDATE SET energy_points = 100, last_reset_date = CURRENT_DATE
        `;
        await client.query(upsertQuery, [userId]);
        return true;
      }

      const energy = energyResult.rows[0];
      if (energy.energy_points < energyCost) {
        return false;
      }

      const updateQuery = `
        UPDATE user_energy 
        SET energy_points = energy_points - $1 
        WHERE user_id = $2
      `;
      await client.query(updateQuery, [energyCost, userId]);
      return true;
    } finally {
      client.release();
    }
  }

  // Validate path speed
  static async validatePathSpeed(points: PathPoint[]): Promise<boolean> {
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];

      const timeDiff = (p2.timestamp.getTime() - p1.timestamp.getTime()) / 1000; // seconds
      const speedKmh = p2.speed * 3.6; // convert m/s to km/h

      if (speedKmh < this.MIN_SPEED_KMH || speedKmh > this.MAX_SPEED_KMH) {
        return false;
      }
    }
    return true;
  }

  // Calculate team capture bonus
  static async calculateTeamBonus(
    teamId: string,
    territoryId: string
  ): Promise<number> {
    const client = await pool.connect();
    try {
      const activeMembersQuery = `
        SELECT COUNT(*) as active_count
        FROM team_members tm
        JOIN user_locations ul ON tm.user_id = ul.user_id
        WHERE tm.team_id = $1 
        AND ul.timestamp > NOW() - INTERVAL '15 minutes'
        AND ul.is_active = true
      `;
      const result = await client.query(activeMembersQuery, [teamId]);
      const activeCount = parseInt(result.rows[0].active_count);
      return Math.min(1 + activeCount * 0.1, 1.5);
    } finally {
      client.release();
    }
  }

  // Calculate time and weather bonus
  static async calculateEnvironmentalBonus(
    territoryId: string
  ): Promise<number> {
    const client = await pool.connect();
    try {
      const currentHour = new Date().getHours();
      let bonus = 1;

      if (currentHour >= 22 || currentHour < 6) {
        bonus += 0.2;
      }

      const weatherQuery = `
        SELECT * FROM weather_conditions 
        WHERE territory_id = $1 
        ORDER BY recorded_at DESC 
        LIMIT 1
      `;
      const weatherResult = await client.query(weatherQuery, [territoryId]);
      
      if (weatherResult.rows.length > 0) {
        const weather = weatherResult.rows[0];
        if (weather.weather_condition.includes('rain')) bonus += 0.15;
        if (weather.weather_condition.includes('snow')) bonus += 0.25;
        if (weather.temperature < 0) bonus += 0.2;
        if (weather.temperature > 30) bonus += 0.15;
      }

      return bonus;
    } finally {
      client.release();
    }
  }

  // Update territory fortification
  static async updateFortification(
    territoryId: string,
    teamId: string
  ): Promise<void> {
    const client = await pool.connect();
    try {
      const captureQuery = `
        SELECT * FROM territory_captures 
        WHERE territory_id = $1 AND team_id = $2 AND is_active = true
      `;
      const captureResult = await client.query(captureQuery, [territoryId, teamId]);

      if (captureResult.rows.length > 0) {
        const capture = captureResult.rows[0];
        const lastFortTime = capture.last_fortification_time;
        const now = new Date();

        if (!lastFortTime || now.getTime() - new Date(lastFortTime).getTime() > 24 * 60 * 60 * 1000) {
          const updateQuery = `
            UPDATE territory_captures 
            SET fortification_level = LEAST(fortification_level + 1, 5),
                last_fortification_time = NOW()
            WHERE id = $1
          `;
          await client.query(updateQuery, [capture.id]);
        }
      }
    } finally {
      client.release();
    }
  }

  // Anti-cheat validation
  static validateLocationSequence(points: PathPoint[]): boolean {
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];

      // Check for impossible speed (teleporting)
      const distance = this.calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
      const timeDiff = (p2.timestamp.getTime() - p1.timestamp.getTime()) / 1000;
      const speed = (distance / timeDiff) * 3.6; // km/h

      if (speed > this.MAX_SPEED_KMH) {
        return false;
      }

      // Check for GPS jumps (accuracy)
      if (p2.accuracy > 30) {
        // More than 30 meters accuracy is suspicious
        return false;
      }
    }
    return true;
  }

  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}
