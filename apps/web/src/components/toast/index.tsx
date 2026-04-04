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
          className={`px-4 py-3 rounded-lg border shadow-lg text-sm
            ${toast.type === 'success'
              ? 'bg-[var(--bg-surface)] border-[var(--color-success)] text-[var(--color-success)]'
              : toast.type === 'error'
              ? 'bg-[var(--bg-surface)] border-[var(--color-error)] text-[var(--color-error)]'
              : toast.type === 'warning'
              ? 'bg-[var(--bg-surface)] border-[var(--color-warning)] text-[var(--color-warning)]'
              : 'bg-[var(--bg-surface)] border-[var(--color-info)] text-[var(--color-info)]'
            }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
});

export default bindServices(ToastContent, [ToastService]);
