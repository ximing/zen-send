import { Service } from '@rabjs/react';
import { io, Socket } from 'socket.io-client';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { HomeService } from './home.service';
import type { TransferSession } from '@zen-send/shared';

export class SocketService extends Service {
  socket: Socket | null = null;
  private _deviceId: string | null = null;
  connected: boolean = false;

  get isConnected() {
    return this.connected;
  }

  get authService() {
    return this.resolve(AuthService);
  }

  get notificationService() {
    return this.resolve(NotificationService);
  }

  get homeService() {
    return this.resolve(HomeService);
  }

  get serverUrl(): string {
    return this.authService.serverUrl.replace(/^http(s)?/, 'ws$1');
  }

  get deviceId(): string | null {
    return this._deviceId;
  }

  connect(deviceId: string, deviceName: string, deviceType: 'android' | 'ios') {
    if (this.socket?.connected) return;

    this._deviceId = deviceId;
    const token = this.authService.accessToken;
    const serverUrl = this.serverUrl;

    console.log('[Socket] Connecting to:', serverUrl);
    console.log('[Socket] Device ID:', deviceId);
    console.log('[Socket] Token exists:', !!token);

    this.socket = io(serverUrl, {
      transports: ['websocket'],
      auth: {
        token,
      },
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected, socket ID:', this.socket?.id);
      this.connected = true;
      this.socket?.emit('device:register', {
        name: deviceName,
        type: deviceType,
      });
    });

    this.socket.on('connect_error', (error) => {
      console.log('[Socket] Connect error:', error.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('transfer:new', (data: unknown) => {
      const payload = data as { session?: TransferSession };
      const session = payload.session;
      if (!session) return;

      const title = session.sourceDeviceId || 'New Transfer';
      const body = session.items?.[0]?.name || 'You have a new incoming transfer';
      this.notificationService.showTransferNotification(title, body);

      // Incremental append instead of full refresh
      this.homeService.addTransfer(session);
    });

    this.socket.on('transfer:progress', (data: unknown) => {
      const payload = data as { sessionId: string; progress: number; speed: number };
      this.homeService.updateProgressFromSocket(payload.sessionId, payload.progress, payload.speed);
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
