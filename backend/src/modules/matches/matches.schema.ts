import { z } from 'zod';

export const updateMatchStatsSchema = z.object({
  body: z.object({
    opponentPoints: z.coerce.number().min(0, 'Điểm không được âm').optional().default(0),
    stats: z.record(
      z.string(), // Key là userId
      z.object({
        pts: z.number().min(0),
        reb: z.number().min(0),
        ast: z.number().min(0),
      })
    ),
  }),
  params: z.object({
    id: z.string().min(1, 'Match ID is required'),
  }),
});