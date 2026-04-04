// Stub service - will be replaced in Task 3
import { Service } from '@rabjs/react';
import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '../lib/env';
import { AuthService } from './auth.service';
import type { Device } from '@zen-send/shared';

export class SocketService extends Service {
  private socket: Socket | null = null;
  isConnected = false;

  get authService() {
    return this.resolve(AuthService);
  }

  connect() {
    if (this.socket?.connected) return;

    const socketUrl = getSocketUrl();
    this.socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.registerDevice();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected = false;
  }

  registerDevice() {
    if (!this.socket?.connected) return;
    this.socket.emit('device:register', {
      name: this.getDeviceName(),
      type: this.getDeviceType(),
    });
  }

  private getDeviceName(): string {
    return 'Web Device';
  }

  private getDeviceType(): string {
    return 'web';
  }

  sendHeartbeat() {
    if (!this.socket?.connected) return;
    this.socket.emit('device:heartbeat');
  }

  onDeviceList(callback: (devices: Device[]) => void) {
    this.socket?.on('device:list', (data: { devices: Device[] }) => callback(data.devices));
  }

  onTransferNew(callback: (session: unknown) => void) {
    this.socket?.on('transfer:new', (session) => callback(session));
  }

  onTransferProgress(callback: (data: { sessionId: string; progress: number }) => void) {
    this.socket?.on('transfer:progress', callback);
  }

  onTransferComplete(callback: (data: { sessionId: string }) => void) {
    this.socket?.on('transfer:complete', callback);
  }

  emitTransferComplete(sessionId: string) {
    this.socket?.emit('transfer:complete', { sessionId });
  }

  notifyTransfer(targetDeviceId: string | null, sessionId: string): void {
    if (!this.socket?.connected) return;
    if (targetDeviceId === null) {
      this.socket.emit('transfer:notify', { sessionId });
    } else {
      this.socket.emit('transfer:notify', { targetDeviceId, sessionId });
    }
  }

  removeAllListeners() {
    this.socket?.removeAllListeners('device:list');
    this.socket?.removeAllListeners('transfer:new');
    this.socket?.removeAllListeners('transfer:progress');
    this.socket?.removeAllListeners('transfer:complete');
  }
}
