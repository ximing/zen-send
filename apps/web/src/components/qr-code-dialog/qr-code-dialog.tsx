import React, { useEffect, useState, useCallback } from 'react';
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="bg-[var(--bg-elevated)] rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">二维码</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          >
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="flex justify-center mb-5">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="rounded-xl" />
          ) : (
            <div className="w-[240px] h-[240px] bg-[var(--bg-surface)] rounded-xl animate-pulse" />
          )}
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl p-3 mb-4">
          <p className="text-xs text-[var(--text-muted)] break-all leading-relaxed">{url}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary)]/90 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  );
}

export { QRCodeDialog };
