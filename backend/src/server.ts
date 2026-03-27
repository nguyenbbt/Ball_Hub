import 'dotenv/config';
import http from 'http';
import { app } from './app';
import { connectDB } from './config/db';
import { initSocket } from './socket';
import { logger } from './config/logger';

const PORT = process.env.PORT ?? 5000;

const server = http.createServer(app);

initSocket(server);

const start = async (): Promise<void> => {
  await connectDB();
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
