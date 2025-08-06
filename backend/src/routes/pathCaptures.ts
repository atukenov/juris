import { Router } from 'express';
import { body } from 'express-validator';
import * as pathCapturesController from '../controllers/pathCaptures';
import { auth } from '../middleware/auth';

const router = Router();

// All capture routes require authentication
router.use(auth);

// Start a capture path
router.post(
  '/:territoryId/start-capture',
  [
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
  ],
  pathCapturesController.startCapturePath
);

// Add point to capture path
router.post(
  '/path/:pathId/point',
  [
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
  ],
  pathCapturesController.addPathPoint
);

// Complete capture path
router.post(
  '/path/:pathId/complete',
  pathCapturesController.completeCapturePath
);

// Get team's territories
router.get('/team/:teamId', async (req, res) => {
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
          tc.points_earned,
          cp.path_line as capture_path
        FROM territories t
        JOIN territory_captures tc ON t.id = tc.territory_id
        LEFT JOIN capture_paths cp ON t.id = cp.territory_id AND cp.is_completed = true
        WHERE tc.team_id = ${parseInt(teamId)}
          AND tc.is_active = true
        ORDER BY tc.captured_at DESC
      `;

    const team = await prisma.team.findUnique({
      where: { id: String(teamId) },
      include: {
        _count: {
          select: {
            captures: true,
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({
      team: {
        id: team.id,
        name: team.name,
        totalTerritories: team._count.captures,
      },
      territories,
    });
  } catch (error) {
    console.error('Get team territories error:', error);
    res.status(500).json({ error: 'Error fetching team territories' });
  }
});

export default router;
