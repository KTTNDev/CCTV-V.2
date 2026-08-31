'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';

export type ColorTheme =
  | 'light'
  | 'dark';

interface ThemeContextValue {
  theme: ColorTheme;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY =
  'rawai-cctv-color-theme';

const THEME_CHANGE_EVENT =
  'rawai-cctv-theme-change';

const ThemeContext =
  createContext<ThemeContextValue | null>(
    null,
  );

function applyTheme(
  theme: ColorTheme,
): void {
  const isDark = theme === 'dark';

  document.documentElement.classList.toggle(
    'dark',
    isDark,
  );

  document.documentElement.style.colorScheme =
    theme;

  const themeColor = document.querySelector<
    HTMLMetaElement
  >('meta[name="theme-color"]');

  themeColor?.setAttribute(
    'content',
    isDark ? '#07111f' : '#201c56',
  );

  window.dispatchEvent(
    new Event(THEME_CHANGE_EVENT),
  );
}

function getThemeSnapshot(): ColorTheme {
  return document.documentElement.classList.contains(
    'dark',
  )
    ? 'dark'
    : 'light';
}

function getServerThemeSnapshot(): ColorTheme {
  return 'light';
}

function subscribeToTheme(
  onStoreChange: () => void,
): () => void {
  window.addEventListener(
    THEME_CHANGE_EVENT,
    onStoreChange,
  );

  return () =>
    window.removeEventListener(
      THEME_CHANGE_EVENT,
      onStoreChange,
    );
}

export function ThemeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => {
        const nextTheme =
          theme === 'dark'
            ? 'light'
            : 'dark';

        applyTheme(nextTheme);

        try {
          window.localStorage.setItem(
            THEME_STORAGE_KEY,
            nextTheme,
          );
        } catch {
          // Theme ยังคงทำงานในหน้านี้แม้บันทึกไม่ได้
        }
      },
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used inside ThemeProvider',
    );
  }

  return context;
}
