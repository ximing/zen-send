import { Service } from '@rabjs/react';
import { AuthService } from './auth.service';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  statusCode: number;
}

export class ApiService extends Service {
  private get authService(): AuthService {
    return this.resolve(AuthService);
  }

  private get baseUrl(): string {
    return this.authService.serverUrlWithProtocol;
  }

  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const makeRequest = async (): Promise<Response> => {
      const authHeaders = this.authService.getAuthHeaders();
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options.headers,
        },
      });
    };

    let response = await makeRequest();

    // Handle 401 with token refresh (avoid infinite loops)
    if (response.status === 401 && !this.isRefreshing && !path.includes('/auth/refresh')) {
      this.isRefreshing = true;
      this.refreshPromise = this.authService.doRefreshToken().then(() => {
        this.refreshPromise = null;
      }).catch(() => {
        this.refreshPromise = null;
      });
      try {
        await this.refreshPromise;
        response = await makeRequest();
      } catch {
        this.authService.handleUnauthorized();
        throw new Error('Unauthorized');
      } finally {
        this.isRefreshing = false;
      }
    }

    // If another request is already refreshing tokens, wait for it and retry
    if (response.status === 401 && this.isRefreshing && this.refreshPromise && !path.includes('/auth/refresh')) {
      try {
        await this.refreshPromise;
        response = await makeRequest();
      } catch {
        throw new Error('Unauthorized');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const result: ApiResponse<T> = await response.json();

    if (!result.success) {
      const errorMessage = typeof result.data === 'string' ? result.data : 'Request failed';
      throw new Error(errorMessage);
    }

    return result.data;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async cancelUpload(sessionId: string): Promise<void> {
    await this.delete(`/api/transfers/${sessionId}`);
  }

  async deleteTransfer(sessionId: string): Promise<void> {
    await this.delete(`/api/transfers/${sessionId}`);
  }

  async getTransferDownloadUrl(transferId: string): Promise<string> {
    return this.get<{ downloadUrl: string }>(`/api/transfers/${transferId}/download`).then(
      (res) => res.downloadUrl,
    );
  }

  async getTransferFile(transferId: string): Promise<Blob> {
    const downloadUrl = await this.getTransferDownloadUrl(transferId);
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('Failed to download file');
    return response.blob();
  }
}
