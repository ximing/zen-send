import 'reflect-metadata';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { useExpressServer, useContainer } from 'routing-controllers';
import { Container } from 'typedi';
import { logger } from '@zen-send/logger';
import { setupSocket } from './socket/socket.js';
import { initIOC } from './ioc.js';
import { controllers } from './controllers/index.js';
import { currentUserChecker } from './middlewares/auth.middleware.js';
import { DbService } from './services/db.service.js';
import { S3Service } from './services/s3.service.js';

useContainer(Container);

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

  useExpressServer(app, {
    controllers,
    validation: true,
    defaultErrorHandler: false,
    currentUserChecker,
  });

  const PORT = process.env.PORT || 3110;
  httpServer.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server started');
  });

  return { app, io };
}
