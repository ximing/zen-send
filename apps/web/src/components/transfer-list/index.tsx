import React from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { TransferListService, type TransferFilter } from './transfer-list.service';
import type { TransferSession, TransferItemType } from '@zen-send/shared';

const FILTERS: { label: string; value: TransferFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Files', value: 'file' },
  { label: 'Text', value: 'text' },
  { label: 'Clipboard', value: 'clipboard' },
];

const TYPE_ICONS: Record<TransferItemType, string> = {
  file: '📎',
  text: '✏️',
  clipboard: '📋',
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
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getTransferIcon(transfer: TransferSession): string {
  const firstItem = transfer.items?.[0];
  if (firstItem?.type) {
    return TYPE_ICONS[firstItem.type];
  }
  if (transfer.contentType.startsWith('text/') || transfer.originalFileName) {
    return TYPE_ICONS.file;
  }
  return TYPE_ICONS.clipboard;
}

function getTransferName(transfer: TransferSession): string {
  return transfer.items?.[0]?.name || transfer.originalFileName || 'Unknown';
}

// FilterTabs component
const FilterTabsComponent = observer(() => {
  const service = useService(TransferListService);

  return (
    <div className="flex gap-2 mb-4">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => service.setFilter(f.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${service.filter === f.value
              ? 'bg-primary text-on-primary'
              : 'bg-surface border border-border-default text-text-secondary hover:bg-bg-elevated'
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
  const icon = getTransferIcon(transfer);
  const name = getTransferName(transfer);
  const size = formatSize(transfer.totalSize);
  const time = formatRelativeTime(transfer.createdAt);

  return (
    <div className="p-4 bg-surface border border-border-default rounded-lg hover:bg-bg-elevated transition-colors cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl" role="img" aria-label="transfer type">
            {icon}
          </span>
          <div className="flex flex-col">
            <span className="text-text-primary font-medium">{name}</span>
            <span className="text-sm text-text-muted">{size}</span>
          </div>
        </div>
        <span className="text-sm text-text-muted">{time}</span>
      </div>
    </div>
  );
});

// EmptyState component
const EmptyStateComponent = observer(() => {
  const service = useService(TransferListService);
  const filterLabel = FILTERS.find((f) => f.value === service.filter)?.label ?? 'All';

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-4xl mb-4" role="img" aria-label="empty">
        📭
      </span>
      <p className="text-text-muted">
        No {filterLabel.toLowerCase()} transfers yet
      </p>
    </div>
  );
});

const TransferListContent = observer(() => {
  const service = useService(TransferListService);

  return (
    <div className="space-y-3">
      <FilterTabsComponent />

      {service.filteredTransfers.length === 0 ? (
        <EmptyStateComponent />
      ) : (
        service.filteredTransfers.map((transfer) => (
          <TransferItem key={transfer.id} transfer={transfer} />
        ))
      )}
    </div>
  );
});

export default bindServices(TransferListContent, [TransferListService]);
