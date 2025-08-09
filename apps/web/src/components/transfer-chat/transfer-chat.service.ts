import { Service } from '@rabjs/react';
import type { TransferSession } from '@zen-send/shared';

export type ChatTimeFilter = 'all' | 'today' | 'week' | 'month';

interface DateGroup {
  label: string;
  date: Date;
  transfers: TransferSession[];
}

export class TransferChatService extends Service {
  searchQuery = '';
  timeFilter: ChatTimeFilter = 'all';

  getDateGroups(transfers: TransferSession[]): DateGroup[] {
    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups: Map<string, { label: string; date: Date; transfers: TransferSession[] }> = new Map();

    for (const transfer of transfers) {
      const transferDate = new Date(transfer.createdAt);
      let groupKey: string;
      let groupLabel: string;

      if (transferDate >= startOfToday) {
        groupKey = 'today';
        groupLabel = '今天';
      } else if (transferDate >= startOfWeek) {
        groupKey = 'week';
        groupLabel = '本周';
      } else if (transferDate >= startOfMonth) {
        groupKey = 'month';
        groupLabel = '本月';
      } else {
        groupKey = transferDate.toISOString().split('T')[0];
        groupLabel = transferDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, { label: groupLabel, date: transferDate, transfers: [] });
      }
      groups.get(groupKey)!.transfers.push(transfer);
    }

    // Convert to array and sort by date descending
    return Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  filterTransfers(transfers: TransferSession[], searchQuery: string, timeFilter: ChatTimeFilter): TransferSession[] {
    let filtered = [...transfers];

    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      const startOfToday = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter((t) => {
        const transferDate = new Date(t.createdAt);
        if (timeFilter === 'today') return transferDate >= startOfToday;
        if (timeFilter === 'week') return transferDate >= startOfWeek;
        if (timeFilter === 'month') return transferDate >= startOfMonth;
        return true;
      });
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => {
        const name = (t.originalFileName || '').toLowerCase();
        const textContent = t.items?.find((item) => item.type === 'text')?.content?.toLowerCase() || '';
        return name.includes(query) || textContent.includes(query);
      });
    }

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }

  setSearchQuery(query: string) {
    this.searchQuery = query;
  }

  setTimeFilter(filter: ChatTimeFilter) {
    this.timeFilter = filter;
  }
}

export default TransferChatService;
