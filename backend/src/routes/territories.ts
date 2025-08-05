import { Router } from 'express';
import { body, query } from 'express-validator';
import * as territoriesController from '../controllers/territories';
import { auth } from '../middleware/auth';

const router = Router();

// All territory routes require authentication
router.use(auth);

// Create territory
router.post(
  '/',
  [
    body('name')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Territory name must be at least 3 characters long'),
    body('description').optional().trim(),
    body('boundary')
      .isObject()
      .withMessage('Boundary must be a valid GeoJSON polygon'),
    body('centerPoint')
      .isObject()
      .withMessage('Center point must be a valid GeoJSON point'),
    body('difficultyLevel')
      .isInt({ min: 1, max: 5 })
      .withMessage('Difficulty level must be between 1 and 5'),
    body('pointsValue')
      .isInt({ min: 0 })
      .withMessage('Points value must be a positive number'),
  ],
  territoriesController.createTerritory
);

// Get all territories
router.get('/', territoriesController.getTerritories);

// Get territory by ID
router.get('/:id', territoriesController.getTerritoryById);

// Get nearby territories
router.get(
  '/nearby',
  [
    query('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    query('lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    query('radius')
      .optional()
      .isInt({ min: 1, max: 5000 })
      .withMessage('Radius must be between 1 and 5000 meters'),
  ],
  territoriesController.getNearbyTerritories
);

export default router;
