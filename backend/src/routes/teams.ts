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
      .custom((value) => {
        if (value && !teamsController.TEAM_COLORS.includes(value)) {
          throw new Error(
            'Invalid color. Must be one of the predefined colors.'
          );
        }
        return true;
      }),
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
      .custom((value) => {
        if (value && !teamsController.TEAM_COLORS.includes(value)) {
          throw new Error(
            'Invalid color. Must be one of the predefined colors.'
          );
        }
        return true;
      }),
  ],
  teamsController.updateTeam
);

// Delete team
router.delete('/:id', teamsController.deleteTeam);

// Join team
router.post('/:id/join', teamsController.joinTeam);

// Leave team
router.post('/:id/leave', teamsController.leaveTeam);

// Get available team colors
router.get('/colors/available', teamsController.getAvailableColors);

// Get pending ownership transfers
router.get('/transfers/pending', teamsController.getPendingTransfers);

// Transfer ownership
router.post(
  '/:id/transfer-ownership',
  [
    body('newOwnerId')
      .isInt({ min: 1 })
      .withMessage('New owner ID must be a positive integer'),
  ],
  teamsController.transferOwnership
);

// Accept ownership transfer
router.post('/transfers/:transferId/accept', teamsController.acceptOwnership);

// Reject ownership transfer
router.post('/transfers/:transferId/reject', teamsController.rejectOwnership);

export default router;
