import { PrismaClient } from '@prisma/client';

interface MatchPerformance {
  match: string;
  pts: number;
  oppPts: number;
  rebounds: number;
  assists: number;
}

export class StatisticsService {
  private prisma = new PrismaClient();

  async getTeamDashboardStats(teamId: string) {
    // TỐI ƯU 1: Chạy song song truy vấn lấy Trận đấu và Cầu thủ
    const [events, players] = await Promise.all([
      // Truy vấn 1: Lấy các trận đấu
      this.prisma.event.findMany({
        where: { 
          teamId, 
          type: 'MATCH',
          matchDetails: { isNot: null }
        },
        orderBy: { date: 'asc' },
        // TỐI ƯU 2: Ngăn over-fetching, chỉ lấy ngày và thông số kỹ thuật
        select: {
          date: true,
          matchDetails: {
            select: {
              teamPoints: true,
              opponentPoints: true,
              rebounds: true,
              assists: true
            }
          }
        }
      }),

      // Truy vấn 2: Lấy dữ liệu profile của cầu thủ
      this.prisma.user.findMany({
        where: { 
          teamId, 
          role: 'PLAYER',
          // TỐI ƯU 3: Đẩy bộ lọc "cầu thủ đã thi đấu" xuống thẳng DB
          profile: { matchesPlayed: { gt: 0 } }
        },
        // TỐI ƯU 4: Lấy tối thiểu các fields cần thiết để tính toán xếp hạng
        select: {
          firstName: true,
          lastName: true,
          profile: {
            select: {
              pointsPerGame: true,
              reboundsPerGame: true,
              assistsPerGame: true
            }
          }
        }
      })
    ]);

    // Lọc lại các trận đã có teamPoints (để đảm bảo tính toàn vẹn)
    const completedMatches = events.filter(e => e.matchDetails && e.matchDetails.teamPoints !== null);
    
    let totalWins = 0, totalLosses = 0;
    let totalPts = 0, totalOppPts = 0;
    let totalReb = 0, totalAst = 0;

    const monthlyMap: Record<string, { wins: number; losses: number }> = {};
    const matchPerformance: MatchPerformance[] = [];

    // Tính toán thống kê từ các trận đấu
    completedMatches.forEach((event, index) => {
      const match = event.matchDetails!;
      const tPts = match.teamPoints || 0;
      const oPts = match.opponentPoints || 0;
      const isWin = tPts > oPts;
      
      if (isWin) totalWins++; else totalLosses++;
      totalPts += tPts;
      totalOppPts += oPts;
      totalReb += (match.rebounds || 0);
      totalAst += (match.assists || 0);

      // Nhóm theo tháng
      const month = new Date(event.date).toLocaleString('en-US', { month: 'short' });
      if (!monthlyMap[month]) monthlyMap[month] = { wins: 0, losses: 0 };
      if (isWin) monthlyMap[month].wins++; else monthlyMap[month].losses++;

      // Dữ liệu biểu đồ từng trận
      matchPerformance.push({
        match: `M${index + 1}`,
        pts: tPts,
        oppPts: oPts,
        rebounds: match.rebounds || 0,
        assists: match.assists || 0,
      });
    });

    const totalGames = completedMatches.length || 1;
    const ppg = totalPts / totalGames;
    const oppPpg = totalOppPts / totalGames;
    const winRate = completedMatches.length ? Math.round((totalWins / totalGames) * 100) : 0;

    const monthlyTrend = Object.keys(monthlyMap).map(month => ({
      month,
      wins: monthlyMap[month].wins,
      losses: monthlyMap[month].losses
    }));

    const COLORS = ['#1d4ed8', '#0891b2', '#16a34a', '#ea580c', '#dc2626', '#7c3aed'];
    
    // Xếp hạng cầu thủ (Đã loại bỏ filter matchesPlayed > 0 vì đã thực hiện ở DB)
    const playerRatings = players
      .map((p, i) => {
        const prof = p.profile!;
        const rating = ((prof.pointsPerGame + prof.reboundsPerGame + prof.assistsPerGame) / 3).toFixed(1);
        
        return {
          name: `${p.firstName} ${p.lastName}`.trim() || 'Player',
          initials: p.firstName?.charAt(0).toUpperCase() || 'P',
          rating: Number(rating),
          color: COLORS[i % COLORS.length]
        };
      })
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

    const radarData = [
      { stat: 'Scoring', value: Math.min(100, Math.round((ppg / 100) * 100)) },
      { stat: 'Defense', value: Math.min(100, Math.round(100 - (oppPpg / 100 * 80))) },
      { stat: 'Rebounding', value: Math.min(100, Math.round((totalReb / totalGames / 50) * 100)) },
      { stat: 'Playmaking', value: Math.min(100, Math.round((totalAst / totalGames / 30) * 100)) },
    ];

    return {
      summary: {
        totalGames: completedMatches.length,
        ppg: ppg.toFixed(1),
        oppPpg: oppPpg.toFixed(1),
        rpg: (totalReb / totalGames).toFixed(1),
        winRate: `${winRate}%`
      },
      matchPerformance,
      monthlyTrend,
      playerRatings,
      radarData
    };
  }
}