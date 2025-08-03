export const theme = {
  light: {
    bgPrimary: '#fafafa',
    bgSurface: '#ffffff',
    bgElevated: '#f5f5f5',
    bgOverlay: 'rgba(0, 0, 0, 0.5)',
    primary: '#1a1a1a',
    primaryHover: '#333333',
    primaryPressed: '#000000',
    onPrimary: '#ffffff',
    secondary: '#666666',
    secondaryHover: '#555555',
    accent: '#888888',
    textPrimary: '#1a1a1a',
    textSecondary: '#666666',
    textMuted: '#999999',
    textDisabled: '#cccccc',
    onSurface: '#1a1a1a',
    borderDefault: '#e5e5e5',
    borderSubtle: '#f0f0f0',
    borderFocus: '#1a1a1a',
    success: '#16a34a',
    warning: '#ca8a04',
    error: '#dc2626',
    info: '#2563eb',
  },
  dark: {
    bgPrimary: '#0f0f0f',
    bgSurface: '#141414',
    bgElevated: '#1a1a1a',
    bgOverlay: 'rgba(0, 0, 0, 0.7)',
    primary: '#e5e5e5',
    primaryHover: '#d4d4d4',
    primaryPressed: '#a3a3a3',
    onPrimary: '#0f0f0f',
    secondary: '#888888',
    secondaryHover: '#999999',
    accent: '#666666',
    textPrimary: '#e5e5e5',
    textSecondary: '#888888',
    textMuted: '#555555',
    textDisabled: '#333333',
    onSurface: '#e5e5e5',
    borderDefault: '#2a2a2a',
    borderSubtle: '#1f1f1f',
    borderFocus: '#e5e5e5',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
  },
} as const satisfies Record<'light' | 'dark', Theme>;

export type Theme = {
  bgPrimary: string;
  bgSurface: string;
  bgElevated: string;
  bgOverlay: string;
  primary: string;
  primaryHover: string;
  primaryPressed: string;
  onPrimary: string;
  secondary: string;
  secondaryHover: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  onSurface: string;
  borderDefault: string;
  borderSubtle: string;
  borderFocus: string;
  success: string;
  warning: string;
  error: string;
  info: string;
};

export type ThemeMode = 'light' | 'dark' | 'system';
export const storageKey = 'zen-send-theme';

export function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getResolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode;
}
