import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from '@zen-send/logger';
import { setupSocket } from './socket/socket.js';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

setupSocket(io);

const PORT = process.env.PORT || 3110;
httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});
