import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression'; // Đã import compression
import { errorMiddleware } from './middlewares/error.middleware';
import { statisticsRouter } from './modules/statistics/statistics.route';
import { authRouter } from './modules/auth/auth.route';
import { playersRouter } from './modules/players/players.route';
import { teamsRouter } from './modules/teams/teams.route'; 
import { usersRouter } from './modules/users/users.route';
import { messagesRouter } from './modules/messages/messages.route';
import { tacticsRouter } from './modules/tactics/tactics.route';
import { inventoryRouter } from './modules/inventory/inventory.route';
import { financesRouter } from './modules/finances/finances.route';
import { eventsRouter } from './modules/events/events.route';
import { tasksRouter } from './modules/tasks/tasks.route';
import { matchesRouter } from './modules/matches/matches.route';
import { dashboardRouter } from './modules/dashboard/dashboard.route';
import { notificationsRouter } from './modules/notifications/notifications.route';

export const app = express();

// Global middlewares
app.use(helmet());
app.use(compression()); // Kích hoạt Gzip compression cho toàn bộ HTTP responses

const defaultClientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const allowedOrigins = new Set([defaultClientOrigin, 'http://localhost:5174']);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes (mounted per module)
app.use('/api/auth', authRouter); 
app.use('/api/players', playersRouter); 
app.use('/api/teams', teamsRouter); 
app.use('/api/users', usersRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/tactics', tacticsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/finances', financesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/statistics', statisticsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/notifications', notificationsRouter);
app.use(errorMiddleware);