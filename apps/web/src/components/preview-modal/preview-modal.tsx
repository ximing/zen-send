import React, { useCallback, useEffect, useRef, useState } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { X, Download, Eye, FileText } from 'lucide-react';
import { HomeService } from '../../pages/home/home.service';
import { ApiService } from '../../services/api.service';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

const isImageType = (contentType?: string) => {
  if (!contentType) return false;
  return contentType.startsWith('image/');
};

const PreviewModal = observer(() => {
  const homeService = useService(HomeService);
  const apiService = useService(ApiService);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const transfer = homeService.previewTransfer;
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Load image preview for image types
  useEffect(() => {
    if (!transfer || !isImageType(transfer.contentType)) {
      setImageUrl(null);
      return;
    }

    let revoked = false;
    apiService.getTransferFile(transfer.id).then((blob) => {
      if (revoked) return;
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
    }).catch(() => {
      if (!revoked) setImageUrl(null);
    });

    return () => {
      revoked = true;
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [apiService, transfer?.id, transfer?.contentType]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (transfer) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [transfer]);

  const handleClose = useCallback(() => {
    homeService.setPreviewTransfer(null);
  }, [homeService]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      handleClose();
    }
  }, [handleClose]);

  const handleDownload = useCallback(async () => {
    if (!transfer) return;
    try {
      const blob = await apiService.getTransferFile(transfer.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = transfer.originalFileName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, [apiService, transfer]);

  if (!transfer) return null;

  const firstItem = transfer.items?.[0];
  const isText = firstItem?.type === 'text';

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 w-full max-w-lg mx-auto bg-[var(--bg-elevated)] rounded-2xl shadow-xl backdrop:bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">
            {transfer.originalFileName || '文本消息'}
          </h3>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          >
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          {isText ? (
            <div className="bg-[var(--bg-surface)] rounded-xl p-4 max-h-[300px] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                {firstItem.content}
              </pre>
            </div>
          ) : imageUrl ? (
            <div className="bg-[var(--bg-surface)] rounded-xl p-4 text-center">
              <img
                src={imageUrl}
                alt={transfer.originalFileName}
                className="max-h-[300px] mx-auto rounded-lg object-contain"
              />
            </div>
          ) : (
            <div className="bg-[var(--bg-surface)] rounded-xl p-8 text-center">
              <FileText size={48} className="mx-auto text-[var(--text-muted)] mb-2" />
              <div className="text-sm text-[var(--text-secondary)]">
                {transfer.originalFileName}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                {formatSize(transfer.totalSize)}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-surface)]/80 transition-colors flex items-center justify-center gap-2"
          >
            <Eye size={18} />
            预览
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary)]/90 transition-colors flex items-center justify-center gap-2"
          >
            <Download size={18} />
            下载
          </button>
        </div>
      </div>
    </dialog>
  );
});

export default bindServices(PreviewModal, []);
export { PreviewModal };
