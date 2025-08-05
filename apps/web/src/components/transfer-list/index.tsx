import React, { useCallback } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { FileText, Pencil, MailOpen, Eye, Download, Trash2, X, AlertTriangle } from 'lucide-react';
import { HomeService, type TransferFilter } from '../../pages/home/home.service';
import { ApiService } from '../../services/api.service';
import SearchBarComponent from '../search-bar';
import PreviewModalComponent from '../preview-modal';
import type { TransferSession, TransferItemType } from '@zen-send/shared';

const FILTERS: { label: string; value: TransferFilter }[] = [
  { label: 'ALL', value: 'all' },
  { label: 'FILES', value: 'file' },
  { label: 'TEXT', value: 'text' },
];

const TYPE_ICONS: Record<TransferItemType, React.ReactNode> = {
  file: <FileText size={18} className="text-[var(--text-secondary)]" />,
  text: <Pencil size={18} className="text-[var(--text-secondary)]" />,
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'JUST_NOW';
  if (minutes < 60) return `${minutes}M_AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H_AGO`;
  const days = Math.floor(hours / 24);
  return `${days}D_AGO`;
}

function getTransferIcon(transfer: TransferSession): React.ReactNode {
  const firstItem = transfer.items?.[0];
  if (firstItem?.type) {
    return TYPE_ICONS[firstItem.type];
  }
  if (transfer.contentType.startsWith('text/') || transfer.originalFileName) {
    return TYPE_ICONS.file;
  }
  return TYPE_ICONS.file;
}

function getTransferName(transfer: TransferSession): string {
  return transfer.items?.[0]?.name || transfer.originalFileName || 'UNKNOWN';
}

// FilterTabs component
const FilterTabsComponent = observer(() => {
  const service = useService(HomeService);

  return (
    <div className="flex gap-2 mb-4">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => service.setTypeFilter(f.value)}
          className={`px-4 py-2 rounded-md text-xs tracking-wider transition-colors
            ${service.filter === f.value
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
            }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
});

// TransferItem component
const TransferItem = observer(({ transfer }: { transfer: TransferSession }) => {
  const homeService = useService(HomeService);
  const apiService = useService(ApiService);
  const icon = getTransferIcon(transfer);
  const name = getTransferName(transfer);
  const size = formatSize(transfer.totalSize);
  const time = formatRelativeTime(transfer.createdAt);
  const isDeleteConfirm = homeService.deleteConfirmId === transfer.id;

  const handlePreview = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      homeService.setPreviewTransfer(transfer);
    },
    [homeService, transfer]
  );

  const handleDownload = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
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
    [apiService, transfer]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      homeService.setDeleteConfirm(transfer.id);
    },
    [homeService, transfer.id]
  );

  const handleConfirmDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await apiService.deleteTransfer(transfer.id);
        homeService.setDeleteConfirm(null);
        await homeService.loadTransfers();
      } catch (err) {
        console.error('Delete failed:', err);
      }
    },
    [apiService, homeService, transfer.id]
  );

  const handleCancelDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      homeService.setDeleteConfirm(null);
    },
    [homeService]
  );

  return (
    <div
      className={`p-4 bg-[var(--bg-surface)] border rounded-xl transition-colors
        ${isDeleteConfirm ? 'border-[var(--danger)] bg-[var(--danger)]/10' : 'border-[var(--border-default)] hover:border-[var(--border-subtle)]'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span>{icon}</span>
          <div className="flex flex-col">
            <span className="text-[var(--text-primary)] font-medium">{name}</span>
            <span className="text-xs text-[var(--text-muted)]">{size}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] mr-2">{time}</span>

          {isDeleteConfirm ? (
            <>
              <button
                onClick={handleConfirmDelete}
                className="p-2 hover:bg-[var(--danger)]/20 rounded-lg transition-colors text-[var(--danger)]"
                title="Confirm delete"
              >
                <AlertTriangle size={18} />
              </button>
              <button
                onClick={handleCancelDelete}
                className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                title="Cancel"
              >
                <X size={18} className="text-[var(--text-secondary)]" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handlePreview}
                className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                title="Preview"
              >
                <Eye size={18} className="text-[var(--text-secondary)]" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                title="Download"
              >
                <Download size={18} className="text-[var(--text-secondary)]" />
              </button>
              <button
                onClick={handleDeleteClick}
                className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 size={18} className="text-[var(--text-secondary)]" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

// EmptyState component
const EmptyStateComponent = observer(() => {
  const service = useService(HomeService);
  const filterLabel = FILTERS.find((f) => f.value === service.filter)?.label ?? 'ALL';

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <MailOpen size={48} className="text-[var(--text-muted)] mb-4" />
      <p className="text-[var(--text-muted)]">
        NO_{filterLabel}_TRANSFERS_YET
      </p>
    </div>
  );
});

const TransferListContent = observer(() => {
  const service = useService(HomeService);

  return (
    <div className="space-y-3">
      <SearchBarComponent />
      <FilterTabsComponent />

      {service.filteredTransfers.length === 0 ? (
        <EmptyStateComponent />
      ) : (
        <>
          {service.filteredTransfers.map((transfer) => (
            <TransferItem key={transfer.id} transfer={transfer} />
          ))}

          {service.hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={() => service.loadMoreTransfers()}
                disabled={service.isLoading}
                className="px-6 py-2 text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-default)] disabled:opacity-50"
              >
                {service.isLoading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}

      <PreviewModalComponent />
    </div>
  );
});

export default bindServices(TransferListContent, [HomeService, ApiService]);