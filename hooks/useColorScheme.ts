import { useEffect, useState } from 'react';

/**
 * useColorScheme — returns the active OS-level color preference.
 *
 *   Reads `prefers-color-scheme: dark` on mount and re-renders whenever the
 *   user (or OS auto-night-shift) toggles it. SSR-safe: defaults to 'light'
 *   when window is undefined.
 *
 *   Apps use it to flip between LIGHT_MOOD and DARK_MOOD variants of their
 *   palette so the look adapts to night-time usage automatically.
 */
export function useColorScheme(): 'light' | 'dark' {
  const [scheme, setScheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setScheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return scheme;
}
