import { Router, RequestHandler } from 'express';
import { createTeam, getPendingTeams, getRoster, joinTeam, updateTeamStatus } from './teams.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware';
import { createTeamSchema, joinTeamSchema, updateTeamStatusSchema } from './teams.schema';

const router = Router();

router.use(authMiddleware as RequestHandler);

router.get('/pending', requireRole(['ADMIN']) as RequestHandler, getPendingTeams as RequestHandler);
router.put('/:id/status', requireRole(['ADMIN']) as RequestHandler, validate(updateTeamStatusSchema), updateTeamStatus as RequestHandler);

router.post('/', requireRole(['COACH']) as RequestHandler, validate(createTeamSchema), createTeam as RequestHandler);
router.post('/create', requireRole(['COACH']) as RequestHandler, validate(createTeamSchema), createTeam as RequestHandler);
router.post('/join', requireRole(['PLAYER']) as RequestHandler, validate(joinTeamSchema), joinTeam as RequestHandler);

// ĐIỂM SỬA CHỮA: Chỉ sử dụng 1 route duy nhất này để lấy Roster
router.get('/roster', getRoster as RequestHandler);

export { router as teamsRouter };