import { prisma } from '../lib/prisma';

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
    userId: number,
    energyCost: number
  ): Promise<boolean> {
    const energy = await prisma.user_energy.findFirst({
      where: { userId },
    });

    // Reset energy if it's a new day
    if (!energy || energy.last_reset_date < new Date().setHours(0, 0, 0, 0)) {
      await prisma.user_energy.upsert({
        where: { userId },
        create: {
          userId,
          energy_points: 100,
          last_reset_date: new Date(),
        },
        update: {
          energy_points: 100,
          last_reset_date: new Date(),
        },
      });
      return true;
    }

    if (energy.energy_points < energyCost) {
      return false;
    }

    await prisma.user_energy.update({
      where: { id: energy.id },
      data: {
        energy_points: energy.energy_points - energyCost,
      },
    });

    return true;
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
    teamId: number,
    territoryId: number
  ): Promise<number> {
    const activeMembers = await prisma.teamMember.count({
      where: {
        teamId,
        user: {
          locations: {
            some: {
              timestamp: {
                gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
              },
            },
          },
        },
      },
    });

    return Math.min(1 + activeMembers * 0.1, 1.5); // Max 50% bonus
  }

  // Calculate time and weather bonus
  static async calculateEnvironmentalBonus(
    territoryId: number
  ): Promise<number> {
    const currentHour = new Date().getHours();
    const weather = await prisma.weather_conditions.findFirst({
      where: { territoryId },
      orderBy: { recorded_at: 'desc' },
    });

    let bonus = 1;

    // Night bonus (22:00 - 06:00)
    if (currentHour >= 22 || currentHour < 6) {
      bonus += 0.2;
    }

    // Weather bonus
    if (weather) {
      if (weather.weather_condition.includes('rain')) bonus += 0.15;
      if (weather.weather_condition.includes('snow')) bonus += 0.25;
      if (weather.temperature < 0) bonus += 0.2;
      if (weather.temperature > 30) bonus += 0.15;
    }

    return bonus;
  }

  // Update territory fortification
  static async updateFortification(
    territoryId: number,
    teamId: number
  ): Promise<void> {
    const capture = await prisma.territoryCapture.findFirst({
      where: {
        territoryId,
        teamId,
        isActive: true,
      },
    });

    if (capture) {
      const lastFortTime = capture.last_fortification_time;
      const now = new Date();

      // Can fortify once per 24 hours
      if (
        !lastFortTime ||
        now.getTime() - lastFortTime.getTime() > 24 * 60 * 60 * 1000
      ) {
        await prisma.territoryCapture.update({
          where: { id: capture.id },
          data: {
            fortification_level: Math.min(capture.fortification_level + 1, 5),
            last_fortification_time: now,
          },
        });
      }
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
