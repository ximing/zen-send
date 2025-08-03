import 'reflect-metadata';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { useExpressServer, useContainer } from 'routing-controllers';
import { Container } from 'typedi';
import { logger } from '@zen-send/logger';
import { setupSocket } from './socket/socket.js';
import { initIOC } from './ioc.js';
import { controllers } from './controllers/index.js';
import { currentUserChecker } from './middlewares/auth.middleware.js';
import { errorHandler } from './middleware/error.js';

useContainer(Container);

export async function createApp(): Promise<{ app: ReturnType<typeof useExpressServer>; io: SocketIOServer }> {
  await initIOC();

  const httpServer = createServer();

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  setupSocket(io);

  const app = useExpressServer(httpServer, {
    controllers,
    validation: true,
    defaultErrorHandler: false,
    currentUserChecker,
    errorHandler,
  });

  const PORT = process.env.PORT || 3110;
  httpServer.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server started');
  });

  return { app, io };
}
