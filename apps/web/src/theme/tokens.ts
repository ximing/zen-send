export const theme = {
  light: {
    bgPrimary: '#F7F5F2',
    bgSurface: '#FFFFFF',
    bgElevated: '#F5F5F5',
    bgOverlay: 'rgba(0, 0, 0, 0.5)',
    primary: '#2C2C2C',
    primaryHover: '#3C3C3C',
    primaryPressed: '#1C1C1C',
    onPrimary: '#F7F5F2',
    secondary: '#9A958F',
    secondaryHover: '#8A857C',
    accent: '#8B9A7D',
    accentSoft: 'rgba(139, 154, 125, 0.12)',
    textPrimary: '#2C2C2C',
    textSecondary: '#9A958F',
    textMuted: '#B5AFA8',
    textDisabled: '#DDD8D0',
    onSurface: '#2C2C2C',
    borderFocus: '#8B9A7D',
    success: '#8B9A7D',
    warning: '#ca8a04',
    error: '#dc2626',
    info: '#2563eb',
  },
  dark: {
    bgPrimary: '#1C1C1E',
    bgSurface: '#242426',
    bgElevated: '#2C2C2E',
    bgHeader: '#3A3A3C',
    bgOverlay: 'rgba(0, 0, 0, 0.7)',
    primary: '#3A3A3C',
    primaryHover: '#4A4A4C',
    primaryPressed: '#2A2A2C',
    onPrimary: '#E5E2DC',
    secondary: '#8A8880',
    secondaryHover: '#9A9890',
    accent: '#8B9A7D',
    accentSoft: 'rgba(139, 154, 125, 0.12)',
    textPrimary: '#E5E2DC',
    textSecondary: '#8A8880',
    textMuted: '#6B6860',
    textFaint: '#4A4A4C',
    textDisabled: '#5A5A5C',
    onSurface: '#E5E2DC',
    borderFocus: '#8B9A7D',
    success: '#8B9A7D',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
  },
} as const satisfies Record<'light' | 'dark', Theme>;

export type Theme = {
  bgPrimary: string;
  bgSurface: string;
  bgElevated: string;
  bgHeader?: string;
  bgOverlay: string;
  primary: string;
  primaryHover: string;
  primaryPressed: string;
  onPrimary: string;
  secondary: string;
  secondaryHover: string;
  accent: string;
  accentSoft: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint?: string;
  textDisabled: string;
  onSurface: string;
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
