export const theme = {
  light: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceElevated: '#F5F5F5',
    primary: '#6366F1',
    primaryHover: '#4F46E5',
    primaryPressed: '#4338CA',
    onPrimary: '#FFFFFF',
    secondary: '#8B5CF6',
    secondaryHover: '#7C3AED',
    accent: '#06B6D4',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    onSurface: '#1F2937',
    border: '#E5E7EB',
    borderStrong: '#D1D5DB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowStrong: 'rgba(0, 0, 0, 0.15)',
  },
  dark: {
    background: '#0F0F0F',
    surface: '#1A1A1A',
    surfaceElevated: '#262626',
    primary: '#818CF8',
    primaryHover: '#6366F1',
    primaryPressed: '#4F46E5',
    onPrimary: '#1F2937',
    secondary: '#A78BFA',
    secondaryHover: '#8B5CF6',
    accent: '#22D3EE',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    onSurface: '#F9FAFB',
    border: '#374151',
    borderStrong: '#4B5563',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowStrong: 'rgba(0, 0, 0, 0.5)',
  },
} as const satisfies Record<'light' | 'dark', Theme>;

export type Theme = {
  background: string;
  surface: string;
  surfaceElevated: string;
  primary: string;
  primaryHover: string;
  primaryPressed: string;
  onPrimary: string;
  secondary: string;
  secondaryHover: string;
  accent: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  onSurface: string;
  border: string;
  borderStrong: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  shadow: string;
  shadowStrong: string;
};
export type ThemeMode = 'light' | 'dark' | 'system';
export const storageKey = 'zen-send-theme';

export function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getResolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode;
}
