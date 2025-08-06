import { Router } from 'express';
import * as validator from 'express-validator';
import * as teamsController from '../controllers/teams';
import { auth } from '../middleware/auth';

const { body } = validator;

const router = Router();

// All team routes require authentication
router.use(auth);

// Create team
router.post(
  '/',
  [
    body('name')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Team name must be at least 3 characters long'),
    body('description').optional().trim(),
    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex color (e.g., #FF0000)'),
  ],
  teamsController.createTeam
);

// Get all teams
router.get('/', teamsController.getTeams);

// Get team by ID
router.get('/:id', teamsController.getTeamById);

// Update team
router.put(
  '/:id',
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3 })
      .withMessage('Team name must be at least 3 characters long'),
    body('description').optional().trim(),
    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex color (e.g., #FF0000)'),
  ],
  teamsController.updateTeam
);

// Join team
router.post('/:id/join', teamsController.joinTeam);

export default router;
