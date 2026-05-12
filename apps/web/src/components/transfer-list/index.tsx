import React, { useCallback, useRef, useEffect } from 'react';
import { observer, useService } from '@rabjs/react';
import { MailOpen } from 'lucide-react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    deviceService.loadDevices();

    const handleTransferNew = (data: unknown) => {
      const session = data as TransferSession;
      homeService.addTransfer(session);
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
  }, [deviceService, socketService, homeService]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop } = containerRef.current;
    if (
      scrollTop < 200 &&
      homeService.hasMore &&
      !homeService.isLoadingOlder
    ) {
      homeService.loadOlderTransfers();
    }
  }, [homeService]);

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

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2"
        onScroll={handleScroll}
      >
        {transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center pt-20">
            <MailOpen size={48} className="text-[var(--text-secondary)] mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">No transfers yet</p>
          </div>
        ) : (
          <>
            {transfers.map((transfer) => (
              <TransferItem
                key={transfer.id}
                transfer={transfer}
                onPreview={handlePreview}
                onDownload={handleDownload}
                onDelete={handleDelete}
              />
            ))}

            {homeService.hasMore && (
              <div className="py-4 text-center">
                <div className="w-5 h-5 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}
          </>
        )}
      </div>

      <PreviewModal />
    </div>
  );
}

export default observer(TransferListInner);
