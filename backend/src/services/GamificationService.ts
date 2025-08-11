import { pool } from '../lib/database';
import { WeeklyStreakService } from './WeeklyStreakService';
import { notificationService } from './notificationService';

export class GamificationService {
  static calculateRequiredExperience(level: number): number {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  static async awardExperience(userId: string, experience: number): Promise<{ leveledUp: boolean; newLevel?: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const levelQuery = `
        INSERT INTO user_levels (user_id, current_level, total_experience, experience_to_next_level)
        VALUES ($1, 1, 0, 100)
        ON CONFLICT (user_id) DO NOTHING
        RETURNING *
      `;
      await client.query(levelQuery, [userId]);

      const currentQuery = `SELECT * FROM user_levels WHERE user_id = $1`;
      const currentResult = await client.query(currentQuery, [userId]);
      const userLevel = currentResult.rows[0];

      let newTotalExp = userLevel.total_experience + experience;
      let currentLevel = userLevel.current_level;
      let expToNext = userLevel.experience_to_next_level;
      let leveledUp = false;

      while (newTotalExp >= this.calculateRequiredExperience(currentLevel + 1)) {
        currentLevel++;
        leveledUp = true;
      }

      expToNext = this.calculateRequiredExperience(currentLevel + 1) - newTotalExp;

      const updateQuery = `
        UPDATE user_levels 
        SET current_level = $1, total_experience = $2, experience_to_next_level = $3, updated_at = NOW()
        WHERE user_id = $4
      `;
      await client.query(updateQuery, [currentLevel, newTotalExp, expToNext, userId]);

      await client.query('COMMIT');

      if (leveledUp) {
        await notificationService.sendUserNotification(userId, {
          title: 'Level Up!',
          body: `Congratulations! You reached level ${currentLevel}`,
          data: { type: 'level_up', newLevel: currentLevel }
        });
      }

      return { leveledUp, newLevel: leveledUp ? currentLevel : undefined };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateAchievementProgress(userId: string, category: string, progressType: string, value: number): Promise<void> {
    const client = await pool.connect();
    try {
      const achievementsQuery = `
        SELECT * FROM achievements 
        WHERE category = $1 AND requirement_type = $2 AND is_active = true
      `;
      const achievementsResult = await client.query(achievementsQuery, [category, progressType]);

      for (const achievement of achievementsResult.rows) {
        const userAchievementQuery = `
          INSERT INTO user_achievements (user_id, achievement_id, progress)
          VALUES ($1, $2, 0)
          ON CONFLICT (user_id, achievement_id) DO NOTHING
        `;
        await client.query(userAchievementQuery, [userId, achievement.id]);

        const updateQuery = `
          UPDATE user_achievements 
          SET progress = GREATEST(progress, $1),
              is_completed = CASE WHEN $1 >= $2 THEN true ELSE is_completed END,
              unlocked_at = CASE WHEN $1 >= $2 AND NOT is_completed THEN NOW() ELSE unlocked_at END
          WHERE user_id = $3 AND achievement_id = $4 AND NOT is_completed
          RETURNING is_completed, progress
        `;
        const updateResult = await client.query(updateQuery, [value, achievement.requirement_value, userId, achievement.id]);

        if (updateResult.rows.length > 0 && updateResult.rows[0].is_completed) {
          await this.awardExperience(userId, achievement.points_reward);

          await notificationService.sendUserNotification(userId, {
            title: 'Achievement Unlocked!',
            body: `You earned "${achievement.name}"`,
            data: { 
              type: 'achievement_unlocked', 
              achievementId: achievement.id,
              achievementName: achievement.name,
              pointsReward: achievement.points_reward
            }
          });
        }
      }
    } finally {
      client.release();
    }
  }

  static async updateDailyActivity(userId: string, territoriesCount: number, distance: number, points: number): Promise<void> {
    const client = await pool.connect();
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const upsertQuery = `
        INSERT INTO user_daily_activity (user_id, activity_date, territories_captured, distance_run, points_earned)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, activity_date)
        DO UPDATE SET 
          territories_captured = user_daily_activity.territories_captured + $3,
          distance_run = user_daily_activity.distance_run + $4,
          points_earned = user_daily_activity.points_earned + $5
      `;
      await client.query(upsertQuery, [userId, today, territoriesCount, distance, points]);

      const streakQuery = `
        SELECT COUNT(*) as streak_days
        FROM user_daily_activity
        WHERE user_id = $1 
        AND activity_date >= CURRENT_DATE - INTERVAL '30 days'
        AND territories_captured > 0
        ORDER BY activity_date DESC
      `;
      const streakResult = await client.query(streakQuery, [userId]);
      const streakDays = parseInt(streakResult.rows[0].streak_days);

      await this.updateAchievementProgress(userId, 'streak', 'consecutive_days', streakDays);
      
      await this.updateWeeklyStreak(userId);
      await WeeklyStreakService.updateUserStreaks(userId);
    } finally {
      client.release();
    }
  }

  static async updateWeeklyStreak(userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      const weeklyStreakQuery = `
        WITH weekly_runs AS (
          SELECT 
            DATE_TRUNC('week', activity_date) as week_start,
            COUNT(DISTINCT activity_date) as runs_per_week
          FROM user_daily_activity
          WHERE user_id = $1 
          AND activity_date >= CURRENT_DATE - INTERVAL '12 weeks'
          AND (territories_captured > 0 OR distance_run > 0)
          GROUP BY DATE_TRUNC('week', activity_date)
          HAVING COUNT(DISTINCT activity_date) >= 3
          ORDER BY week_start DESC
        ),
        consecutive_weeks AS (
          SELECT 
            week_start,
            runs_per_week,
            ROW_NUMBER() OVER (ORDER BY week_start DESC) as week_rank
          FROM weekly_runs
        ),
        streak_calculation AS (
          SELECT 
            COUNT(*) as weekly_streak
          FROM consecutive_weeks cw1
          WHERE NOT EXISTS (
            SELECT 1 FROM consecutive_weeks cw2 
            WHERE cw2.week_rank = cw1.week_rank - 1 
            AND cw2.week_start != cw1.week_start - INTERVAL '1 week'
          )
          AND cw1.week_rank <= (
            SELECT MIN(week_rank) FROM consecutive_weeks cw3
            WHERE EXISTS (
              SELECT 1 FROM consecutive_weeks cw4 
              WHERE cw4.week_rank = cw3.week_rank - 1 
              AND cw4.week_start != cw3.week_start - INTERVAL '1 week'
            )
            UNION ALL SELECT 999
            LIMIT 1
          )
        )
        SELECT COALESCE(weekly_streak, 0) as weekly_streak FROM streak_calculation
      `;
      
      const weeklyResult = await client.query(weeklyStreakQuery, [userId]);
      const weeklyStreak = parseInt(weeklyResult.rows[0]?.weekly_streak || 0);

      if (weeklyStreak >= 4) {
        await this.updateAchievementProgress(userId, 'streak', 'weekly_streak', weeklyStreak);
      }

      const monthlyStreakQuery = `
        SELECT COUNT(*) as monthly_streak
        FROM (
          SELECT DATE_TRUNC('month', activity_date) as month_start
          FROM user_daily_activity
          WHERE user_id = $1 
          AND activity_date >= CURRENT_DATE - INTERVAL '12 months'
          AND (territories_captured > 0 OR distance_run > 0)
          GROUP BY DATE_TRUNC('month', activity_date)
          HAVING COUNT(DISTINCT DATE_TRUNC('week', activity_date)) >= 4
          AND COUNT(DISTINCT activity_date) >= 12
          ORDER BY month_start DESC
        ) monthly_runs
      `;
      
      const monthlyResult = await client.query(monthlyStreakQuery, [userId]);
      const monthlyStreak = parseInt(monthlyResult.rows[0]?.monthly_streak || 0);

      if (monthlyStreak >= 3) {
        await this.updateAchievementProgress(userId, 'streak', 'monthly_streak', monthlyStreak);
      }
    } finally {
      client.release();
    }
  }

