import { Router } from 'express';
import * as validator from 'express-validator';
import { auth } from '../middleware/auth';
import {
  captureTerritory,
  getActiveCaptures,
  getCaptureHistory,
  releaseTerritoryCapture,
} from '../controllers/captures';

const router = Router();

// Middleware для аутентификации на всех маршрутах
router.use(auth);

// POST /api/captures - Захват территории командой
router.post(
  '/',
  [
    validator
      .body('territoryId')
      .isInt({ min: 1 })
      .withMessage('Territory ID must be a positive integer'),
    validator
      .body('teamId')
      .isInt({ min: 1 })
      .withMessage('Team ID must be a positive integer'),
    validator
      .body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    validator
      .body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    validator
      .body('captureMethod')
      .optional()
      .isIn(['presence', 'challenge', 'event'])
      .withMessage('Capture method must be one of: presence, challenge, event'),
  ],
  captureTerritory
);

// GET /api/captures/active - Получить все активные захваты
router.get('/active', getActiveCaptures);

// GET /api/captures/history - Получить историю захватов с фильтрами
router.get(
  '/history',
  [
    validator
      .query('territoryId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Territory ID must be a positive integer'),
    validator
      .query('teamId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Team ID must be a positive integer'),
    validator
      .query('userId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('User ID must be a positive integer'),
    validator
      .query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    validator
      .query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
  ],
  getCaptureHistory
);

// DELETE /api/captures/:id - Освобождение захвата территории
router.delete(
  '/:id',
  [
    validator
      .param('id')
      .isInt({ min: 1 })
      .withMessage('Capture ID must be a positive integer'),
  ],
  releaseTerritoryCapture
);

export default router;
