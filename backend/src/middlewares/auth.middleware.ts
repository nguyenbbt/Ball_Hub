import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

type UserRole = 'ADMIN' | 'COACH' | 'PLAYER';

interface AuthTokenPayload {
  id: string;
  role?: UserRole;
  teamId?: string | null;
}

// Định nghĩa chuẩn và EXPORT để các file khác dùng chung
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role?: UserRole;
    teamId?: string | null;
  };
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
};

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
    
    req.user = {
      id: payload.id,
      role: payload.role,
      teamId: payload.teamId ?? null,
    };
    
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const role = req.user?.role;

    if (!role) {
      res.status(403).json({ message: 'Forbidden: Missing user role.' });
      return;
    }

    if (!allowedRoles.includes(role)) {
      res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
      return;
    }

    next();
  };
};