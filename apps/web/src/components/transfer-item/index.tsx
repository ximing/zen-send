import React, { useState, useEffect, useRef } from 'react';
import { prepare, layout } from '@chenglou/pretext';
import { observer, useService } from '@rabjs/react';
import { FileText, Image, Copy, Link, Download, Trash2, QrCode, X, ArrowUp } from 'lucide-react';
import { ApiService } from '../../services/api.service';
import { HomeService } from '../../pages/home/home.service';
import { ToastService } from '../toast/toast.service';
import { QRCodeDialog } from '../qr-code-dialog';
import { formatTimeOfDay } from '../../lib/format-time-of-day';
import type { TransferSession } from '@zen-send/shared';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatBytePair(uploaded: number, total: number): string {
  const divisor =
    total < 1024
      ? 1
      : total < 1024 * 1024
        ? 1024
        : total < 1024 * 1024 * 1024
          ? 1024 * 1024
          : 1024 * 1024 * 1024;
  const unit =
    divisor === 1 ? 'B' : divisor === 1024 ? 'KB' : divisor === 1024 * 1024 ? 'MB' : 'GB';
  if (unit === 'B') {
    return `${Math.round(uploaded)} / ${Math.round(total)} B`;
  }
  return `${(uploaded / divisor).toFixed(1)} / ${(total / divisor).toFixed(1)} ${unit}`;
}

const isImageMimeType = (mimeType: string | null | undefined): boolean => {
  if (!mimeType) return false;
  return mimeType.startsWith('image/');
};

const rowIconBtnClass =
  'w-[34px] h-[34px] inline-flex items-center justify-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors';
const rowDangerBtnClass =
  'w-[34px] h-[34px] inline-flex items-center justify-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--color-error)] transition-colors';
const noteIconBtnClass =
  'w-[30px] h-[30px] inline-flex items-center justify-center rounded-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors';

interface TransferItemProps {
  transfer: TransferSession;
  onPreview: (transfer: TransferSession) => void;
  onDownload: (transfer: TransferSession) => void;
  onDelete: (transfer: TransferSession) => void;
}

