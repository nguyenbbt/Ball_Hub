import { getDb } from '../../config/db';
import { ObjectId } from 'mongodb';

export class UsersService {
  async updateProfile(userId: string, updateData: any) {
    const db = getDb();
    
    // Loại bỏ các trường nhạy cảm không cho phép user tự ý sửa
    const { password, email, role, _id, createdAt, updatedAt, ...safeData } = updateData;

    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { ...safeData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) throw new Error('Không tìm thấy người dùng.');
    
    // Xóa password trước khi trả về frontend
    const { password: _, ...userWithoutPassword } = result;
    return userWithoutPassword;
  }
}