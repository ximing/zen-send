import React, { useEffect, useCallback, useState } from 'react';
import { observer, useService } from '@rabjs/react';
import { Upload } from 'lucide-react';
import { HomeService } from './home.service';
import { SocketService } from '../../services/socket.service';
import FilterTabs from '../../components/filter-tabs';
import TransferList from '../../components/transfer-list';
import SelectedFiles from '../../components/selected-files';
import BottomToolbar from '../../components/bottom-toolbar';
import Toast from '../../components/toast';
import { getMimeTypeFromExtension } from '../../lib/zen-bridge';

const HomeContent = observer(() => {
  const homeService = useService(HomeService);
  const socketService = useService(SocketService);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    homeService.loadTransfers();
    socketService.connect();
  }, [homeService, socketService]);

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
          const type = file.type || getMimeTypeFromExtension(file.name);
          files.push({ name: file.name, size: file.size, type, data: buffer });
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
            const type = file.type || getMimeTypeFromExtension(file.name);
            files.push({ name: file.name, size: file.size, type, data: buffer });
          }
        }
      }

      if (files.length > 0) {
        homeService.addFiles(files);
        homeService.uploadFiles();
      }
    },
    [homeService]
  );

  return (
    <div
      className={`flex-1 min-h-0 flex flex-col relative
        ${isDragging ? 'ring-2 ring-[var(--accent)] ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <SelectedFiles />
      <FilterTabs />
      <TransferList />
      <BottomToolbar />

      {isDragging && (
        <div className="absolute inset-0 bg-[var(--bg-primary)]/80 flex items-center justify-center z-50">
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

export default HomeContent;
