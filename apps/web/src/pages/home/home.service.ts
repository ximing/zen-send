import { Service } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import type { TransferSession } from '@zen-send/shared';

export type TransferFilter = 'all' | 'file' | 'text';
export type TimeFilter = 'all' | 'today' | 'week' | 'month';

export interface UploadingFile {
  id: string;
  name: string;
  size: number;
  type?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  sessionId?: string;
  error?: string;
  speed?: number;
  eta?: number;
  startTime?: number;
  uploadedBytes?: number;
}

export class HomeService extends Service {
  transfers: TransferSession[] = [];
  selectedFiles: { name: string; size: number; type?: string; data?: ArrayBuffer }[] = [];
  filter: TransferFilter = 'all';
  timeFilter: TimeFilter = 'all';
  searchQuery = '';
  isLoading = false;
  isLoadingOlder = false;
  error: string | null = null;
  uploadingFiles: UploadingFile[] = [];
  previewTransfer: TransferSession | null = null;
  deleteConfirmId: string | null = null;
  hasMore = true;
  private _fileData = new Map<
    string,
    { name: string; size: number; type?: string; data?: ArrayBuffer }
  >();

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
    let filtered = this.transfers;

    if (this.filter !== 'all') {
      filtered = filtered.filter((t) => t.items?.some((item) => item.type === this.filter));
    }

    if (this.timeFilter !== 'all') {
      const now = Date.now();
      const startOfToday = new Date().setHours(0, 0, 0, 0);
      const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;
      const startOfMonth = startOfToday - 30 * 24 * 60 * 60 * 1000;

      filtered = filtered.filter((t) => {
        if (this.timeFilter === 'today') return t.createdAt >= startOfToday;
        if (this.timeFilter === 'week') return t.createdAt >= startOfWeek;
        if (this.timeFilter === 'month') return t.createdAt >= startOfMonth;
        return true;
      });
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter((t) => {
        const name = (t.originalFileName || '').toLowerCase();
        const textContent =
          t.items?.find((item) => item.type === 'text')?.content?.toLowerCase() || '';
        return name.includes(query) || textContent.includes(query);
      });
    }

