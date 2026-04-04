import React, { useEffect, useRef } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { MailOpen } from 'lucide-react';
import { HomeService, type UploadingFile } from '../../pages/home/home.service';
import { DeviceService } from '../../services/device.service';
import { SocketService } from '../../services/socket.service';
import { TransferChatService } from './transfer-chat.service';
import { MessageBubble } from './message-bubble';
import { DateSeparator } from './date-separator';
import SearchBarComponent from '../search-bar';

const TransferChatContent = observer(() => {
  const homeService = useService(HomeService);
  const deviceService = useService(DeviceService);
  const socketService = useService(SocketService);
  const chatService = useService(TransferChatService);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    deviceService.loadDevices();
  }, [deviceService]);

  // Get filtered and grouped transfers
  const filteredTransfers = chatService.filterTransfers(
    homeService.transfers,
    homeService.searchQuery,
    chatService.timeFilter
  );
  const dateGroups = chatService.getDateGroups(filteredTransfers);

  // Create a map of uploading files by session id
  const uploadingFilesMap = new Map<string, UploadingFile>();
  for (const file of homeService.uploadingFiles) {
    if (file.sessionId) {
      uploadingFilesMap.set(file.sessionId, file);
    }
  }

  return (
    <div className="space-y-3">
      <SearchBarComponent />

      {dateGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MailOpen size={48} className="text-[var(--text-muted)] mb-4" />
          <p className="text-[var(--text-muted)]">
            NO_TRANSFERS_YET
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="space-y-2">
          {dateGroups.map((group) => (
            <div key={group.label}>
              <DateSeparator date={group.label} />
              {group.transfers.map((transfer) => (
                <MessageBubble
                  key={transfer.id}
                  transfer={transfer}
                  uploadingFile={uploadingFilesMap.get(transfer.id)}
                />
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
        </div>
      )}
    </div>
  );
});

export default bindServices(TransferChatContent, [HomeService, DeviceService, SocketService, TransferChatService]);
