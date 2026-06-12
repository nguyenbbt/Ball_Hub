import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { MessagesService } from './messages.service';

const messagesService = new MessagesService();

export const getTeamMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { teamId } = req.params;
        const { before, limit } = req.query;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const parsedLimit = typeof limit === 'string' ? Number(limit) : undefined;
        const safeLimit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;

        const result = await messagesService.getTeamMessages(userId, teamId, {
            before: typeof before === 'string' ? before : undefined,
            limit: safeLimit,
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const getDirectMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { userId: otherUserId } = req.params;
        const { before, limit } = req.query;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const parsedLimit = typeof limit === 'string' ? Number(limit) : undefined;
        const safeLimit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;

        const result = await messagesService.getDirectMessages(userId, otherUserId, {
            before: typeof before === 'string' ? before : undefined,
            limit: safeLimit,
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const getDirectThreads = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const threads = await messagesService.getDirectThreads(userId);
        res.json({ threads });
    } catch (err) {
        next(err);
    }
};
