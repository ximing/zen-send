import { Service } from '@rabjs/react';
import * as Clipboard from 'expo-clipboard';
import { ApiService } from './api.service';
import { SocketService } from './socket.service';
import type { TransferSession } from '@zen-send/shared';

export type TransferFilter = 'all' | 'file' | 'text';

// Upload progress tracking
export interface UploadProgress {
  sessionId: string;
  fileName: string;
  progress: number; // 0-100
  speed: number; // bytes per second
  eta: number; // seconds remaining
  status: 'uploading' | 'completed' | 'failed' | 'cancelled';
}

export class HomeService extends Service {
  transfers: TransferSession[] = [];
  filter: TransferFilter = 'all';
  loading = false;
  loadingMore = false;
  offset = 0;
  hasMore = true;
  searchQuery = '';
  uploadProgress: UploadProgress[] = [];

  private readonly LIMIT = 50;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor() {
    super();
    this.loadTransfers();
  }

  get apiService() {
    return this.resolve(ApiService);
  }

  get socketService() {
    return this.resolve(SocketService);
  }

  get filteredTransfers() {
    let result = this.transfers;

    // Apply type filter
    if (this.filter !== 'all') {
      result = result.filter((t) => t.items?.[0]?.type === this.filter);
    }

    // Apply search filter (client-side)
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.items?.some((item) => item.name?.toLowerCase().includes(query))
      );
    }

    return result;
  }

  async loadTransfers() {
    this.loading = true;
    try {
      const response = await this.apiService.get<{ transfers: TransferSession[] }>(
        `/api/transfers?limit=${this.LIMIT}&offset=0`
      );
      this.transfers = response.transfers;
      this.offset = this.transfers.length;
      this.hasMore = response.transfers.length === this.LIMIT;
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      this.loading = false;
    }
  }

  async loadMore() {
    if (this.loadingMore || !this.hasMore) return;
    this.loadingMore = true;
    try {
      const response = await this.apiService.get<{ transfers: TransferSession[] }>(
        `/api/transfers?limit=${this.LIMIT}&offset=${this.offset}`
      );
      this.transfers = [...this.transfers, ...response.transfers];
      this.offset += response.transfers.length;
      this.hasMore = response.transfers.length === this.LIMIT;
    } catch (err) {
      console.error('Failed to load more transfers:', err);
    } finally {
      this.loadingMore = false;
    }
  }

  setFilter(filter: TransferFilter) {
    this.filter = filter;
  }

  setSearchQuery(query: string) {
    this.searchQuery = query;
  }

  addTransfer(transfer: TransferSession) {
    this.transfers = [transfer, ...this.transfers];
  }

  updateTransfer(transfer: TransferSession) {
    const index = this.transfers.findIndex((t) => t.id === transfer.id);
    if (index !== -1) {
      this.transfers[index] = transfer;
    }
  }

  // Read clipboard content
  async readClipboard(): Promise<string | null> {
    const text = await Clipboard.getStringAsync();
    return text || null;
  }

  // Delete a transfer
  async deleteTransfer(sessionId: string): Promise<void> {
    await this.apiService.delete(`/api/transfers/${sessionId}`);
    this.transfers = this.transfers.filter((t) => t.id !== sessionId);
  }

  // Send text
  async sendText(text: string): Promise<void> {
    const apiService = this.resolve(ApiService);
    await apiService.post('/api/transfers/init', {
      type: 'text',
      content: text,
      totalSize: new TextEncoder().encode(text).length,
      contentType: 'text/plain',
      sourceDeviceId: 'mobile-device',
    });
  }

  // Upload files with progress, retry, and cancellation
  async uploadFiles(documents: { uri: string; name?: string; mimeType?: string }[]): Promise<void> {
    const apiService = this.resolve(ApiService);
    const socketService = this.resolve(SocketService);

    for (const doc of documents) {
      const sessionId = 'upload-' + Math.random().toString(36).slice(2);
      const abortController = new AbortController();
      this.abortControllers.set(sessionId, abortController);

      // Initialize progress
      const progressEntry: UploadProgress = {
        sessionId,
        fileName: doc.name || 'Unknown',
        progress: 0,
        speed: 0,
        eta: 0,
        status: 'uploading',
      };
      this.uploadProgress = [...this.uploadProgress, progressEntry];

      try {
        // Get file info
        const response = await fetch(doc.uri);
        const blob = await response.blob();
        const size = blob.size;

        // For files <= 10KB, send as text inline
        if (size <= 10 * 1024) {
          const content = await blob.text();
          await apiService.post('/api/transfers/init', {
            type: 'text',
            content,
            totalSize: size,
            contentType: doc.mimeType || 'application/octet-stream',
            sourceDeviceId: 'mobile-device',
          });
          this.updateProgress(sessionId, 100, size, size, 'completed');
        } else {
          // Initialize transfer for S3 upload
          const initResponse = await apiService.post<{
            sessionId: string;
            presignedUrls: string[];
            chunkSize: number;
          }>('/api/transfers/init', {
            type: 'file',
            fileName: doc.name,
            totalSize: size,
            contentType: doc.mimeType || 'application/octet-stream',
            chunkCount: Math.ceil(size / (1024 * 1024)),
            sourceDeviceId: 'mobile-device',
          });

          // Upload chunks with parallelization and retry
          const chunkSize = initResponse.chunkSize || 1024 * 1024;
          const chunks: { index: number; blob: Blob }[] = [];

          let offset = 0;
          let chunkIndex = 0;
          while (offset < size) {
            chunks.push({
              index: chunkIndex,
              blob: blob.slice(offset, offset + chunkSize),
            });
            offset += chunkSize;
            chunkIndex++;
          }

          // Parallel upload with retry (max 3 attempts per chunk)
          const MAX_RETRIES = 3;
          const uploadedChunks: boolean[] = new Array(chunks.length).fill(false);
          let uploadedBytes = 0;
          const startTime = Date.now();

          await Promise.all(
            chunks.map(async (chunk, idx) => {
              let attempts = 0;
              while (attempts < MAX_RETRIES && !uploadedChunks[idx]) {
                try {
                  const presignedUrl = initResponse.presignedUrls[idx];

                  await fetch(presignedUrl, {
                    method: 'PUT',
                    body: chunk.blob,
                    signal: abortController.signal,
                  });

                  // Report chunk
                  await apiService.post(`/api/transfers/${initResponse.sessionId}/chunks`, {
                    chunkIndex: chunk.index,
                    etag: 'etag',
                  });

                  uploadedChunks[idx] = true;
                  uploadedBytes += chunk.blob.size;

                  // Update progress
                  const elapsed = (Date.now() - startTime) / 1000;
                  const speed = uploadedBytes / elapsed;
                  const remaining = size - uploadedBytes;
                  const eta = remaining / speed;
                  const progress = (uploadedBytes / size) * 100;

                  this.updateProgress(sessionId, progress, speed, eta, 'uploading');
                } catch (err) {
                  if (err instanceof Error && err.name === 'AbortError') {
                    throw err;
                  }
                  attempts++;
                  if (attempts >= MAX_RETRIES) {
                    throw new Error(`Chunk ${idx} failed after ${MAX_RETRIES} retries`);
                  }
                }
              }
            })
          );

          // Complete transfer
          await apiService.post(`/api/transfers/${initResponse.sessionId}/complete`);

          // Notify via socket
          socketService.emitTransferNotify(initResponse.sessionId);

          this.updateProgress(sessionId, 100, 0, 0, 'completed');
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          this.updateProgress(sessionId, 0, 0, 0, 'cancelled');
        } else {
          this.updateProgress(sessionId, 0, 0, 0, 'failed');
          console.error('Upload error:', err);
        }
      } finally {
        this.abortControllers.delete(sessionId);
      }
    }
  }

  private updateProgress(
    sessionId: string,
    progress: number,
    speed: number,
    eta: number,
    status: UploadProgress['status']
  ) {
    this.uploadProgress = this.uploadProgress.map((p) =>
      p.sessionId === sessionId ? { ...p, progress, speed, eta, status } : p
    );
  }

  // Cancel an upload
  cancelUpload(sessionId: string) {
    const abortController = this.abortControllers.get(sessionId);
    if (abortController) {
      abortController.abort();
      this.updateProgress(sessionId, 0, 0, 0, 'cancelled');
    }
  }

  // Download transfer
  async downloadTransfer(transfer: TransferSession): Promise<string | null> {
    const apiService = this.resolve(ApiService);

    for (const item of transfer.items ?? []) {
      if (item.storageType === 'db' && item.content) {
        return item.content;
      } else if (item.storageType === 's3') {
        const { url } = await apiService.get<{ url: string }>(
          `/api/transfers/${transfer.id}/download`
        );
        return url;
      }
    }
    return null;
  }
}
