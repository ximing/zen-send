import React, { useState, useCallback } from 'react';
import { observer, useService } from '@rabjs/react';
import {
  FileText,
  Pencil,
  CheckCircle,
  AlertCircle,
  Download,
  Eye,
} from 'lucide-react';
import type { TransferSession, TransferItemType } from '@zen-send/shared';
import { DeviceTag } from './device-tag';
import { useTransferBubble } from './hooks/use-transfer-bubble';
import { HomeService, type UploadingFile } from '../../pages/home/home.service';
import { ApiService } from '../../services/api.service';

const TYPE_ICONS: Record<TransferItemType, React.ReactNode> = {
  file: <FileText size={24} className="text-[var(--text-secondary)]" />,
  text: <Pencil size={24} className="text-[var(--text-secondary)]" />,
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'JUST_NOW';
  if (minutes < 60) return `${minutes}M_AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H_AGO`;
  const days = Math.floor(hours / 24);
  return `${days}D_AGO`;
}

interface MessageBubbleProps {
  transfer: TransferSession;
  uploadingFile?: UploadingFile;
}

export const MessageBubble: React.FC<MessageBubbleProps> = observer(({ transfer, uploadingFile }) => {
  const homeService = useService(HomeService);
  const apiService = useService(ApiService);
  const { direction, device, isSent } = useTransferBubble(transfer);

  const firstItem = transfer.items?.[0];
  const itemType = firstItem?.type || 'file';
  const icon = TYPE_ICONS[itemType];

  const [isHovered, setIsHovered] = useState(false);

  const isUploading = uploadingFile && (uploadingFile.status === 'uploading' || uploadingFile.status === 'pending');
  const isCompleted = uploadingFile?.status === 'completed' || transfer.status === 'completed';
  const isFailed = uploadingFile?.status === 'failed' || transfer.status === 'failed';

  const handlePreview = useCallback(() => {
    homeService.setPreviewTransfer(transfer);
  }, [homeService, transfer]);

  const handleDownload = useCallback(async () => {
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

  const getProgress = () => {
    if (uploadingFile) return uploadingFile.progress;
    if (transfer.status === 'completed') return 100;
    return 0;
  };

  return (
    <div
      className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-3`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={new Date(transfer.createdAt).toLocaleString('zh-CN')}
    >
      <div
        className={`relative max-w-[70%] rounded-2xl px-4 py-3 transition-all
          ${isSent
            ? 'bg-[var(--primary)]/10 rounded-br-md'
            : 'bg-[var(--bg-elevated)] rounded-bl-md'
          }
          ${isHovered ? 'shadow-md' : ''}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Thumbnail/Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-[var(--bg-surface)] rounded-lg flex items-center justify-center overflow-hidden">
            {icon}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-[var(--text-primary)] font-medium truncate">
              {transfer.originalFileName || 'Unknown'}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              {formatSize(transfer.totalSize)}
            </div>

            {/* Progress bar for uploading */}
            {isUploading && (
              <div className="mt-2">
                <div className="h-[3px] bg-[var(--border-subtle)] rounded-[2px] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] transition-[width] duration-200 ease"
                    style={{ width: `${getProgress()}%` }}
                  />
                </div>
                {uploadingFile.speed !== undefined && uploadingFile.speed > 0 && (
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">
                    {formatSize(uploadingFile.speed)}/s
                  </div>
                )}
              </div>
            )}

            {/* Status indicators */}
            {isCompleted && (
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle size={12} className="text-[var(--color-success)]" />
                <span className="text-[10px] text-[var(--color-success)]">Completed</span>
              </div>
            )}

            {isFailed && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle size={12} className="text-[var(--color-error)]" />
                <span className="text-[10px] text-[var(--color-error)]">Failed</span>
              </div>
            )}
          </div>

          {/* Action buttons on hover */}
          {isHovered && !isUploading && (
            <div className={`flex gap-1 ${isSent ? 'order-1' : 'order-3'}`}>
              <button
                onClick={handlePreview}
                className="p-1.5 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
                title="Preview"
              >
                <Eye size={14} className="text-[var(--text-secondary)]" />
              </button>
              <button
                onClick={handleDownload}
                className="p-1.5 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
                title="Download"
              >
                <Download size={14} className="text-[var(--text-secondary)]" />
              </button>
            </div>
          )}
        </div>

        {/* Device tag */}
        <div className={`mt-2 ${isSent ? 'text-right' : 'text-left'}`}>
          <DeviceTag device={device} direction={direction} />
        </div>

        {/* Time */}
        <div className={`text-[10px] text-[var(--text-muted)] mt-1 ${isSent ? 'text-right' : 'text-left'}`}>
          {formatRelativeTime(transfer.createdAt)}
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;