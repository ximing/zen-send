import React, { useState, useCallback, useEffect } from 'react';
import { observer, useService } from '@rabjs/react';
import { FileText, Pencil, CheckCircle, AlertCircle, Download, Eye, Copy, Link } from 'lucide-react';
import type { TransferSession, TransferItemType, DeviceType } from '@zen-send/shared';
import { useTransferBubble } from './hooks/use-transfer-bubble';
import { HomeService, type UploadingFile } from '../../pages/home/home.service';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../toast/toast.service';
import iconSprite from '../../assets/icon.png';

const TYPE_ICONS: Record<TransferItemType, React.ReactNode> = {
  file: <FileText size={24} className="text-[var(--text-secondary)]" />,
  text: <Pencil size={24} className="text-[var(--text-secondary)]" />,
};

// Sprite map: 1000x420px, 4x2 grid
// Icons are roughly 184x184px
// Layout:
// Row 1: Light Web, Light Android, Dark Web, Dark Android
// Row 2: Light iOS, Light Desktop, Dark iOS, Dark Desktop
const DEVICE_SPRITE_CENTERS: Record<DeviceType, { light: {x: number, y: number}, dark: {x: number, y: number} }> = {
  web: { dark: { x: 132, y: 94.5 }, light: { x: 619.5, y: 94.5 } },
  android: { dark: { x: 377, y: 94.5 }, light: { x: 864, y: 94.5 } },
  ios: { dark: { x: 132, y: 326.5 }, light: { x: 619.5, y: 326.5 } },
  desktop: { dark: { x: 377, y: 326.5 }, light: { x: 864, y: 326.5 } },
};

const isImageType = (contentType?: string) => {
  if (!contentType) return false;
  return contentType.startsWith('image/');
};

