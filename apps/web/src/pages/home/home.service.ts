import { Service } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import type { TransferSession } from '@zen-send/shared';

export type TransferFilter = 'all' | 'file' | 'text' | 'clipboard';

export class HomeService extends Service {
  transfers: TransferSession[] = [];
  selectedFiles: { name: string; size: number; data?: ArrayBuffer }[] = [];
  filter: TransferFilter = 'all';
  isLoading = false;
  error: string | null = null;

  get authService() {
    return this.resolve(AuthService);
  }

  get apiService() {
    return this.resolve(ApiService);
  }

  get socketService() {
    return this.resolve(SocketService);
  }

  get filteredTransfers() {
    if (this.filter === 'all') return this.transfers;
    return this.transfers.filter((t) =>
      t.items?.some((item) => item.type === this.filter)
    );
  }

  async loadTransfers() {
    this.isLoading = true;
    this.error = null;
    try {
      const response = await this.apiService.get<{ data: { transfers: TransferSession[] } }>(
        '/api/transfers'
      );
      this.transfers = response.data?.transfers || [];
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load transfers';
    } finally {
      this.isLoading = false;
    }
  }

  setFilter(filter: TransferFilter) {
    this.filter = filter;
  }

  addFiles(files: { name: string; size: number; data?: ArrayBuffer }[]) {
    this.selectedFiles = [...this.selectedFiles, ...files];
  }

  removeFile(index: number) {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  clearFiles() {
    this.selectedFiles = [];
  }
}
