import React from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { FileText, Pencil, MailOpen } from 'lucide-react';
import { TransferListService, type TransferFilter } from './transfer-list.service';
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
  const service = useService(TransferListService);

  return (
    <div className="flex gap-2 mb-4">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => service.setFilter(f.value)}
          className={`px-4 py-2 rounded-md text-xs tracking-wider transition-colors
            ${service.filter === f.value
              ? 'bg-[var(--primary)] text-[var(--on-primary)]'
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
  const icon = getTransferIcon(transfer);
  const name = getTransferName(transfer);
  const size = formatSize(transfer.totalSize);
  const time = formatRelativeTime(transfer.createdAt);

  return (
    <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-default)]
                    rounded-lg hover:border-[var(--border-subtle)] transition-colors cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span>{icon}</span>
          <div className="flex flex-col">
            <span className="text-[var(--text-primary)] font-medium">{name}</span>
            <span className="text-xs text-[var(--text-muted)]">{size}</span>
          </div>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{time}</span>
      </div>
    </div>
  );
});

// EmptyState component
const EmptyStateComponent = observer(() => {
  const service = useService(TransferListService);
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
