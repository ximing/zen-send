// Stub service - will be replaced in Task 3
import { Service } from '@rabjs/react';
import { ApiService } from './api.service';
import type { LoginRequest, RegisterRequest } from '@zen-send/dto';
import type { AuthTokens } from '@zen-send/shared';

const TOKEN_KEY = 'zen_send_tokens';

export class AuthService extends Service {
  accessToken: string | null = null;
  refreshToken: string | null = null;
  user: { id: string; email: string } | null = null;

  constructor() {
    super();
    this.loadTokens();
  }

  get isAuthenticated() {
    return !!this.accessToken;
  }

  private loadTokens() {
    try {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (stored) {
        const tokens: AuthTokens = JSON.parse(stored);
        this.accessToken = tokens.accessToken;
        this.refreshToken = tokens.refreshToken;
        this.user = tokens.user;
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  private saveTokens(tokens: AuthTokens) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.user = tokens.user;
  }

  get apiService() {
    return this.resolve(ApiService);
  }

  async login(request: LoginRequest): Promise<void> {
    const tokens = await this.apiService.post<AuthTokens>('/api/auth/login', request);
    this.saveTokens(tokens);
  }

  async register(request: RegisterRequest): Promise<void> {
    const tokens = await this.apiService.post<AuthTokens>('/api/auth/register', request);
    this.saveTokens(tokens);
  }

  async logout(): Promise<void> {
    try {
      await this.apiService.post('/api/auth/logout');
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      this.accessToken = null;
      this.refreshToken = null;
      this.user = null;
    }
  }

  async doRefreshToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token');
    }
    const tokens = await this.apiService.post<AuthTokens>('/api/auth/refresh', {
      refreshToken: this.refreshToken,
    });
    this.saveTokens(tokens);
  }

  getAuthHeaders(): Record<string, string> {
    if (!this.accessToken) return {};
    return { Authorization: `Bearer ${this.accessToken}` };
  }
}
