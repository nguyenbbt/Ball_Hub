import { Router, RequestHandler } from 'express';
import { getNotifications, createNotification, markRead, markAllRead } from './notifications.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

export const notificationsRouter = Router();

notificationsRouter.use(authMiddleware as RequestHandler);
notificationsRouter.get('/team/:teamId', getNotifications as RequestHandler);
notificationsRouter.post('/', createNotification as RequestHandler);
notificationsRouter.put('/:id/read', markRead as RequestHandler);
notificationsRouter.put('/team/:teamId/read-all', markAllRead as RequestHandler);