const formatSpeed = (bytesPerSec: number): string => {
  if (bytesPerSec > 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
};

const formatEta = (seconds: number): string => {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

interface DeviceIconProps {
  deviceType: DeviceType;
  className?: string;
  isDarkTheme?: boolean;
}

const DeviceIcon: React.FC<DeviceIconProps> = ({ deviceType, className, isDarkTheme = false }) => {
  const centers = DEVICE_SPRITE_CENTERS[deviceType] || DEVICE_SPRITE_CENTERS.web;
  const { x: centerX, y: centerY } = isDarkTheme ? centers.dark : centers.light;
  
  // Scale image so icon (184px) becomes 28px (leaves 6px padding in 40px container)
  const scale = 28 / 184;
  const bgWidth = 1000 * scale;
  const bgHeight = 420 * scale;
  
  const posX = 20 - centerX * scale;
  const posY = 20 - centerY * scale;

  return (
    <div
      className={`w-10 h-10 flex-shrink-0 ${className || ''}`}
      style={{
        backgroundImage: `url(${iconSprite})`,
        backgroundPosition: `${posX}px ${posY}px`,
        backgroundSize: `${bgWidth}px ${bgHeight}px`,
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatRelativeTime(timestamp: number): string {
  // Handle timestamp in seconds or milliseconds
  const ts = timestamp > 1e12 ? timestamp : timestamp * 1000;
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(ts).toLocaleDateString('zh-CN');
}

interface MessageBubbleProps {
  transfer: TransferSession;
  uploadingFile?: UploadingFile;
}

export const MessageBubble: React.FC<MessageBubbleProps> = observer(
  ({ transfer, uploadingFile }) => {
    const homeService = useService(HomeService);
    const apiService = useService(ApiService);
    const themeService = useService(ThemeService);
    const toastService = useService(ToastService);
    const { direction, device, isSent } = useTransferBubble(transfer);
    const isDarkTheme = themeService.resolvedTheme === 'dark';

    const firstItem = transfer.items?.[0];
    const itemType = firstItem?.type || 'file';
    const icon = TYPE_ICONS[itemType];

    // Determine content type for image detection - prefer item mimeType over session contentType
    const effectiveContentType = firstItem?.mimeType || transfer.contentType;

    // Multi-file detection
    const itemCount = transfer.items?.length ?? 1;
    const isMultiFile = itemCount > 1;
    const displayFileName = isMultiFile
      ? `${transfer.originalFileName} 等 ${itemCount} 个文件`
      : transfer.originalFileName || 'Unknown';

    // Thumbnail items for multi-file display (max 4)
    const thumbnailItems = isMultiFile ? (transfer.items ?? []).slice(0, 4) : [];

    const [isHovered, setIsHovered] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    // Load image preview for image types
    useEffect(() => {
      if (!isImageType(effectiveContentType)) {
        setImageUrl(null);
        return;
      }

      let revoked = false;
      apiService
        .getTransferFile(transfer.id)
        .then((blob) => {
          if (revoked) return;
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        })
        .catch(() => {
          if (!revoked) setImageUrl(null);
        });

      return () => {
        revoked = true;
        setImageUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      };
    }, [apiService, transfer.id, effectiveContentType]);

    const textContent = firstItem?.content || '';
    const isLongText = textContent.length > 150;

    const isUploading =
      uploadingFile && (uploadingFile.status === 'uploading' || uploadingFile.status === 'pending');
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

    const handleCopyLink = useCallback(async () => {
      try {
        const { url } = await apiService.getTransferExternalLink(transfer.id);
        await navigator.clipboard.writeText(url);
        toastService.show('链接已复制，可在 6 小时内访问', 'success');
      } catch (err) {
        console.error('Failed to copy link:', err);
        toastService.show('复制链接失败', 'error');
      }
    }, [apiService, transfer.id, toastService]);

    const getProgress = () => {
      if (uploadingFile) return uploadingFile.progress;
      if (transfer.status === 'completed') return 100;
      return 0;
    };

    return (
      <div
        className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-2 px-1`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={new Date(transfer.createdAt).toLocaleString('zh-CN')}
      >
        <div className={`flex items-start ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Device Icon - external on the side */}
          <DeviceIcon
            deviceType={device?.type || 'web'}
            isDarkTheme={isDarkTheme}
            className={isSent ? 'ml-2' : 'mr-2'}
          />

          {/* Tail - CSS triangle pointing to icon, matches bubble background */}
          <div
            className={`w-0 h-0 border-t-8 border-b-8 border-t-transparent border-b-transparent mt-3 ${
              isSent ? 'border-l-8 -ml-px' : 'border-r-8 -mr-px'
            }`}
            style={{
              [isSent ? 'borderLeftColor' : 'borderRightColor']: isPending
                ? 'var(--bg-surface)'
                : 'var(--bg-elevated)',
            }}
          />

          {/* Bubble */}
          <div
            className={`relative max-w-[70%] min-w-[180px] rounded-2xl px-4 py-2.5 transition-all duration-150
            ${isPending ? 'bg-[var(--bg-surface)] opacity-50' : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80'}
            ${isHovered ? 'shadow-lg' : ''}
          `}
          >
            {/* Image message - full width, no gap */}
            {imageUrl && itemType !== 'text' && isImageType(effectiveContentType) ? (
              <div className="w-full -mx-4">
                <img
                  src={imageUrl}
                  alt={transfer.originalFileName}
                  className="w-full max-h-[300px] rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={handlePreview}
                />
              </div>
            ) : (
              /* File/Text message layout */
              <div className="flex items-center gap-4">
                {/* Icon for files, not for text */}
                {itemType !== 'text' && (
                  <div className="flex-shrink-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={transfer.originalFileName}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    ) : (
                      icon
                    )}
                  </div>
                )}

                {/* File Info - compact vertical stack */}
                <div className="flex-1 min-w-0">
                  {itemType === 'text' && firstItem?.content ? (
                    <div>
                      <div
                        className={`text-sm leading-relaxed whitespace-pre-wrap ${isExpired ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'} ${isLongText && !isExpanded ? 'line-clamp-3' : ''}`}
                      >
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
                    <div
                      className={`text-sm font-medium truncate leading-relaxed max-w-full w-full ${isExpired ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}
                    >
                      {displayFileName}
                    </div>
                  )}

                  {/* Upload progress bar */}
                  {isUploading && uploadingFile && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent)] transition-all duration-300 ease-out"
                          style={{ width: `${uploadingFile.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-xs text-[var(--text-muted)]">
                        <span>{uploadingFile.progress}%</span>
                        {uploadingFile.speed !== undefined && uploadingFile.speed > 0 && (
                          <span>
                            {formatSpeed(uploadingFile.speed)}
                            {uploadingFile.eta !== undefined && uploadingFile.eta > 0 && (
                              <> · ETA {formatEta(uploadingFile.eta)}</>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
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
                        <Copy
                          size={16}
                          className="text-[var(--text-secondary)] hover:text-[var(--accent)]"
                        />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handlePreview}
                          className="p-2 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye
                            size={16}
                            className="text-[var(--text-secondary)] hover:text-[var(--accent)]"
                          />
                        </button>
                        <button
                          onClick={handleDownload}
                          className="p-2 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download
                            size={16}
                            className="text-[var(--text-secondary)] hover:text-[var(--accent)]"
                          />
                        </button>
                        {firstItem?.storageType === 's3' && (
                          <button
                            onClick={handleCopyLink}
                            className="p-2 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
                            title="Copy Link"
                          >
                            <Link
                              size={16}
                              className="text-[var(--text-secondary)] hover:text-[var(--accent)]"
                            />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Bottom row: Size + Status + Time */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-subtle)]/30">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span>{formatSize(transfer.totalSize)}</span>
                {isCompleted && !isUploading && (
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
              <span className="text-xs text-[var(--text-muted)]">
                {formatRelativeTime(transfer.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default MessageBubble;
