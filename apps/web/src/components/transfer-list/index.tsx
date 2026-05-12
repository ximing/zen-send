import React, { useCallback, useEffect, useRef, useState } from 'react';
import { observer, useService } from '@rabjs/react';
import {
  VirtuosoMessageList,
  VirtuosoMessageListLicense,
  VirtuosoMessageListMethods,
} from '@virtuoso.dev/message-list';
import { ChevronDown, MailOpen } from 'lucide-react';
import { HomeService } from '../../pages/home/home.service';
import { DeviceService } from '../../services/device.service';
import { SocketService } from '../../services/socket.service';
import { ToastService } from '../toast/toast.service';
import TransferItem from '../transfer-item';
import { PreviewModal } from '../preview-modal';
import type { TransferSession } from '@zen-send/shared';

function TransferListInner() {
  const homeService = useService(HomeService);
  const deviceService = useService(DeviceService);
  const socketService = useService(SocketService);
  const toastService = useService(ToastService);
  const virtuosoRef = useRef<VirtuosoMessageListMethods<TransferSession, null>>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [newTransferCount, setNewTransferCount] = useState(0);

  useEffect(() => {
    deviceService.loadDevices();
  }, [deviceService]);

  useEffect(() => {
    const handleTransferNew = (data: unknown) => {
      const payload = data as { session: TransferSession };
      const session = payload.session;
      if (!session) return;

      // addTransfer already deduplicates by id
      homeService.addTransfer(session);

      if (!atBottom) {
        setNewTransferCount((c) => c + 1);
      }
    };

    const handleTransferComplete = (data: unknown) => {
      const { sessionId } = data as { sessionId: string };
      homeService.markTransferComplete(sessionId);
    };

    socketService.onTransferNew(handleTransferNew);
    socketService.onTransferComplete(handleTransferComplete);

    return () => {
      socketService.offTransferNew(handleTransferNew);
      socketService.offTransferComplete(handleTransferComplete);
    };
  }, [socketService, homeService, atBottom]);

  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToItem({ index: 'LAST', align: 'end' });
    setNewTransferCount(0);
  }, []);

  const handlePreview = useCallback(
    (transfer: TransferSession) => {
      homeService.setPreviewTransfer(transfer);
    },
    [homeService]
  );

  const handleDownload = useCallback(
    async (transfer: TransferSession) => {
      try {
        const apiService = homeService.apiService;
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
    },
    [homeService]
  );

  const handleDelete = useCallback(
    async (transfer: TransferSession) => {
      const ok = await toastService.confirm('确定要删除这条记录吗？');
      if (!ok) return;
      try {
        await homeService.apiService.deleteTransfer(transfer.id);
        homeService.loadTransfers();
      } catch (err) {
        console.error('Delete failed:', err);
      }
    },
    [homeService, toastService]
  );

  if (homeService.isLoading && homeService.transfers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const transfers = homeService.filteredTransfers;

  if (transfers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center pt-20">
        <MailOpen size={48} className="text-[var(--text-secondary)] mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">No transfers yet</p>
        <PreviewModal />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative">
      <VirtuosoMessageListLicense licenseKey="">
        <VirtuosoMessageList<TransferSession, null>
          ref={virtuosoRef}
          data={{
            data: transfers,
            scrollModifier: {
              type: 'auto-scroll-to-bottom',
              autoScroll: ({ atBottom, scrollInProgress }) => {
                if (atBottom || scrollInProgress) {
                  return { index: 'LAST', align: 'end', behavior: 'smooth' };
                }
                return false;
              },
            },
          }}
          style={{ height: '100%' }}
          computeItemKey={({ data }) => data.id}
          ItemContent={({ data }) => (
            <TransferItem
              transfer={data}
              onPreview={handlePreview}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          )}
          onScroll={(location) => {
            setAtBottom(location.isAtBottom);
            if (location.isAtBottom) setNewTransferCount(0);
            if (location.listOffset === 0 && homeService.hasMore && !homeService.isLoadingOlder) {
              homeService.loadOlderTransfers();
            }
          }}
          Header={() =>
            homeService.isLoadingOlder ? (
              <div className="py-4 text-center">
                <div className="w-5 h-5 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : null
          }
        />
      </VirtuosoMessageListLicense>

      {/* New transfer banner */}
      {newTransferCount > 0 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2
            px-4 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-medium
            shadow-lg cursor-pointer hover:bg-[var(--accent)]/90 transition-colors z-10"
          onClick={scrollToBottom}
        >
          <span>{newTransferCount} 条新传输</span>
          <ChevronDown size={16} />
        </div>
      )}

      {/* Scroll to bottom button */}
      {!atBottom && newTransferCount === 0 && (
        <button
          className="absolute bottom-4 right-4 w-10 h-10 rounded-full
            bg-[var(--bg-surface)] border border-[var(--border-subtle)]
            shadow-md flex items-center justify-center
            hover:bg-[var(--bg-elevated)] transition-colors z-10"
          onClick={scrollToBottom}
        >
          <ChevronDown size={20} className="text-[var(--text-secondary)]" />
        </button>
      )}

      <PreviewModal />
    </div>
  );
}

export default observer(TransferListInner);
