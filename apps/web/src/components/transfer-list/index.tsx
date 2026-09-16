import React, { useCallback, useEffect, useRef, useState } from 'react';
import { observer, useService } from '@rabjs/react';
import { VList, type VListHandle } from 'virtua';
import { ChevronUp, Paperclip } from 'lucide-react';
import { HomeService } from '../../pages/home/home.service';
import { DeviceService } from '../../services/device.service';
import { SocketService } from '../../services/socket.service';
import { ToastService } from '../toast/toast.service';
import TransferItem from '../transfer-item';
import { PreviewModal } from '../preview-modal';
import { getDayGroupKey, getDayGroupLabel } from '../../lib/format-time-of-day';
import type { TransferSession } from '@zen-send/shared';

type TransferListRow =
  | { type: 'header'; key: string; label: string }
  | { type: 'item'; key: string; transfer: TransferSession };

function buildTransferListRows(transfers: TransferSession[]): TransferListRow[] {
  const newestFirst = transfers.slice().reverse();
  const rows: TransferListRow[] = [];
  let lastDayKey = '';

  for (const transfer of newestFirst) {
    const dayKey = getDayGroupKey(transfer.createdAt);
    if (dayKey !== lastDayKey) {
      lastDayKey = dayKey;
      rows.push({
        type: 'header',
        key: `day-${dayKey}`,
        label: getDayGroupLabel(transfer.createdAt),
      });
    }
    rows.push({ type: 'item', key: transfer.id, transfer });
  }

  return rows;
}

function TransferListInner() {
  const homeService = useService(HomeService);
  const deviceService = useService(DeviceService);
  const socketService = useService(SocketService);
  const toastService = useService(ToastService);
  const vlistRef = useRef<VListHandle>(null);
  const [newTransferCount, setNewTransferCount] = useState(0);
  const atTopRef = useRef(true);

  useEffect(() => {
    deviceService.loadDevices();
  }, [deviceService]);

  useEffect(() => {
    const handleTransferNew = (data: unknown) => {
      const payload = data as { session: TransferSession };
      const session = payload.session;
      if (!session) return;

      homeService.addTransfer(session);

      if (!atTopRef.current) {
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
  }, [socketService, homeService]);

  const scrollToTop = useCallback(() => {
    vlistRef.current?.scrollToIndex(0, { smooth: true });
    setNewTransferCount(0);
  }, []);

  const handleScroll = useCallback(
    (offset: number) => {
      const handle = vlistRef.current;
      if (!handle) return;

      const isAtTop = offset <= 1;
      atTopRef.current = isAtTop;
      if (isAtTop) setNewTransferCount(0);

      const isAtBottom = offset + handle.viewportSize >= handle.scrollSize - 1;
      if (isAtBottom && homeService.hasMore && !homeService.isLoadingOlder) {
        homeService.loadOlderTransfers();
      }
    },
    [homeService]
  );

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
    const isFilterEmpty = homeService.filter !== 'all';
    return (
      <div className="flex-1 flex flex-col items-center text-center pt-[72px] pb-10 px-4">
        <div className="w-[76px] h-[76px] rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] flex items-center justify-center mb-[18px]">
          <Paperclip size={32} />
        </div>
        <p className="text-[15px] font-medium text-[var(--text-primary)]">
          {isFilterEmpty ? '该分类下暂无记录' : '还没有传输记录'}
        </p>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-[1.7]">
          把文件拖进窗口,或在上方写一段文字
          <br />
          记录会按天整理在这里
        </p>
        <PreviewModal />
      </div>
    );
  }

  const rows = buildTransferListRows(transfers);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative">
      <VList ref={vlistRef} style={{ height: '100%' }} onScroll={handleScroll}>
        {rows.map((row, index) =>
          row.type === 'header' ? (
            <div
              key={row.key}
              className={`text-[12px] text-[var(--text-muted)] mx-[18px] mb-2 ${
                index === 0 ? 'mt-0' : 'mt-[22px]'
              }`}
            >
              {row.label}
            </div>
          ) : (
            <TransferItem
              key={row.key}
              transfer={row.transfer}
              onPreview={handlePreview}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          )
        )}
        {homeService.isLoadingOlder && (
          <div className="py-4 text-center">
            <div className="w-5 h-5 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}
      </VList>

      {newTransferCount > 0 && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2
            px-4 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-medium
            shadow-lg cursor-pointer hover:bg-[var(--accent)]/90 transition-colors z-10"
          onClick={scrollToTop}
        >
          <ChevronUp size={16} />
          <span>有 {newTransferCount} 条新记录</span>
        </div>
      )}

      <PreviewModal />
    </div>
  );
}

export default observer(TransferListInner);
