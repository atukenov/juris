import { Request, Response } from 'express';
import { pool } from '../lib/database';
import * as validator from 'express-validator';

// Захват территории командой
export const captureTerritory = async (req: Request, res: Response) => {
  try {
    // Проверяем ошибки валидации
    const errors = validator.validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      territoryId,
      teamId,
      latitude,
      longitude,
      captureMethod = 'presence',
    } = req.body;

    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const client = await pool.connect();
    try {
      // Проверяем, существует ли территория
      const territoryQuery = `
        SELECT id, name, boundary, center_point, points_value
        FROM territories 
        WHERE id = $1
      `;
      const territoryResult = await client.query(territoryQuery, [territoryId]);

      if (territoryResult.rows.length === 0) {
        return res.status(404).json({ error: 'Territory not found' });
      }

      const territory = territoryResult.rows[0];

      // Проверяем, является ли пользователь участником команды
      const membershipQuery = `
        SELECT id FROM team_members 
        WHERE team_id = $1 AND user_id = $2
      `;
      const membershipResult = await client.query(membershipQuery, [
        teamId,
        userId,
      ]);

      if (membershipResult.rows.length === 0) {
        return res
          .status(403)
          .json({ error: 'User is not a member of this team' });
      }

      // Проверяем, что пользователь находится внутри или рядом с территорией
      const userPoint = `POINT(${longitude} ${latitude})`;
      const distanceQuery = `
        SELECT ST_DWithin(
          boundary::geography,
          ST_SetSRID(ST_GeomFromText($1), 4326)::geography,
          50
        ) as within_territory
        FROM territories 
        WHERE id = $2
      `;
      const distanceResult = await client.query(distanceQuery, [
        userPoint,
        territoryId,
      ]);

      if (!distanceResult.rows[0].within_territory) {
        return res.status(400).json({
          error: 'User must be within 50 meters of the territory to capture it',
        });
      }

      // Проверяем, не захвачена ли территория уже этой командой
      const existingCaptureQuery = `
        SELECT id FROM territory_captures 
        WHERE territory_id = $1 AND team_id = $2 AND is_active = true
      `;
      const existingResult = await client.query(existingCaptureQuery, [
        territoryId,
        teamId,
      ]);

      if (existingResult.rows.length > 0) {
        return res
          .status(400)
          .json({ error: 'Territory is already captured by this team' });
      }

      // Деактивируем предыдущие захваты этой территории
      const deactivateQuery = `
        UPDATE territory_captures 
        SET is_active = false, lost_at = NOW()
        WHERE territory_id = $1 AND is_active = true
      `;
      await client.query(deactivateQuery, [territoryId]);

      // Создаем новый захват
      const captureQuery = `
        INSERT INTO territory_captures (
          territory_id,
          team_id,
          captured_by_user_id,
          capture_method,
          points_earned
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING 
          id,
          territory_id,
          team_id,
          captured_by_user_id,
          captured_at,
          capture_method,
          points_earned
      `;

      const captureResult = await client.query(captureQuery, [
        territoryId,
        teamId,
        userId,
        captureMethod,
        territory.points_value,
      ]);

      const capture = captureResult.rows[0];

      // Получаем информацию о команде и территории для ответа
      const responseQuery = `
        SELECT 
          tc.id,
          tc.captured_at,
          tc.capture_method,
          tc.points_earned,
          t.name as territory_name,
          tm.name as team_name,
          u.username as captured_by_username
        FROM territory_captures tc
        JOIN territories t ON tc.territory_id = t.id
        JOIN teams tm ON tc.team_id = tm.id
        JOIN users u ON tc.captured_by_user_id = u.id
        WHERE tc.id = $1
      `;

      const responseResult = await client.query(responseQuery, [capture.id]);
      const captureInfo = responseResult.rows[0];

      res.status(201).json({
        id: capture.id,
        territoryId: capture.territory_id,
        teamId: capture.team_id,
        capturedBy: {
          id: capture.captured_by_user_id,
          username: captureInfo.captured_by_username,
        },
        capturedAt: capture.captured_at,
        captureMethod: capture.capture_method,
        pointsEarned: capture.points_earned,
        territory: {
          name: captureInfo.territory_name,
        },
        team: {
          name: captureInfo.team_name,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Capture territory error:', error);
    res.status(500).json({ error: 'Error capturing territory' });
  }
};

// Получить все активные захваты
export const getActiveCaptures = async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      const capturesQuery = `
        SELECT 
          tc.id,
          tc.captured_at,
          tc.capture_method,
          tc.points_earned,
          t.id as territory_id,
          t.name as territory_name,
          ST_AsGeoJSON(t.boundary)::json as territory_boundary,
          ST_AsGeoJSON(t.center_point)::json as territory_center,
          tm.id as team_id,
          tm.name as team_name,
          tm.color as team_color,
          u.id as captured_by_id,
          u.username as captured_by_username
        FROM territory_captures tc
        JOIN territories t ON tc.territory_id = t.id
        JOIN teams tm ON tc.team_id = tm.id
        JOIN users u ON tc.captured_by_user_id = u.id
        WHERE tc.is_active = true
        ORDER BY tc.captured_at DESC
      `;

      const result = await client.query(capturesQuery);

      const captures = result.rows.map((row) => ({
        id: row.id,
        capturedAt: row.captured_at,
        captureMethod: row.capture_method,
        pointsEarned: row.points_earned,
        territory: {
          id: row.territory_id,
          name: row.territory_name,
          boundary: row.territory_boundary,
          centerPoint: row.territory_center,
        },
        team: {
          id: row.team_id,
          name: row.team_name,
          color: row.team_color,
        },
        capturedBy: {
          id: row.captured_by_id,
          username: row.captured_by_username,
        },
      }));

      res.json(captures);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get active captures error:', error);
    res.status(500).json({ error: 'Error fetching active captures' });
  }
};

// Получить историю захватов с фильтрами
export const getCaptureHistory = async (req: Request, res: Response) => {
  try {
    // Проверяем ошибки валидации
    const errors = validator.validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { territoryId, teamId, userId, limit = 20, offset = 0 } = req.query;

    const client = await pool.connect();
    try {
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      if (territoryId) {
        paramCount++;
        whereConditions.push(`tc.territory_id = $${paramCount}`);
        queryParams.push(Number(territoryId));
      }

      if (teamId) {
        paramCount++;
        whereConditions.push(`tc.team_id = $${paramCount}`);
        queryParams.push(Number(teamId));
      }

      if (userId) {
        paramCount++;
        whereConditions.push(`tc.captured_by_user_id = $${paramCount}`);
        queryParams.push(Number(userId));
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(' AND ')}`
          : '';

      paramCount++;
      const limitParam = paramCount;
      queryParams.push(Number(limit));

      paramCount++;
      const offsetParam = paramCount;
      queryParams.push(Number(offset));

      const historyQuery = `
        SELECT 
          tc.id,
          tc.captured_at,
          tc.lost_at,
          tc.is_active,
          tc.capture_method,
          tc.points_earned,
          t.id as territory_id,
          t.name as territory_name,
          tm.id as team_id,
          tm.name as team_name,
          tm.color as team_color,
          u.id as captured_by_id,
          u.username as captured_by_username
        FROM territory_captures tc
        JOIN territories t ON tc.territory_id = t.id
        JOIN teams tm ON tc.team_id = tm.id
        JOIN users u ON tc.captured_by_user_id = u.id
        ${whereClause}
        ORDER BY tc.captured_at DESC
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `;

      const result = await client.query(historyQuery, queryParams);

      const captures = result.rows.map((row) => ({
        id: row.id,
        capturedAt: row.captured_at,
        lostAt: row.lost_at,
        isActive: row.is_active,
        captureMethod: row.capture_method,
        pointsEarned: row.points_earned,
        territory: {
          id: row.territory_id,
          name: row.territory_name,
        },
        team: {
          id: row.team_id,
          name: row.team_name,
          color: row.team_color,
        },
        capturedBy: {
          id: row.captured_by_id,
          username: row.captured_by_username,
        },
      }));

      res.json({
        captures,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: captures.length,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get capture history error:', error);
    res.status(500).json({ error: 'Error fetching capture history' });
  }
};

// Освобождение захвата территории
export const releaseTerritoryCapture = async (req: Request, res: Response) => {
  try {
    // Проверяем ошибки валидации
    const errors = validator.validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const client = await pool.connect();
    try {
      // Проверяем, существует ли захват и принадлежит ли он команде пользователя
      const captureQuery = `
        SELECT 
          tc.id,
          tc.team_id,
          tc.territory_id,
          tc.is_active,
          tm.owner_id
        FROM territory_captures tc
        JOIN teams tm ON tc.team_id = tm.id
        WHERE tc.id = $1
      `;

      const captureResult = await client.query(captureQuery, [id]);

      if (captureResult.rows.length === 0) {
        return res.status(404).json({ error: 'Capture not found' });
      }

      const capture = captureResult.rows[0];

      if (!capture.is_active) {
        return res.status(400).json({ error: 'Capture is already inactive' });
      }

      // Проверяем права: пользователь должен быть владельцем команды или участником
      const membershipQuery = `
        SELECT id FROM team_members 
        WHERE team_id = $1 AND user_id = $2
      `;
      const membershipResult = await client.query(membershipQuery, [
        capture.team_id,
        userId,
      ]);

      if (membershipResult.rows.length === 0 && capture.owner_id !== userId) {
        return res.status(403).json({
          error: 'You do not have permission to release this capture',
        });
      }

      // Деактивируем захват
      const releaseQuery = `
        UPDATE territory_captures 
        SET is_active = false, lost_at = NOW()
        WHERE id = $1
        RETURNING id, lost_at
      `;

      const releaseResult = await client.query(releaseQuery, [id]);

      res.json({
        message: 'Territory capture released successfully',
        captureId: releaseResult.rows[0].id,
        releasedAt: releaseResult.rows[0].lost_at,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Release capture error:', error);
    res.status(500).json({ error: 'Error releasing territory capture' });
  }
};
