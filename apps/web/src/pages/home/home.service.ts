import { Service } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import type { TransferSession } from '@zen-send/shared';

export type TransferFilter = 'all' | 'file' | 'text';

export interface UploadingFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  sessionId?: string;
  error?: string;
}

export class HomeService extends Service {
  transfers: TransferSession[] = [];
  selectedFiles: { name: string; size: number; data?: ArrayBuffer }[] = [];
  filter: TransferFilter = 'all';
  isLoading = false;
  error: string | null = null;
  uploadingFiles: UploadingFile[] = [];

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

  async uploadFiles(targetDeviceId: string) {
    const files = this.selectedFiles;
    if (files.length === 0) return;

    for (const file of files) {
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const uploadingFile: UploadingFile = {
        id: uploadId,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'pending',
      };
      this.uploadingFiles = [...this.uploadingFiles, uploadingFile];
      this.executeUpload(uploadId, file, targetDeviceId);
    }

    this.selectedFiles = [];
  }

  private async executeUpload(
    uploadId: string,
    file: { name: string; size: number; data?: ArrayBuffer },
    targetDeviceId: string
  ) {
    const TEXT_INLINE_MAX_SIZE = 10 * 1024;
    const CHUNK_SIZE = 1 * 1024 * 1024;

    try {
      this.updateUploadStatus(uploadId, { status: 'uploading' });

      const sourceDeviceId = 'web-device';

      if (file.data && file.size <= TEXT_INLINE_MAX_SIZE) {
        const content = new TextDecoder().decode(file.data);
        const response = await this.apiService.post<any>('/api/transfers/init', {
          sourceDeviceId,
          targetDeviceId,
          type: 'text',
          fileName: file.name,
          contentType: 'text/plain',
          totalSize: file.size,
          content,
        });

        this.updateUploadStatus(uploadId, {
          status: 'completed',
          progress: 100,
          sessionId: response.data.sessionId,
        });
      } else {
        const chunkCount = Math.ceil(file.size / CHUNK_SIZE);
        const initResponse = await this.apiService.post<any>('/api/transfers/init', {
          sourceDeviceId,
          targetDeviceId,
          type: 'file',
          fileName: file.name,
          contentType: 'application/octet-stream',
          totalSize: file.size,
          chunkCount,
        });

        const { sessionId, presignedUrls } = initResponse.data;
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
            this.updateUploadStatus(uploadId, { progress });
          })
        );

        await this.apiService.post(`/api/transfers/${sessionId}/complete`);

        this.updateUploadStatus(uploadId, {
          status: 'completed',
          progress: 100,
        });
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
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`Chunk upload failed: ${response.status}`);
    }

    return response.headers.get('ETag') || '';
  }

  private updateUploadStatus(uploadId: string, updates: Partial<UploadingFile>) {
    this.uploadingFiles = this.uploadingFiles.map((f) =>
      f.id === uploadId ? { ...f, ...updates } : f
    );
  }

  async cancelUpload(uploadId: string) {
    const file = this.uploadingFiles.find((f) => f.id === uploadId);
    if (file?.sessionId) {
      await this.apiService.deleteTransfer(file.sessionId);
    }
    this.updateUploadStatus(uploadId, { status: 'cancelled' });
  }

  removeUpload(uploadId: string) {
    this.uploadingFiles = this.uploadingFiles.filter((f) => f.id !== uploadId);
  }
}
