import { useEffect } from 'react';
import { useThemeStore } from '../store/theme';
import { useTenantStore } from '../store/tenant';
import { useUIThemeStore } from '../store/ui-theme';
import { hexToHSL } from '../lib/color-utils';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useThemeStore();
  const { branding } = useTenantStore();
  const { applyToDOM } = useUIThemeStore();

  // Boot: apply persisted UI theme on mount
  useEffect(() => {
    applyToDOM();
  }, [applyToDOM]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, setTheme]);

  // Apply tenant branding colors — only if not overridden by UI theme store
  useEffect(() => {
    const root = document.documentElement;
    // Only apply tenant branding if UI theme hasn't set a custom brand color
    // (UI theme store takes precedence over tenant branding for brand-primary)
    if (branding?.primaryColor) {
      const hsl = hexToHSL(branding.primaryColor);
      root.style.setProperty('--brand-primary', hsl);
    }
    if (branding?.secondaryColor) {
      const hsl = hexToHSL(branding.secondaryColor);
      root.style.setProperty('--brand-secondary', hsl);
    }
  }, [branding?.primaryColor, branding?.secondaryColor]);

  return <>{children}</>;
}
