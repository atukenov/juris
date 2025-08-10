import { Router } from 'express';
import { auth } from '../middleware/auth';
import * as gamificationController from '../controllers/gamification';

const router = Router();

router.use(auth);

router.get('/level', gamificationController.getUserLevel);

router.get('/achievements', gamificationController.getUserAchievements);

router.get('/rankings', gamificationController.getRankings);

router.get('/challenges', gamificationController.getUserChallenges);

router.get('/stats', gamificationController.getUserStats);

export default router;
