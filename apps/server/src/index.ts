import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { logger } from '@zen-send/logger';
import { createApp } from './app.js';

dotenv.config();

const app = createApp();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Store devices in memory (replace with DB in production)
const devices = new Map<string, { id: string; name: string; type: string; socketId?: string }>();

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Client connected');

  socket.on('register', (data: { name: string; type: string }) => {
    const deviceId = crypto.randomUUID();
    const device = { id: deviceId, ...data, socketId: socket.id };
    devices.set(deviceId, device);
    socket.emit('registered', { deviceId });
    logger.info({ deviceId, name: data.name }, 'Device registered');
  });

  socket.on('discover', () => {
    const deviceList = Array.from(devices.values()).map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
    }));
    socket.emit('devices', deviceList);
  });

  socket.on('transfer', (data: { targetId: string; items: unknown[] }) => {
    const targetDevice = Array.from(devices.values()).find((d) => d.id === data.targetId);
    if (targetDevice?.socketId) {
      io.to(targetDevice.socketId).emit('incoming-transfer', {
        sourceId: socket.id,
        items: data.items,
      });
    }
  });

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected');
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});
