import { createContext, useContext, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/storageKeys';

type Theme = 'dark' | 'light';

interface POSThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const POSThemeContext = createContext<POSThemeContextType | undefined>(undefined);

// Clave única de preferencia por usuario POS
function getThemeStorageKey(userId?: string): string {
  return userId ? `pos-theme-${userId}` : 'pos-theme-guest';
}

interface POSThemeProviderProps {
  children: React.ReactNode;
  userId?: string;
}

export function POSThemeProvider({ children, userId }: POSThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('dark');

  // Cargar preferencia al montar o cuando cambia el usuario
  useEffect(() => {
    const storageKey = getThemeStorageKey(userId);
    const savedTheme = localStorage.getItem(storageKey) as Theme | null;
    
    if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
      setThemeState(savedTheme);
    } else {
      // Por defecto dark para POS
      setThemeState('dark');
    }
  }, [userId]);

  // Aplicar clase al document cuando cambia el theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    const storageKey = getThemeStorageKey(userId);
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <POSThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </POSThemeContext.Provider>
  );
}

export function usePOSTheme() {
  const context = useContext(POSThemeContext);
  if (context === undefined) {
    throw new Error('usePOSTheme must be used within a POSThemeProvider');
  }
  return context;
}

// Hook para usar en login (sin userId)
export function usePOSThemeLogin() {
  useEffect(() => {
    // Forzar dark en login
    const root = window.document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
  }, []);
}