  static async updateRankings(): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userRankingsQuery = `
        WITH user_points AS (
          SELECT 
            u.id as user_id,
            COALESCE(SUM(tc.points_earned), 0) as total_points,
            COALESCE(SUM(CASE WHEN tc.captured_at >= CURRENT_DATE - INTERVAL '7 days' THEN tc.points_earned ELSE 0 END), 0) as weekly_points,
            COALESCE(SUM(CASE WHEN tc.captured_at >= CURRENT_DATE - INTERVAL '30 days' THEN tc.points_earned ELSE 0 END), 0) as monthly_points
          FROM users u
          LEFT JOIN territory_captures tc ON u.id = tc.captured_by_user_id
          GROUP BY u.id
        ),
        ranked_users AS (
          SELECT 
            user_id,
            total_points,
            weekly_points,
            monthly_points,
            ROW_NUMBER() OVER (ORDER BY total_points DESC) as global_rank,
            ROW_NUMBER() OVER (ORDER BY weekly_points DESC) as weekly_rank,
            ROW_NUMBER() OVER (ORDER BY monthly_points DESC) as monthly_rank
          FROM user_points
        )
        INSERT INTO user_rankings (user_id, total_points, weekly_points, monthly_points, global_rank, weekly_rank, monthly_rank, last_updated)
        SELECT user_id, total_points, weekly_points, monthly_points, global_rank, weekly_rank, monthly_rank, NOW()
        FROM ranked_users
        ON CONFLICT (user_id)
        DO UPDATE SET
          total_points = EXCLUDED.total_points,
          weekly_points = EXCLUDED.weekly_points,
          monthly_points = EXCLUDED.monthly_points,
          global_rank = EXCLUDED.global_rank,
          weekly_rank = EXCLUDED.weekly_rank,
          monthly_rank = EXCLUDED.monthly_rank,
          last_updated = NOW()
      `;
      await client.query(userRankingsQuery);

