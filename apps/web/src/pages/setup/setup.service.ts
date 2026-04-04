import { Service } from '@rabjs/react';
import { ConfigService } from '../../services/config.service';
import { isElectron } from '../../lib/env';

export class SetupService extends Service {
  serverUrl: string = '';
  isLoading = false;
  error: string | null = null;

  get configService() {
    return this.resolve(ConfigService);
  }

  constructor() {
    super();
    if (!isElectron) {
      // 浏览器模式下不显示 setup
      this.serverUrl = '';
    }
  }

  async init() {
    if (!isElectron) return;
    this.isLoading = true;
    try {
      this.serverUrl = await this.configService.loadServerUrl();
      if (!this.serverUrl) {
        this.serverUrl = this.configService.getDefaultDevUrl();
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load config';
    } finally {
      this.isLoading = false;
    }
  }

  async saveAndConnect(): Promise<boolean> {
    if (!this.serverUrl.trim()) {
      this.error = 'Please enter a server address';
      return false;
    }

    this.isLoading = true;
    this.error = null;

    try {
      await this.configService.saveServerUrl(this.serverUrl.trim());
      return true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to save config';
      return false;
    } finally {
      this.isLoading = false;
    }
  }
}
