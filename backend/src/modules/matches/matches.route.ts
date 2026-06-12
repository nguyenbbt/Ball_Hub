import { Router, RequestHandler } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { getMatches, saveMatchStats } from './matches.controller';
import { updateMatchStatsSchema } from './matches.schema';

export const matchesRouter = Router();

matchesRouter.use(authMiddleware as RequestHandler);
matchesRouter.get('/', getMatches as RequestHandler);
matchesRouter.put('/:id/stats', validate(updateMatchStatsSchema), saveMatchStats as RequestHandler);