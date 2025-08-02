import { Service } from '@rabjs/react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export class ToastService extends Service {
  toasts: ToastMessage[] = [];

  show(message: string, type: ToastMessage['type'] = 'info') {
    const id = Date.now().toString();
    this.toasts = [...this.toasts, { id, type, message }];

    setTimeout(() => {
      this.dismiss(id);
    }, 5000);
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }
}
