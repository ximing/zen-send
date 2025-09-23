import React, { useState, useEffect, useRef } from 'react';
import { prepare, layout } from '@chenglou/pretext';
import { observer, useService } from '@rabjs/react';
import { FileText, PenLine, Image, Copy, Link, Download, Trash2, QrCode } from 'lucide-react';
import { ThemeService } from '../../services/theme.service';
import { ApiService } from '../../services/api.service';
import { HomeService } from '../../pages/home/home.service';
import { ToastService } from '../toast/toast.service';
import { QRCodeDialog } from '../qr-code-dialog';
import type { TransferSession } from '@zen-send/shared';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function getRelativeTime(timestamp: number): string {
  const ts = timestamp > 1e12 ? timestamp : timestamp * 1000;
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'JUST NOW';
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  return `${days}D AGO`;
}

const isImageMimeType = (mimeType: string | null | undefined): boolean => {
  if (!mimeType) return false;
  return mimeType.startsWith('image/');
};

interface TransferItemProps {
  transfer: TransferSession;
  onPreview: (transfer: TransferSession) => void;
  onDownload: (transfer: TransferSession) => void;
  onDelete: (transfer: TransferSession) => void;
}

function TransferItemInner({ transfer, onPreview, onDownload, onDelete }: TransferItemProps) {
  const themeService = useService(ThemeService);
  const apiService = useService(ApiService);
  const homeService = useService(HomeService);
  const toastService = useService(ToastService);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflow, setIsOverflow] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const contentAreaRef = useRef<HTMLDivElement>(null);

  const firstItem = transfer.items?.[0];
  const isText = firstItem?.type === 'text';
  const isImage = !isText && isImageMimeType(firstItem?.mimeType);
  const name = isText
    ? firstItem?.content?.slice(0, 30) || 'Text'
    : transfer.originalFileName || 'File';
  const size = isText ? 'Text' : firstItem?.size ? formatSize(firstItem.size) : 'File';
  const timeAgo = getRelativeTime(transfer.createdAt);

  useEffect(() => {
    if (!isImage || !firstItem?.id) {
      setThumbnailUrl(null);
      return;
    }

    let revoked = false;

    if (firstItem.storageType === 's3') {
      apiService
        .getTransferDownloadUrl(transfer.id)
        .then((url) => {
          if (!revoked) setThumbnailUrl(url);
        })
        .catch(() => {
          if (!revoked) setThumbnailUrl(null);
        });
    } else if (firstItem.storageType === 'db' && firstItem.content) {
      if (firstItem.content.startsWith('data:image') || firstItem.content.startsWith('http')) {
        setThumbnailUrl(firstItem.content);
      }
    }

    return () => {
      revoked = true;
    };
  }, [isImage, firstItem, transfer.id, apiService]);

  useEffect(() => {
    if (!isText || !firstItem?.content || isExpanded || !contentAreaRef.current) return;

    const el = contentAreaRef.current;
    const computed = window.getComputedStyle(el);
    const font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    const lineHeight =
      computed.lineHeight === 'normal'
        ? parseFloat(computed.fontSize) * 1.2
        : parseFloat(computed.lineHeight);

    const prepared = prepare(firstItem.content, font);
    const { lineCount } = layout(prepared, el.clientWidth, lineHeight);
    setIsOverflow(lineCount > 2);

    const observer = new ResizeObserver(() => {
      if (!contentAreaRef.current) return;
      const { lineCount } = layout(prepared, contentAreaRef.current.clientWidth, lineHeight);
      setIsOverflow(lineCount > 2);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isText, firstItem?.content, isExpanded]);

  const handleCopyText = () => {
    if (firstItem?.content) {
      navigator.clipboard.writeText(firstItem.content);
      toastService.show('Copied to clipboard', 'success');
    }
  };

  const handleCopyLink = async () => {
    if (firstItem?.storageType === 's3') {
      try {
        const { url } = await apiService.getTransferExternalLink(transfer.id);
        await navigator.clipboard.writeText(url);
        toastService.show('Link copied', 'success');
      } catch {
        toastService.show('Failed to copy link', 'error');
      }
    }
  };

  const handleQrCode = async () => {
    try {
      if (firstItem?.storageType === 's3') {
        const { url } = await apiService.getTransferExternalLink(transfer.id);
        setQrCodeUrl(url);
      } else {
        const url = await apiService.getTransferDownloadUrl(transfer.id);
        setQrCodeUrl(url);
      }
      setQrDialogOpen(true);
    } catch {
      toastService.show('Failed to generate QR code', 'error');
    }
  };

  return (
  <>
    <div
      className={`flex ${isText ? 'items-start' : 'items-center'} p-3 mx-4 mb-2 rounded-xl bg-[var(--bg-surface)]
        transition-all duration-150 cursor-pointer
        ${isHovered ? 'shadow-sm' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onPreview(transfer)}
    >
      {/* Icon/Thumbnail */}
      <div className="w-[42px] h-[42px] rounded-[10px] bg-[var(--bg-elevated)] flex items-center justify-center overflow-hidden shrink-0">
        {isImage && thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="w-[42px] h-[42px] rounded-[10px] object-cover"
          />
        ) : isText ? (
          <PenLine size={20} className="text-[var(--text-secondary)]" />
        ) : isImage ? (
          <Image size={20} className="text-[var(--text-secondary)]" />
        ) : (
          <FileText size={20} className="text-[var(--text-secondary)]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 ml-3 min-w-0" ref={contentAreaRef}>
        {isText ? (
          <>
            <div
              className={`text-sm font-medium text-[var(--text-primary)] whitespace-pre-wrap break-words ${
                !isExpanded ? 'line-clamp-2' : ''
              }`}
            >
              {firstItem?.content || 'Text'}
            </div>
            {isOverflow && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="text-xs text-[var(--accent)] mt-0.5 hover:underline"
              >
                {isExpanded ? '收起' : '展开'}
              </button>
            )}
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">
              {size} · {timeAgo}
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-medium text-[var(--text-primary)] truncate">{name}</div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">
              {size} · {timeAgo}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        {isText ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyText();
            }}
            className="p-1.5 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
            title="Copy"
          >
            <Copy size={18} className="text-[var(--text-secondary)]" />
          </button>
        ) : (
          <>
            {firstItem?.storageType === 's3' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLink();
                }}
                className="p-1.5 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
                title="Copy Link"
              >
                <Link size={18} className="text-[var(--text-secondary)]" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(transfer);
              }}
              className="p-1.5 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
              title="Download"
            >
              <Download size={18} className="text-[var(--text-secondary)]" />
            </button>
          </>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleQrCode();
          }}
          className="p-1.5 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
          title="QR Code"
        >
          <QrCode size={18} className="text-[var(--text-secondary)]" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(transfer);
          }}
          className="p-1.5 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 size={18} className="text-[var(--text-secondary)]" />
        </button>
      </div>
    </div>

    <QRCodeDialog
      url={qrCodeUrl}
      open={qrDialogOpen}
      onClose={() => setQrDialogOpen(false)}
    />
  </>
  );
}

export default observer(TransferItemInner);
