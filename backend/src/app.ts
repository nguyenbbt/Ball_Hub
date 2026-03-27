import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorMiddleware } from './middlewares/error.middleware';

export const app = express();

// Global middlewares
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes (mounted per module)
// app.use('/api/auth', authRouter);
// app.use('/api/teams', teamsRouter);
// ... additional routers added here as modules are implemented

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Error handling — must be last
app.use(errorMiddleware);
