import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'blue' | 'emerald' | 'dark' | 'indigo' | 'rose';

export interface ThemeOption {
  id: AppTheme;
  name: string;
  tagline: string;
  iconColor: string;
  bgPreview: string;
  isDark: boolean;
  accentClass: string;
  primaryGradient: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'blue',
    name: 'Hospital Ocean Blue',
    tagline: 'Tema Klasik Rumah Sakit Modern & Bersih',
    iconColor: '#0284c7',
    bgPreview: 'from-sky-600 to-blue-700',
    isDark: false,
    accentClass: 'text-sky-600',
    primaryGradient: 'from-sky-600 to-blue-700',
  },
  {
    id: 'emerald',
    name: 'Clinical Emerald & Teal',
    tagline: 'Nuansa Medis Menenangkan & Segar',
    iconColor: '#059669',
    bgPreview: 'from-emerald-600 to-teal-700',
    isDark: false,
    accentClass: 'text-emerald-600',
    primaryGradient: 'from-emerald-600 to-teal-700',
  },
  {
    id: 'dark',
    name: 'Midnight Dark Mode',
    tagline: 'Mode Gelap Ramah Mata untuk Sif Malam',
    iconColor: '#38bdf8',
    bgPreview: 'from-slate-800 to-slate-950',
    isDark: true,
    accentClass: 'text-sky-400',
    primaryGradient: 'from-slate-800 to-slate-900',
  },
  {
    id: 'indigo',
    name: 'Royal HD Indigo',
    tagline: 'Tampilan Eksklusif Berkontras Tinggi',
    iconColor: '#6366f1',
    bgPreview: 'from-indigo-600 to-purple-700',
    isDark: false,
    accentClass: 'text-indigo-600',
    primaryGradient: 'from-indigo-600 to-purple-700',
  },
  {
    id: 'rose',
    name: 'Warm Coral & Amber',
    tagline: 'Nuansa Ramah, Hangat & Nyaman',
    iconColor: '#f43f5e',
    bgPreview: 'from-rose-500 to-amber-600',
    isDark: false,
    accentClass: 'text-rose-600',
    primaryGradient: 'from-rose-500 to-amber-600',
  },
];

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  currentThemeConfig: ThemeOption;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('hemo_theme_v1') as AppTheme;
    if (saved && ['blue', 'emerald', 'dark', 'indigo', 'rose'].includes(saved)) {
      return saved;
    }
    return 'blue';
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('hemo_theme_v1', newTheme);
  };

  const toggleTheme = () => {
    setTheme(isDark ? 'blue' : 'dark');
  };

  const currentThemeConfig =
    THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];
  const isDark = currentThemeConfig.isDark;

  useEffect(() => {
    // Apply data-theme or class to document root
    const root = document.documentElement;
    root.classList.remove('theme-blue', 'theme-emerald', 'theme-dark', 'theme-indigo', 'theme-rose');
    root.classList.add(`theme-${theme}`);
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, isDark]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        currentThemeConfig,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
