import React, { useEffect, useCallback, useState } from 'react';
import { observer, useService } from '@rabjs/react';
import { Upload } from 'lucide-react';
import { HomeService } from './home.service';
import { TextInputBar } from '../../components/text-input-bar';
import FilterTabs from '../../components/filter-tabs';
import TransferList from '../../components/transfer-list';
import { getMimeTypeFromExtension } from '../../lib/zen-bridge';

const HomeContent = observer(() => {
  const homeService = useService(HomeService);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    homeService.loadTransfers();
  }, [homeService]);

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
        homeService.sendFiles(files);
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
      <div className="flex-1 min-h-0 flex flex-col w-full max-w-[680px] mx-auto">
        <div className="px-4 pt-[18px] shrink-0">
          <TextInputBar />
        </div>
        <FilterTabs />
        <TransferList />
      </div>

      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--bg-primary)_82%,transparent)]">
          <div className="rounded-[24px] px-[72px] py-[52px] text-center bg-[var(--bg-surface)] shadow-[0_20px_60px_-20px_rgba(44,44,44,0.18)]">
            <div className="w-[84px] h-[84px] rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mx-auto mb-[18px]">
              <Upload size={36} />
            </div>
            <p className="text-[18px] font-semibold text-[var(--text-primary)]">松开即发送</p>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1.5">支持多文件和文件夹</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default HomeContent;
