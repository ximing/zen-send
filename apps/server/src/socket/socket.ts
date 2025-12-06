import * as Y from 'yjs';
import type { Server, Socket } from 'socket.io';
import { Container } from 'typedi';
import { verifyAccessToken, type TokenPayload } from '../utils/jwt.js';
import { DeviceService } from '../services/device.service.js';
import { TransferService } from '../services/transfer.service.js';
import { NoteCollabService } from '../services/note-collab.service.js';
import { NoteService } from '../services/note.service.js';
import { logger } from '@zen-send/logger';
import { setSocketIO } from './socket-instance.js';

interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
  deviceId?: string;
}

interface DeviceSocket {
  socketId: string;
  deviceId: string;
  deviceName: string;
}

// In-memory map of device IDs to their socket info
const deviceSockets = new Map<string, DeviceSocket>();

export function setupSocket(io: Server): void {
  // Auth middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    const shareToken = socket.handshake.auth.shareToken as string | undefined;

    // JWT 认证（已登录用户）
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        socket.user = payload;
        return next();
      } catch {
        logger.warn({ socketId: socket.id }, 'Socket auth failed: invalid token');
        return next(new Error('Authentication error: invalid token'));
      }
    }

    // shareToken 匿名访客认证
    if (shareToken) {
      const noteService = Container.get(NoteService);
      const note = await noteService.getNoteByShareToken(shareToken);
      if (note) {
        socket.user = { userId: `guest:${socket.id}` };
        return next();
      }
      logger.warn({ socketId: socket.id }, 'Socket auth failed: invalid shareToken');
      return next(new Error('Authentication error: invalid shareToken'));
    }

    logger.warn({ socketId: socket.id }, 'Socket auth failed: missing token');
    return next(new Error('Authentication error: missing token'));
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
      async (data: {
        deviceId?: string;
        deviceName?: string;
        deviceType?: string;
        name?: string;
        type?: string;
      }) => {
        const deviceId = data.deviceId || data.name || socket.id;
        const deviceName = data.deviceName || data.name || 'Unknown';
        const deviceType = data.deviceType || data.type || 'unknown';

        if (socket.user?.userId) {
          // Ensure device exists in DB, then update heartbeat
          const deviceService = Container.get(DeviceService);
          const existing = await deviceService.getDeviceById(deviceId);
          if (!existing) {
            try {
              await deviceService.registerDevice({
                id: deviceId,
                userId: socket.user.userId,
                name: deviceName,
                type: deviceType as 'web' | 'android' | 'ios' | 'desktop',
              });
            } catch {
              await deviceService.updateDeviceHeartbeat(deviceId);
            }
          } else {
            await deviceService.updateDeviceHeartbeat(deviceId);
          }

          // Store deviceId on socket for later use
          socket.deviceId = deviceId;

          // Add to deviceSockets map for targeted notifications
          deviceSockets.set(deviceId, {
            socketId: socket.id,
            deviceId,
            deviceName,
          });

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
      const userId = socket.user?.userId;

      try {
        const transferService = Container.get(TransferService);
        const transfer = userId ? await transferService.getTransferById(sessionId, userId) : null;

        const targetSocketInfo = deviceSockets.get(targetDeviceId);
        if (targetSocketInfo?.socketId) {
          if (transfer) {
            io.to(targetSocketInfo.socketId).emit('transfer:new', { session: transfer });
          } else {
            io.to(targetSocketInfo.socketId).emit('transfer:new', { sessionId });
          }
          logger.info({ targetDeviceId, sessionId }, 'Transfer notification sent');
        } else {
          logger.warn({ targetDeviceId, sessionId }, 'Target device not found or offline');
        }
      } catch (error) {
        logger.error({ error, sessionId }, 'Failed to fetch transfer for notification');
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

    // ── 笔记协作事件 ──────────────────────────────────

    // 追踪此 socket 加入的 note rooms，用于 disconnect 时 untrack
    const joinedNoteIds = new Set<string>();

    socket.on(
      'note:collab:join',
      async (data: {
        noteId: string;
        shareToken?: string;
        stateVector?: number[];
        clientState?: number[];
      }) => {
        const { noteId, shareToken, stateVector, clientState } = data;
        if (!userId) return;

        const noteService = Container.get(NoteService);
        let authorized = false;

        const ownNote = await noteService.getNoteById(noteId, userId);
        if (ownNote) authorized = true;

        if (!authorized && shareToken) {
          const sharedNote = await noteService.getNoteByShareToken(shareToken);
          if (sharedNote && sharedNote.id === noteId) authorized = true;
        }

        if (!authorized) {
          socket.emit('note:collab:error', { noteId, message: 'Note not found or access denied' });
          return;
        }

        socket.join(`note:${noteId}`);

        const collabService = Container.get(NoteCollabService);
        const doc = await collabService.getOrCreateDoc(noteId);

        // 仅首次 join 时计入连接数（重连时已在 Set 里不重复计）
        if (!joinedNoteIds.has(noteId)) {
          collabService.trackConnection(noteId);
          joinedNoteIds.add(noteId);
        }

        // 如果客户端有离线编辑，先合并到服务端 doc，再广播给其他客户端
        if (clientState && clientState.length > 0) {
          collabService.applyUpdate(noteId, new Uint8Array(clientState));
          socket.to(`note:${noteId}`).emit('note:collab:update', { noteId, update: clientState });
        }

        // 计算要发给客户端的 diff：有 stateVector 则发增量，否则发全量
        const sv = stateVector && stateVector.length > 0 ? new Uint8Array(stateVector) : undefined;
        const stateUpdate = Y.encodeStateAsUpdate(doc, sv);
        socket.emit('note:collab:sync', {
          noteId,
          update: Array.from(stateUpdate),
        });

        logger.info({ socketId: socket.id, noteId, userId }, 'Client joined note room');
      }
    );

    socket.on('note:collab:update', (data: { noteId: string; update: number[] }) => {
      const { noteId, update } = data;
      if (!userId) return;

      const collabService = Container.get(NoteCollabService);
      collabService.applyUpdate(noteId, new Uint8Array(update));
      socket.to(`note:${noteId}`).emit('note:collab:update', { noteId, update });
    });

    socket.on('note:collab:awareness', (data: { noteId: string; awareness: number[] }) => {
      const { noteId, awareness } = data;
      socket.to(`note:${noteId}`).emit('note:collab:awareness', { noteId, awareness });
    });

    socket.on('note:collab:leave', (data: { noteId: string }) => {
      const { noteId } = data;
      socket.leave(`note:${noteId}`);
      if (joinedNoteIds.has(noteId)) {
        Container.get(NoteCollabService).untrackConnection(noteId);
        joinedNoteIds.delete(noteId);
      }
      logger.debug({ socketId: socket.id, noteId }, 'Client left note room');
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      const deviceId = socket.deviceId;
      logger.info({ socketId: socket.id, deviceId }, 'Client disconnected');

      // 释放未主动 leave 的 note 连接计数
      if (joinedNoteIds.size > 0) {
        const collabService = Container.get(NoteCollabService);
        for (const noteId of joinedNoteIds) {
          collabService.untrackConnection(noteId);
        }
        joinedNoteIds.clear();
      }

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
