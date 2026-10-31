'use client';

import { useEffect } from 'react';

const ACCENT_MAP: Record<string, string> = {
  white:   '#ffffff',
  sky:     '#38bdf8',
  emerald: '#10b981',
  purple:  '#a855f7',
  rose:    '#f43f5e',
  amber:   '#f59e0b',
};

/**
 * ThemeProvider — Reads saved theme preferences from localStorage and
 * applies them as CSS variables / data attributes on <html> immediately
 * on mount (client-side). This makes accent color + glass blur actually
 * work across the whole app, not just the settings page.
 */
export function ThemeProvider() {
  useEffect(() => {
    const savedAccent = localStorage.getItem('chronicle_accent') || 'white';
    const savedBlur   = localStorage.getItem('chronicle_blur')   || 'balanced';

    const hex = ACCENT_MAP[savedAccent] ?? '#ffffff';

    // Apply accent color as CSS variable
    document.documentElement.style.setProperty('--accent-hex', hex);
    document.documentElement.setAttribute('data-accent', savedAccent);

    // Apply glass blur preset
    document.documentElement.setAttribute('data-blur', savedBlur);
  }, []);

  return null; // renders nothing — pure side-effect component
}

