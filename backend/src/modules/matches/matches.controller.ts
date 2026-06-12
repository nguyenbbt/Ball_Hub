import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { MatchesService } from './matches.service';
import { NotificationsService } from '../notifications/notifications.service';

const prisma = new PrismaClient();
const matchesService = new MatchesService();
const notificationsService = new NotificationsService();

export const getMatches = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId;
    if (!teamId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // TỐI ƯU 1: Lấy query parameters cho phân trang
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // TỐI ƯU 2: Chạy song song truy vấn dữ liệu và đếm tổng
    const [matches, total] = await Promise.all([
      prisma.event.findMany({
        where: { teamId, type: 'MATCH' },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        // TỐI ƯU 3: Thay thế include bằng select để tránh fetch thừa dữ liệu
        select: {
          id: true,
          title: true,
          date: true,
          location: true,
          matchDetails: {
            select: {
              id: true,
              opponent: true,
              isHome: true,
              matchType: true,
              teamPoints: true,
              opponentPoints: true
            }
          }
        },
      }),
      prisma.event.count({ where: { teamId, type: 'MATCH' } })
    ]);

    // Trả về cấu trúc có chuẩn pagination
    res.json({
      data: matches,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }); 
  } catch (error) {
    console.error('Failed to fetch matches', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const saveMatchStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId;
    const { id } = req.params; 
    const { stats, opponentPoints } = req.body as {
      stats: Record<string, { pts: number; reb: number; ast: number }>;
      opponentPoints?: number;
    };

    if (!teamId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const result = await matchesService.updateMatchStats({
      eventId: id,
      stats,
      opponentPoints,
    });

    await notificationsService.createNotification(
      teamId, 
      'Kết quả trận đấu', 
      'Huấn luyện viên vừa cập nhật kết quả và chỉ số cá nhân của trận đấu.', 
      'MATCH'
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'Match not found') {
      res.status(404).json({ message: 'Match not found' });
      return;
    }

    console.error('Failed to save match stats', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};