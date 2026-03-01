import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getTenantSlug } from '../utils/tenant';

// ─── Preset themes ────────────────────────────────────────────────────────────
export type UIThemePreset =
  | 'default'
  | 'saffron'
  | 'emerald'
  | 'midnight'
  | 'royal'
  | 'crimson'
  | 'slate';

export interface UIThemeTokens {
  // ── Mode ──────────────────────────────────────────────────────────────────
  mode: 'light' | 'dark';

  // ── Radius ────────────────────────────────────────────────────────────────
  radius: number; // rem — applied to --radius

  // ── Brand ─────────────────────────────────────────────────────────────────
  brandPrimary: string;       // hex
  brandMuted: string;         // hex
  brandSecondary: string;     // hex

  // ── Background / surface ──────────────────────────────────────────────────
  background: string;         // hex — page background
  surface: string;            // hex — card / panel surface

  // ── Foreground / text ─────────────────────────────────────────────────────
  foreground: string;         // hex — primary text
  mutedFg: string;            // hex — muted text
  cardForeground: string;     // hex — text on cards

  // ── Border / input ────────────────────────────────────────────────────────
  border: string;             // hex
  input: string;              // hex

  // ── Sidebar ───────────────────────────────────────────────────────────────
  sidebarBg: string;          // hex
  sidebarFg: string;          // hex
  sidebarFgActive: string;    // hex
  sidebarBorder: string;      // hex
  sidebarActiveBg: string;    // hex
  sidebarHoverBg: string;     // hex

  // ── Cards ─────────────────────────────────────────────────────────────────
  cardShadow: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  cardBorder: boolean;
  cardBorderRadius: number;   // rem — card specific override

  // ── Typography ────────────────────────────────────────────────────────────
  fontFamily: 'inter' | 'geist' | 'system' | 'poppins' | 'nunito';
  fontScale: number;          // 0.9 | 1.0 | 1.1 | 1.125

  // ── Spacing density ───────────────────────────────────────────────────────
  density: 'compact' | 'default' | 'comfortable';
}

// ─── CSS variable helpers ─────────────────────────────────────────────────────

function hexToHSL(hex: string): string {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
    switch (max) {
      case r: h = ((g - b) / diff + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / diff + 2) * 60; break;
      case b: h = ((r - g) / diff + 4) * 60; break;
    }
  }
  return `${Math.round(h * 10) / 10} ${Math.round(s * 1000) / 10}% ${Math.round(l * 1000) / 10}%`;
}

