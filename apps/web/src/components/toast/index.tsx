import React from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { ToastService } from './toast.service';

const ToastContent = observer(() => {
  const service = useService(ToastService);

  if (service.toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {service.toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg min-w-[250px] max-w-md
            ${toast.type === 'success' ? 'bg-success text-white' : ''}
            ${toast.type === 'error' ? 'bg-error text-white' : ''}
            ${toast.type === 'info' ? 'bg-info text-white' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span>{toast.message}</span>
            <button
              onClick={() => service.dismiss(toast.id)}
              className="ml-2 opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
});

export default bindServices(ToastContent, [ToastService]) as React.ComponentType; 
