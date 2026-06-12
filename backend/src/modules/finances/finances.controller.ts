import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { FinancesService } from './finances.service';

const financesService = new FinancesService();

export const getTransactions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId;
    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await financesService.getTransactions(teamId, page, limit);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const createTransaction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId;
    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const created = await financesService.createTransaction(teamId, req.body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

export const updateTransaction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId;
    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const { id } = req.params;
    const updated = await financesService.updateTransaction(teamId, id, req.body);

    if (!updated) {
      res.status(404).json({ message: 'Không tìm thấy giao dịch hoặc bạn không có quyền sửa.' });
      return;
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId;
    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const { id } = req.params;
    const deleted = await financesService.deleteTransaction(teamId, id);

    if (!deleted) {
      res.status(404).json({ message: 'Không tìm thấy giao dịch hoặc bạn không có quyền xóa.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Xóa giao dịch thành công.' });
  } catch (error) {
    next(error);
  }
};