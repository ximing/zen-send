import React, { useState, useCallback } from 'react';
import { observer, useService } from '@rabjs/react';
import {
  FileText,
  Pencil,
  CheckCircle,
  AlertCircle,
  Download,
  Eye,
  Copy,
  Globe,
  Smartphone,
  Tablet,
  Monitor,
} from 'lucide-react';
import type { TransferSession, TransferItemType, DeviceType } from '@zen-send/shared';
import { DeviceTag } from './device-tag';
import { useTransferBubble } from './hooks/use-transfer-bubble';
import { HomeService, type UploadingFile } from '../../pages/home/home.service';
import { ApiService } from '../../services/api.service';

const TYPE_ICONS: Record<TransferItemType, React.ReactNode> = {
  file: <FileText size={24} className="text-[var(--text-secondary)]" />,
  text: <Pencil size={24} className="text-[var(--text-secondary)]" />,
};

const DEVICE_TYPE_ICONS: Record<DeviceType, React.ReactNode> = {
  web: <Globe size={18} />,
  android: <Smartphone size={18} />,
  ios: <Tablet size={18} />,
  desktop: <Monitor size={18} />,
};

const DEVICE_ICON_COLORS = {
  sent: '#22c55e',
  received: '#a855f7',
} as const;

const isImageType = (contentType?: string) => {
  if (!contentType) return false;
  return contentType.startsWith('image/');
};

interface DeviceIconProps {
  deviceType: DeviceType;
  isSent: boolean;
}

const DeviceIcon: React.FC<DeviceIconProps> = ({ deviceType, isSent }) => {
  const color = isSent ? DEVICE_ICON_COLORS.sent : DEVICE_ICON_COLORS.received;
  return (
    <div
      className="w-10 h-10 rounded-full border-2 bg-white shadow-md flex items-center justify-center flex-shrink-0"
      style={{ borderColor: color, color }}
    >
      {DEVICE_TYPE_ICONS[deviceType]}
    </div>
  );
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

  // Multi-file detection
  const itemCount = transfer.items?.length ?? 1;
  const isMultiFile = itemCount > 1;
  const displayFileName = isMultiFile
    ? `${transfer.originalFileName} 等 ${itemCount} 个文件`
    : (transfer.originalFileName || 'Unknown');

  // Thumbnail items for multi-file display (max 4)
  const thumbnailItems = isMultiFile ? (transfer.items ?? []).slice(0, 4) : [];

  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const textContent = firstItem?.content || '';
  const isLongText = textContent.length > 150;

  const isUploading = uploadingFile && (uploadingFile.status === 'uploading' || uploadingFile.status === 'pending');
  const isCompleted = uploadingFile?.status === 'completed' || transfer.status === 'completed';
  const isFailed = uploadingFile?.status === 'failed' || transfer.status === 'failed';
  const isPending = transfer.status === 'pending';
  const isExpired = transfer.status === 'expired';

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

  const handleCopyText = useCallback(() => {
    if (firstItem?.content) {
      navigator.clipboard.writeText(firstItem.content);
    }
  }, [firstItem]);

  const getProgress = () => {
    if (uploadingFile) return uploadingFile.progress;
    if (transfer.status === 'completed') return 100;
    return 0;
  };

  return (
    <div
      className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-2 px-3`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={new Date(transfer.createdAt).toLocaleString('zh-CN')}
    >
      <div className={`flex items-start ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Device Icon - external on the side */}
        {device && (
          <DeviceIcon deviceType={device.type} isSent={isSent} />
        )}

        {/* Tail - CSS triangle pointing to icon, matches bubble background */}
        <div
          className={`w-0 h-0 border-t-8 border-b-8 border-t-transparent border-b-transparent ${
            isSent
              ? 'border-r-8 border-r-[var(--bg-elevated)] -ml-0.5'
              : 'border-l-8 border-l-[var(--bg-elevated)] -mr-0.5'
          }`}
        />

        {/* Bubble */}
        <div
          className={`relative max-w-[90%] min-w-[260px] rounded-2xl px-5 py-3 transition-all duration-150
            ${isPending ? 'bg-[var(--bg-surface)] opacity-50' : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80'}
            ${isHovered ? 'shadow-lg' : ''}
          `}
        >
          {/* Compact single-line layout */}
          <div className="flex items-center gap-4">
            {/* Icon for files, not for text */}
            {itemType !== 'text' && (
              <div className="flex-shrink-0">
                {icon}
              </div>
            )}

            {/* File Info - compact vertical stack */}
            <div className="flex-1 min-w-0">
              {itemType === 'text' && firstItem?.content ? (
                <div>
                  <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isExpired ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'} ${isLongText && !isExpanded ? 'line-clamp-3' : ''}`}>
                    {firstItem.content}
                  </div>
                  {isLongText && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] mt-1"
                    >
                      {isExpanded ? '收起' : '展开'}
                    </button>
                  )}
                </div>
              ) : (
                <div className={`text-sm font-medium truncate leading-relaxed ${isExpired ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                  {displayFileName}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
                <span>{formatSize(transfer.totalSize)}</span>
                {isCompleted && (
                  <span className="flex items-center gap-1 text-[var(--color-success)]">
                    <CheckCircle size={10} /> Done
                  </span>
                )}
                {isFailed && (
                  <span className="flex items-center gap-1 text-[var(--color-error)]">
                    <AlertCircle size={10} /> Failed
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {(isHovered || isCompleted) && !isUploading && !isPending && !isExpired && (
              <div className={`flex gap-2 flex-shrink-0 ${isSent ? 'order-1' : 'order-3'}`}>
                {itemType === 'text' ? (
                  <button
                    onClick={handleCopyText}
                    className="p-2 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
                    title="Copy"
                  >
                    <Copy size={16} className="text-[var(--text-secondary)] hover:text-[var(--accent)]" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handlePreview}
                      className="p-2 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
                      title="Preview"
                    >
                      <Eye size={16} className="text-[var(--text-secondary)] hover:text-[var(--accent)]" />
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-2 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download size={16} className="text-[var(--text-secondary)] hover:text-[var(--accent)]" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Bottom row: Device tag + Time */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border-subtle)]/30">
            <DeviceTag device={device} direction={direction} />
            <span className="text-xs text-[var(--text-muted)]">
              {formatRelativeTime(transfer.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;