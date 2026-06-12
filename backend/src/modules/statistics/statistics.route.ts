import { Router, RequestHandler } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { getDashboardStats } from './statistics.controller';

export const statisticsRouter = Router();

statisticsRouter.use(authMiddleware as RequestHandler);
statisticsRouter.get('/dashboard', getDashboardStats as RequestHandler);