import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { NotificationsService } from '../notifications/notifications.service';
import { TasksService } from './tasks.service';

const notificationsService = new NotificationsService();
const tasksService = new TasksService();

export const getTasks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId;
    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    // Lấy query parameters cho phân trang
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await tasksService.getTasks(teamId, page, limit);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId;
    const creatorId = req.user?.id;
    
    if (!teamId || !creatorId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const task = await tasksService.createTask(teamId, creatorId, req.body);

    // TỐI ƯU 3: Bỏ chữ await, dùng catch để handle lỗi ngầm. Không block the main thread.
    notificationsService.createNotification(
      teamId, 
      'Nhiệm vụ mới', 
      `HLV vừa giao nhiệm vụ: "${task.title}". Hãy kiểm tra chi tiết!`, 
      'TASK'
    ).catch(err => console.error('Failed to send task notification', err));

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

export const updateTaskStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId;
    const { id } = req.params;
    const { status } = req.body;

    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const updated = await tasksService.updateTaskStatus(teamId, id, status);

    if (!updated) {
      res.status(404).json({ message: 'Không tìm thấy nhiệm vụ hoặc bạn không có quyền sửa.' });
      return;
    }

    // TỐI ƯU 3: Bỏ chữ await, chạy ngầm notification
    notificationsService.createNotification(
      teamId, 
      'Cập nhật tiến độ', 
      `Nhiệm vụ "${updated.title}" đã chuyển sang trạng thái: ${updated.status}`, 
      'TASK'
    ).catch(err => console.error('Failed to send status update notification', err));

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId;
    const { id } = req.params;

    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const deleted = await tasksService.deleteTask(teamId, id);

    if (!deleted) {
      res.status(404).json({ message: 'Không tìm thấy nhiệm vụ hoặc bạn không có quyền xóa.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Xóa nhiệm vụ thành công' });
  } catch (error) {
    next(error);
  }
};