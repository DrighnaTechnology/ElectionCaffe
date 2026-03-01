import { useEffect, useState } from 'react';
import { PaletteIcon, CheckIcon, BookmarkIcon, Loader2Icon } from 'lucide-react';
import { useUIThemeStore, UI_THEME_PRESETS, UIThemePreset, UIThemeTokens } from '../store/ui-theme';
import { useAuthStore } from '../store/auth';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { nbAPI } from '../services/api';
import { toast } from 'sonner';

interface SavedTheme {
  id: string;
  name: string;
  description: string;
  tokens: UIThemeTokens;
  createdAt: string;
}

// Mini colour swatch strip
function ColourStrip({ colors }: { colors: string[] }) {
  return (
    <div className="flex gap-0.5 mt-1">
      {colors.map((c, i) => (
        <div
          key={i}
          className="h-2 flex-1 rounded-sm border border-black/10"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

export function ThemeToggle() {
  const { preset, applyPreset, applyTokens, customTokens } = useUIThemeStore();
  const { user } = useAuthStore();
  const isAdmin = !user?.customRoleId;
  const navigate = useNavigate();

  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [open, setOpen] = useState(false);

  // Load saved themes from DB when dropdown opens (admin only)
  useEffect(() => {
    if (!open || !isAdmin) return;
    setLoadingSaved(true);
    nbAPI.getSavedThemes()
      .then((res) => setSavedThemes(res.data?.data?.themes || []))
      .catch(() => {/* silently ignore */})
      .finally(() => setLoadingSaved(false));
  }, [open, isAdmin]);

  const handleApplyPreset = (key: UIThemePreset) => {
    applyPreset(key);
    toast.success(`Theme "${UI_THEME_PRESETS[key].label}" applied`);
    setOpen(false);
  };

  const handleApplySaved = (t: SavedTheme) => {
    applyTokens(t.tokens);
    toast.success(`Theme "${t.name}" applied`);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative" title="Theme & Appearance">
          <PaletteIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 max-h-[520px] overflow-y-auto">
        {/* ── Built-in presets ── */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
          Built-in Themes
        </DropdownMenuLabel>

        {(Object.entries(UI_THEME_PRESETS) as [UIThemePreset, typeof UI_THEME_PRESETS[UIThemePreset]][]).map(([key, p]) => {
          const isActive = preset === key && Object.keys(customTokens).length === 0;
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => handleApplyPreset(key)}
              className="cursor-pointer px-3 py-2.5 focus:bg-muted"
            >
              <div className="flex items-center gap-3 w-full min-w-0">
                <div
                  className="h-7 w-7 rounded-md border border-black/10 shrink-0"
                  style={{ backgroundColor: p.preview }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium truncate">{p.label}</span>
                    {isActive && <CheckIcon className="h-3 w-3 text-brand shrink-0" />}
                  </div>
                  <ColourStrip colors={[p.tokens.brandPrimary, p.tokens.sidebarBg, p.tokens.background, p.tokens.surface, p.tokens.border]} />
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}

        {isAdmin && (
          <>
            <DropdownMenuSeparator />

            {/* ── Saved (DB) themes — admin only ── */}
            <DropdownMenuLabel className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <BookmarkIcon className="h-3 w-3" />
              Saved Themes
            </DropdownMenuLabel>

            {loadingSaved ? (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                Loading…
              </div>
            ) : savedThemes.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground italic">
                No saved themes yet — generate one in UI Theme Studio
              </div>
            ) : (
              savedThemes.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onClick={() => handleApplySaved(t)}
                  className="cursor-pointer px-3 py-2.5 focus:bg-muted"
                >
                  <div className="flex items-center gap-3 w-full min-w-0">
                    <div
                      className="h-7 w-7 rounded-md border border-black/10 shrink-0"
                      style={{ backgroundColor: t.tokens.brandPrimary }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium truncate block">{t.name}</span>
                      <ColourStrip colors={[t.tokens.brandPrimary, t.tokens.sidebarBg, t.tokens.background, t.tokens.surface, t.tokens.border]} />
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}

            <DropdownMenuSeparator />

            {/* ── Go to Theme Studio — admin only ── */}
            <DropdownMenuItem
              onClick={() => { navigate('/ui-theme'); setOpen(false); }}
              className="cursor-pointer px-3 py-2 text-xs text-brand font-medium"
            >
              <PaletteIcon className="h-3.5 w-3.5 mr-2" />
              Open UI Theme Studio…
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
