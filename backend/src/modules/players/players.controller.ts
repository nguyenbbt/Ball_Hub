import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../middlewares/auth.middleware';

const prisma = new PrismaClient();

// 1. Lấy thông tin cá nhân (Dành cho Player tự xem)
export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    
    res.json({ hasProfile: !!profile, profile });
  } catch (error) {
    console.error('Failed to get profile', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// 2. Tạo hoặc cập nhật profile (Dành cho Player tự cập nhật lúc Onboarding)
export const upsertProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const { position, jerseyNumber, height, weight, age } = req.body;

    const profile = await prisma.playerProfile.upsert({
      where: { userId },
      update: { position, jerseyNumber, height, weight, age },
      create: { userId, position, jerseyNumber, height, weight, age }
    });

    res.json({ message: 'Cập nhật hồ sơ thành công', profile });
  } catch (error) {
    console.error('Failed to upsert profile', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// 3. Huấn luyện viên (Coach) cập nhật thông tin cho cầu thủ
export const updatePlayerProfileByCoach = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const coachId = req.user?.id;
    if (!coachId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const { id: playerId } = req.params;
    const { position, jerseyNumber, height, weight, age } = req.body;

    // Kiểm tra Coach có team không
    const coach = await prisma.user.findUnique({ where: { id: coachId } });
    if (!coach?.teamId) { res.status(403).json({ message: 'Forbidden: Coach has no team.' }); return; }

    // Đảm bảo cầu thủ tồn tại và CÙNG ĐỘI với Coach (Tính năng bảo mật rất tốt của bạn)
    const player = await prisma.user.findUnique({ where: { id: playerId } });
    if (!player || player.teamId !== coach.teamId) {
      res.status(404).json({ message: 'Không tìm thấy cầu thủ trong đội của bạn.' });
      return;
    }

    const profile = await prisma.playerProfile.upsert({
      where: { userId: playerId },
      update: { position, jerseyNumber, height, weight, age },
      create: { userId: playerId, position, jerseyNumber, height, weight, age }
    });

    res.json({ message: 'Huấn luyện viên cập nhật hồ sơ cầu thủ thành công', profile });
  } catch (error) {
    console.error('Failed to update player profile by coach', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

