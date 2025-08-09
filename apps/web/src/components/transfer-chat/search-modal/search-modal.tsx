import React, { useState, useEffect, useCallback, useRef } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { X, Search } from 'lucide-react';
import { HomeService } from '../../../pages/home/home.service';
import { TransferChatService } from '../transfer-chat.service';
import type { TransferSession } from '@zen-send/shared';

const TIME_FILTERS = [
  { label: '全部', value: 'all' },
  { label: '今天', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
] as const;

const SearchModal = observer(() => {
  const homeService = useService(HomeService);
  const chatService = useService(TransferChatService);
  const [query, setQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (chatService.searchModalOpen && inputRef.current) {
      const timeout = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [chatService.searchModalOpen]);

  // Handle dialog show/close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (chatService.searchModalOpen) {
      dialog.showModal();
      setQuery('');
      setTimeFilter('all');
    } else {
      dialog.close();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [chatService.searchModalOpen]);

  const handleClose = useCallback(() => {
    chatService.closeSearchModal();
  }, [chatService]);

  // Get filtered results
  const results = chatService.filterTransfers(
    homeService.transfers,
    query,
    timeFilter
  );

  const handleResultClick = useCallback((transfer: TransferSession) => {
    // Scroll to transfer in chat list
    const element = document.getElementById(`transfer-${transfer.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    homeService.setPreviewTransfer(transfer);
    handleClose();
  }, [homeService, handleClose]);

  return (
    <dialog
      ref={dialogRef}
      className="max-w-2xl w-[90vw] mx-auto my-auto bg-[var(--bg-surface)] rounded-2xl shadow-xl p-0 backdrop:bg-black/30"
    >
      <div className="p-4">
        {/* Search Input */}
        <div className="flex items-center gap-2 mb-4">
          <Search size={18} className="text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文件名或内容..."
            className="flex-1 bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--border-focus)] border border-[var(--border-subtle)]"
          />
          <button
            onClick={handleClose}
            className="p-1 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          >
            <X size={18} className="text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Time Filter */}
        <div className="flex gap-2 mb-4">
          {TIME_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setTimeFilter(filter.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors
                ${timeFilter === filter.value
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]/80'
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {results.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              {query ? '未找到匹配结果' : '输入关键词搜索'}
            </div>
          ) : (
            results.map((transfer) => (
              <button
                key={transfer.id}
                onClick={() => handleResultClick(transfer)}
                className="w-full text-left p-3 bg-[var(--bg-surface)] rounded-xl hover:bg-[var(--bg-surface)]/80 transition-colors"
              >
                <div className="text-sm text-[var(--text-primary)] truncate">
                  {transfer.originalFileName || '文本消息'}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  {new Date(transfer.createdAt).toLocaleString('zh-CN')}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </dialog>
  );
});

export { SearchModal };
export default SearchModal;
