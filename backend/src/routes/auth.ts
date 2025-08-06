import { Router } from 'express';
import * as validator from 'express-validator';
import * as authController from '../controllers/auth';

const { body } = validator;

const router = Router();

router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters long'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email address'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('First name must be at least 2 characters long'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Last name must be at least 2 characters long'),
  ],
  authController.register
);

router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email address'),
    body('password').exists().withMessage('Password is required'),
  ],
  authController.login
);

export default router;
