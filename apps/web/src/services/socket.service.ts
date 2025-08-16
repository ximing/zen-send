// Stub service - will be replaced in Task 3
import { Service } from '@rabjs/react';
import { io, Socket } from 'socket.io-client';
import { getSocketUrl, getApiBaseUrl } from '../lib/env';
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

    const apiBaseUrl = getApiBaseUrl();
    const socketUrl = getSocketUrl();
    console.log('[Socket] API base URL:', apiBaseUrl);
    console.log('[Socket] Window location origin:', window.location.origin);
    console.log('[Socket] Connecting to:', socketUrl);
    console.log('[Socket] Auth token exists:', !!this.authService.accessToken);

    this.socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
      auth: {
        token: this.authService.accessToken,
      },
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected, socket ID:', this.socket?.id);
      this.isConnected = true;
      this.registerDevice();
    });

    this.socket.on('connect_error', (error) => {
      console.log('[Socket] Connect error:', error.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
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

  offTransferNew(callback: (session: unknown) => void) {
    this.socket?.off('transfer:new', callback);
  }

  offTransferComplete(callback: (data: { sessionId: string }) => void) {
    this.socket?.off('transfer:complete', callback);
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
