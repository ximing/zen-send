import { Service } from '@rabjs/react';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from './api.service';
import { SocketService } from './socket.service';
import type { TransferSession } from '@zen-send/shared';

export type TransferFilter = 'all' | 'file' | 'text';

// Download progress tracking
export interface DownloadProgress {
  sessionId: string;
  transfer: TransferSession;
  progress: number;
  status: 'downloading' | 'completed' | 'failed';
  localUri?: string;
}

// Upload progress tracking
export interface UploadProgress {
  sessionId: string;
  fileName: string;
  progress: number; // 0-100
  speed: number; // bytes per second
  eta: number; // seconds remaining
  status: 'uploading' | 'completed' | 'failed' | 'cancelled';
}

const DOWNLOADS_STORAGE_KEY = '@zen-send/downloads';

export class HomeService extends Service {
  transfers: TransferSession[] = [];
  filter: TransferFilter = 'all';
  loading = false;
  loadingMore = false;
  isRefreshing = false;
  offset = 0;
  hasMore = true;
  searchQuery = '';
  uploadProgress: UploadProgress[] = [];
  downloads: DownloadProgress[] = [];

  private readonly LIMIT = 50;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor() {
    super();
    this.loadTransfers();
    this.loadDownloadsFromStorage();
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

  async refresh() {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    this.offset = 0;
    this.hasMore = true;
    try {
      const response = await this.apiService.get<{ transfers: TransferSession[] }>(
        `/api/transfers?limit=${this.LIMIT}&offset=0`
      );
      this.transfers = response.transfers;
      this.offset = this.transfers.length;
      this.hasMore = response.transfers.length === this.LIMIT;
    } catch (err) {
      console.error('Failed to refresh transfers:', err);
    } finally {
      this.isRefreshing = false;
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
      sourceDeviceId: this.socketService.deviceId ?? 'mobile-device',
    });
    // Refresh to update the transfer list with the new text
    await this.refresh();
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
        // Get file info - use FileSystem for local file URIs
        console.log('[Upload] Step 1: Reading file from uri:', doc.uri);
        let size = 0;
        let arrayBuffer: ArrayBuffer;

        if (doc.uri.startsWith('file://')) {
          // Use expo-file-system to read local files
          const base64 = await FileSystem.readAsStringAsync(doc.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          // Convert base64 to ArrayBuffer
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          arrayBuffer = bytes.buffer;
          size = arrayBuffer.byteLength;
        } else {
          // Fallback to fetch for http/https URIs
          const response = await fetch(doc.uri);
          arrayBuffer = await response.arrayBuffer();
          size = arrayBuffer.byteLength;
        }
        console.log('[Upload] Step 2: File read, size:', size);

        // For files <= 10KB, send as text inline
        if (size <= 10 * 1024) {
          const content = new TextDecoder().decode(arrayBuffer);
          await apiService.post('/api/transfers/init', {
            type: 'text',
            content,
            totalSize: size,
            contentType: doc.mimeType || 'application/octet-stream',
            sourceDeviceId: this.socketService.deviceId ?? 'mobile-device',
          });
          this.updateProgress(sessionId, 100, size, size, 'completed');
          // Refresh to update the transfer list with the new file
          await this.refresh();
        } else {
          // Initialize transfer for S3 upload
          console.log('[Upload] Step 3: Starting S3 upload for file, size > 10KB');
          console.log('[Upload] Starting upload for:', doc.name, 'size:', size);
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
            sourceDeviceId: this.socketService.deviceId ?? 'mobile-device',
          });
          console.log('[Upload] Init response:', JSON.stringify({
            sessionId: initResponse.sessionId,
            presignedUrlsCount: initResponse.presignedUrls?.length,
            presignedUrlsFirst: initResponse.presignedUrls?.[0]?.substring(0, 100),
            chunkSize: initResponse.chunkSize,
          }));

          // Upload chunks with parallelization and retry
          const chunkSize = initResponse.chunkSize || 1024 * 1024;
          const chunks: { index: number; data: ArrayBuffer; size: number }[] = [];

          let offset = 0;
          let chunkIndex = 0;
          while (offset < size) {
            const chunkEnd = Math.min(offset + chunkSize, size);
            chunks.push({
              index: chunkIndex,
              data: arrayBuffer.slice(offset, chunkEnd),
              size: chunkEnd - offset,
            });
            offset = chunkEnd;
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
              let presignedUrl = initResponse.presignedUrls[idx];
              console.log('[Upload] Chunk', idx, '- presignedUrl:', presignedUrl ? presignedUrl.substring(0, 80) + '...' : 'UNDEFINED', 'chunk size:', chunk.size);
              while (attempts < MAX_RETRIES && !uploadedChunks[idx]) {
                try {
                  console.log('[Upload] Chunk', idx, 'attempt', attempts + 1, '- starting upload to S3 via XHR');

                  // Helper: XHR PUT promise
                  const xhrPut = (url: string, data: ArrayBuffer, timeoutMs = 30000): Promise<XMLHttpRequest> => {
                    return new Promise((resolve, reject) => {
                      const xhr = new XMLHttpRequest();
                      xhr.open('PUT', url, true);
                      xhr.timeout = timeoutMs;
                      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
                      xhr.onload = () => {
                        console.log('[Upload] Chunk', idx, 'XHR load - status:', xhr.status, 'readyState:', xhr.readyState);
                        resolve(xhr);
                      };
                      xhr.onerror = () => {
                        console.log('[Upload] Chunk', idx, 'XHR error - statusText:', xhr.statusText, 'readyState:', xhr.readyState);
                        reject(new Error(`XHR error: ${xhr.statusText}`));
                      };
                      xhr.ontimeout = () => {
                        console.log('[Upload] Chunk', idx, 'XHR timeout');
                        reject(new Error('XHR timeout'));
                      };
                      // Handle abort
                      if (abortController.signal) {
                        abortController.signal.addEventListener('abort', () => {
                          xhr.abort();
                          reject(new Error('Abort'));
                        });
                      }
                      console.log('[Upload] Chunk', idx, 'sending XHR, data size:', data.byteLength);
                      xhr.send(data);
                    });
                  };

                  console.log('[Upload] Chunk', idx, 'full URL:', presignedUrl);
                  console.log('[Upload] Chunk', idx, 'request details:', JSON.stringify({
                    method: 'PUT',
                    bodySize: chunk.data.byteLength,
                    hasSignal: !!abortController.signal,
                  }));

                  const xhrResult = await xhrPut(presignedUrl, chunk.data);
                  const response = {
                    ok: xhrResult.status >= 200 && xhrResult.status < 300,
                    status: xhrResult.status,
                    text: () => Promise.resolve(xhrResult.responseText || ''),
                  };
                  console.log('[Upload] Chunk', idx, 'response status:', response.status, 'ok:', response.ok);

                  // Log response body for error statuses
                  if (!response.ok) {
                    let errorBody = '';
                    try {
                      errorBody = await response.text();
                    } catch {
                      errorBody = '(could not read response body)';
                    }
                    console.log('[Upload] Chunk', idx, 'error response body:', errorBody.substring(0, 500));
                  }

                  // Re-request presigned URLs on 403/401
                  if (response.status === 403 || response.status === 401) {
                    const newInitResponse = await apiService.post<{
                      sessionId: string;
                      presignedUrls: string[];
                      chunkSize: number;
                    }>('/api/transfers/init', {
                      type: 'file',
                      fileName: doc.name,
                      totalSize: size,
                      contentType: doc.mimeType || 'application/octet-stream',
                      chunkCount: Math.ceil(size / (1024 * 1024)),
                      sourceDeviceId: this.socketService.deviceId ?? 'mobile-device',
                    });
                    presignedUrl = newInitResponse.presignedUrls[idx];
                    attempts--;
                    continue;
                  }

                  if (!response.ok) {
                    throw new Error(`Upload failed with status ${response.status}`);
                  }

                  // Report chunk
                  await apiService.post(`/api/transfers/${initResponse.sessionId}/chunks`, {
                    chunkIndex: chunk.index,
                    etag: 'etag',
                  });

                  uploadedChunks[idx] = true;
                  uploadedBytes += chunk.size;

                  // Update progress
                  const elapsed = (Date.now() - startTime) / 1000;
                  const speed = uploadedBytes / elapsed;
                  const remaining = size - uploadedBytes;
                  const eta = remaining / speed;
                  const progress = (uploadedBytes / size) * 100;

                  this.updateProgress(sessionId, progress, speed, eta, 'uploading');
                } catch (err) {
                  const error = err instanceof Error ? err : new Error(String(err));
                  const errorDetails = {
                    name: error.name,
                    message: error.message,
                    cause: error.cause ? (error.cause instanceof Error ? { name: error.cause.name, message: error.cause.message } : String(error.cause)) : undefined,
                    stack: error.stack,
                    url: presignedUrl?.substring(0, 200),
                    chunkIndex: idx,
                    attempt: attempts + 1,
                  };
                  console.log('[Upload] Chunk', idx, 'error details:', JSON.stringify(errorDetails, null, 2));
                  console.error('[Upload] Chunk', idx, 'error:', error);
                  if (error.name === 'AbortError' || error.message === 'Abort') {
                    throw err;
                  }
                  attempts++;
                  if (attempts >= MAX_RETRIES) {
                    const err = new Error(`Chunk ${idx} failed after ${MAX_RETRIES} retries: ${error.message}`);
                    err.name = 'AbortError';
                    throw err;
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
          console.error('Upload error:', err instanceof Error ? err.message : String(err), err);
        }
      } finally {
        this.abortControllers.delete(sessionId);
      }
    }
  }

  updateProgress(
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

  // Handle progress update from socket events
  updateProgressFromSocket(sessionId: string, progress: number, speed: number) {
    const existing = this.uploadProgress.find((p) => p.sessionId === sessionId);
    if (existing) {
      this.updateProgress(sessionId, progress, speed, 0, 'uploading');
    }
  }

  // Cancel an upload
  async cancelUpload(sessionId: string): Promise<void> {
    const abortController = this.abortControllers.get(sessionId);
    if (abortController) {
      abortController.abort();
      this.updateProgress(sessionId, 0, 0, 0, 'cancelled');
    }
    // Notify server to clean up the transfer
    await this.apiService.deleteTransfer(sessionId);
  }

  // Remove an upload from the progress list
  removeUpload(sessionId: string): void {
    this.uploadProgress = this.uploadProgress.filter((p) => p.sessionId !== sessionId);
  }

  // Download transfer
  async downloadTransfer(transfer: TransferSession): Promise<string | null> {
    const apiService = this.resolve(ApiService);

    console.log('[Download] transfer:', JSON.stringify(transfer, null, 2));
    console.log('[Download] items:', transfer.items);

    for (const item of transfer.items ?? []) {
      console.log('[Download] item:', item.id, 'storageType:', item.storageType, 'hasContent:', !!item.content);
      if (item.storageType === 'db' && item.content) {
        return item.content;
      } else if (item.storageType === 's3') {
        console.log('[Download] Fetching download URL for:', transfer.id);
        const response = await apiService.get<{ downloadUrl: string }>(
          `/api/transfers/${transfer.id}/download`
        );
        console.log('[Download] API response:', response);
        return response.downloadUrl;
      }
    }
    console.log('[Download] No valid item found for download');
    return null;
  }

  // Load downloads from local storage
  private async loadDownloadsFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.default.getItem(DOWNLOADS_STORAGE_KEY);
      if (stored) {
        const parsed: DownloadProgress[] = JSON.parse(stored);
        // Filter out downloads that are still in downloading state (they should be restarted)
        this.downloads = parsed.filter((d) => d.status !== 'downloading');
        console.log('[Downloads] Loaded from storage:', this.downloads.length);
      }
    } catch (err) {
      console.error('[Downloads] Failed to load from storage:', err);
    }
  }

