import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const captureTerritory = async (req: Request, res: Response) => {
  try {
    const { territoryId } = req.params;
    const { lat, lng } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's active team
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

    // Check if territory exists
    const territory = await prisma.$queryRaw`
      SELECT 
        id,
        name,
        difficulty_level,
        points_value,
        ST_Contains(
          boundary::geometry,
          ST_SetSRID(ST_MakePoint(${Number(lng)}, ${Number(lat)})::geometry, 4326)
        ) as is_within
      FROM territories
      WHERE id = ${parseInt(territoryId)}
    `;

    if (!territory || territory.length === 0) {
      return res.status(404).json({ error: 'Territory not found' });
    }

    if (!territory[0].is_within) {
      return res
        .status(400)
        .json({
          error: 'You must be within the territory boundaries to capture it',
        });
    }

    // Check if territory is already captured
    const activeCapture = await prisma.territoryCapture.findFirst({
      where: {
        territoryId: parseInt(territoryId),
        isActive: true,
      },
      include: {
        team: true,
      },
    });

    if (activeCapture) {
      if (activeCapture.teamId === userTeam.teamId) {
        return res
          .status(400)
          .json({ error: 'Your team already owns this territory' });
      }

      // Update previous capture as inactive
      await prisma.territoryCapture.update({
        where: { id: activeCapture.id },
        data: {
          isActive: false,
          lostAt: new Date(),
        },
      });
    }

    // Record user's location
    await prisma.$queryRaw`
      INSERT INTO user_locations (
        user_id,
        location,
        accuracy
      )
      VALUES (
        ${userId},
        ST_SetSRID(ST_MakePoint(${Number(lng)}, ${Number(lat)})::geometry, 4326),
        ${10.0} -- Default accuracy in meters
      )
    `;

    // Create new capture
    const capture = await prisma.territoryCapture.create({
      data: {
        territoryId: parseInt(territoryId),
        teamId: userTeam.teamId,
        capturedByUserId: userId,
        captureMethod: 'presence',
        pointsEarned: territory[0].points_value,
        isActive: true,
      },
      include: {
        territory: {
          select: {
            name: true,
            difficultyLevel: true,
            pointsValue: true,
          },
        },
        team: {
          select: {
            name: true,
            color: true,
          },
        },
        capturedBy: {
          select: {
            username: true,
          },
        },
      },
    });

    res.status(201).json({
      message: `Territory "${capture.territory.name}" captured successfully by team "${capture.team.name}"!`,
      capture,
    });
  } catch (error) {
    console.error('Capture territory error:', error);
    res.status(500).json({ error: 'Error capturing territory' });
  }
};

export const getTeamTerritories = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    const territories = await prisma.$queryRaw`
      SELECT 
        t.id,
        t.name,
        t.description,
        ST_AsGeoJSON(t.boundary)::json as boundary,
        ST_AsGeoJSON(t.center_point)::json as center_point,
        t.difficulty_level,
        t.points_value,
        tc.captured_at,
        tc.points_earned
      FROM territories t
      JOIN territory_captures tc ON t.id = tc.territory_id
      WHERE tc.team_id = ${parseInt(teamId)}
        AND tc.is_active = true
      ORDER BY tc.captured_at DESC
    `;

    const team = await prisma.team.findUnique({
      where: { id: parseInt(teamId) },
      select: {
        name: true,
        color: true,
        _count: {
          select: {
            captures: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({
      team: {
        ...team,
        totalTerritories: team._count.captures,
      },
      territories,
    });
  } catch (error) {
    console.error('Get team territories error:', error);
    res.status(500).json({ error: 'Error fetching team territories' });
  }
};
