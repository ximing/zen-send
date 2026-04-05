import { Service } from '@rabjs/react';
import * as Notifications from 'expo-notifications';

export class NotificationService extends Service {
  async requestPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async showTransferNotification(title: string, body: string) {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  }
}
