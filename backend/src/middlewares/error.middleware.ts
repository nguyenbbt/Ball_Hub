import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorMiddleware = (
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const statusCode = err.statusCode ?? 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (err instanceof ZodError) {
    res.status(400).json({ errors: err.errors });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    res.status(400).json({ message: err.message, code: err.code });
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ message: err.message });
    return;
  }

  logger.error(err.message, { stack: err.stack, statusCode });

  res.status(statusCode).json({
    message: isProduction && statusCode === 500 ? 'Internal Server Error' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};
