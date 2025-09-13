import React from 'react';
import { observer, useService } from '@rabjs/react';
import { X } from 'lucide-react';
import { HomeService, type UploadingFile } from '../../pages/home/home.service';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

function SelectedFileItem({
  progress,
  onCancel,
  onRemove,
}: {
  progress: UploadingFile;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const getStatusColor = () => {
    switch (progress.status) {
      case 'uploading':
        return 'var(--accent)';
      case 'completed':
        return '#22C55E';
      case 'failed':
        return '#EF4444';
      case 'cancelled':
        return 'var(--text-secondary)';
      default:
        return 'var(--text-secondary)';
    }
  };

  return (
    <div className="flex items-center p-3 rounded-[10px] mb-2 bg-[var(--bg-surface)]">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--text-primary)] truncate">
          {progress.name}
        </div>
        {progress.status === 'uploading' && (
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
            {progress.progress.toFixed(0)}% · {formatSize(progress.speed ?? 0)}/s · ETA{' '}
            {formatTime(progress.eta ?? 0)}
          </div>
        )}
        {progress.status === 'completed' && (
          <div className="text-xs mt-0.5" style={{ color: '#22C55E' }}>
            Completed
          </div>
        )}
        {progress.status === 'failed' && (
          <div className="text-xs mt-0.5" style={{ color: '#EF4444' }}>
            Failed
          </div>
        )}
        {progress.status === 'cancelled' && (
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">Cancelled</div>
        )}
      </div>
      <div className="ml-3 flex items-center gap-2 shrink-0">
        {progress.status === 'uploading' && (
          <div className="w-16 h-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ backgroundColor: getStatusColor(), width: `${progress.progress}%` }}
            />
          </div>
        )}
        <button
          onClick={progress.status === 'uploading' ? onCancel : onRemove}
          className="p-1 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
        >
          <X size={18} className="text-[var(--text-secondary)]" />
        </button>
      </div>
    </div>
  );
}

function SelectedFilesInner() {
  const homeService = useService(HomeService);

  if (homeService.uploadingFiles.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-2">
      {homeService.uploadingFiles.map((progress) => (
        <SelectedFileItem
          key={progress.id}
          progress={progress}
          onCancel={() => homeService.cancelUpload(progress.id)}
          onRemove={() => homeService.removeUpload(progress.id)}
        />
      ))}
    </div>
  );
}

export default observer(SelectedFilesInner);
