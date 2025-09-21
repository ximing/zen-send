import React from 'react';
import { observer, useService } from '@rabjs/react';
import { ToastService } from './toast.service';

const ToastContent = observer(() => {
  const service = useService(ToastService);

  return (
    <>
      {/* Toast Notifications */}
      {service.toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
          {service.toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-3 bg-[var(--bg-surface)] text-[var(--text)]`}
            >
              <div
                className={`w-1 h-4 rounded-full
                  ${
                    toast.type === 'success'
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
      )}

      {/* Confirm Dialog */}
      {service.confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={service.confirmDialog.onCancel}
          />
          <div className="relative bg-[var(--bg-surface)] rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-[var(--text-primary)] text-base mb-6">
              {service.confirmDialog.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={service.confirmDialog.onCancel}
                className="px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                取消
              </button>
              <button
                onClick={service.confirmDialog.onConfirm}
                className="px-4 py-2 rounded-lg text-sm text-white bg-[var(--color-error)] hover:opacity-90 transition-opacity"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default ToastContent;
