declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role?: 'ADMIN' | 'COACH' | 'PLAYER';
        teamId?: string | null;
      };
    }
  }
}