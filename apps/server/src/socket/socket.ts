import type { Server, Socket } from 'socket.io';
import { Container } from 'typedi';
import { verifyAccessToken, type TokenPayload } from '../utils/jwt.js';
import { DeviceService, type DeviceInfo } from '../services/device.service.js';
import { logger } from '@zen-send/logger';
import { setSocketIO } from './socket-instance.js';

interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
  deviceId?: string;
}

interface DeviceSocket {
  socketId: string;
  device: DeviceInfo;
}

// In-memory map of device IDs to their socket info
const deviceSockets = new Map<string, DeviceSocket>();

export function setupSocket(io: Server): void {
  // Auth middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      logger.warn({ socketId: socket.id }, 'Socket auth failed: missing token');
      return next(new Error('Authentication error: missing token'));
    }

    try {
      const payload = verifyAccessToken(token as string);
      socket.user = payload;
      next();
    } catch (error) {
      logger.warn({ socketId: socket.id }, 'Socket auth failed: invalid token');
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.userId;

    logger.info({ socketId: socket.id, userId }, 'Client connected');

    if (!userId) {
      socket.disconnect();
      return;
    }

    // Join user-specific room for broadcasting transfers
    socket.join(`user:${userId}`);

    // Emit device list to the connected user
    emitDeviceList(io, userId, socket.id);

    // Handle device heartbeat
    socket.on('device:heartbeat', async () => {
      const deviceId = socket.deviceId;
      if (!deviceId) return;

      try {
        await Container.get(DeviceService).updateDeviceHeartbeat(deviceId);
        logger.debug({ deviceId }, 'Device heartbeat updated');
      } catch (error) {
        logger.error({ error, deviceId }, 'Failed to update device heartbeat');
      }
    });

    // Handle explicit device registration
    socket.on(
      'device:register',
      async (data: { deviceId: string; deviceName: string; deviceType: string }) => {
        const { deviceId, deviceName } = data;

        if (socket.user?.userId) {
          // Update device as online
          await Container.get(DeviceService).updateDeviceHeartbeat(deviceId);

          // Store deviceId on socket for later use
          socket.deviceId = deviceId;

          logger.info(
            { socketId: socket.id, deviceId, deviceName },
            'Device registered via socket event'
          );
        }
      }
    );

    // Handle transfer notification
    socket.on('transfer:notify', async (data: { targetDeviceId: string; sessionId: string }) => {
      const { targetDeviceId, sessionId } = data;

      const targetSocketInfo = deviceSockets.get(targetDeviceId);
      if (targetSocketInfo?.socketId) {
        io.to(targetSocketInfo.socketId).emit('transfer:new', { sessionId });
        logger.info({ targetDeviceId, sessionId }, 'Transfer notification sent');
      } else {
        logger.warn({ targetDeviceId, sessionId }, 'Target device not found or offline');
      }
    });

    // Handle progress update
    socket.on('transfer:progress', (data: { sessionId: string; progress: number }) => {
      const { sessionId, progress } = data;
      // Emit progress to the session room or specific client
      io.to(sessionId).emit('transfer:progress', { sessionId, progress });
    });

    // Handle completion notification
    socket.on('transfer:complete', (data: { sessionId: string }) => {
      const { sessionId } = data;
      io.to(sessionId).emit('transfer:complete', { sessionId });
      logger.info({ sessionId }, 'Transfer complete notification sent');
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      const deviceId = socket.deviceId;
      logger.info({ socketId: socket.id, deviceId }, 'Client disconnected');

      if (deviceId) {
        deviceSockets.delete(deviceId);

        try {
          await Container.get(DeviceService).setDeviceOffline(deviceId);
          logger.info({ deviceId }, 'Device marked offline');

          // Emit updated device list to user
          if (userId) {
            emitDeviceListToUser(io, userId);
          }
        } catch (error) {
          logger.error({ error, deviceId }, 'Failed to set device offline');
        }
      }
    });
  });
}

async function emitDeviceList(io: Server, userId: string, currentSocketId: string): Promise<void> {
  try {
    const devices = await Container.get(DeviceService).getUserDevices(userId);
    const deviceList = devices.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      lastSeen: d.lastSeenAt,
      isOnline: d.isOnline === 1,
    }));

    io.to(currentSocketId).emit('device:list', { devices: deviceList });
    logger.debug({ userId, count: deviceList.length }, 'Device list emitted');
  } catch (error) {
    logger.error({ error, userId }, 'Failed to emit device list');
  }
}

async function emitDeviceListToUser(io: Server, userId: string): Promise<void> {
  try {
    const devices = await Container.get(DeviceService).getUserDevices(userId);
    const deviceList = devices.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      lastSeen: d.lastSeenAt,
      isOnline: d.isOnline === 1,
    }));

    // Find all sockets belonging to this user and emit to them
    for (const [deviceId, socketInfo] of deviceSockets) {
      const device = await Container.get(DeviceService).getDeviceById(deviceId);
      if (device && device.userId === userId) {
        io.to(socketInfo.socketId).emit('device:list', { devices: deviceList });
      }
    }
  } catch (error) {
    logger.error({ error, userId }, 'Failed to emit device list to user');
  }
}
