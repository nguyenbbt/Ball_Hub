import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email('Email không đúng định dạng'),
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
    // ĐIỂM SỬA CHỮA: Đã xóa trường inviteCode khỏi Zod schema
    role: z.enum(['COACH', 'PLAYER', 'coach', 'player']), 
  }).refine((data) => data.name || (data.firstName && data.lastName), {
    message: "Vui lòng cung cấp họ tên",
    path: ["name"],
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email không đúng định dạng'),
    password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  }),
});