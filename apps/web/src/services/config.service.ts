// Stub service - will be replaced in Task 3
import { Service } from '@rabjs/react';
import { getZenBridge } from '../lib/zen-bridge';
import { isElectron } from '../lib/env';

export class ConfigService extends Service {
  serverUrl: string = '';
  isConfigured = false;

  constructor() {
    super();
    if (isElectron) {
      const bridge = getZenBridge();
      this.serverUrl = bridge.getServerUrl?.() || '';
      this.isConfigured = !!this.serverUrl;
    } else {
      // Browser mode defaults to dev server
      this.serverUrl = 'http://localhost:5274';
      this.isConfigured = true;
    }
  }

  async loadServerUrl(): Promise<string> {
    if (!isElectron) {
      this.serverUrl = window.location.origin;
      return this.serverUrl;
    }

    const bridge = getZenBridge();
    this.serverUrl = bridge.getServerUrl?.() || '';
    this.isConfigured = !!this.serverUrl;
    return this.serverUrl;
  }

  async saveServerUrl(url: string): Promise<void> {
    if (!isElectron) return;

    const bridge = getZenBridge();
    bridge.setServerUrl?.(url);
    this.serverUrl = url;
    this.isConfigured = true;
  }

  getDefaultDevUrl(): string {
    return 'http://localhost:5274';
  }
}