      const teamRankingsQuery = `
        WITH team_points AS (
          SELECT 
            t.id as team_id,
            COALESCE(SUM(tc.points_earned), 0) as total_points,
            COALESCE(SUM(CASE WHEN tc.captured_at >= CURRENT_DATE - INTERVAL '7 days' THEN tc.points_earned ELSE 0 END), 0) as weekly_points,
            COALESCE(SUM(CASE WHEN tc.captured_at >= CURRENT_DATE - INTERVAL '30 days' THEN tc.points_earned ELSE 0 END), 0) as monthly_points
          FROM teams t
          LEFT JOIN territory_captures tc ON t.id = tc.team_id
          WHERE t.is_active = true
          GROUP BY t.id
        ),
        ranked_teams AS (
          SELECT 
            team_id,
            total_points,
            weekly_points,
            monthly_points,
            ROW_NUMBER() OVER (ORDER BY total_points DESC) as global_rank,
            ROW_NUMBER() OVER (ORDER BY weekly_points DESC) as weekly_rank,
            ROW_NUMBER() OVER (ORDER BY monthly_points DESC) as monthly_rank
          FROM team_points
        )
        INSERT INTO team_rankings (team_id, total_points, weekly_points, monthly_points, global_rank, weekly_rank, monthly_rank, last_updated)
        SELECT team_id, total_points, weekly_points, monthly_points, global_rank, weekly_rank, monthly_rank, NOW()
        FROM ranked_teams
        ON CONFLICT (team_id)
        DO UPDATE SET
          total_points = EXCLUDED.total_points,
          weekly_points = EXCLUDED.weekly_points,
          monthly_points = EXCLUDED.monthly_points,
          global_rank = EXCLUDED.global_rank,
          weekly_rank = EXCLUDED.weekly_rank,
          monthly_rank = EXCLUDED.monthly_rank,
          last_updated = NOW()
      `;
      await client.query(teamRankingsQuery);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
