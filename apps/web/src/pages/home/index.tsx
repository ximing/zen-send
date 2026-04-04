import React, { useEffect, useCallback, useState } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { HomeService, UploadingFile } from './home.service';
import { AuthService } from '../../services/auth.service';
import { SendToolbarService } from '../../components/send-toolbar/send-toolbar.service';
import { TransferListService } from '../../components/transfer-list/transfer-list.service';
import { SocketService } from '../../services/socket.service';
import SendToolbar from '../../components/send-toolbar';
import TransferList from '../../components/transfer-list';
import Sidebar from '../../components/sidebar';
import Toast from '../../components/toast';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';

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

  const renderUploadProgress = (upload: UploadingFile) => {
    const icon = upload.status === 'completed' ? CheckCircle :
                 upload.status === 'failed' ? AlertCircle : Upload;
    const iconColor = upload.status === 'completed' ? 'text-[var(--color-success)]' :
                      upload.status === 'failed' ? 'text-[var(--color-error)]' :
                      'text-[var(--text-secondary)]';

    return (
      <div
        key={upload.id}
        className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg"
      >
        {React.createElement(icon, { size: 16, className: iconColor })}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--text-primary)] truncate">{upload.name}</div>
          {upload.status === 'uploading' && (
            <div className="mt-1 h-1 bg-[var(--bg-primary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${upload.progress}%` }}
              />
            </div>
          )}
          {upload.status === 'failed' && (
            <div className="text-xs text-[var(--color-error)] mt-1">{upload.error}</div>
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

      <main className="flex-1 ml-16 max-w-2xl mx-auto px-6 py-10">
        <SendToolbar />

        {service.uploadingFiles.length > 0 && (
          <div className="mb-8">
            <div className="label mb-3">UPLOADING</div>
            <div className="space-y-2">
              {service.uploadingFiles.map(renderUploadProgress)}
            </div>
          </div>
        )}

        <TransferList />

        {service.selectedFiles.length > 0 && (
          <div className="mt-10">
            <button
              onClick={() => sendToolbarService.sendFiles()}
              className="w-full py-3 px-4 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg
                         font-medium tracking-wider hover:bg-[var(--primary-hover)] transition-colors"
            >
              SEND
            </button>
          </div>
        )}
      </main>

      {isDragging && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 pointer-events-none">
          <div className="text-center">
            <Upload size={48} className="text-[var(--primary)] mx-auto mb-4" />
            <p className="text-lg text-[var(--text-primary)]">Drop files here</p>
          </div>
        </div>
      )}

      <Toast />
    </div>
  );
});

export default bindServices(HomeContent, [HomeService, SendToolbarService, TransferListService]);
