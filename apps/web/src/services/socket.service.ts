// Stub service - will be replaced in Task 3
import { Service } from '@rabjs/react';
import { io, Socket } from 'socket.io-client';
import { getSocketUrl, getApiBaseUrl } from '../lib/env';
import { AuthService } from './auth.service';
import type { Device } from '@zen-send/shared';

export class SocketService extends Service {
  readonly instanceId: string = crypto.randomUUID();
  private readonly _instanceTime: string = new Date().toLocaleTimeString();
  private _socket: Socket | null = null;
  isConnected = false;

  get socket(): Socket | null {
    return this._socket;
  }

  get authService() {
    return this.resolve(AuthService);
  }

  connect(shareToken?: string) {
    if (this._socket?.connected) return;

    const apiBaseUrl = getApiBaseUrl();
    const socketUrl = getSocketUrl();
    console.log('[Socket] API base URL:', apiBaseUrl);
    console.log('[Socket] Window location origin:', window.location.origin);
    console.log('[Socket] Connecting to:', socketUrl);
    console.log('[Socket] Auth token exists:', !!this.authService.accessToken);

    const auth = shareToken
      ? { shareToken }
      : { token: this.authService.accessToken };

    this._socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
      auth,
    });

    this._socket.on('connect', () => {
      console.log('[Socket] Connected, socket ID:', this._socket?.id);
      this.isConnected = true;
      this.registerDevice();
    });

    this._socket.on('connect_error', (error) => {
      console.log('[Socket] Connect error:', error.message);
    });

    this._socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.isConnected = false;
    });
  }

  disconnect() {
    this._socket?.disconnect();
    this._socket = null;
    this.isConnected = false;
  }

  registerDevice() {
    if (!this._socket?.connected) return;
    this._socket.emit('device:register', {
      deviceId: this.getDeviceId(),
      deviceName: this.getDeviceName(),
      deviceType: this.getDeviceType(),
    });
  }

  private getDeviceId(): string {
    return 'web-' + this.instanceId;
  }

  private getDeviceName(): string {
    return `Web (${this._instanceTime})`;
  }

  private getDeviceType(): string {
    return 'web';
  }

  sendHeartbeat() {
    if (!this._socket?.connected) return;
    this._socket.emit('device:heartbeat');
  }

  onDeviceList(callback: (devices: Device[]) => void) {
    this._socket?.on('device:list', (data: { devices: Device[] }) => callback(data.devices));
  }

  onTransferNew(callback: (session: unknown) => void) {
    this._socket?.on('transfer:new', (session) => callback(session));
  }

  onTransferProgress(callback: (data: { sessionId: string; progress: number }) => void) {
    this._socket?.on('transfer:progress', callback);
  }

  onTransferComplete(callback: (data: { sessionId: string }) => void) {
    this._socket?.on('transfer:complete', callback);
  }

  offTransferNew(callback: (session: unknown) => void) {
    this._socket?.off('transfer:new', callback);
  }

  offTransferComplete(callback: (data: { sessionId: string }) => void) {
    this._socket?.off('transfer:complete', callback);
  }

  emitTransferComplete(sessionId: string) {
    this._socket?.emit('transfer:complete', { sessionId });
  }

  notifyTransfer(targetDeviceId: string | null, sessionId: string): void {
    if (!this._socket?.connected) return;
    if (targetDeviceId === null) {
      this._socket.emit('transfer:notify', { sessionId });
    } else {
      this._socket.emit('transfer:notify', { targetDeviceId, sessionId });
    }
  }

  removeAllListeners() {
    this._socket?.removeAllListeners('device:list');
    this._socket?.removeAllListeners('transfer:new');
    this._socket?.removeAllListeners('transfer:progress');
    this._socket?.removeAllListeners('transfer:complete');
  }
}
