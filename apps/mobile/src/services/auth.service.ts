import { Service } from '@rabjs/react';
import * as SecureStore from 'expo-secure-store';
import type { LoginRequest, RegisterRequest } from '@zen-send/dto';
import type { AuthTokens } from '@zen-send/shared';

const TOKEN_KEY = 'zen_send_tokens';

export class AuthService extends Service {
  accessToken: string | null = null;
  refreshToken: string | null = null;
  user: { id: string; email: string } | null = null;
  serverUrl: string = 'http://localhost:3110';

  constructor() {
    super();
    this.loadTokens();
  }

  get isAuthenticated() {
    return !!this.accessToken;
  }

  get apiService() {
    return this.resolve(ApiService);
  }

  get serverUrlWithProtocol(): string {
    return this.serverUrl;
  }

  private async loadTokens() {
    try {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (stored) {
        const tokens: AuthTokens = JSON.parse(stored);
        this.accessToken = tokens.accessToken;
        this.refreshToken = tokens.refreshToken;
        this.user = tokens.user;
      }
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  }

  private async saveTokens(tokens: AuthTokens) {
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.user = tokens.user;
  }

  async setServerUrl(url: string) {
    this.serverUrl = url;
  }

  async login(request: LoginRequest): Promise<void> {
    const response = await fetch(`${this.serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(typeof result.data === 'string' ? result.data : 'Login failed');
    }

    this.saveTokens(result.data);
  }

  async register(request: RegisterRequest): Promise<void> {
    const response = await fetch(`${this.serverUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(typeof result.data === 'string' ? result.data : 'Registration failed');
    }

    this.saveTokens(result.data);
  }

  async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        await fetch(`${this.serverUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
          },
        });
      }
    } finally {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      this.accessToken = null;
      this.refreshToken = null;
      this.user = null;
    }
  }

  getAuthHeaders(): Record<string, string> {
    if (!this.accessToken) return {};
    return { Authorization: `Bearer ${this.accessToken}` };
  }
}

// Forward declaration for ApiService
export class ApiService extends Service {
  private baseUrl: string = '';

  get authService() {
    return this.resolve(AuthService);
  }
}
