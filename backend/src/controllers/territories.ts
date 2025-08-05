import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

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

    const territory = await prisma.$queryRaw`
      INSERT INTO territories (
        name, 
        description, 
        boundary, 
        center_point, 
        difficulty_level, 
        points_value
      )
      VALUES (
        ${name},
        ${description},
        ST_GeomFromGeoJSON(${JSON.stringify(boundary)}),
        ST_GeomFromGeoJSON(${JSON.stringify(centerPoint)}),
        ${difficultyLevel},
        ${pointsValue}
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

    res.status(201).json(territory[0]);
  } catch (error) {
    console.error('Create territory error:', error);
    res.status(500).json({ error: 'Error creating territory' });
  }
};

// Get all territories
export const getTerritories = async (req: Request, res: Response) => {
  try {
    const territories = await prisma.$queryRaw`
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
    `;

    res.json(territories);
  } catch (error) {
    console.error('Get territories error:', error);
    res.status(500).json({ error: 'Error fetching territories' });
  }
};

// Get territory by ID
export const getTerritoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const territory = await prisma.$queryRaw`
      SELECT 
        t.id,
        t.name,
        t.description,
        ST_AsGeoJSON(t.boundary)::json as boundary,
        ST_AsGeoJSON(t.center_point)::json as center_point,
        t.difficulty_level,
        t.points_value,
        t.created_at,
        (
          SELECT json_agg(json_build_object(
            'id', tc.id,
            'team', json_build_object(
              'id', tm.id,
              'name', tm.name,
              'color', tm.color
            ),
            'captured_at', tc.captured_at
          ))
          FROM territory_captures tc
          JOIN teams tm ON tc.team_id = tm.id
          WHERE tc.territory_id = t.id AND tc.is_active = true
        ) as active_captures
      FROM territories t
      WHERE t.id = ${parseInt(id)}
    `;

    if (!territory || territory.length === 0) {
      return res.status(404).json({ error: 'Territory not found' });
    }

    res.json(territory[0]);
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

    const territories = await prisma.$queryRaw`
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
          ST_SetSRID(ST_MakePoint(${Number(lng)}, ${Number(lat)})::geography, 4326)
        ) as distance
      FROM territories
      WHERE ST_DWithin(
        center_point::geography,
        ST_SetSRID(ST_MakePoint(${Number(lng)}, ${Number(lat)})::geography, 4326),
        ${Number(radius)}
      )
      ORDER BY distance
    `;

    res.json(territories);
  } catch (error) {
    console.error('Get nearby territories error:', error);
    res.status(500).json({ error: 'Error fetching nearby territories' });
  }
};
