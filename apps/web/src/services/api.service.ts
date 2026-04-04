// Stub service - will be replaced in Task 3
import { Service } from '@rabjs/react';
import { getApiBaseUrl } from '../lib/env';
import { AuthService } from './auth.service';

export class ApiService extends Service {
  private baseUrl: string = '';

  constructor() {
    super();
    this.baseUrl = getApiBaseUrl();
  }

  private get authService() {
    return this.resolve(AuthService);
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const authHeaders = this.authService.getAuthHeaders();
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Handle 401 by redirecting to login
      if (response.status === 401) {
        localStorage.removeItem('zen_send_tokens');
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
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
}
