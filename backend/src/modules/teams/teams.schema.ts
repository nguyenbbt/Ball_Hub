import { z } from 'zod';

export const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Tên đội bóng không được để trống'),
  }),
});

export const updateTeamStatusSchema = z.object({
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
  }),
});

export const joinTeamSchema = z.object({
  body: z.object({
    inviteCode: z.string().min(6, 'Mã mời không hợp lệ'),
  }),
});