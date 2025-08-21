import { Request, Response } from 'express';
import { pool } from '../lib/database';
import {
  GameMechanicsService,
  PathPoint,
} from '../services/GameMechanicsService';

interface TeamMember {
  id: number;
  user_id: string;  // Changed to string to match database type
  team_id: string;  // Changed to string to match database type
  team: {
    id: string;     // Changed to string to match database type
    name: string;
    is_active: boolean;
  };
}

// Starting a capture path
export const startCapturePath = async (req: Request, res: Response) => {
  try {
    const { territoryId } = req.params;
    const { lat, lng } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has an active team
    const {
      rows: [userTeam],
    } = await pool.query<TeamMember>(
      `
      SELECT 
        tm.id, tm.user_id, tm.team_id,
        json_build_object(
          'id', t.id,
          'name', t.name,
          'is_active', t.is_active
        ) as team
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = $1 AND t.is_active = true
      LIMIT 1
    `,
      [userId]
    );

    if (!userTeam) {
      return res
        .status(400)
        .json({ error: 'You must be in a team to capture territories' });
    }

    // Check if user already has an active path for this territory
    const { rows: activePath } = await pool.query<{ id: number }>(
      `
      SELECT id FROM capture_paths
      WHERE user_id = $1
        AND territory_id = $2
        AND is_completed = false
    `,
      [userId, parseInt(territoryId)]
    );

    if (activePath.length > 0) {
      return res.status(400).json({
        error: 'You already have an active capture path for this territory',
      });
    }

    // Create new capture path with initial point
    const {
      rows: [newPath],
    } = await pool.query<{ id: number; start_time: Date }>(
      `
      INSERT INTO capture_paths (
        user_id,
        territory_id,
        path_line,
        path_points_count
      )
      VALUES (
        $1,
        $2,
        ST_MakeLine(ARRAY[ST_SetSRID(ST_MakePoint($3, $4), 4326)]),
        1
      )
      RETURNING id, start_time
    `,
      [userId, parseInt(territoryId), lng, lat]
    );

    res.status(201).json({
      message: 'Capture path started',
      pathId: newPath.id,
      startTime: newPath.start_time,
    });
  } catch (error) {
    console.error('Start capture path error:', error);
    res.status(500).json({ error: 'Error starting capture path' });
  }
};

// Add point to capture path
export const addPathPoint = async (req: Request, res: Response) => {
  try {
    const { pathId } = req.params;
    const { lat, lng, accuracy, speed, altitude, heading } = req.body;
    const userId = req.user?.id;

    const point: PathPoint = {
      lat,
      lng,
      accuracy,
      speed,
      timestamp: new Date(),
      altitude,
      heading,
    };

    // Validate point
    const { rows: lastPoints } = await pool.query<{ lat: number; lng: number }>(
      `
      SELECT 
        ST_Y(unnest(ST_Points(path_line))) as lat,
        ST_X(unnest(ST_Points(path_line))) as lng
      FROM capture_paths
      WHERE id = $1
        AND user_id = $2
        AND is_completed = false
      ORDER BY created_at DESC
      LIMIT 5
    `,
      [parseInt(pathId), userId]
    );

    interface LastPointData {
      lat: number;
      lng: number;
    }

    const points: PathPoint[] = lastPoints.map((p: LastPointData) => ({
      ...point,
      lat: p.lat,
      lng: p.lng,
      timestamp: new Date(Date.now() - 5000), // Approximate previous timestamps
    }));
    points.push(point);

    if (!GameMechanicsService.validateLocationSequence(points)) {
      return res
        .status(400)
        .json({ error: 'Invalid location sequence detected' });
    }

    // Update path line by adding new point
    const { rows: updatedPath } = await pool.query<{
      path_points_count: number;
    }>(
      `
      UPDATE capture_paths
      SET 
        path_line = ST_AddPoint(
          path_line,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)
        ),
        path_points_count = path_points_count + 1
      WHERE id = $3
        AND user_id = $4
        AND is_completed = false
      RETURNING path_points_count
    `,
      [lng, lat, parseInt(pathId), userId]
    );

    if (updatedPath.length === 0) {
      return res.status(404).json({ error: 'Active capture path not found' });
    }

    res.json({
      message: 'Point added to capture path',
      pointsCount: updatedPath[0].path_points_count,
    });
  } catch (error) {
    console.error('Add path point error:', error);
    res.status(500).json({ error: 'Error adding point to capture path' });
  }
};

