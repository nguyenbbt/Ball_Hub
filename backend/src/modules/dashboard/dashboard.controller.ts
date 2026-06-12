import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { DashboardService } from './dashboard.service';

const dashboardService = new DashboardService();

export const getDashboardInfo = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const teamId = req.user?.teamId;
    const role = req.user?.role;

    if (!userId || !teamId || !role) {
      res.status(403).json({ message: 'Không thể truy cập dữ liệu Dashboard.' });
      return;
    }

    const result = await dashboardService.getDashboardData(userId, teamId, role);
    res.json(result);
  } catch (err) {
    next(err);
  }
};