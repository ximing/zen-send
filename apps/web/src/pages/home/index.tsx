import React, { useEffect, useCallback, useState } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { HomeService } from './home.service';
import { AuthService } from '../../services/auth.service';
import { SendToolbarService } from './send-toolbar.service';
import { SocketService } from '../../services/socket.service';
import TransferChat from '../../components/transfer-chat';
import Sidebar from '../../components/sidebar';
import Toast from '../../components/toast';
import { Upload } from 'lucide-react';
import { getMimeTypeFromExtension } from '../../lib/zen-bridge';

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

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files: { name: string; size: number; type?: string; data?: ArrayBuffer }[] = [];
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
          // Fallback to inferring type from extension if file.type is empty
          const type = file.type || getMimeTypeFromExtension(file.name);
          files.push({
            name: file.name,
            size: file.size,
            type,
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
            // Fallback to inferring type from extension if file.type is empty
            const type = file.type || getMimeTypeFromExtension(file.name);
            files.push({
              name: file.name,
              size: file.size,
              type,
              data: buffer,
            });
          }
        }
      }

      if (files.length > 0) {
        service.addFiles(files);
      }
    },
    [service]
  );

  return (
    <div
      className={`h-screen bg-[var(--bg-primary)] flex overflow-hidden ${isDragging ? 'ring-2 ring-[var(--primary)] ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Sidebar />

      <main className="flex-1 ml-16 px-2 py-2 flex flex-col min-h-0 overflow-hidden">
        <div className="w-full flex flex-col flex-1 min-h-0 overflow-hidden">
          <TransferChat />

          {service.selectedFiles.length > 0 && (
            <div className="shrink-0 pt-2">
              <button
                onClick={() => sendToolbarService.sendFiles()}
                className="w-full py-3 px-4 bg-[var(--primary)] text-[var(--on-primary)] rounded-xl
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
