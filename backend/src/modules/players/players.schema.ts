import { z } from 'zod';

export const upsertProfileSchema = z.object({
  body: z.object({
    position: z.enum(['PG', 'SG', 'SF', 'PF', 'C'], { errorMap: () => ({ message: 'Vị trí không hợp lệ' }) }).optional(),
    jerseyNumber: z.coerce.number().int().min(0).max(99).optional(),
    height: z.string().optional(),
    weight: z.string().optional(),
    age: z.coerce.number().int().min(10).max(60).optional(),
  }),
});

export const updatePlayerProfileSchema = z.object({
  params: z.object({
    id: z.string().length(24, 'ID cầu thủ không hợp lệ'), // Chuẩn ID của MongoDB
  }),
  body: upsertProfileSchema.shape.body, // Tái sử dụng lại schema xác thực body ở trên cho ngắn gọn
});