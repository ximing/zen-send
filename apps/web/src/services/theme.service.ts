// Stub service - will be replaced in Task 3
import { Service } from '@rabjs/react';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'zen-send-theme';

export class ThemeService extends Service {
  mode: ThemeMode = 'system';
  resolvedTheme: 'light' | 'dark' = 'light';

  constructor() {
    super();
    this.loadMode();
    this.updateResolvedTheme();
  }

  private loadMode() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      this.mode = stored;
    }
  }

  setMode(mode: ThemeMode) {
    this.mode = mode;
    localStorage.setItem(STORAGE_KEY, mode);
    this.updateResolvedTheme();
  }

  private updateResolvedTheme() {
    if (this.mode === 'system') {
      this.resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } else {
      this.resolvedTheme = this.mode;
    }
    this.applyTheme();
  }

  private applyTheme() {
    const root = document.documentElement;
    if (this.resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  toggleTheme() {
    this.setMode(this.resolvedTheme === 'dark' ? 'light' : 'dark');
  }
}
