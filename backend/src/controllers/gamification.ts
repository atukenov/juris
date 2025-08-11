import { Request, Response } from 'express';
import { pool } from '../lib/database';
import { GamificationService } from '../services/GamificationService';

export const getUserLevel = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = await pool.connect();
    try {
      const levelQuery = `
        SELECT current_level, total_experience, experience_to_next_level
        FROM user_levels 
        WHERE user_id = $1
      `;
      const levelResult = await client.query(levelQuery, [userId]);

      if (levelResult.rows.length === 0) {
        await GamificationService.awardExperience(userId, 0);
        return res.json({
          currentLevel: 1,
          totalExperience: 0,
          experienceToNextLevel: 100
        });
      }

      const level = levelResult.rows[0];
      res.json({
        currentLevel: level.current_level,
        totalExperience: level.total_experience,
        experienceToNextLevel: level.experience_to_next_level
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get user level error:', error);
    res.status(500).json({ error: 'Error fetching user level' });
  }
};

export const getUserAchievements = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = await pool.connect();
    try {
      const achievementsQuery = `
        SELECT 
          a.id,
          a.name,
          a.description,
          a.icon,
          a.category,
          a.points_reward,
          ua.progress,
          ua.is_completed,
          ua.unlocked_at,
          a.requirement_value
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
        WHERE a.is_active = true
        ORDER BY ua.is_completed DESC, a.category, a.requirement_value
      `;
      const result = await client.query(achievementsQuery, [userId]);

      const achievements = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        category: row.category,
        pointsReward: row.points_reward,
        progress: row.progress || 0,
        isCompleted: row.is_completed || false,
        unlockedAt: row.unlocked_at,
        requirementValue: row.requirement_value,
        progressPercentage: Math.min(100, ((row.progress || 0) / row.requirement_value) * 100)
      }));

      res.json(achievements);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get user achievements error:', error);
    res.status(500).json({ error: 'Error fetching achievements' });
  }
};

export const getRankings = async (req: Request, res: Response) => {
  try {
    const { type = 'global', category = 'user', limit = 50 } = req.query;
    
    const client = await pool.connect();
    try {
      let rankingsQuery: string;
      let rankColumn: string;

      if (type === 'weekly') {
        rankColumn = 'weekly_rank';
      } else if (type === 'monthly') {
        rankColumn = 'monthly_rank';
      } else {
        rankColumn = 'global_rank';
      }

      if (category === 'team') {
        rankingsQuery = `
          SELECT 
            tr.team_id as id,
            t.name,
            t.color,
            tr.total_points,
            tr.weekly_points,
            tr.monthly_points,
            tr.${rankColumn} as rank
          FROM team_rankings tr
          JOIN teams t ON tr.team_id = t.id
          WHERE t.is_active = true
          ORDER BY tr.${rankColumn}
          LIMIT $1
        `;
      } else {
        rankingsQuery = `
          SELECT 
            ur.user_id as id,
            u.username,
            ur.total_points,
            ur.weekly_points,
            ur.monthly_points,
            ur.${rankColumn} as rank,
            ul.current_level
          FROM user_rankings ur
          JOIN users u ON ur.user_id = u.id
          LEFT JOIN user_levels ul ON ur.user_id = ul.user_id
          ORDER BY ur.${rankColumn}
          LIMIT $1
        `;
      }

      const result = await client.query(rankingsQuery, [limit]);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get rankings error:', error);
    res.status(500).json({ error: 'Error fetching rankings' });
  }
};

export const getUserChallenges = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = await pool.connect();
    try {
      const challengesQuery = `
        SELECT 
          c.id,
          c.name,
          c.description,
          c.challenge_type,
          c.category,
          c.points_reward,
          c.start_date,
          c.end_date,
          uc.progress,
          uc.is_completed,
          uc.completed_at,
          c.requirement_value
        FROM challenges c
        LEFT JOIN user_challenges uc ON c.id = uc.challenge_id AND uc.user_id = $1
        WHERE c.is_active = true 
        AND c.start_date <= CURRENT_DATE 
        AND c.end_date > CURRENT_DATE
        ORDER BY c.challenge_type, c.end_date
      `;
      const result = await client.query(challengesQuery, [userId]);

      const challenges = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        challengeType: row.challenge_type,
        category: row.category,
        pointsReward: row.points_reward,
        startDate: row.start_date,
        endDate: row.end_date,
        progress: row.progress || 0,
        isCompleted: row.is_completed || false,
        completedAt: row.completed_at,
        requirementValue: row.requirement_value,
        progressPercentage: Math.min(100, ((row.progress || 0) / row.requirement_value) * 100)
      }));

      res.json(challenges);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get user challenges error:', error);
    res.status(500).json({ error: 'Error fetching challenges' });
  }
};

export const getUserStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = await pool.connect();
    try {
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT tc.id) as territories_captured,
          COALESCE(SUM(tc.points_earned), 0) as total_points,
          COALESCE(SUM(uda.distance_run), 0) as total_distance,
          COUNT(DISTINCT uda.activity_date) as active_days,
          ul.current_level,
          ur.global_rank,
          ur.weekly_rank
        FROM users u
        LEFT JOIN territory_captures tc ON u.id = tc.captured_by_user_id
        LEFT JOIN user_daily_activity uda ON u.id = uda.user_id
        LEFT JOIN user_levels ul ON u.id = ul.user_id
        LEFT JOIN user_rankings ur ON u.id = ur.user_id
        WHERE u.id = $1
        GROUP BY u.id, ul.current_level, ur.global_rank, ur.weekly_rank
      `;
      const result = await client.query(statsQuery, [userId]);

      if (result.rows.length === 0) {
        return res.json({
          territoriesCaptured: 0,
          totalPoints: 0,
          totalDistance: 0,
          activeDays: 0,
          currentLevel: 1,
          globalRank: null,
          weeklyRank: null
        });
      }

      const stats = result.rows[0];
      res.json({
        territoriesCaptured: parseInt(stats.territories_captured),
        totalPoints: parseInt(stats.total_points),
        totalDistance: parseFloat(stats.total_distance) / 1000, // Convert to km
        activeDays: parseInt(stats.active_days),
        currentLevel: stats.current_level || 1,
        globalRank: stats.global_rank,
        weeklyRank: stats.weekly_rank
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Error fetching user statistics' });
  }
};
