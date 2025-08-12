import { Service } from '@rabjs/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from './api.service';
import type { LoginRequest, RegisterRequest } from '@zen-send/dto';
import type { AuthTokens } from '@zen-send/shared';

const TOKEN_KEY = 'zen_send_tokens';
const SERVER_URL_KEY = 'zen_send_server_url';

export class AuthService extends Service {
  accessToken: string | null = null;
  refreshToken: string | null = null;
  user: { id: string; email: string } | null = null;
  serverUrl: string = '';

  constructor() {
    super();
    this.loadTokens();
    this.loadServerUrl();
  }

  private async loadServerUrl() {
    try {
      const url = await AsyncStorage.getItem(SERVER_URL_KEY);
      if (url) {
        this.serverUrl = url;
      }
    } catch {
      // ignore
    }
  }

  async saveServerUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(SERVER_URL_KEY, url);
    this.serverUrl = url;
  }

  getServerUrl(): string {
    return this.serverUrl || 'http://localhost:3110';
  }

  get isAuthenticated() {
    return !!this.accessToken;
  }

  private async loadTokens() {
    try {
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      if (stored) {
        const tokens: AuthTokens = JSON.parse(stored);
        this.accessToken = tokens.accessToken;
        this.refreshToken = tokens.refreshToken;
        this.user = tokens.user;
      }
    } catch {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  }

  private async saveTokens(tokens: AuthTokens) {
    await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.user = tokens.user;
  }

  get apiService() {
    return this.resolve(ApiService);
  }

  async login(request: LoginRequest, serverUrl: string): Promise<void> {
    // Save serverUrl before making any API calls
    await this.saveServerUrl(serverUrl);
    const tokens = await this.apiService.post<AuthTokens>('/api/auth/login', request);
    await this.saveTokens(tokens);
  }

  async register(request: RegisterRequest): Promise<void> {
    const tokens = await this.apiService.post<AuthTokens>('/api/auth/register', request);
    await this.saveTokens(tokens);
  }

  async logout(): Promise<void> {
    try {
      await this.apiService.post('/api/auth/logout');
    } finally {
      await AsyncStorage.removeItem(TOKEN_KEY);
      this.accessToken = null;
      this.refreshToken = null;
      this.user = null;
    }
  }

  async loginWithQrToken(token: string, serverUrl: string): Promise<void> {
    // Save serverUrl before making any API calls
    await this.saveServerUrl(serverUrl);
    // Exchange pair token for auth tokens directly
    const response = await fetch(`${serverUrl}/api/auth/pair-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.data || 'Login failed');
    }
    const tokens = result.data as AuthTokens;
    await this.saveTokens(tokens);
  }

  async doRefreshToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token');
    }
    const tokens = await this.apiService.post<AuthTokens>('/api/auth/refresh', {
      refreshToken: this.refreshToken,
    });
    await this.saveTokens(tokens);
  }

  getAuthHeaders(): Record<string, string> {
    if (!this.accessToken) return {};
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  handleUnauthorized(): void {
    // Clear tokens on 401
    AsyncStorage.removeItem(TOKEN_KEY);
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    // Navigation to login should be handled by the app's navigation system
    // This method can be overridden or events can be emitted for navigation
  }
}
