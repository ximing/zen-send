// ThemeService delegates to ThemeProvider as the source of truth.
// ThemeProvider manages the actual theme state and class toggling via React context.
// ThemeService is a thin wrapper that syncs via localStorage and custom events.

import { Service } from '@rabjs/react';
import { storageKey, getResolvedTheme, type ThemeMode } from '../theme/tokens';

const THEME_CHANGE_EVENT = 'zen-send:themechange';

export class ThemeService extends Service {
  private _mode: ThemeMode = 'system';

  constructor() {
    super();
    this._loadMode();
  }

  private _loadMode() {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      this._mode = stored;
    }
  }

  get mode(): ThemeMode {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  }

  get resolvedTheme(): 'light' | 'dark' {
    return getResolvedTheme(this.mode);
  }

  setMode(mode: ThemeMode) {
    this._mode = mode;
    localStorage.setItem(storageKey, mode);
    // Notify ThemeProvider to sync via custom event
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { mode } }));
  }

  toggleTheme() {
    this.setMode(this.resolvedTheme === 'dark' ? 'light' : 'dark');
  }
}
