import React from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { ToastService } from './toast.service';

const ToastContent = observer(() => {
  const service = useService(ToastService);

  if (service.toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {service.toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-3 bg-[var(--bg-surface)] text-[var(--text)]`}
        >
          <div
            className={`w-1 h-4 rounded-full
              ${toast.type === 'success'
                ? 'bg-[var(--accent)]'
                : toast.type === 'error'
                ? 'bg-[var(--color-error)]'
                : toast.type === 'warning'
                ? 'bg-[var(--color-warning)]'
                : 'bg-[var(--color-info)]'
              }`}
          />
          {toast.message}
        </div>
      ))}
    </div>
  );
});

export default bindServices(ToastContent, [ToastService]);
