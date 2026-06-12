import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { StatisticsService } from './statistics.service';

const statsService = new StatisticsService();

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId;
    if (!teamId) {
      res.status(403).json({ message: 'Bạn chưa tham gia đội bóng nào' });
      return;
    }

    const data = await statsService.getTeamDashboardStats(teamId);
    res.status(200).json(data);
  } catch (error) {
    console.error('Failed to fetch statistics:', error);
    next(error); // Tối ưu: Đẩy lỗi về Error Middleware chung thay vì res.status(500) cứng
  }
};