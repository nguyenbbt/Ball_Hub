import { Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { AuthRequest } from '../../middlewares/auth.middleware'; // Import từ gốc
import { cloudinary } from '../../config/cloudinary';

const usersService = new UsersService();

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id; 
    const role = req.user?.role;
    const teamId = req.user?.teamId ?? null;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (role !== 'ADMIN' && !teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const updatedUser = await usersService.updateProfile(userId, req.body);
    res.json({ message: 'Cập nhật thành công', user: updatedUser });
  } catch (err) {
    next(err);
  }
};

export const uploadAvatar = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const teamId = req.user?.teamId ?? null;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (role !== 'ADMIN' && !teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    if (!req.file?.buffer) {
      res.status(400).json({ message: 'Vui lòng chọn ảnh để tải lên.' });
      return;
    }

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'ballhub/avatars',
          resource_type: 'image',
          public_id: `user_${userId}_${Date.now()}`,
          overwrite: true,
          transformation: [
            { width: 512, height: 512, crop: 'fill', gravity: 'face', quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (error, uploadResult) => {
          if (error || !uploadResult?.secure_url) {
            reject(error ?? new Error('Upload avatar thất bại.'));
            return;
          }
          resolve({ secure_url: uploadResult.secure_url });
        }
      );

      stream.end(req.file!.buffer);
    });

    res.json({ message: 'Upload avatar thành công', avatarUrl: result.secure_url });
  } catch (err) {
    next(err);
  }
};