import { Router, RequestHandler } from 'express';
import { getMyProfile, upsertProfile, updatePlayerProfileByCoach } from './players.controller';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { updatePlayerProfileSchema, upsertProfileSchema } from './players.schema';

export const playersRouter = Router();

playersRouter.use(authMiddleware as RequestHandler);

// ĐÃ SỬA: Chặn không cho Coach tự lấy/tạo Profile của chính mình
playersRouter.get('/me', requireRole(['PLAYER']) as RequestHandler, getMyProfile as RequestHandler);

playersRouter.put(
  '/profile', 
  requireRole(['PLAYER']) as RequestHandler, // ĐÃ SỬA: Chỉ Player mới được tự upsert
  validate(upsertProfileSchema), 
  upsertProfile as RequestHandler
);

// (Giữ nguyên) Chỉ Coach mới được sửa profile của người khác bằng params ID
playersRouter.put(
  '/:id/profile', 
  requireRole(['COACH']) as RequestHandler, 
  validate(updatePlayerProfileSchema), 
  updatePlayerProfileByCoach as RequestHandler
);