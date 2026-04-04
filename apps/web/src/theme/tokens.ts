export const theme = {
  light: {
    bgPrimary: '#FAFAFA',
    bgSurface: '#FFFFFF',
    bgElevated: '#F5F5F5',
    bgOverlay: 'rgba(0, 0, 0, 0.5)',
    primary: '#6366F1',
    primaryHover: '#4F46E5',
    primaryPressed: '#4338CA',
    onPrimary: '#FFFFFF',
    secondary: '#8B5CF6',
    secondaryHover: '#7C3AED',
    accent: '#06B6D4',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textDisabled: '#D1D5DB',
    onSurface: '#1F2937',
    borderDefault: '#E5E7EB',
    borderSubtle: '#F3F4F6',
    borderFocus: '#6366F1',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  dark: {
    bgPrimary: '#0F0F0F',
    bgSurface: '#1A1A1A',
    bgElevated: '#262626',
    bgOverlay: 'rgba(0, 0, 0, 0.7)',
    primary: '#818CF8',
    primaryHover: '#6366F1',
    primaryPressed: '#4F46E5',
    onPrimary: '#1F2937',
    secondary: '#A78BFA',
    secondaryHover: '#8B5CF6',
    accent: '#22D3EE',
    textPrimary: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    textDisabled: '#4B5563',
    onSurface: '#F9FAFB',
    borderDefault: '#374151',
    borderSubtle: '#1F2937',
    borderFocus: '#818CF8',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
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
