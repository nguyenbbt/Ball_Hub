import { PrismaClient, TeamStatus } from '@prisma/client';

export class TeamsService {
  private prisma = new PrismaClient();

  async createTeam(coachId: string, name: string) {
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    return this.prisma.team.create({
      data: {
        name,
        inviteCode,
        status: 'PENDING',
        members: {
          connect: { id: coachId }
        }
      },
      select: { id: true, name: true, inviteCode: true, status: true }
    });
  }

  async getPendingTeams(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [teams, total] = await Promise.all([
      this.prisma.team.findMany({
        where: { status: 'PENDING' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          createdAt: true,
          members: {
            where: { role: 'COACH' },
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      }),
      this.prisma.team.count({ where: { status: 'PENDING' } })
    ]);

    return {
      data: teams,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async updateTeamStatus(teamId: string, status: TeamStatus) {
    const result = await this.prisma.team.update({
      where: { id: teamId },
      data: { status },
      select: { id: true, name: true, status: true }
    });

    if (!result) throw new Error('Không tìm thấy đội bóng.');
    return result;
  }

  async joinTeam(playerId: string, inviteCode: string) {
    const team = await this.prisma.team.findUnique({ 
      where: { inviteCode },
      select: { id: true, status: true }
    });

    if (!team) throw new Error('Mã mời không tồn tại hoặc đã hết hạn.');

    const user = await this.prisma.user.findUnique({ 
      where: { id: playerId },
      select: { teamId: true }
    });

    if (user?.teamId === team.id) throw new Error('Bạn đã là thành viên của đội bóng này.');

    await this.prisma.user.update({
      where: { id: playerId },
      data: { teamId: team.id },
      select: { id: true }
    });

    return { message: 'Tham gia đội bóng thành công!', teamId: team.id, teamStatus: team.status };
  }

  // TỐI ƯU HIỆU SUẤT: Nhận thẳng teamId thay vì userId
  async getRoster(teamId: string) {
    // TỐI ƯU HIỆU SUẤT: Bẻ gãy Nested Query, chạy lấy thông tin Team và Members song song
    let [team, members] = await Promise.all([
      this.prisma.team.findUnique({
        where: { id: teamId },
        select: { id: true, name: true, inviteCode: true }
      }),
      this.prisma.user.findMany({
        where: { teamId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          avatarUrl: true,
          profile: {
            select: {
              id: true,
              jerseyNumber: true,
              position: true,
              status: true,
              rating: true,
              matchesPlayed: true,
              pointsPerGame: true,
              reboundsPerGame: true,
              assistsPerGame: true,
              age: true,
              height: true,
              weight: true,
              nationality: true
            }
          }
        }
      })
    ]);

    if (!team) return { team: null, coach: null, players: [] };

    if (!team.inviteCode) {
      const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      team = await this.prisma.team.update({
        where: { id: team.id },
        data: { inviteCode: newCode },
        select: { id: true, name: true, inviteCode: true }
      });
    }

    const coach = members.find(m => m.role === 'COACH') || null;
    const rawPlayers = members.filter(m => m.role === 'PLAYER');

    const players = rawPlayers.map(player => {
      const profile = player.profile || {} as any;
      const pts = profile.pointsPerGame || 0;
      const reb = profile.reboundsPerGame || 0;
      const ast = profile.assistsPerGame || 0;

      let calculatedRating = profile.rating || 0;
      
      if (calculatedRating === 0 && (pts > 0 || reb > 0 || ast > 0)) {
        calculatedRating = Math.min(10, (pts + reb * 1.2 + ast * 1.5) / 2.5);
      }

      return {
        ...player,
        profile: {
          ...profile,
          rating: calculatedRating
        }
      };
    });

    return {
      team,
      coach,
      players,
    };
  }
}