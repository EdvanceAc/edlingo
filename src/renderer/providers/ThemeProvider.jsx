import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => null,
  toggleTheme: () => null,
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export function ThemeProvider({ children, defaultTheme = 'light', storageKey = 'lingo-theme' }) {
  const [theme, setTheme] = useState(defaultTheme);

  useEffect(() => {
    // Load theme from storage on mount
    const loadTheme = async () => {
      try {
        const response = await window.electronAPI?.getTheme?.();
        if (response && response.success && response.theme) {
          setTheme(response.theme);
        } else {
          // Fallback to localStorage for web compatibility
          const localTheme = localStorage.getItem(storageKey);
          if (localTheme) {
            setTheme(localTheme);
          }
        }
      } catch (error) {
        console.warn('Failed to load theme:', error);
        // Try localStorage as fallback
        const localTheme = localStorage.getItem(storageKey);
        if (localTheme) {
          setTheme(localTheme);
        }
      }
    };

    loadTheme();
  }, [storageKey]);

  useEffect(() => {
    // Apply theme to document
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    // Save theme to storage
    const saveTheme = async () => {
      try {
        await window.electronAPI?.setTheme?.(theme);
      } catch (error) {
        console.warn('Failed to save theme via Electron API:', error);
      }
      // Always save to localStorage as fallback
      localStorage.setItem(storageKey, theme);
    };

    saveTheme();
  }, [theme, storageKey]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}