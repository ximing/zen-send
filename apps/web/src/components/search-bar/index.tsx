import { observer, useService } from '@rabjs/react';
import { Search } from 'lucide-react';
import { HomeService } from '../../pages/home/home.service';
import { TransferChatService } from '../../components/transfer-chat/transfer-chat.service';

const TIME_FILTERS: { label: string; value: 'all' | 'today' | 'week' | 'month' }[] = [
  { label: 'All time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
];

const SearchBarComponent = observer(() => {
  const homeService = useService(HomeService);
  const chatService = useService(TransferChatService);

  return (
    <div className="space-y-3 mb-4">
      {/* Search Input */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          type="text"
          placeholder="Search transfers..."
          value={homeService.searchQuery}
          onChange={(e) => homeService.setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[var(--bg-surface)] rounded-xl
                     text-[var(--text-primary)] placeholder-[var(--text-muted)]
                     focus:outline-none transition-colors"
        />
      </div>

      {/* Time Filter only */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <select
            value={chatService.timeFilter}
            onChange={(e) => chatService.setTimeFilter(e.target.value as any)}
            className="w-full px-4 py-2 bg-[var(--bg-surface)] rounded-xl
                       text-[var(--text-primary)] appearance-none cursor-pointer
                       focus:outline-none transition-colors"
          >
            {TIME_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
});

export default SearchBarComponent;
