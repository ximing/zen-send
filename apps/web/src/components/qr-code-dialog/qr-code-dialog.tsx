import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import QRCode from 'qrcode';

interface QRCodeDialogProps {
  url: string;
  open: boolean;
  onClose: () => void;
}

function QRCodeDialog({ url, open, onClose }: QRCodeDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !url) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(url, {
      width: 240,
      margin: 2,
      color: { dark: '#2C2C2C', light: '#FFFFFF' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [open, url]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.currentTarget === e.target) onClose();
    },
    [onClose]
  );

  if (!open) return null;

  // 列表用 virtua，滚动容器 contain:strict、行 position:absolute。
  // 弹层若留在行内，fixed 逃不出该层叠上下文，会被后面的文件卡片盖住。
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="二维码"
    >
      <div className="bg-[var(--bg-elevated)] rounded-2xl shadow-xl max-w-sm w-full max-h-[calc(100dvh-2rem)] flex flex-col p-6">
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">二维码</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          >
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="flex justify-center mb-5 shrink-0">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="rounded-xl" />
          ) : (
            <div className="w-[240px] h-[240px] bg-[var(--bg-surface)] rounded-xl animate-pulse" />
          )}
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl p-3 mb-4 overflow-y-auto min-h-0 overscroll-contain">
          <p className="text-xs text-[var(--text-muted)] break-all leading-relaxed">{url}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full shrink-0 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary)]/90 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>,
    document.body
  );
}

export { QRCodeDialog };