export function applyUITheme(tokens: UIThemeTokens) {
  const root = document.documentElement;

  // Mode class
  root.classList.remove('light', 'dark');
  root.classList.add(tokens.mode);

  // ── Radius
  root.style.setProperty('--radius', `${tokens.radius}rem`);

  // ── Brand
  root.style.setProperty('--brand-primary', hexToHSL(tokens.brandPrimary));
  root.style.setProperty('--brand-muted', hexToHSL(tokens.brandMuted));
  root.style.setProperty('--brand-secondary', hexToHSL(tokens.brandSecondary));

  // ── Surfaces
  root.style.setProperty('--background', hexToHSL(tokens.background));
  root.style.setProperty('--card', hexToHSL(tokens.surface));
  root.style.setProperty('--popover', hexToHSL(tokens.surface));
  // muted = slightly tinted surface (used by bg-muted, hover states, etc.)
  root.style.setProperty('--muted', hexToHSL(tokens.border));
  root.style.setProperty('--accent', hexToHSL(tokens.border));
  root.style.setProperty('--secondary', hexToHSL(tokens.border));

  // ── Foreground
  root.style.setProperty('--foreground', hexToHSL(tokens.foreground));
  root.style.setProperty('--card-foreground', hexToHSL(tokens.cardForeground));
  root.style.setProperty('--popover-foreground', hexToHSL(tokens.cardForeground));
  root.style.setProperty('--muted-foreground', hexToHSL(tokens.mutedFg));
  root.style.setProperty('--secondary-foreground', hexToHSL(tokens.foreground));
  root.style.setProperty('--accent-foreground', hexToHSL(tokens.foreground));

  // ── Border / input
  root.style.setProperty('--border', hexToHSL(tokens.border));
  root.style.setProperty('--input', hexToHSL(tokens.input));
  root.style.setProperty('--ring', hexToHSL(tokens.brandPrimary));

  // ── Sidebar
  root.style.setProperty('--sidebar-bg', hexToHSL(tokens.sidebarBg));
  root.style.setProperty('--sidebar-foreground', hexToHSL(tokens.sidebarFg));
  root.style.setProperty('--sidebar-foreground-active', hexToHSL(tokens.sidebarFgActive));
  root.style.setProperty('--sidebar-border', hexToHSL(tokens.sidebarBorder));
  root.style.setProperty('--sidebar-active-bg', hexToHSL(tokens.sidebarActiveBg));
  root.style.setProperty('--sidebar-hover-bg', hexToHSL(tokens.sidebarHoverBg));

  // ── Card shadow
  const shadowMap: Record<UIThemeTokens['cardShadow'], string> = {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  };
  root.style.setProperty('--card-shadow', shadowMap[tokens.cardShadow]);
  root.style.setProperty('--card-border-width', tokens.cardBorder ? '1px' : '0px');
  root.style.setProperty('--card-radius', `${tokens.cardBorderRadius}rem`);

  // ── Font family
  const fontMap: Record<UIThemeTokens['fontFamily'], string> = {
    inter: "'Inter', system-ui, sans-serif",
    geist: "'Geist', 'Inter', sans-serif",
    system: "system-ui, -apple-system, sans-serif",
    poppins: "'Poppins', 'Inter', sans-serif",
    nunito: "'Nunito', 'Inter', sans-serif",
  };
  root.style.setProperty('--font-family', fontMap[tokens.fontFamily]);
  // Use CSS var for font scale — avoid touching html font-size which breaks rem cascade
  root.style.setProperty('--font-scale', `${tokens.fontScale}`);

  // ── Density — padding scale via CSS var
  const densityMap = { compact: '0.75', default: '1', comfortable: '1.25' };
  root.style.setProperty('--density', densityMap[tokens.density]);
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export const UI_THEME_PRESETS: Record<UIThemePreset, { label: string; preview: string; tokens: UIThemeTokens }> = {
  default: {
    label: 'ElectionCaffe Default',
    preview: '#F97316',
    tokens: {
      mode: 'light',
      radius: 0.5,
      brandPrimary: '#F97316',
      brandMuted: '#FFF7ED',
      brandSecondary: '#F97316',
      background: '#F5F7FA',
      surface: '#FFFFFF',
      foreground: '#0F172A',
      mutedFg: '#64748B',
      cardForeground: '#0F172A',
      border: '#E2E8F0',
      input: '#E2E8F0',
      sidebarBg: '#111827',
      sidebarFg: '#9CA3AF',
      sidebarFgActive: '#F9FAFB',
      sidebarBorder: '#1F2937',
      sidebarActiveBg: '#1F2937',
      sidebarHoverBg: '#1A2535',
      cardShadow: 'sm',
      cardBorder: true,
      cardBorderRadius: 0.5,
      fontFamily: 'inter',
      fontScale: 1.0,
      density: 'default',
    },
  },
  saffron: {
    label: 'Saffron & Ivory',
    preview: '#FF9933',
    tokens: {
      mode: 'light',
      radius: 0.75,
      brandPrimary: '#FF9933',
      brandMuted: '#FFF8F0',
      brandSecondary: '#138808',
      background: '#FFFDF8',
      surface: '#FFFFFF',
      foreground: '#1A1A2E',
      mutedFg: '#6B7280',
      cardForeground: '#1A1A2E',
      border: '#FFE4B8',
      input: '#FFE4B8',
      sidebarBg: '#1A1A2E',
      sidebarFg: '#A0A8B8',
      sidebarFgActive: '#FFFFFF',
      sidebarBorder: '#2D2D4E',
      sidebarActiveBg: '#FF9933',
      sidebarHoverBg: '#262650',
      cardShadow: 'md',
      cardBorder: true,
      cardBorderRadius: 0.75,
      fontFamily: 'inter',
      fontScale: 1.0,
      density: 'default',
    },
  },
  emerald: {
    label: 'Emerald Victory',
    preview: '#059669',
    tokens: {
      mode: 'light',
      radius: 0.5,
      brandPrimary: '#059669',
      brandMuted: '#ECFDF5',
      brandSecondary: '#0284C7',
      background: '#F8FAFB',
      surface: '#FFFFFF',
      foreground: '#111827',
      mutedFg: '#6B7280',
      cardForeground: '#111827',
      border: '#D1FAE5',
      input: '#D1FAE5',
      sidebarBg: '#064E3B',
      sidebarFg: '#6EE7B7',
      sidebarFgActive: '#FFFFFF',
      sidebarBorder: '#065F46',
      sidebarActiveBg: '#059669',
      sidebarHoverBg: '#047857',
      cardShadow: 'md',
      cardBorder: true,
      cardBorderRadius: 0.5,
      fontFamily: 'inter',
      fontScale: 1.0,
      density: 'default',
    },
  },
  midnight: {
    label: 'Midnight Dark',
    preview: '#6366F1',
    tokens: {
      mode: 'dark',
      radius: 0.5,
      brandPrimary: '#6366F1',
      brandMuted: '#1E1B4B',
      brandSecondary: '#8B5CF6',
      background: '#0B0F1A',
      surface: '#141929',
      foreground: '#F1F5F9',
      mutedFg: '#64748B',
      cardForeground: '#F1F5F9',
      border: '#1E293B',
      input: '#1E293B',
      sidebarBg: '#0D1117',
      sidebarFg: '#8B9DC3',
      sidebarFgActive: '#F1F5F9',
      sidebarBorder: '#1A2235',
      sidebarActiveBg: '#1E2A45',
      sidebarHoverBg: '#161F32',
      cardShadow: 'lg',
      cardBorder: true,
      cardBorderRadius: 0.5,
      fontFamily: 'inter',
      fontScale: 1.0,
      density: 'default',
    },
  },
  royal: {
    label: 'Royal Blue',
    preview: '#1D4ED8',
    tokens: {
      mode: 'light',
      radius: 0.375,
      brandPrimary: '#1D4ED8',
      brandMuted: '#EFF6FF',
      brandSecondary: '#7C3AED',
      background: '#F8FAFF',
      surface: '#FFFFFF',
      foreground: '#0F172A',
      mutedFg: '#64748B',
      cardForeground: '#0F172A',
      border: '#DBEAFE',
      input: '#DBEAFE',
      sidebarBg: '#1E3A8A',
      sidebarFg: '#93C5FD',
      sidebarFgActive: '#FFFFFF',
      sidebarBorder: '#1E40AF',
      sidebarActiveBg: '#1D4ED8',
      sidebarHoverBg: '#1E3A8A',
      cardShadow: 'sm',
      cardBorder: true,
      cardBorderRadius: 0.375,
      fontFamily: 'inter',
      fontScale: 1.0,
      density: 'default',
    },
  },
  crimson: {
    label: 'Crimson Power',
    preview: '#DC2626',
    tokens: {
      mode: 'light',
      radius: 0.25,
      brandPrimary: '#DC2626',
      brandMuted: '#FEF2F2',
      brandSecondary: '#B91C1C',
      background: '#FAFAFA',
      surface: '#FFFFFF',
      foreground: '#111827',
      mutedFg: '#6B7280',
      cardForeground: '#111827',
      border: '#FECACA',
      input: '#FECACA',
      sidebarBg: '#7F1D1D',
      sidebarFg: '#FCA5A5',
      sidebarFgActive: '#FFFFFF',
      sidebarBorder: '#991B1B',
      sidebarActiveBg: '#DC2626',
      sidebarHoverBg: '#92400E',
      cardShadow: 'none',
      cardBorder: true,
      cardBorderRadius: 0.25,
      fontFamily: 'inter',
      fontScale: 1.0,
      density: 'default',
    },
  },
  slate: {
    label: 'Corporate Slate',
    preview: '#475569',
    tokens: {
      mode: 'light',
      radius: 0.25,
      brandPrimary: '#475569',
      brandMuted: '#F1F5F9',
      brandSecondary: '#334155',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      foreground: '#0F172A',
      mutedFg: '#64748B',
      cardForeground: '#0F172A',
      border: '#E2E8F0',
      input: '#E2E8F0',
      sidebarBg: '#0F172A',
      sidebarFg: '#94A3B8',
      sidebarFgActive: '#F8FAFC',
      sidebarBorder: '#1E293B',
      sidebarActiveBg: '#1E293B',
      sidebarHoverBg: '#1E293B',
      cardShadow: 'sm',
      cardBorder: true,
      cardBorderRadius: 0.25,
      fontFamily: 'inter',
      fontScale: 1.0,
      density: 'default',
    },
  },
};

// ─── Store ────────────────────────────────────────────────────────────────────

interface UIThemeState {
  preset: UIThemePreset;
  tokens: UIThemeTokens;
  customTokens: Partial<UIThemeTokens>; // User overrides on top of preset
  applyPreset: (preset: UIThemePreset) => void;
  applyTokens: (tokens: UIThemeTokens) => void; // Apply a full token set (e.g. AI-generated)
  updateToken: <K extends keyof UIThemeTokens>(key: K, value: UIThemeTokens[K]) => void;
  resetToPreset: () => void;
  applyToDOM: () => void;
}

export const useUIThemeStore = create<UIThemeState>()(
  persist(
    (set, get) => ({
      preset: 'default',
      tokens: UI_THEME_PRESETS.default.tokens,
      customTokens: {},

      applyPreset: (preset) => {
        const tokens = UI_THEME_PRESETS[preset].tokens;
        applyUITheme(tokens);
        set({ preset, tokens, customTokens: {} });
      },

      applyTokens: (tokens) => {
        applyUITheme(tokens);
        // Mark as custom (not tied to a named preset)
        set({ tokens, customTokens: tokens as Partial<UIThemeTokens> });
      },

      updateToken: (key, value) => {
        const newTokens = { ...get().tokens, [key]: value };
        const newCustom = { ...get().customTokens, [key]: value };
        applyUITheme(newTokens);
        set({ tokens: newTokens, customTokens: newCustom });
      },

      resetToPreset: () => {
        const tokens = UI_THEME_PRESETS[get().preset].tokens;
        applyUITheme(tokens);
        set({ tokens, customTokens: {} });
      },

      applyToDOM: () => {
        applyUITheme(get().tokens);
      },
    }),
    {
      name: `electioncaffe-ui-theme-${getTenantSlug() || 'default'}`,
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyUITheme(state.tokens);
        }
      },
    }
  )
);
