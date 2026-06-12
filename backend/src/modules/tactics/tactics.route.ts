import { Router, RequestHandler } from 'express';
import { createTacticHandler, getTeamTacticsHandler, getTacticByIdHandler, updateTacticHandler, deleteTacticHandler } from './tactics.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { createTacticSchema, updateTacticSchema, deleteTacticSchema } from './tactics.schema';

export const tacticsRouter = Router();

tacticsRouter.use(authMiddleware as RequestHandler); 

tacticsRouter.post('/', validate(createTacticSchema), createTacticHandler as RequestHandler);
tacticsRouter.get('/', getTeamTacticsHandler as RequestHandler);
tacticsRouter.get('/:id', getTacticByIdHandler as RequestHandler); // MỚI: API Lấy chi tiết
tacticsRouter.put('/:id', validate(updateTacticSchema), updateTacticHandler as RequestHandler);
tacticsRouter.delete('/:id', validate(deleteTacticSchema), deleteTacticHandler as RequestHandler);

export default tacticsRouter;