function TransferItemInner({ transfer, onPreview, onDownload, onDelete }: TransferItemProps) {
  const apiService = useService(ApiService);
  const homeService = useService(HomeService);
  const toastService = useService(ToastService);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflow, setIsOverflow] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const contentAreaRef = useRef<HTMLDivElement>(null);

  const firstItem = transfer.items?.[0];
  const isText = firstItem?.type === 'text';
  const isImage = !isText && isImageMimeType(firstItem?.mimeType);
  const name = isText
    ? firstItem?.content?.slice(0, 30) || '文字'
    : transfer.originalFileName || '文件';
  const size = firstItem?.size
    ? formatSize(firstItem.size)
    : transfer.totalSize
      ? formatSize(transfer.totalSize)
      : '';
  const absoluteTime = formatTimeOfDay(transfer.createdAt);

  const uploadingFile = homeService.uploadingFiles.find(
    (f) => f.id === transfer.id || f.sessionId === transfer.id
  );
  const isUploading = uploadingFile?.status === 'pending' || uploadingFile?.status === 'uploading';
  const isFailed = uploadingFile?.status === 'failed';

  useEffect(() => {
    if (!isImage || !firstItem?.id || isUploading || isFailed) {
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
  }, [isImage, firstItem, transfer.id, apiService, isUploading, isFailed]);

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
    setIsOverflow(lineCount > 3);

    const resizeObserver = new ResizeObserver(() => {
      if (!contentAreaRef.current) return;
      const { lineCount: nextCount } = layout(
        prepared,
        contentAreaRef.current.clientWidth,
        lineHeight
      );
      setIsOverflow(nextCount > 3);
    });
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [isText, firstItem?.content, isExpanded]);

  const handleCopyText = () => {
    if (firstItem?.content) {
      navigator.clipboard.writeText(firstItem.content);
      toastService.show('已复制到剪贴板', 'success');
    }
  };

  const handleCopyLink = async () => {
    if (firstItem?.storageType === 's3') {
      try {
        const { url } = await apiService.getTransferExternalLink(transfer.id);
        await navigator.clipboard.writeText(url);
        toastService.show('链接已复制', 'success');
      } catch {
        toastService.show('复制链接失败', 'error');
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
      toastService.show('生成二维码失败', 'error');
    }
  };

  const thumb = (
    <div className="relative w-[46px] h-[46px] rounded-[10px] bg-[var(--bg-elevated)] flex items-center justify-center overflow-hidden shrink-0">
      {isImage && thumbnailUrl ? (
        <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
      ) : isImage ? (
        <Image size={20} className="text-[var(--text-secondary)]" />
      ) : (
        <FileText size={20} className="text-[var(--text-secondary)]" />
      )}
      {isUploading && uploadingFile && (
        <span className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--primary)_35%,transparent)] text-[11px] font-semibold tabular-nums text-white">
          {Math.round(uploadingFile.progress)}%
        </span>
      )}
    </div>
  );

  if (isText) {
    return (
      <>
        <div
          className="group mx-4 mb-2 rounded-[14px] bg-[var(--accent-soft)] pt-[14px] px-4 pb-[11px] cursor-pointer"
          onClick={() => onPreview(transfer)}
        >
          <div
            ref={contentAreaRef}
            className={`text-[14px] leading-[1.65] text-[var(--text-primary)] whitespace-pre-wrap break-words ${
              !isExpanded ? 'line-clamp-3' : ''
            }`}
          >
            {firstItem?.content || '文字'}
          </div>
          {isOverflow && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-xs text-[var(--accent)] mt-0.5 hover:underline"
            >
              {isExpanded ? '收起' : '展开'}
            </button>
          )}
          <div className="flex items-center justify-between mt-[9px]">
            <span className="text-[11.5px] text-[var(--text-secondary)]">{absoluteTime}</span>
            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <button
                type="button"
                title="复制"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyText();
                }}
                className={noteIconBtnClass}
              >
                <Copy size={15} />
              </button>
              <button
                type="button"
                title="二维码"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQrCode();
                }}
                className={noteIconBtnClass}
              >
                <QrCode size={15} />
              </button>
              <button
                type="button"
                title="删除"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(transfer);
                }}
                className={noteIconBtnClass}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
        <QRCodeDialog url={qrCodeUrl} open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div
        className={`group flex items-center px-[14px] py-[11px] mx-4 mb-2 rounded-[14px] bg-[var(--bg-surface)] transition-[box-shadow] duration-150 ${
          isUploading ? 'cursor-default' : 'cursor-pointer hover:shadow-sm'
        }`}
        onClick={() => {
          if (isUploading || isFailed) return;
          onPreview(transfer);
        }}
      >
        {thumb}
        <div className="flex-1 min-w-0 ml-3">
          <div className="text-sm font-medium text-[var(--text-primary)] truncate">{name}</div>
          {isUploading && uploadingFile ? (
            <>
              <div className="text-xs mt-[3px] tabular-nums text-[var(--accent)]">
                {formatBytePair(uploadingFile.uploadedBytes ?? 0, uploadingFile.size)} ·{' '}
                {formatSize(uploadingFile.speed ?? 0)}/s
              </div>
              <div className="h-[3px] rounded-[2px] bg-[var(--bg-elevated)] mt-2 overflow-hidden">
                <div
                  className="h-full rounded-[2px] bg-[var(--accent)] transition-[width] duration-300"
                  style={{ width: `${uploadingFile.progress}%` }}
                />
              </div>
            </>
          ) : isFailed ? (
            <div className="text-xs mt-[3px] tabular-nums text-[var(--text-secondary)]">
              <span className="text-[var(--color-error)]">上传失败</span>
              {size ? ` · ${size}` : ''} · {absoluteTime}
            </div>
          ) : (
            <div className="text-xs mt-[3px] tabular-nums text-[var(--text-secondary)]">
              {size} · {absoluteTime}
            </div>
          )}
        </div>

        {isUploading && uploadingFile ? (
          <button
            type="button"
            title="取消"
            onClick={(e) => {
              e.stopPropagation();
              homeService.cancelUpload(uploadingFile.id);
            }}
            className="w-[34px] h-[34px] ml-2.5 inline-flex items-center justify-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors shrink-0"
          >
            <X size={15} />
          </button>
        ) : isFailed && uploadingFile ? (
          <div className="flex ml-2.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              type="button"
              title="重试"
              onClick={(e) => {
                e.stopPropagation();
                homeService.retryUpload(uploadingFile.id);
              }}
              className="w-[34px] h-[34px] inline-flex items-center justify-center rounded-[10px] text-[var(--accent)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <ArrowUp size={16} />
            </button>
            <button
              type="button"
              title="删除"
              onClick={(e) => {
                e.stopPropagation();
                homeService.discardFailedUpload(uploadingFile.id);
              }}
              className={rowDangerBtnClass}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <div className="flex ml-2.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              type="button"
              title="下载"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(transfer);
              }}
              className={rowIconBtnClass}
            >
              <Download size={16} />
            </button>
            {firstItem?.storageType === 's3' && (
              <button
                type="button"
                title="复制链接"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLink();
                }}
                className={rowIconBtnClass}
              >
                <Link size={16} />
              </button>
            )}
            <button
              type="button"
              title="二维码"
              onClick={(e) => {
                e.stopPropagation();
                handleQrCode();
              }}
              className={rowIconBtnClass}
            >
              <QrCode size={16} />
            </button>
            <button
              type="button"
              title="删除"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(transfer);
              }}
              className={rowDangerBtnClass}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <QRCodeDialog url={qrCodeUrl} open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} />
    </>
  );
}

export default observer(TransferItemInner);
