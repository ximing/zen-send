export const tokens = {
  colors: {
    light: {
      bgPrimary: '#F7F5F2',
      bgSurface: '#FFFFFF',
      bgElevated: '#F5F5F5',
      textPrimary: '#2C2C2C',
      textSecondary: '#9A958F',
      textMuted: '#B5AFA8',
      borderDefault: '#DDD8D0',
      borderSubtle: '#EDEBE7',
      accent: '#8B9A7D',
      accentSoft: '#8B9A7D20',
    },
    dark: {
      bgPrimary: '#1C1C1E',
      bgSurface: '#242426',
      bgElevated: '#2C2C2E',
      textPrimary: '#E5E2DC',
      textSecondary: '#8A8880',
      textMuted: '#6B6860',
      borderDefault: '#3A3A3C',
      borderSubtle: '#2E2E30',
      accent: '#8B9A7D',
      accentSoft: '#8B9A7D20',
    },
  },
  deviceColors: {
    web: '#3B82F6',
    android: '#22C55E',
    ios: '#A855F7',
    desktop: '#F97316',
    unknown: '#6B7280',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  typography: {
    title: { fontSize: 20, fontWeight: '500' as const },
    body: { fontSize: 14, fontWeight: '400' as const },
    caption: { fontSize: 12, fontWeight: '400' as const },
    small: { fontSize: 11, fontWeight: '400' as const },
  },
  radius: {
    sm: 6,
    md: 8,
    lg: 10,
    xl: 12,
    xxl: 14,
  },
};

export type ThemeMode = 'light' | 'dark';