// Complete capture path and attempt territory capture
export const completeCapturePath = async (req: Request, res: Response) => {
  try {
    const { pathId } = req.params;
    const userId = req.user?.id;

    // Check user's energy
    const hasEnergy = await GameMechanicsService.checkEnergy(
      userId!,
      GameMechanicsService['ENERGY_COST_BASE']
    );
    if (!hasEnergy) {
      return res.status(400).json({ error: 'Not enough energy points' });
    }

    // Get the capture path and territory info
    interface PathInfo {
      id: number;
      territory_id: string;
      path_points_count: number;
      path_line: any;
      boundary: any;
      territory_name: string;
    }

    const { rows: pathInfo } = await pool.query<PathInfo>(
      `
      SELECT 
        cp.id,
        cp.territory_id,
        cp.path_points_count,
        cp.path_line,
        t.boundary,
        t.name as territory_name
      FROM capture_paths cp
      JOIN territories t ON cp.territory_id = t.id
      WHERE cp.id = $1
        AND cp.user_id = $2
        AND cp.is_completed = false
    `,
      [parseInt(pathId), userId]
    );

    if (pathInfo.length === 0) {
      return res.status(404).json({ error: 'Active capture path not found' });
    }

    const path = pathInfo[0];

    // Check if path forms a cycle (start point = end point)
    const {
      rows: [validation],
    } = await pool.query<{
      is_cycle: boolean;
      path_length: number;
      territory_area: number;
      overlap_area: number;
    }>(
      `
      SELECT ST_Equals(
        ST_StartPoint($1),
        ST_EndPoint($1)
      ) as is_cycle,
      ST_Length($1::geography) as path_length,
      ST_Area($2::geography) as territory_area,
      ST_Area(ST_Intersection(
        ST_MakePolygon($1),
        $2
      )::geography) as overlap_area
    `,
      [path.path_line, path.boundary]
    );

    if (!validation.is_cycle) {
      return res.status(400).json({
        error: 'Path must form a complete cycle (return to starting point)',
        pathLength: Math.round(validation.path_length),
        territoryArea: Math.round(validation.territory_area),
      });
    }

    // Check if the path covers enough of the territory (at least 60%)
    const coveragePercent =
      (validation.overlap_area / validation.territory_area) * 100;
    if (coveragePercent < 60) {
      return res.status(400).json({
        error: 'Path must cover at least 60% of the territory',
        coverage: Math.round(coveragePercent),
        pathLength: Math.round(validation.path_length),
        territoryArea: Math.round(validation.territory_area),
      });
    }

    // Get user's team
    const {
      rows: [userTeam],
    } = await pool.query<TeamMember>(
      `
      SELECT 
        tm.id, tm.user_id, tm.team_id,
        json_build_object(
          'id', t.id,
          'name', t.name,
          'is_active', t.is_active
        ) as team
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = $1
      LIMIT 1
    `,
      [userId]
    );

    if (!userTeam?.team) {
      return res.status(400).json({
        error: 'You must be in an active team to capture territories',
      });
    }

    // Mark current captures as inactive
    await pool.query(
      `
      UPDATE territory_captures
      SET is_active = false, lost_at = CURRENT_TIMESTAMP
      WHERE territory_id = $1 AND is_active = true
    `,
      [path.territory_id]
    );

    // Calculate bonuses
    const teamBonus = await GameMechanicsService.calculateTeamBonus(
      userTeam.team.id,
      path.territory_id
    );
    const envBonus = await GameMechanicsService.calculateEnvironmentalBonus(
      path.territory_id
    );
    const totalBonus = teamBonus * envBonus;
    const points = Math.round(coveragePercent * totalBonus);

    // Create new capture
    const {
      rows: [capture],
    } = await pool.query<{
      id: number;
      points_earned: number;
    }>(
      `
      INSERT INTO territory_captures (
        territory_id,
        team_id,
        captured_by_user_id,
        capture_method,
        points_earned,
        fortification_level,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, points_earned
    `,
      [
        path.territory_id,
        userTeam.team.id,
        userId,
        'path_trace',
        points,
        1,
        true,
      ]
    );

    // Mark path as completed
    await pool.query(
      `
      UPDATE capture_paths
      SET 
        is_completed = true,
        end_time = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [path.id]
    );

    const {
      rows: [team],
    } = await pool.query<{ name: string }>(
      `
      SELECT name 
      FROM teams 
      WHERE id = $1
    `,
      [userTeam.team_id]
    );

    res.json({
      message: `Territory "${path.territory_name}" captured successfully by team "${team?.name}"!`,
      coverage: Math.round(coveragePercent),
      pathLength: Math.round(validation.path_length),
      pointsEarned: capture.points_earned,
    });
  } catch (error) {
    console.error('Complete capture path error:', error);
    res.status(500).json({ error: 'Error completing capture path' });
  }
};
