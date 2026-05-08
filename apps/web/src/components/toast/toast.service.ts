import { Service } from '@rabjs/react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface ConfirmDialog {
  id: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export class ToastService extends Service {
  toasts: ToastMessage[] = [];
  confirmDialog: ConfirmDialog | null = null;
  private timeoutIds: Map<string, ReturnType<typeof setTimeout>> = new Map();

  show(message: string, type: ToastMessage['type'] = 'info') {
    const id = Date.now().toString();
    this.toasts = [...this.toasts, { id, type, message }];

    const timeoutId = setTimeout(() => {
      this.dismiss(id);
    }, 5000);
    this.timeoutIds.set(id, timeoutId);
  }

  confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const id = Date.now().toString();
      this.confirmDialog = {
        id,
        message,
        onConfirm: () => {
          this.confirmDialog = null;
          resolve(true);
        },
        onCancel: () => {
          this.confirmDialog = null;
          resolve(false);
        },
      };
    });
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
    for (const timeoutId of this.timeoutIds.values()) {
      clearTimeout(timeoutId);
    }
    this.timeoutIds.clear();
  }
}