  // Save downloads to local storage
  private async saveDownloadsToStorage(): Promise<void> {
    try {
      // Only save completed downloads (not downloading ones)
      const toSave = this.downloads.filter((d) => d.status === 'completed' && d.localUri);
      await AsyncStorage.default.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(toSave));
    } catch (err) {
      console.error('[Downloads] Failed to save to storage:', err);
    }
  }

  // Add transfer to downloads list and start downloading
  startDownload(transfer: TransferSession): void {
    console.log('[Download] startDownload called with:', transfer.id, transfer.items?.[0]?.name);
    const existing = this.downloads.find((d) => d.sessionId === transfer.id);
    if (existing) {
      console.log('[Download] Already downloading, skipping');
      return;
    }

    const download: DownloadProgress = {
      sessionId: transfer.id,
      transfer,
      progress: 0,
      status: 'downloading',
    };
    this.downloads = [...this.downloads, download];
    console.log('[Download] Added to downloads list, count:', this.downloads.length);
    this.executeDownload(transfer.id);
  }

  private async executeDownload(sessionId: string): Promise<void> {
    const download = this.downloads.find((d) => d.sessionId === sessionId);
    if (!download) return;

    const index = this.downloads.findIndex((d) => d.sessionId === sessionId);
    console.log('[Download] Starting download for:', sessionId, 'index:', index);

    try {
      const url = await this.downloadTransfer(download.transfer);
      console.log('[Download] Got URL:', url);
      if (!url) {
        console.log('[Download] No URL returned, marking as failed');
        if (index !== -1) {
          this.downloads[index] = { ...this.downloads[index], status: 'failed' };
          this.downloads = [...this.downloads];
        }
        return;
      }

      const fileName = download.transfer.items?.[0]?.name ?? 'download';
      const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
      const fileUri = `${baseDir}${fileName}`;
      console.log('[Download] Saving to:', fileUri);

      // Download file to local storage
      if (url.startsWith('http')) {
        const downloadedUri = await FileSystem.downloadAsync(url, fileUri);
        console.log('[Download] Downloaded URI:', downloadedUri.uri);
        if (downloadedUri.uri) {
          if (index !== -1) {
            this.downloads[index] = { ...this.downloads[index], progress: 100, status: 'completed', localUri: downloadedUri.uri };
            this.downloads = [...this.downloads];
            this.saveDownloadsToStorage();
          }
        } else {
          if (index !== -1) {
            this.downloads[index] = { ...this.downloads[index], status: 'failed' };
            this.downloads = [...this.downloads];
          }
        }
      } else {
        // DB content - save to file
        await FileSystem.writeAsStringAsync(fileUri, url);
        if (index !== -1) {
          this.downloads[index] = { ...this.downloads[index], progress: 100, status: 'completed', localUri: fileUri };
          this.downloads = [...this.downloads];
          this.saveDownloadsToStorage();
        }
      }
    } catch (err) {
      console.error('[Download] Download failed:', err);
      if (index !== -1) {
        this.downloads[index] = { ...this.downloads[index], status: 'failed' };
        this.downloads = [...this.downloads];
      }
    }
  }

  // Remove a download from the list
  removeDownload(sessionId: string): void {
    this.downloads = this.downloads.filter((d) => d.sessionId !== sessionId);
    this.saveDownloadsToStorage();
  }

  // Clear completed/failed downloads
  clearDownloads(): void {
    this.downloads = this.downloads.filter((d) => d.status === 'downloading');
    this.saveDownloadsToStorage();
  }
}
