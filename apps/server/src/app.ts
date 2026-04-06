import 'reflect-metadata';
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

export async function createApp(): Promise<{ app: express.Application; io: SocketIOServer }> {
  await initIOC();

  // Initialize database
  const dbService = Container.get(DbService);
  await dbService.init();

  // Initialize S3
  const s3Service = Container.get(S3Service);
  await s3Service.init();

  const app = express();

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

  const PORT = process.env.PORT || 3110;
  httpServer.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server started');
  });

  return { app, io };
}
