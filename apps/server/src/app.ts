import 'reflect-metadata';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { useExpressServer } from 'routing-controllers';
import { logger } from '@zen-send/logger';
import { setupSocket } from './socket/socket.js';
import { setSocketIO } from './socket/socket-instance.js';
import { initIOC } from './ioc.js';
import { Container } from 'typedi';

import { controllers } from './controllers/index.js';
import { currentUserChecker } from './middlewares/auth.middleware.js';
import { Action } from 'routing-controllers';
import { DbService } from './services/db.service.js';
import { S3Service } from './services/s3.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function createApp(): Promise<{ app: express.Application; io: SocketIOServer }> {
  await initIOC();

  // Initialize database
  const dbService = Container.get(DbService);
  await dbService.init();

  // Initialize S3
  const s3Service = Container.get(S3Service);
  await s3Service.init();

  const app = express();

  // Serve static files from public directory (web build artifacts)
  const publicPath = join(__dirname, '../public');
  app.use(express.static(publicPath));

  const httpServer = createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  setupSocket(io);
  setSocketIO(io);

  useExpressServer(app, {
    controllers,
    validation: true,
    defaultErrorHandler: true,
    currentUserChecker,
    authorizationChecker: async (action: Action) => {
      const user = await currentUserChecker(action);
      return !!user;
    },
  });

  // SPA fallback: serve index.html for client-side routes
  app.get('*', (_req, res) => {
    res.sendFile(join(publicPath, 'index.html'));
  });

  const PORT = process.env.PORT || 3110;
  httpServer.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server started');
  });

  return { app, io };
}
