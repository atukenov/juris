import { Router } from 'express';
import * as validator from 'express-validator';
import { auth } from '../middleware/auth';
import * as chatController from '../controllers/chat';

const { body, param, query } = validator;
const router = Router();

router.use(auth);

router.get('/messages', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
], chatController.getTeamMessages);

router.post('/messages', [
  body('message').trim().isLength({ min: 1, max: 500 })
], chatController.sendMessage);

router.post('/messages/:messageId/reactions', [
  param('messageId').isInt({ min: 1 }),
  body('emoji').isIn(['👍', '❤️', '😂', '😮', '😢', '😡'])
], chatController.addReaction);

export default router;
