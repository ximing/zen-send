import { Service } from '@rabjs/react';
import { showToast } from '../components/toast';

export class NotificationService extends Service {
  async requestPermission(): Promise<boolean> {
    // In-app toast doesn't need permission
    return true;
  }

  async showTransferNotification(title: string, body: string) {
    showToast(`${title}: ${body}`);
  }
}
