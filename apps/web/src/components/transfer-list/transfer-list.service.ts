import { Service } from '@rabjs/react';
import { HomeService, type TransferFilter } from '../../pages/home/home.service';
import type { TransferSession, TransferItemType } from '@zen-send/shared';

export type { TransferFilter };

export class TransferListService extends Service {
  filter: TransferFilter = 'all';

  get homeService() {
    return this.resolve(HomeService);
  }

  get filteredTransfers(): TransferSession[] {
    const transfers = this.homeService?.transfers ?? [];
    const filtered =
      this.filter === 'all'
        ? transfers
        : transfers.filter((t) => t.items?.some((item) => item.type === this.filter));

    // Sort by time descending (newest first)
    return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
  }

  setFilter(filter: TransferFilter) {
    this.filter = filter;
  }
}