    return filtered;
  }

  setSearchQuery(query: string) {
    this.searchQuery = query;
  }

  setTypeFilter(filter: TransferFilter) {
    this.filter = filter;
  }

  setTimeFilter(filter: TimeFilter) {
    this.timeFilter = filter;
  }

  setPreviewTransfer(transfer: TransferSession | null) {
    this.previewTransfer = transfer;
  }

  setDeleteConfirm(id: string | null) {
    this.deleteConfirmId = id;
  }

  markTransferComplete(sessionId: string) {
    const transfer = this.transfers.find((t) => t.id === sessionId);
    if (transfer) {
      transfer.status = 'completed';
      this.transfers = [...this.transfers];
    }
  }

  addTransfer(session: TransferSession) {
    if (this.transfers.some((t) => t.id === session.id)) return;
    this.transfers = [...this.transfers, session];
  }

  async loadTransfers(limit = 50) {
    this.isLoading = true;
    this.error = null;
    try {
      const result = await this.apiService.get<{
        transfers: TransferSession[];
        hasMore: boolean;
      }>(`/api/transfers?limit=${limit}`);
      this.transfers = result.transfers || [];
      this.hasMore = result.hasMore;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load transfers';
    } finally {
      this.isLoading = false;
    }
  }

  async loadOlderTransfers(limit = 50) {
    if (this.isLoadingOlder || !this.hasMore || this.transfers.length === 0) return;
    this.isLoadingOlder = true;
    try {
      const first = this.transfers[0];
      const result = await this.apiService.get<{
        transfers: TransferSession[];
        hasMore: boolean;
      }>(`/api/transfers?limit=${limit}&beforeCreatedAt=${first.createdAt}&beforeId=${first.id}`);
      const older = result.transfers || [];
      const existingIds = new Set(this.transfers.map((t) => t.id));
      const newTransfers = older.filter((t) => !existingIds.has(t.id));
      this.transfers = [...newTransfers, ...this.transfers];
      this.hasMore = result.hasMore;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load older transfers';
    } finally {
      this.isLoadingOlder = false;
    }
  }

  addFiles(files: { name: string; size: number; type?: string; data?: ArrayBuffer }[]) {
    this.selectedFiles = [...this.selectedFiles, ...files];
  }

  removeFile(index: number) {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  clearFiles() {
    this.selectedFiles = [];
  }

  async uploadFiles() {
    const files = this.selectedFiles;
    if (files.length === 0) return;

    for (const file of files) {
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const uploadingFile: UploadingFile = {
        id: uploadId,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'pending',
      };
      this.uploadingFiles = [...this.uploadingFiles, uploadingFile];
      this._fileData.set(uploadId, {
        name: file.name,
        size: file.size,
        type: file.type,
        data: file.data,
      });

      // Add temporary session to list (appears at bottom in ASC order)
      const tempSession: TransferSession = {
        id: uploadId,
        userId: this.authService.user?.id || '',
        sourceDeviceId: 'web-device',
        targetDeviceId: null,
        status: 'pending',
        s3Bucket: '',
        s3Key: '',
        originalFileName: file.name,
        totalSize: file.size,
        chunkCount: 0,
        receivedChunks: 0,
        contentType: file.type || 'application/octet-stream',
        ttlExpiresAt: 0,
        createdAt: Math.floor(Date.now() / 1000),
        items: [
          {
            id: `temp-item-${uploadId}`,
            sessionId: uploadId,
            type: 'file',
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            content: undefined,
            thumbnailKey: undefined,
            storageType: 's3',
            createdAt: Math.floor(Date.now() / 1000),
          },
        ],
      };
      this.transfers = [...this.transfers, tempSession];

      this.executeUpload(uploadId, file);
    }

    this.selectedFiles = [];
  }

  private async executeUpload(
    uploadId: string,
    file: { name: string; size: number; type?: string; data?: ArrayBuffer }
  ) {
    const TEXT_INLINE_MAX_SIZE = 10 * 1024;
    const CHUNK_SIZE = 5 * 1024 * 1024;
    const startTime = Date.now();
    const speedSamples: number[] = [];
    let lastUpdateTime = startTime;
    let lastUploadedBytes = 0;

    this.updateUploadStatus(uploadId, { startTime, uploadedBytes: 0 });

    const updateSpeedAndEta = (uploadedBytes: number) => {
      const now = Date.now();
      const elapsed = (now - lastUpdateTime) / 1000;
      const bytesDelta = uploadedBytes - lastUploadedBytes;

      if (elapsed >= 0.5 && bytesDelta > 0) {
        const currentSpeed = bytesDelta / elapsed;
        speedSamples.push(currentSpeed);
        if (speedSamples.length > 5) speedSamples.shift();

        const avgSpeed = speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length;
        const remainingBytes = file.size - uploadedBytes;
        const eta = avgSpeed > 0 ? remainingBytes / avgSpeed : 0;

        this.updateUploadStatus(uploadId, { speed: avgSpeed, eta, uploadedBytes });
        lastUpdateTime = now;
        lastUploadedBytes = uploadedBytes;
      }
    };

    try {
      this.updateUploadStatus(uploadId, { status: 'uploading' });

      const sourceDeviceId = 'web-device';

      const isTextFile =
        file.type?.startsWith('text/') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.json');

      if (isTextFile && file.data && file.size <= TEXT_INLINE_MAX_SIZE) {
        const content = new TextDecoder().decode(file.data);
        const { sessionId } = await this.apiService.post<{ sessionId: string }>(
          '/api/transfers/init',
          {
            sourceDeviceId,
            type: 'text',
            fileName: file.name,
            contentType: file.type || 'text/plain',
            totalSize: file.size,
            content,
          }
        );

        this.updateUploadStatus(uploadId, {
          status: 'completed',
          progress: 100,
          sessionId,
          speed: 0,
          eta: 0,
          uploadedBytes: file.size,
        });
        // Socket transfer:new will deliver the full session; addTransfer dedup handles it
      } else {
        const chunkCount = Math.ceil(file.size / CHUNK_SIZE);
        const { sessionId, presignedUrls } = await this.apiService.post<{
          sessionId: string;
          presignedUrls: string[];
        }>('/api/transfers/init', {
          sourceDeviceId,
          type: 'file',
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          totalSize: file.size,
          chunkCount,
        });

        this.updateUploadStatus(uploadId, { sessionId });

        const totalChunks = presignedUrls.length;
        let completedChunks = 0;

        await Promise.all(
          presignedUrls.map(async (url: string, index: number) => {
            const start = index * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.data?.slice(start, end);

            if (!chunk) return;

            const etag = await this.uploadChunkToS3(url, chunk);

            await this.apiService.post(`/api/transfers/${sessionId}/chunks`, {
              chunkIndex: index,
              etag,
            });

            completedChunks++;
            const progress = Math.round((completedChunks / totalChunks) * 100);
            const uploadedBytes = Math.min(completedChunks * CHUNK_SIZE, file.size);
            this.updateUploadStatus(uploadId, { progress, uploadedBytes });
            updateSpeedAndEta(uploadedBytes);
          })
        );

        await this.apiService.post(`/api/transfers/${sessionId}/complete`);

        this.updateUploadStatus(uploadId, {
          status: 'completed',
          progress: 100,
          speed: 0,
          eta: 0,
          uploadedBytes: file.size,
        });
        // Socket transfer:new will deliver the full session; addTransfer dedup handles it
      }
    } catch (error) {
      this.updateUploadStatus(uploadId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }

  private async uploadChunkToS3(url: string, chunk: ArrayBuffer): Promise<string> {
    const response = await fetch(url, {
      method: 'PUT',
      body: chunk,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    if (!response.ok) throw new Error(`Chunk upload failed: ${response.status}`);
    return response.headers.get('ETag') || '';
  }

  private updateUploadStatus(uploadId: string, updates: Partial<UploadingFile>) {
    this.uploadingFiles = this.uploadingFiles.map((f) =>
      f.id === uploadId ? { ...f, ...updates } : f
    );

    if (updates.sessionId) {
      this.transfers = this.transfers.map((t) =>
        t.id === uploadId ? { ...t, id: updates.sessionId! } : t
      );
    }

    if (updates.status === 'completed' && updates.sessionId) {
      this.transfers = this.transfers.map((t) =>
        t.id === updates.sessionId ? { ...t, status: 'completed' } : t
      );
      setTimeout(() => this.removeUpload(uploadId), 2000);
    }
  }

  async cancelUpload(uploadId: string) {
    const file = this.uploadingFiles.find((f) => f.id === uploadId);
    if (file?.sessionId) {
      await this.apiService.deleteTransfer(file.sessionId);
    }
    this.updateUploadStatus(uploadId, { status: 'cancelled' });
    setTimeout(() => this.removeUpload(uploadId), 3000);
  }

  removeUpload(uploadId: string) {
    this.uploadingFiles = this.uploadingFiles.filter((f) => f.id !== uploadId);
    this._fileData.delete(uploadId);
  }

  async retryUpload(uploadId: string) {
    const fileData = this._fileData.get(uploadId);
    if (!fileData) return;

    const newUploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const uploadingFile: UploadingFile = {
      id: newUploadId,
      name: fileData.name,
      size: fileData.size,
      progress: 0,
      status: 'pending',
    };

    this.updateUploadStatus(uploadId, { status: 'cancelled' });
    this.uploadingFiles = this.uploadingFiles.filter((f) => f.id !== uploadId);
    this.uploadingFiles = [...this.uploadingFiles, uploadingFile];
    this._fileData.set(newUploadId, fileData);
    this._fileData.delete(uploadId);
    this.executeUpload(newUploadId, fileData);
  }

  async sendText(content: string) {
    const sourceDeviceId = 'web-device';
    try {
      await this.apiService.post('/api/transfers/init', {
        sourceDeviceId,
        type: 'text',
        fileName: 'text.txt',
        contentType: 'text/plain',
        totalSize: new TextEncoder().encode(content).length,
        content,
      });
      // No loadTransfers() — Socket transfer:new will deliver the session incrementally
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Failed to send text');
    }
  }
}
