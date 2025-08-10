import { Service } from '@rabjs/react';
import { io, Socket } from 'socket.io-client';

export class SocketService extends Service {
  socket: Socket | null = null;
  private deviceId: string | null = null;

  get isConnected() {
    return this.socket?.connected ?? false;
  }

  get authService() {
    return this.resolve(AuthService);
  }

  get serverUrl(): string {
    return this.authService.serverUrl.replace(/^http(s)?/, 'ws$1');
  }

  connect(deviceId: string, deviceName: string, deviceType: 'android' | 'ios') {
    if (this.socket?.connected) return;

    this.deviceId = deviceId;
    const token = this.authService.accessToken;

    this.socket = io(this.serverUrl, {
      transports: ['websocket'],
      auth: {
        token,
      },
    });

    this.socket.on('connect', () => {
      this.socket?.emit('device:register', {
        name: deviceName,
        type: deviceType,
      });
    });

    this.socket.on('transfer:new', (_data: unknown) => {
      // Emit event for listeners
    });

    this.socket.on('transfer:progress', (_data: unknown) => {
      // Emit event for listeners
    });

    this.socket.on('disconnect', () => {
      // Handle disconnect
    });

    setInterval(() => this.sendHeartbeat(), 30000);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  emitTransferNotify(sessionId: string, targetDeviceId?: string) {
    this.socket?.emit('transfer:notify', { sessionId, targetDeviceId });
  }

  emitTransferComplete(sessionId: string) {
    this.socket?.emit('transfer:complete', { sessionId });
  }

  sendHeartbeat() {
    if (this.deviceId && this.socket?.connected) {
      this.socket?.emit('device:heartbeat');
    }
  }
}

// Import for type resolution
import { AuthService } from './auth.service';
