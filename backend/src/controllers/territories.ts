import { Request, Response } from 'express';
import { pool } from '../lib/database';

// Create a territory
export const createTerritory = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      boundary,
      centerPoint,
      difficultyLevel,
      pointsValue,
    } = req.body;

    const client = await pool.connect();
    try {
      const territoryQuery = `
        INSERT INTO territories (
          name, 
          description, 
          boundary, 
          center_point, 
          difficulty_level, 
          points_value
        )
        VALUES (
          $1,
          $2,
          ST_GeomFromGeoJSON($3),
          ST_GeomFromGeoJSON($4),
          $5,
          $6
        )
        RETURNING 
          id, 
          name, 
          description, 
          ST_AsGeoJSON(boundary)::json as boundary,
          ST_AsGeoJSON(center_point)::json as center_point,
          difficulty_level,
          points_value,
          created_at
      `;

      const result = await client.query(territoryQuery, [
        name,
        description || null,
        JSON.stringify(boundary),
        JSON.stringify(centerPoint),
        difficultyLevel,
        pointsValue,
      ]);

      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create territory error:', error);
    res.status(500).json({ error: 'Error creating territory' });
  }
};

// Get all territories
export const getTerritories = async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      const territoriesQuery = `
        SELECT 
          id,
          name,
          description,
          ST_AsGeoJSON(boundary)::json as boundary,
          ST_AsGeoJSON(center_point)::json as center_point,
          difficulty_level,
          points_value,
          created_at
        FROM territories
        ORDER BY created_at DESC
      `;

      const result = await client.query(territoriesQuery);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get territories error:', error);
    res.status(500).json({ error: 'Error fetching territories' });
  }
};

// Get territory by ID
export const getTerritoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();

    try {
      const territoryQuery = `
        SELECT 
          t.id,
          t.name,
          t.description,
          ST_AsGeoJSON(t.boundary)::json as boundary,
          ST_AsGeoJSON(t.center_point)::json as center_point,
          t.difficulty_level,
          t.points_value,
          t.created_at
        FROM territories t
        WHERE t.id = $1
      `;

      const territoryResult = await client.query(territoryQuery, [id]);

      if (territoryResult.rows.length === 0) {
        return res.status(404).json({ error: 'Territory not found' });
      }

      const territory = territoryResult.rows[0];

      // Get active captures for this territory
      const capturesQuery = `
        SELECT 
          tc.id,
          tc.captured_at,
          tc.points_earned,
          tm.id as team_id,
          tm.name as team_name,
          tm.color as team_color
        FROM territory_captures tc
        JOIN teams tm ON tc.team_id = tm.id
        WHERE tc.territory_id = $1 AND tc.is_active = true
        ORDER BY tc.captured_at DESC
      `;

      const capturesResult = await client.query(capturesQuery, [id]);

      territory.activCaptures = capturesResult.rows.map((capture) => ({
        id: capture.id,
        capturedAt: capture.captured_at,
        pointsEarned: capture.points_earned,
        team: {
          id: capture.team_id,
          name: capture.team_name,
          color: capture.team_color,
        },
      }));

      res.json(territory);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get territory error:', error);
    res.status(500).json({ error: 'Error fetching territory' });
  }
};

// Get nearby territories
export const getNearbyTerritories = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = 1000 } = req.query; // radius in meters

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ error: 'Latitude and longitude are required' });
    }

    const client = await pool.connect();
    try {
      const nearbyQuery = `
        SELECT 
          id,
          name,
          description,
          ST_AsGeoJSON(boundary)::json as boundary,
          ST_AsGeoJSON(center_point)::json as center_point,
          difficulty_level,
          points_value,
          ST_Distance(
            center_point::geography,
            ST_SetSRID(ST_MakePoint($1, $2)::geography, 4326)
          ) as distance
        FROM territories
        WHERE ST_DWithin(
          center_point::geography,
          ST_SetSRID(ST_MakePoint($1, $2)::geography, 4326),
          $3
        )
        ORDER BY distance
      `;

      const result = await client.query(nearbyQuery, [
        Number(lng),
        Number(lat),
        Number(radius),
      ]);

      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get nearby territories error:', error);
    res.status(500).json({ error: 'Error fetching nearby territories' });
  }
};
