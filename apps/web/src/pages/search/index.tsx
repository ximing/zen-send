import React, { useState, useCallback } from 'react';
import { observer, useService } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { HomeService, type TimeFilter } from '../home/home.service';
import TransferItem from '../../components/transfer-item';
import type { TransferSession } from '@zen-send/shared';

const TIME_FILTERS: { label: string; value: TimeFilter }[] = [
  { label: '全部', value: 'all' },
  { label: '今天', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
];

function SearchPage() {
  const navigate = useNavigate();
  const homeService = useService(HomeService);
  const [query, setQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
      homeService.setSearchQuery(text);
    },
    [homeService]
  );

  const handleBack = useCallback(() => {
    homeService.setSearchQuery('');
    navigate('/');
  }, [homeService, navigate]);

  const filteredTransfers = homeService.filteredTransfers;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 py-2 gap-2 shrink-0 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
        <button
          onClick={handleBack}
          className="p-1 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
        >
          <ChevronLeft size={24} className="text-[var(--text-primary)]" />
        </button>
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="搜索文件名..."
          autoFocus
          className="flex-1 h-10 px-3.5 bg-[var(--bg-surface)] rounded-[10px] text-sm
                     text-[var(--text-primary)] placeholder-[var(--text-muted)]
                     focus:outline-none"
        />
      </div>

      {/* Time filters */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto shrink-0">
        {TIME_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => {
              setTimeFilter(filter.value);
              homeService.setTimeFilter(filter.value);
            }}
            className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors
              ${
                timeFilter === filter.value
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="flex-1 min-h-0 overflow-y-auto py-2">
        {filteredTransfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-[var(--text-secondary)]">No results found</p>
          </div>
        ) : (
          filteredTransfers.map((transfer) => (
            <TransferItem
              key={transfer.id}
              transfer={transfer}
              onPreview={() => {
                homeService.setPreviewTransfer(transfer);
                handleBack();
              }}
              onDownload={async (t) => {
                try {
                  const blob = await homeService.apiService.getTransferFile(t.id);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = t.originalFileName || 'download';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (err) {
                  console.error('Download failed:', err);
                }
              }}
              onDelete={async (t) => {
                if (!confirm('确定要删除这条记录吗？')) return;
                try {
                  await homeService.apiService.deleteTransfer(t.id);
                  homeService.loadTransfers();
                } catch (err) {
                  console.error('Delete failed:', err);
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default observer(SearchPage);
