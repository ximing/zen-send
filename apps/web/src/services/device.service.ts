import { Service } from '@rabjs/react';
import { ApiService } from './api.service';
import type { Device, DeviceListResponse } from '@zen-send/shared';

export class DeviceService extends Service {
  private _devices: Device[] = [];
  private _loading = false;

  get devices() {
    return this._devices;
  }
  get loading() {
    return this._loading;
  }

  get apiService() {
    return this.resolve(ApiService);
  }

  get currentDeviceId(): string {
    return localStorage.getItem('zen-send-device-id') || '';
  }

  isCurrentDevice(deviceId: string): boolean {
    return deviceId === this.currentDeviceId;
  }

  async loadDevices() {
    this._loading = true;
    try {
      // Server returns { success: true, data: { devices: [...] } }
      const response = await this.apiService.get<DeviceListResponse>('/api/devices');
      this._devices = response.devices || [];
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      this._loading = false;
    }
  }

  async removeDevice(deviceId: string) {
    try {
      await this.apiService.delete(`/api/devices/${deviceId}`);
      this._devices = this._devices.filter((d) => d.id !== deviceId);
    } catch (error) {
      console.error('Failed to remove device:', error);
      throw error;
    }
  }

  async registerCurrentDevice() {
    const deviceId = this.currentDeviceId;
    const deviceName = navigator.userAgent.includes('Mobile') ? 'Web Mobile' : 'Web Browser';

    try {
      await this.apiService.post('/api/devices', {
        name: deviceName,
        type: 'web',
      });
    } catch (error) {
      // Device may already be registered, ignore
    }
  }
}
