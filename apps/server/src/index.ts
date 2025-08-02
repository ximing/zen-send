import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { logger } from '@zen-send/logger';
import { createApp } from './app.js';
import { setupSocket } from './socket/socket.js';

dotenv.config();

const app = createApp();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Setup Socket.io handlers
setupSocket(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});
