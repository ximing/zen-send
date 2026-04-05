import { Service } from '@rabjs/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokens, ThemeMode } from '../theme/tokens';

const THEME_KEY = 'zen_send_theme';

export class ThemeService extends Service {
  mode: ThemeMode = 'light';
  private listener: (() => void) | null = null;

  constructor() {
    super();
    this.loadTheme();
  }

  get colors() {
    return tokens.colors[this.mode];
  }

  get spacing() {
    return tokens.spacing;
  }

  get typography() {
    return tokens.typography;
  }

  get radius() {
    return tokens.radius;
  }

  get isDark() {
    return this.mode === 'dark';
  }

  getDeviceColor(deviceType: string): string {
    return tokens.deviceColors[deviceType as keyof typeof tokens.deviceColors] ?? tokens.deviceColors.unknown;
  }

  private async loadTheme() {
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') {
        this.mode = stored;
      }
    } catch {
      // Use default
    }
  }

  async setMode(mode: ThemeMode) {
    this.mode = mode;
    await AsyncStorage.setItem(THEME_KEY, mode);
  }

  async toggleTheme() {
    await this.setMode(this.isDark ? 'light' : 'dark');
  }
}
