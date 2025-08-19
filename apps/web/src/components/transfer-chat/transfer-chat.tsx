import React, { useEffect, useRef, useState, useCallback } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { MailOpen } from 'lucide-react';
import { getMimeTypeFromExtension } from '../../lib/zen-bridge';
import { HomeService, type UploadingFile } from '../../pages/home/home.service';
import { DeviceService } from '../../services/device.service';
import { SocketService } from '../../services/socket.service';
import { TransferChatService } from './transfer-chat.service';
import { MessageBubble } from './message-bubble';
import { DateSeparator } from './date-separator';
import BottomToolbar from './bottom-toolbar';
import { SearchModal } from './search-modal';
import { PreviewModal } from '../preview-modal';

const TransferChatContent = observer(() => {
  const homeService = useService(HomeService);
  const deviceService = useService(DeviceService);
  const socketService = useService(SocketService);
  const chatService = useService(TransferChatService);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const prevTransfersLengthRef = useRef(0);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const fileData = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type || getMimeTypeFromExtension(file.name),
      data: undefined as ArrayBuffer | undefined,
    }));

    // Read and upload
    files.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = () => {
        fileData[i].data = reader.result as ArrayBuffer;
        homeService.addFiles([fileData[i]]);
        homeService.uploadFiles();
      };
      reader.onerror = () => {
        console.error('Failed to read file:', file.name);
      };
      reader.readAsArrayBuffer(file);
    });
  }, [homeService]);

  useEffect(() => {
    deviceService.loadDevices();

    // Socket event handlers for real-time transfer updates
    const handleTransferNew = (session: unknown) => {
      // Add new transfer to the list and refresh
      homeService.loadTransfers();
      // Scroll to bottom when new transfer arrives
      setTimeout(scrollToBottom, 100);
    };

    const handleTransferComplete = (data: unknown) => {
      // Update session status to completed
      const { sessionId } = data as { sessionId: string };
      homeService.markTransferComplete(sessionId);
    };

    socketService.onTransferNew(handleTransferNew);
    socketService.onTransferComplete(handleTransferComplete);

    return () => {
      socketService.offTransferNew(handleTransferNew);
      socketService.offTransferComplete(handleTransferComplete);
    };
  }, [deviceService, socketService, homeService, scrollToBottom]);

  // Get filtered and grouped transfers using Service methods
  const transfers = homeService.transfers;
  const filtered = chatService.filterTransfers(transfers, chatService.searchQuery, chatService.timeFilter);
  const dateGroups = chatService.getDateGroups(filtered);

  // Auto-scroll to bottom when transfers list grows (new messages sent or received)
  useEffect(() => {
    if (transfers.length > prevTransfersLengthRef.current) {
      prevTransfersLengthRef.current = transfers.length;
      scrollToBottom();
    }
  }, [transfers.length, scrollToBottom]);

  // Create a map of uploading files by uploadId or sessionId
  const uploadingFilesMap = new Map<string, UploadingFile>();
  for (const file of homeService.uploadingFiles) {
    // Map by sessionId if available
    if (file.sessionId) {
      uploadingFilesMap.set(file.sessionId, file);
    }
    // Also map by uploadId for temporary transfers
    uploadingFilesMap.set(file.id, file);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3 py-2"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-[var(--bg-surface)]/80 flex items-center justify-center z-10 rounded-2xl">
            <div className="text-center">
              <div className="text-4xl mb-2">📤</div>
              <div className="text-[var(--text-primary)] font-medium">释放文件上传</div>
            </div>
          </div>
        )}
        {dateGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MailOpen size={48} className="text-[var(--text-muted)] mb-4" />
            <p className="text-[var(--text-muted)]">
              NO_TRANSFERS_YET
            </p>
          </div>
        ) : (
          <>
            {dateGroups.map((group) => (
              <div key={group.label}>
                <DateSeparator date={group.label} />
                {group.transfers.map((transfer) => (
                  <div key={transfer.id} id={`transfer-${transfer.id}`}>
                    <MessageBubble
                      transfer={transfer}
                      uploadingFile={uploadingFilesMap.get(transfer.id)}
                    />
                  </div>
                ))}
              </div>
            ))}

            {homeService.hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => homeService.loadMoreTransfers()}
                  disabled={homeService.isLoading}
                  className="px-6 py-2 text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] disabled:opacity-50"
                >
                  {homeService.isLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <BottomToolbar />
      <SearchModal />
<PreviewModal />
    </div>
  );
});

export default bindServices(TransferChatContent, [TransferChatService]);
