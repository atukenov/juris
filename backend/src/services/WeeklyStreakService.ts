import { pool } from '../lib/database';

export class WeeklyStreakService {
  static async calculateWeeklyStreak(userId: string): Promise<number> {
    const client = await pool.connect();
    try {
      const query = `
        WITH weekly_runs AS (
          SELECT 
            DATE_TRUNC('week', activity_date) as week_start,
            COUNT(DISTINCT activity_date) as runs_count
          FROM user_daily_activity 
          WHERE user_id = $1 
            AND activity_date >= CURRENT_DATE - INTERVAL '1 year'
            AND (territories_captured > 0 OR distance_run > 0)
          GROUP BY DATE_TRUNC('week', activity_date)
          HAVING COUNT(DISTINCT activity_date) >= 3
          ORDER BY week_start DESC
        ),
        consecutive_weeks AS (
          SELECT 
            week_start,
            runs_count,
            ROW_NUMBER() OVER (ORDER BY week_start DESC) as week_rank,
            week_start - (ROW_NUMBER() OVER (ORDER BY week_start DESC) * INTERVAL '1 week') as group_identifier
          FROM weekly_runs
        )
        SELECT COUNT(*) as streak_length
        FROM consecutive_weeks
        WHERE group_identifier = (
          SELECT group_identifier 
          FROM consecutive_weeks 
          WHERE week_rank = 1
        );
      `;
      
      const result = await client.query(query, [userId]);
      return parseInt(result.rows[0]?.streak_length || '0');
    } finally {
      client.release();
    }
  }

  static async calculateMonthlyStreak(userId: string): Promise<number> {
    const client = await pool.connect();
    try {
      const query = `
        WITH monthly_weeks AS (
          SELECT 
            DATE_TRUNC('month', DATE_TRUNC('week', activity_date)) as month_start,
            DATE_TRUNC('week', activity_date) as week_start,
            COUNT(DISTINCT activity_date) as runs_count
          FROM user_daily_activity 
          WHERE user_id = $1 
            AND activity_date >= CURRENT_DATE - INTERVAL '2 years'
            AND (territories_captured > 0 OR distance_run > 0)
          GROUP BY DATE_TRUNC('month', DATE_TRUNC('week', activity_date)), DATE_TRUNC('week', activity_date)
          HAVING COUNT(DISTINCT activity_date) >= 3
        ),
        monthly_qualifying AS (
          SELECT 
            month_start,
            COUNT(*) as qualifying_weeks
          FROM monthly_weeks
          GROUP BY month_start
          HAVING COUNT(*) >= 3
          ORDER BY month_start DESC
        ),
        consecutive_months AS (
          SELECT 
            month_start,
            qualifying_weeks,
            ROW_NUMBER() OVER (ORDER BY month_start DESC) as month_rank,
            month_start - (ROW_NUMBER() OVER (ORDER BY month_start DESC) * INTERVAL '1 month') as group_identifier
          FROM monthly_qualifying
        )
        SELECT COUNT(*) as streak_length
        FROM consecutive_months
        WHERE group_identifier = (
          SELECT group_identifier 
          FROM consecutive_months 
          WHERE month_rank = 1
        );
      `;
      
      const result = await client.query(query, [userId]);
      return parseInt(result.rows[0]?.streak_length || '0');
    } finally {
      client.release();
    }
  }

  static async updateUserStreaks(userId: string): Promise<void> {
    const weeklyStreak = await this.calculateWeeklyStreak(userId);
    const monthlyStreak = await this.calculateMonthlyStreak(userId);

    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO user_streaks (user_id, weekly_streak, monthly_streak, last_updated)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          weekly_streak = $2,
          monthly_streak = $3,
          last_updated = NOW()
      `, [userId, weeklyStreak, monthlyStreak]);
    } finally {
      client.release();
    }
  }
}
