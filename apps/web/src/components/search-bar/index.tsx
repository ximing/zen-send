import { observer, useService } from '@rabjs/react';
import { Search, Filter } from 'lucide-react';
import { HomeService, type TransferFilter, type TimeFilter } from '../../pages/home/home.service';

const TYPE_FILTERS: { label: string; value: TransferFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Files', value: 'file' },
  { label: 'Text', value: 'text' },
];

const TIME_FILTERS: { label: string; value: TimeFilter }[] = [
  { label: 'All time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
];

const SearchBarComponent = observer(() => {
  const service = useService(HomeService);

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
          value={service.searchQuery}
          onChange={(e) => service.setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)]
                     rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)]
                     focus:outline-none focus:border-[var(--primary)] transition-colors"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="flex gap-3">
        {/* Type Filter */}
        <div className="relative flex-1">
          <Filter
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <select
            value={service.filter}
            onChange={(e) => service.setTypeFilter(e.target.value as TransferFilter)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)]
                       rounded-lg text-[var(--text-primary)] appearance-none cursor-pointer
                       focus:outline-none focus:border-[var(--primary)] transition-colors"
          >
            {TYPE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Time Filter */}
        <div className="relative flex-1">
          <select
            value={service.timeFilter}
            onChange={(e) => service.setTimeFilter(e.target.value as TimeFilter)}
            className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)]
                       rounded-lg text-[var(--text-primary)] appearance-none cursor-pointer
                       focus:outline-none focus:border-[var(--primary)] transition-colors"
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