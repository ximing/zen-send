import { Service } from '@rabjs/react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export class ToastService extends Service {
  toasts: ToastMessage[] = [];
  private timeoutIds: Map<string, ReturnType<typeof setTimeout>> = new Map();

  show(message: string, type: ToastMessage['type'] = 'info') {
    const id = Date.now().toString();
    this.toasts = [...this.toasts, { id, type, message }];

    const timeoutId = setTimeout(() => {
      this.dismiss(id);
    }, 5000);
    this.timeoutIds.set(id, timeoutId);
  }

  dismiss(id: string) {
    const timeoutId = this.timeoutIds.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeoutIds.delete(id);
    }
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  dispose() {
    // Clear all pending timeouts on dispose
    for (const timeoutId of this.timeoutIds.values()) {
      clearTimeout(timeoutId);
    }
    this.timeoutIds.clear();
  }
}
