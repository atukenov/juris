import { pool } from '../lib/database';
import { GamificationService } from './GamificationService';

export class ChallengeService {
  static async generateDailyChallenges(): Promise<void> {
    const client = await pool.connect();
    try {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const dailyChallenges = [
        {
          name: 'Territory Hunter',
          description: 'Capture 3 territories today',
          category: 'territory',
          requirement_type: 'capture_territories',
          requirement_value: 3,
          points_reward: 100
        },
        {
          name: 'Distance Runner',
          description: 'Run 5 km today',
          category: 'distance',
          requirement_type: 'run_distance',
          requirement_value: 5000,
          points_reward: 80
        },
        {
          name: 'Team Supporter',
          description: 'Help your team capture 5 territories',
          category: 'team',
          requirement_type: 'team_captures',
          requirement_value: 5,
          points_reward: 120
        }
      ];

      const selectedChallenges = dailyChallenges.sort(() => 0.5 - Math.random()).slice(0, 2);

      for (const challenge of selectedChallenges) {
        const insertQuery = `
          INSERT INTO challenges (name, description, challenge_type, category, requirement_type, requirement_value, points_reward, start_date, end_date)
          VALUES ($1, $2, 'daily', $3, $4, $5, $6, $7, $8)
        `;
        await client.query(insertQuery, [
          challenge.name,
          challenge.description,
          challenge.category,
          challenge.requirement_type,
          challenge.requirement_value,
          challenge.points_reward,
          today,
          tomorrow
        ]);
      }
    } finally {
      client.release();
    }
  }

  static async generateWeeklyChallenges(): Promise<void> {
    const client = await pool.connect();
    try {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const startDate = today.toISOString().split('T')[0];
      const endDate = nextWeek.toISOString().split('T')[0];

      const weeklyChallenges = [
        {
          name: 'Territory Conqueror',
          description: 'Capture 15 territories this week',
          category: 'territory',
          requirement_type: 'capture_territories',
          requirement_value: 15,
          points_reward: 500
        },
        {
          name: 'Marathon Week',
          description: 'Run 25 km this week',
          category: 'distance',
          requirement_type: 'run_distance',
          requirement_value: 25000,
          points_reward: 400
        },
        {
          name: 'Team Champion',
          description: 'Help your team capture 30 territories',
          category: 'team',
          requirement_type: 'team_captures',
          requirement_value: 30,
          points_reward: 600
        }
      ];

      const selectedChallenge = weeklyChallenges[Math.floor(Math.random() * weeklyChallenges.length)];

      const insertQuery = `
        INSERT INTO challenges (name, description, challenge_type, category, requirement_type, requirement_value, points_reward, start_date, end_date)
        VALUES ($1, $2, 'weekly', $3, $4, $5, $6, $7, $8)
      `;
      await client.query(insertQuery, [
        selectedChallenge.name,
        selectedChallenge.description,
        selectedChallenge.category,
        selectedChallenge.requirement_type,
        selectedChallenge.requirement_value,
        selectedChallenge.points_reward,
        startDate,
        endDate
      ]);
    } finally {
      client.release();
    }
  }

  static async updateChallengeProgress(userId: string, category: string, progressType: string, value: number): Promise<void> {
    const client = await pool.connect();
    try {
      const challengesQuery = `
        SELECT * FROM challenges 
        WHERE category = $1 AND requirement_type = $2 
        AND is_active = true 
        AND start_date <= CURRENT_DATE 
        AND end_date > CURRENT_DATE
      `;
      const challengesResult = await client.query(challengesQuery, [category, progressType]);

      for (const challenge of challengesResult.rows) {
        const userChallengeQuery = `
          INSERT INTO user_challenges (user_id, challenge_id, progress)
          VALUES ($1, $2, 0)
          ON CONFLICT (user_id, challenge_id) DO NOTHING
        `;
        await client.query(userChallengeQuery, [userId, challenge.id]);

        const updateQuery = `
          UPDATE user_challenges 
          SET progress = progress + $1,
              is_completed = CASE WHEN progress + $1 >= $2 THEN true ELSE is_completed END,
              completed_at = CASE WHEN progress + $1 >= $2 AND NOT is_completed THEN NOW() ELSE completed_at END
          WHERE user_id = $3 AND challenge_id = $4 AND NOT is_completed
          RETURNING is_completed, progress
        `;
        const updateResult = await client.query(updateQuery, [value, challenge.requirement_value, userId, challenge.id]);

        if (updateResult.rows.length > 0 && updateResult.rows[0].is_completed) {
          await GamificationService.awardExperience(userId, challenge.points_reward);
        }
      }
    } finally {
      client.release();
    }
  }

  static async cleanupExpiredChallenges(): Promise<void> {
    const client = await pool.connect();
    try {
      const cleanupQuery = `
        UPDATE challenges 
        SET is_active = false 
        WHERE end_date <= CURRENT_DATE AND is_active = true
      `;
      await client.query(cleanupQuery);
    } finally {
      client.release();
    }
  }
}
