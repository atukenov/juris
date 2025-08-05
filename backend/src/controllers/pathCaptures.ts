import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  GameMechanicsService,
  PathPoint,
} from '../services/GameMechanicsService';

// Start recording a capture path
export const startCapturePath = async (req: Request, res: Response) => {
  try {
    const { territoryId } = req.params;
    const { lat, lng } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has an active team
    const userTeam = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: { isActive: true },
      },
      include: {
        team: true,
      },
    });

    if (!userTeam) {
      return res
        .status(400)
        .json({ error: 'You must be in a team to capture territories' });
    }

    // Check if user already has an active path for this territory
    const activePath = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM capture_paths
      WHERE user_id = ${String(userId)}
        AND territory_id = ${parseInt(territoryId)}
        AND is_completed = false
    `;

    if (activePath.length > 0) {
      return res.status(400).json({
        error: 'You already have an active capture path for this territory',
      });
    }

    // Create new capture path with initial point
    const newPath = await prisma.$queryRaw`
      INSERT INTO capture_paths (
        user_id,
        territory_id,
        path_line,
        path_points_count
      )
      VALUES (
        ${String(userId)},
        ${parseInt(territoryId)},
        ST_MakeLine(ARRAY[ST_SetSRID(ST_MakePoint(${Number(lng)}, ${Number(lat)}), 4326)]),
        1
      )
      RETURNING id, start_time
    `;

    res.status(201).json({
      message: 'Capture path started',
      pathId: newPath[0].id,
      startTime: newPath[0].start_time,
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
    const lastPoints = await prisma.$queryRaw<
      Array<{ lat: number; lng: number }>
    >`
      SELECT 
        ST_Y(unnest(ST_Points(path_line))) as lat,
        ST_X(unnest(ST_Points(path_line))) as lng
      FROM capture_paths
      WHERE id = ${parseInt(pathId)}
        AND user_id = ${String(userId)}
        AND is_completed = false
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const points: PathPoint[] = lastPoints.map((p) => ({
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
    const updatedPath = await prisma.$queryRaw<any[]>`
      UPDATE capture_paths
      SET 
        path_line = ST_AddPoint(
          path_line,
          ST_SetSRID(ST_MakePoint(${Number(lng)}, ${Number(lat)}), 4326)
        ),
        path_points_count = path_points_count + 1
      WHERE id = ${parseInt(pathId)}
        AND user_id = ${userId}
        AND is_completed = false
      RETURNING path_points_count
    `;

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

    const pathInfo = await prisma.$queryRaw<PathInfo[]>`
      SELECT 
        cp.id,
        cp.territory_id,
        cp.path_points_count,
        cp.path_line,
        t.boundary,
        t.name as territory_name
      FROM capture_paths cp
      JOIN territories t ON cp.territory_id = t.id
      WHERE cp.id = ${parseInt(pathId)}
        AND cp.user_id = ${String(userId)}
        AND cp.is_completed = false
    `;

    if (pathInfo.length === 0) {
      return res.status(404).json({ error: 'Active capture path not found' });
    }

    const path = pathInfo[0];

    // Check if path forms a cycle (start point = end point)
    const isValidCycle = await prisma.$queryRaw`
      SELECT ST_Equals(
        ST_StartPoint(${path.path_line}),
        ST_EndPoint(${path.path_line})
      ) as is_cycle,
      ST_Length(${path.path_line}::geography) as path_length,
      ST_Area(${path.boundary}::geography) as territory_area,
      ST_Area(ST_Intersection(
        ST_MakePolygon(${path.path_line}),
        ${path.boundary}
      )::geography) as overlap_area
    `;

    const validation = isValidCycle[0];

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
    const userTeam = await prisma.teamMember.findFirst({
      where: {
        userId: String(userId),
      },
      include: {
        team: true,
      },
    });

    if (!userTeam?.team) {
      return res.status(400).json({
        error: 'You must be in an active team to capture territories',
      });
    }

    // Mark current captures as inactive
    await prisma.territoryCapture.updateMany({
      where: {
        territoryId: path.territory_id,
        isActive: true,
      },
      data: {
        isActive: false,
        lostAt: new Date(),
      },
    });

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
    const capture = await prisma.territoryCapture.create({
      data: {
        territoryId: path.territory_id,
        teamId: userTeam.team.id,
        capturedByUserId: String(userId),
        captureMethod: 'path_trace',
        pointsEarned: points,
        fortificationLevel: 1,
        isActive: true,
      },
    });

    // Mark path as completed
    await prisma.$queryRaw`
      UPDATE capture_paths
      SET 
        is_completed = true,
        end_time = CURRENT_TIMESTAMP
      WHERE id = ${path.id}
    `;

    const team = await prisma.team.findUnique({
      where: { id: userTeam.teamId },
    });

    res.json({
      message: `Territory "${path.territory_name}" captured successfully by team "${team?.name}"!`,
      coverage: Math.round(coveragePercent),
      pathLength: Math.round(validation.path_length),
      pointsEarned: capture.pointsEarned,
    });
  } catch (error) {
    console.error('Complete capture path error:', error);
    res.status(500).json({ error: 'Error completing capture path' });
  }
};
