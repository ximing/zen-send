import { Service } from '@rabjs/react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LoginRequest, RegisterRequest } from '@zen-send/dto';
import type { AuthTokens } from '@zen-send/shared';

const TOKEN_KEY = 'zen_send_tokens';
const SERVER_URL_KEY = 'zen_send_server_url';
const DEVICE_ID_KEY = 'zen_send_device_id';
const DEFAULT_SERVER_URL = 'http://localhost:3110';

export class AuthService extends Service {
  accessToken: string | null = null;
  refreshToken: string | null = null;
  user: { id: string; email: string } | null = null;
  serverUrl: string = DEFAULT_SERVER_URL;
  isLoading: boolean = true;

  constructor() {
    super();
    this.loadTokens();
    this.loadServerUrl();
  }

  get apiService() {
    return this.resolve(ApiService);
  }

  get serverUrlWithProtocol(): string {
    return this.serverUrl;
  }

  private async loadServerUrl() {
    try {
      const stored = await AsyncStorage.getItem(SERVER_URL_KEY);
      if (stored) {
        this.serverUrl = stored;
      }
    } catch {
      // Use default
    }
  }

  async saveServerUrl(url: string): Promise<void> {
    this.serverUrl = url;
    await AsyncStorage.setItem(SERVER_URL_KEY, url);
  }

  async loadDeviceId(): Promise<string> {
    try {
      const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (stored && stored.startsWith('mobile-')) {
        return stored;
      }
    } catch {
      // Generate new ID on error
    }
    const newId = 'mobile-' + Math.random().toString(36).slice(2);
    await this.saveDeviceId(newId);
    return newId;
  }

  async saveDeviceId(deviceId: string): Promise<void> {
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  get isAuthenticated() {
    return !!this.accessToken;
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
    } finally {
      this.isLoading = false;
    }
  }

  private async saveTokens(tokens: AuthTokens) {
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.user = tokens.user;
  }

  async login(request: LoginRequest, serverUrl: string): Promise<void> {
    await this.saveServerUrl(serverUrl);
    const response = await fetch(`${serverUrl}/api/auth/login`, {
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

  async loginWithQrToken(token: string, serverUrl: string): Promise<void> {
    await this.saveServerUrl(serverUrl);
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
      throw new Error(typeof result.data === 'string' ? result.data : 'Login failed');
    }
    await this.saveTokens(result.data);
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

  async doRefreshToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token');
    }
    const response = await fetch(`${this.serverUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      this.handleUnauthorized();
      throw new Error('Token refresh failed');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error('Token refresh failed');
    }

    await this.saveTokens(result.data);
  }

  handleUnauthorized(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(console.error);
  }

  getAuthHeaders(): Record<string, string> {
    if (!this.accessToken) return {};
    return { Authorization: `Bearer ${this.accessToken}` };
  }
}
