import { PrismaClient } from '@prisma/client';

type MatchStatInput = {
  pts: number;
  reb: number;
  ast: number;
};

type MatchStatsMap = Record<string, MatchStatInput>;

type UpdateMatchStatsParams = {
  eventId: string;
  stats: MatchStatsMap;
  opponentPoints?: number;
};

export class MatchesService {
  private prisma = new PrismaClient();

  async updateMatchStats({ eventId, stats, opponentPoints }: UpdateMatchStatsParams) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // TỐI ƯU: Select trực tiếp thay vì load toàn bộ bảng match
        let match = await tx.match.findUnique({ 
          where: { eventId },
          select: { id: true }
        });
        
        if (!match) {
          match = await tx.match.create({
            data: {
              eventId,
              opponent: 'Unknown',
              matchType: 'league',
              teamPoints: 0,
              opponentPoints: Number(opponentPoints) || 0,
              rebounds: 0,
              assists: 0,
            },
            select: { id: true }
          });
        }

        const statEntries = Object.entries(stats);
        const userIds = statEntries.map(([userId]) => userId);

        const [existingStats, existingProfiles] = await Promise.all([
          tx.playerMatchStat.findMany({
            where: {
              matchId: match.id,
              userId: { in: userIds },
            },
            select: { id: true, userId: true, points: true, rebounds: true, assists: true }
          }),
          tx.playerProfile.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, matchesPlayed: true, pointsPerGame: true, reboundsPerGame: true, assistsPerGame: true }
          }),
        ]);

        const existingStatsMap = new Map(existingStats.map(s => [s.userId, s]));
        const existingProfilesMap = new Map(existingProfiles.map(p => [p.userId, p]));

        let teamRebounds = 0;
        let teamAssists = 0;
        let teamPoints = 0;

        // Mảng chứa tất cả các truy vấn DB cần thực thi song song
        const dbOperations: Promise<any>[] = []; 

        for (const [userId, data] of statEntries) {
          const currentStat = existingStatsMap.get(userId);
          const hadStat = !!currentStat;

          const previousPoints = currentStat?.points ?? 0;
          const previousRebounds = currentStat?.rebounds ?? 0;
          const previousAssists = currentStat?.assists ?? 0;

          teamPoints += data.pts;
          teamRebounds += data.reb;
          teamAssists += data.ast;

          // TỐI ƯU: Không await tuần tự trong vòng lặp, push vào mảng operations
          if (currentStat) {
            dbOperations.push(
              tx.playerMatchStat.update({
                where: { id: currentStat.id },
                data: {
                  points: data.pts,
                  rebounds: data.reb,
                  assists: data.ast,
                },
              })
            );
          } else {
            dbOperations.push(
              tx.playerMatchStat.create({
                data: {
                  matchId: match.id,
                  userId,
                  points: data.pts,
                  rebounds: data.reb,
                  assists: data.ast,
                },
              })
            );
          }

          const profile = existingProfilesMap.get(userId);
          const currentMatchesPlayed = profile?.matchesPlayed ?? 0;
          const currentPointsTotal = (profile?.pointsPerGame ?? 0) * currentMatchesPlayed;
          const currentReboundsTotal = (profile?.reboundsPerGame ?? 0) * currentMatchesPlayed;
          const currentAssistsTotal = (profile?.assistsPerGame ?? 0) * currentMatchesPlayed;

          const nextMatchesPlayed = hadStat ? currentMatchesPlayed : currentMatchesPlayed + 1;
          const nextPointsTotal = currentPointsTotal - (hadStat ? previousPoints : 0) + data.pts;
          const nextReboundsTotal = currentReboundsTotal - (hadStat ? previousRebounds : 0) + data.reb;
          const nextAssistsTotal = currentAssistsTotal - (hadStat ? previousAssists : 0) + data.ast;

          const pointsPerGame = nextMatchesPlayed > 0 ? nextPointsTotal / nextMatchesPlayed : 0;
          const reboundsPerGame = nextMatchesPlayed > 0 ? nextReboundsTotal / nextMatchesPlayed : 0;
          const assistsPerGame = nextMatchesPlayed > 0 ? nextAssistsTotal / nextMatchesPlayed : 0;

          dbOperations.push(
            tx.playerProfile.upsert({
              where: { userId },
              create: {
                userId,
                matchesPlayed: Math.max(nextMatchesPlayed, 1),
                pointsPerGame,
                reboundsPerGame,
                assistsPerGame,
              },
              update: {
                matchesPlayed: nextMatchesPlayed,
                pointsPerGame,
                reboundsPerGame,
                assistsPerGame,
              },
            })
          );
        }

        // Cập nhật chỉ số toàn đội
        dbOperations.push(
          tx.match.update({
            where: { id: match.id },
            data: {
              teamPoints,
              opponentPoints: Number(opponentPoints) || 0,
              rebounds: teamRebounds,
              assists: teamAssists,
            },
          })
        );

        // TỐI ƯU THỰC THI: Chạy tất cả các lệnh update/insert/upsert cùng lúc
        await Promise.all(dbOperations);

        return { message: 'Stats saved successfully' };
      });
    } catch (error) {
      console.error('Error in MatchesService.updateMatchStats:', error);
      throw new Error('Transaction failed');
    }
  }
}