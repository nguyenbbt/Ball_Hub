import { Router } from 'express';
import { updateProfile, uploadAvatar } from './users.controller';
import { authMiddleware } from '../../middlewares/auth.middleware'; // Đảm bảo import đúng tên middleware check token của bạn
import { avatarUpload } from '../../middlewares/upload.middleware';

const router = Router();

// API cần bảo vệ bằng token
router.put('/profile', authMiddleware, updateProfile);
router.post('/avatar', authMiddleware, avatarUpload.single('avatar'), uploadAvatar);

export { router as usersRouter };