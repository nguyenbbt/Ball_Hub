import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { NotificationsService } from './notifications.service';

const notificationsService = new NotificationsService();

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { teamId } = req.params;
    const notifications = await notificationsService.getTeamNotifications(teamId);
    res.json(notifications);
  } catch (err) { next(err); }
};

export const createNotification = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { teamId, title, message, type } = req.body;
    const notification = await notificationsService.createNotification(teamId, title, message, type);
    res.status(201).json(notification);
  } catch (err) { next(err); }
};

export const markRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    await notificationsService.markAsRead(id, userId);
    res.json({ success: true });
  } catch (err) { next(err); }
};

export const markAllRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { teamId } = req.params;
    const userId = req.user!.id;
    await notificationsService.markAllAsRead(teamId, userId);
    res.json({ success: true });
  } catch (err) { next(err); }
};