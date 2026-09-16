import React from 'react';
import { observer, useService } from '@rabjs/react';
import { HomeService, type TransferFilter } from '../../pages/home/home.service';

const FILTERS: { label: string; value: TransferFilter }[] = [
  { label: '全部', value: 'all' },
  { label: '文件', value: 'file' },
  { label: '文字', value: 'text' },
];

function FilterTabsInner() {
  const homeService = useService(HomeService);

  return (
    <div className="flex items-center justify-between shrink-0 mt-6 mb-[14px] mx-4">
      <div className="inline-flex bg-[var(--bg-elevated)] rounded-[10px] p-[3px]">
        {FILTERS.map((f) => {
          const isActive = homeService.filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => homeService.setTypeFilter(f.value)}
              className={`px-[15px] py-[5px] rounded-lg text-[13px] transition-colors
                ${
                  isActive
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium'
                    : 'text-[var(--text-secondary)]'
                }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <span className="text-[12px] text-[var(--text-muted)]">
        {homeService.filteredTransfers.length} 条记录
      </span>
    </div>
  );
}

export default observer(FilterTabsInner);
