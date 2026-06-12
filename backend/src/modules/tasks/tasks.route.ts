import { Router, RequestHandler } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createTaskSchema, updateStatusSchema } from './tasks.schema';
import { getTasks, createTask, updateTaskStatus, deleteTask } from './tasks.controller';

export const tasksRouter = Router();

tasksRouter.use(authMiddleware as RequestHandler);

tasksRouter.get('/', getTasks as RequestHandler);
tasksRouter.post('/', validate(createTaskSchema), createTask as RequestHandler);
tasksRouter.put('/:id/status', validate(updateStatusSchema), updateTaskStatus as RequestHandler);
tasksRouter.delete('/:id', deleteTask as RequestHandler);