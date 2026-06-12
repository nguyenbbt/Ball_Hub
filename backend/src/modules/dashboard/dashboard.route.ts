import { Router, RequestHandler } from 'express';
import { getDashboardInfo } from './dashboard.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

export const dashboardRouter = Router();

dashboardRouter.use(authMiddleware as RequestHandler);
dashboardRouter.get('/', getDashboardInfo as RequestHandler);