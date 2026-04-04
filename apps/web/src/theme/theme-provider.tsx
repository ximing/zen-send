import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { theme, storageKey, getResolvedTheme, type Theme, type ThemeMode } from './tokens';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  colors: Theme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyCssVariables(colors: Theme) {
  const root = document.documentElement;
  (Object.keys(colors) as Array<keyof Theme>).forEach((key) => {
    root.style.setProperty(`--color-${key}`, colors[key]);
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  });

  const resolvedTheme = getResolvedTheme(mode);
  const colors = theme[resolvedTheme];

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(storageKey, newMode);
  };

  useEffect(() => {
    applyCssVariables(colors);
  }, [colors]);

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  useEffect(() => {
    if (mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const newResolved = getResolvedTheme('system');
      applyCssVariables(theme[newResolved]);
      if (newResolved === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
