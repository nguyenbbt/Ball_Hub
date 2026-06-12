import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { NotificationsService } from '../notifications/notifications.service';
import { InventoryService } from './inventory.service';

const notificationsService = new NotificationsService();
const inventoryService = new InventoryService();

export const getInventory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId ?? null;
    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    // Lấy query params cho phân trang
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await inventoryService.getInventory(teamId, page, limit);
    res.status(200).json(result);
  } catch (error) {
    next(error); // TỐI ƯU: Bàn giao lỗi cho Global Error Middleware
  }
};

export const createItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId ?? null;
    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const created = await inventoryService.createItem(teamId, req.body);

    // Bắn thông báo không cần block the main thread
    notificationsService.createNotification(
      teamId, 
      'Kho thiết bị', 
      `Vật dụng mới đã được thêm vào kho: ${created.name} (SL: ${created.quantity})`, 
      'SYSTEM'
    ).catch(err => console.error('Failed to create notification', err));

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

export const updateItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId ?? null;
    const { id } = req.params;

    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const updated = await inventoryService.updateItem(teamId, id, req.body);

    if (!updated) {
      res.status(404).json({ message: 'Không tìm thấy vật dụng hoặc bạn không có quyền sửa.' });
      return;
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId ?? null;
    const { id } = req.params;

    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const deleted = await inventoryService.deleteItem(teamId, id);

    if (!deleted) {
      res.status(404).json({ message: 'Không tìm thấy vật dụng hoặc bạn không có quyền xóa.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Xóa vật dụng thành công.' });
  } catch (error) {
    next(error);
  }
};