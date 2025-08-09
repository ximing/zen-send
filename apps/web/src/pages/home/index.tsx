import React, { useEffect, useCallback, useState } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { HomeService, UploadingFile } from './home.service';
import { AuthService } from '../../services/auth.service';
import { SendToolbarService } from '../../components/send-toolbar/send-toolbar.service';
import { SocketService } from '../../services/socket.service';
import SendToolbar from '../../components/send-toolbar';
import TransferChat from '../../components/transfer-chat';
import Sidebar from '../../components/sidebar';
import Toast from '../../components/toast';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';

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

const HomeContent = observer(() => {
  const service = useService(HomeService);
  const authService = useService(AuthService);
  const sendToolbarService = useService(SendToolbarService);
  const socketService = useService(SocketService);
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);

  if (!authService.isAuthenticated) {
    navigate('/login');
    return null;
  }

  useEffect(() => {
    service.loadTransfers();
    socketService.connect();
  }, [service, socketService]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files: { name: string; size: number; data?: ArrayBuffer }[] = [];
    const items = e.dataTransfer.items;

    const MAX_DEPTH = 10;

    const processEntry = async (entry: FileSystemEntry, depth: number): Promise<void> => {
      if (depth > MAX_DEPTH) return;

      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        const file = await new Promise<File>((resolve, reject) => {
          fileEntry.file(resolve, reject);
        });

        if (file.name.startsWith('.')) return;

        const buffer = await file.arrayBuffer();
        files.push({
          name: file.name,
          size: file.size,
          data: buffer,
        });
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const reader = dirEntry.createReader();

        const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
          reader.readEntries(resolve, reject);
        });

        for (const childEntry of entries) {
          await processEntry(childEntry, depth + 1);
        }
      }
    };

    for (const item of Array.from(items)) {
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        await processEntry(entry, 0);
      } else {
        const file = item.getAsFile();
        if (file && !file.name.startsWith('.')) {
          const buffer = await file.arrayBuffer();
          files.push({
            name: file.name,
            size: file.size,
            data: buffer,
          });
        }
      }
    }

    if (files.length > 0) {
      service.addFiles(files);
    }
  }, [service]);

  const formatSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  };

  const renderUploadProgress = (upload: UploadingFile) => {
    const icon = upload.status === 'completed' ? CheckCircle :
                 upload.status === 'failed' ? AlertCircle : Upload;
    const iconColor = upload.status === 'completed' ? 'text-[var(--color-success)]' :
                      upload.status === 'failed' ? 'text-[var(--color-error)]' :
                      'text-[var(--text-secondary)]';

    return (
      <div
        key={upload.id}
        className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-lg"
      >
        {React.createElement(icon, { size: 16, className: iconColor })}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--text-primary)] truncate">{upload.name}</div>
          {upload.status === 'uploading' && (
            <>
              <div className="mt-1 h-[3px] bg-[var(--border-subtle)] rounded-[2px] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-[width] duration-200 ease"
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                {upload.speed !== undefined && upload.speed > 0 && (
                  <span>{formatSpeed(upload.speed)}</span>
                )}
                {upload.eta !== undefined && upload.eta > 0 && (
                  <span>ETA {formatEta(upload.eta)}</span>
                )}
              </div>
            </>
          )}
          {upload.status === 'completed' && (
            <div className="text-xs text-[var(--text-secondary)] mt-1">
              {formatSize(upload.size)}
            </div>
          )}
          {upload.status === 'failed' && (
            <div className="flex items-center gap-2 mt-1">
              <div className="text-xs text-[var(--color-error)]">{upload.error}</div>
              <button
                onClick={() => service.retryUpload(upload.id)}
                className="text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
              >
                Retry
              </button>
            </div>
          )}
        </div>
        {(upload.status === 'uploading' || upload.status === 'pending') && (
          <button
            onClick={() => service.cancelUpload(upload.id)}
            className="text-[var(--text-muted)] hover:text-[var(--color-error)]"
          >
            <X size={16} />
          </button>
        )}
        {(upload.status === 'completed' || upload.status === 'cancelled' || upload.status === 'failed') && (
          <button
            onClick={() => service.removeUpload(upload.id)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen bg-[var(--bg-primary)] flex ${isDragging ? 'ring-2 ring-[var(--primary)] ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Sidebar />

      <main className="flex-1 ml-16 px-6 py-10">
        <div className="max-w-2xl mx-auto">
          <SendToolbar />

        {service.uploadingFiles.length > 0 && (
          <div className="mb-8">
            <div className="label mb-3">UPLOADING</div>
            <div className="space-y-2">
              {service.uploadingFiles.map(renderUploadProgress)}
            </div>
          </div>
        )}

        <TransferChat />

        {service.selectedFiles.length > 0 && (
          <div className="mt-10">
            <button
              onClick={() => sendToolbarService.sendFiles()}
              className="w-full py-4 px-4 bg-[var(--primary)] text-[var(--on-primary)] rounded-xl
                         font-medium tracking-wider hover:bg-[var(--primary-hover)] transition-colors"
            >
              SEND
            </button>
          </div>
        )}
        </div>
      </main>

      {isDragging && (
        <div className="fixed inset-0 bg-[var(--primary)]/10 flex items-center justify-center z-50">
          <div className="rounded-2xl p-16 text-center bg-[var(--bg-surface)]">
            <Upload size={64} className="text-[var(--accent)] mx-auto mb-4" />
            <p className="text-xl text-[var(--text-primary)] font-medium">Release to upload</p>
          </div>
        </div>
      )}

      <Toast />
    </div>
  );
});

export default bindServices(HomeContent, [HomeService, SendToolbarService]);
