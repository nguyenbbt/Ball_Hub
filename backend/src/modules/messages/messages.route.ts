import { Router, RequestHandler } from 'express';
import { getDirectMessages, getDirectThreads, getTeamMessages } from './messages.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware as RequestHandler);

router.get('/direct', getDirectThreads as RequestHandler);
router.get('/team/:teamId', getTeamMessages as RequestHandler);
router.get('/direct/:userId', getDirectMessages as RequestHandler);

export { router as messagesRouter };
