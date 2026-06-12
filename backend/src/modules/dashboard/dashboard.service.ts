import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DashboardService {
  async getDashboardData(userId: string, teamId: string, role: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // THÊM: Lấy 3 thông báo mới nhất cho bảng Team Announcements
    const announcements = await prisma.notification.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    if (role === 'PLAYER') {
      // 1. Lấy dữ liệu cho Player
      const profile = await prisma.playerProfile.findUnique({ where: { userId } });
      const tasks = await prisma.task.findMany({
        where: { teamId, assignees: { some: { userId } } },
        take: 4,
        orderBy: { dueDate: 'asc' }
      });
      const schedule = await prisma.event.findMany({
        where: { teamId, date: { gte: today } },
        take: 4,
        orderBy: { date: 'asc' }
      });

      // Trả về announcements cho Player
      return { type: 'PLAYER', data: { profile, tasks, schedule, announcements } };
    } else {
      // 2. Lấy dữ liệu cho Coach
      const rosterCount = await prisma.user.count({ where: { teamId, role: 'PLAYER' } });
      const upcomingGames = await prisma.event.count({ where: { teamId, type: 'MATCH', date: { gte: today } } });
      const pendingTasks = await prisma.task.count({ where: { teamId, status: { not: 'DONE' } } });
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayEvents = await prisma.event.findMany({
        where: { teamId, date: { gte: today, lt: tomorrow } },
        orderBy: { date: 'asc' }
      });

      const roster = await prisma.user.findMany({
        where: { teamId, role: 'PLAYER' },
        include: { profile: true },
        take: 8
      });

      const completedMatches = await prisma.event.findMany({
        where: { teamId, type: 'MATCH', matchDetails: { isNot: null } },
        include: { matchDetails: true },
        orderBy: { date: 'asc' }
      });

      const matchesWithScores = completedMatches.filter(m => m.matchDetails && m.matchDetails.teamPoints !== null);
      let wins = 0;
      const performanceData: { week: string; rating: number }[] = [];

      matchesWithScores.forEach((m, idx) => {
        const teamPts = m.matchDetails!.teamPoints || 0;
        const oppPts = m.matchDetails!.opponentPoints || 0;
        if (teamPts > oppPts) wins++;

        const matchRating = 7.0 + ((teamPts - oppPts) * 0.1);
        performanceData.push({
          week: `M${idx + 1}`,
          rating: Number(Math.max(1, Math.min(10, matchRating)).toFixed(1))
        });
      });

      const totalMatches = matchesWithScores.length;
      const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

      // Trả về announcements cho Coach
      return { 
        type: 'COACH', 
        data: { 
          stats: { 
            rosterCount, 
            upcomingGames, 
            pendingTasks,
            winRate: totalMatches > 0 ? `${winRate}%` : 'N/A',
            winLoss: totalMatches > 0 ? `${wins}W ${totalMatches - wins}L` : 'Chưa có dữ liệu'
          }, 
          todayEvents, 
          roster,
          performanceData,
          announcements
        } 
      };
    }
  }
}