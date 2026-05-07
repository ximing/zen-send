import React from 'react';
import { observer, useService } from '@rabjs/react';
import { HomeService, type TransferFilter } from '../../pages/home/home.service';

const FILTERS: { label: string; value: TransferFilter }[] = [
  { label: 'ALL', value: 'all' },
  { label: 'FILES', value: 'file' },
  { label: 'TEXT', value: 'text' },
];

function FilterTabsInner() {
  const homeService = useService(HomeService);

  return (
    <div className="flex gap-2 px-4 py-3">
      {FILTERS.map((f) => {
        const isActive = homeService.filter === f.value;
        return (
          <button
            key={f.value}
            onClick={() => homeService.setTypeFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors
              ${
                isActive
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]/80'
              }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

export default observer(FilterTabsInner);
