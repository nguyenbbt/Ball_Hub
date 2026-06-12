import { Router, RequestHandler } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { transactionSchema } from './finances.schema';
import { createTransaction, deleteTransaction, getTransactions, updateTransaction } from './finances.controller';

export const financesRouter = Router();

financesRouter.use(authMiddleware as RequestHandler);

financesRouter.get('/', getTransactions as RequestHandler);
financesRouter.post('/', validate(transactionSchema), createTransaction as RequestHandler);
financesRouter.put('/:id', validate(transactionSchema), updateTransaction as RequestHandler);
financesRouter.delete('/:id', deleteTransaction as RequestHandler);