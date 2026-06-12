import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const normalizeRole = (role: string): Role => role.toUpperCase() as Role;

export class AuthService {
  // ĐIỂM SỬA CHỮA: Bỏ inviteCode khỏi tham số truyền vào
  async register(data: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    password: string;
    role: string;
  }) {
    let firstName = data.firstName || '';
    let lastName = data.lastName || '';
    
    if (data.name && !data.firstName && !data.lastName) {
      const nameParts = data.name.trim().split(' ');
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
    }

    const existingUser = await prisma.user.findUnique({ 
      where: { email: data.email } 
    });
    
    if (existingUser) {
      throw new Error('Email này đã được đăng ký.');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);
    const normalizedRole = normalizeRole(data.role);

    // ĐIỂM SỬA CHỮA: Xóa logic kiểm tra và gán teamId qua inviteCode ở đây
    
    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: passwordHash,
        firstName: firstName || 'Người dùng',
        lastName: lastName,
        role: normalizedRole,
        // teamId mặc định sẽ tự động là null
      }
    });
    
    const token = this.generateToken(newUser.id, newUser.role, newUser.teamId);

    return {
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        teamId: newUser.teamId,
        teamStatus: null,
      },
      token,
    };
  }

  async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({ 
      where: { email: data.email } 
    });

    if (!user) {
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    const isPasswordMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordMatch) {
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    const teamStatus = user.teamId
      ? await prisma.team
          .findUnique({ where: { id: user.teamId } })
          .then((team) => team?.status ?? null)
      : null;

    const token = this.generateToken(user.id, user.role, user.teamId);

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
        teamStatus,
      },
      token,
    };
  }

  private generateToken(userId: string, role: string, teamId?: string | null): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('Chưa cấu hình JWT_SECRET trong biến môi trường.');
    }

    return jwt.sign({ id: userId, role, teamId: teamId ?? null }, secret, {
      expiresIn: '7d',
    });
  }
}