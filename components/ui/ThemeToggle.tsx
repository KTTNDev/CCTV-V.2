'use client';

import {
  Moon,
  Sun,
} from 'lucide-react';

import {
  useTheme,
} from '../providers/ThemeProvider';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export default function ThemeToggle({
  showLabel = false,
  className = '',
}: ThemeToggleProps) {
  const {
    theme,
    toggleTheme,
  } = useTheme();

  const isDark = theme === 'dark';
  const actionLabel = isDark
    ? 'เปลี่ยนเป็นโหมดสว่าง'
    : 'เปลี่ยนเป็นโหมดมืด';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={actionLabel}
      title={actionLabel}
      className={`theme-toggle inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 ${className}`}
    >
      {isDark ? (
        <Sun
          className="h-5 w-5"
          aria-hidden="true"
        />
      ) : (
        <Moon
          className="h-5 w-5"
          aria-hidden="true"
        />
      )}

      {showLabel && (
        <span className="text-xs font-bold">
          {isDark
            ? 'โหมดสว่าง'
            : 'โหมดมืด'}
        </span>
      )}
    </button>
  );
}
