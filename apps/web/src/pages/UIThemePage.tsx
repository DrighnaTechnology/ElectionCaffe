import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useUIThemeStore,
  UI_THEME_PRESETS,
  UIThemePreset,
  UIThemeTokens,
} from '../store/ui-theme';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  PaletteIcon,
  TypeIcon,
  LayoutDashboardIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  MonitorIcon,
  SunIcon,
  MoonIcon,
  PanelLeftIcon,
  BoxIcon,
  SparklesIcon,
  Wand2Icon,
  Loader2Icon,
  BookmarkIcon,
  Trash2Icon,
  DatabaseIcon,
  SaveIcon,
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { nbAPI } from '../services/api';

interface SavedTheme {
  id: string;
  name: string;
  description: string;
  tokens: UIThemeTokens;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ColorSwatch({
  label,
  value,
  tokenKey,
}: {
  label: string;
  value: string;
  tokenKey: keyof UIThemeTokens;
}) {
  const { updateToken } = useUIThemeStore();
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <div
            className="h-9 w-9 rounded-md border border-border shadow-sm cursor-pointer"
            style={{ backgroundColor: value }}
          />
          <input
            type="color"
            value={value}
            onChange={(e) => updateToken(tokenKey, e.target.value as any)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground uppercase">{value}</span>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  tokenKey,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  tokenKey: keyof UIThemeTokens;
}) {
  const { updateToken } = useUIThemeStore();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-mono text-muted-foreground">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => updateToken(tokenKey, parseFloat(e.target.value) as any)}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-brand"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

function OptionPicker<T extends string>({
  label,
  value,
  options,
  tokenKey,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  tokenKey: keyof UIThemeTokens;
}) {
  const { updateToken } = useUIThemeStore();
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => updateToken(tokenKey, opt.value as any)}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
              value === opt.value
                ? 'bg-brand text-white border-brand'
                : 'bg-background border-border hover:bg-muted'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Live Preview ─────────────────────────────────────────────────────────────

function LivePreview() {
  const { tokens } = useUIThemeStore();
  return (
    <div
      className="rounded-xl overflow-hidden border border-border"
      style={{ fontFamily: 'var(--font-family)' }}
    >
      {/* Mini sidebar + content mockup */}
      <div className="flex h-72">
        {/* Sidebar */}
        <div
          className="w-40 flex flex-col p-3 gap-1 shrink-0"
          style={{ backgroundColor: tokens.sidebarBg }}
        >
          <div className="mb-2 px-1">
            <div
              className="h-2 w-16 rounded-full"
              style={{ backgroundColor: tokens.brandPrimary }}
            />
          </div>
          {['Dashboard', 'Voters', 'Analytics', 'Campaign'].map((item, i) => (
            <div
              key={item}
              className="px-2 py-1.5 rounded-md text-xs transition-colors"
              style={{
                backgroundColor: i === 0 ? tokens.sidebarActiveBg : 'transparent',
                color: i === 0 ? tokens.sidebarFgActive : tokens.sidebarFg,
              }}
            >
              {item}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div
          className="flex-1 p-3 overflow-hidden"
          style={{ backgroundColor: tokens.background }}
        >
          {/* Header bar */}
          <div
            className="h-8 rounded-md mb-3 flex items-center justify-between px-3"
            style={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}` }}
          >
            <div className="h-2 w-24 rounded-full" style={{ backgroundColor: tokens.border }} />
            <div
              className="h-5 w-5 rounded-full"
              style={{ backgroundColor: tokens.brandPrimary }}
            />
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {['Voters', 'Parts', 'Cadres'].map((stat, i) => (
              <div
                key={stat}
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: tokens.surface,
                  border: `1px solid ${tokens.border}`,
                  boxShadow: 'var(--card-shadow)',
                  borderRadius: `${tokens.cardBorderRadius}rem`,
                }}
              >
                <div className="h-1.5 w-8 rounded-full mb-1" style={{ backgroundColor: tokens.border }} />
                <div
                  className="h-3 w-10 rounded-full font-bold"
                  style={{ backgroundColor: i === 0 ? tokens.brandPrimary : tokens.border, opacity: i === 0 ? 1 : 0.6 }}
                />
              </div>
            ))}
          </div>

          {/* Table row mockup */}
          <div
            className="rounded-lg p-2"
            style={{
              backgroundColor: tokens.surface,
              border: `1px solid ${tokens.border}`,
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div className="flex gap-2 mb-1.5 pb-1.5" style={{ borderBottom: `1px solid ${tokens.border}` }}>
              {['Name', 'Part', 'Status'].map((h) => (
                <div key={h} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: tokens.border }} />
              ))}
            </div>
            {[1, 2].map((row) => (
              <div key={row} className="flex gap-2 py-1">
                {[1, 2, 3].map((col) => (
                  <div
                    key={col}
                    className="flex-1 h-1.5 rounded-full"
                    style={{ backgroundColor: tokens.border, opacity: 0.5 }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(to right, ${tokens.brandPrimary}, ${tokens.brandSecondary})`,
        }}
      />
    </div>
  );
}

// ─── Theme Card (reusable for generated + saved) ──────────────────────────────

function ThemeCard({
  name,
  description,
  tokens,
  createdAt,
  onApply,
  onSave,
  onDelete,
  saving,
}: {
  name: string;
  description: string;
  tokens: UIThemeTokens;
  createdAt?: string;
  onApply: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  saving?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
          {createdAt && (
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
        <Badge variant="outline" className="shrink-0 text-xs">
          {tokens.mode === 'dark' ? (
            <><MoonIcon className="h-3 w-3 mr-1" />Dark</>
          ) : (
            <><SunIcon className="h-3 w-3 mr-1" />Light</>
          )}
        </Badge>
      </div>

      {/* Colour palette strip */}
      <div className="flex gap-1">
        {[tokens.brandPrimary, tokens.brandSecondary, tokens.sidebarBg, tokens.background, tokens.surface, tokens.border, tokens.foreground].map((c, i) => (
          <div key={i} className="flex-1 h-4 rounded border border-black/10" style={{ backgroundColor: c }} title={c} />
        ))}
      </div>

      {/* Token summary */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
        <span>Font: <span className="text-foreground font-medium capitalize">{tokens.fontFamily}</span></span>
        <span>Density: <span className="text-foreground font-medium capitalize">{tokens.density}</span></span>
        <span>Radius: <span className="text-foreground font-medium">{tokens.radius}rem</span></span>
        <span>Shadow: <span className="text-foreground font-medium">{tokens.cardShadow}</span></span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onApply}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
          style={{ backgroundColor: 'hsl(var(--brand-primary))', color: '#ffffff' }}
        >
          <CheckCircleIcon className="h-3.5 w-3.5" />
          Apply
        </button>
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <BookmarkIcon className="h-3.5 w-3.5" />}
            Save
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2Icon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Saved Themes Panel ───────────────────────────────────────────────────────

function SavedThemesPanel({ refreshTrigger }: { refreshTrigger: number }) {
  const { applyTokens } = useUIThemeStore();
  const [themes, setThemes] = useState<SavedTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadThemes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await nbAPI.getSavedThemes();
      setThemes(res.data?.data?.themes || []);
    } catch {
      // silently ignore — user may not have saved any themes yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadThemes(); }, [loadThemes, refreshTrigger]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await nbAPI.deleteTheme(id);
      setThemes((prev) => prev.filter((t) => t.id !== id));
      toast.success('Theme deleted');
    } catch {
      toast.error('Failed to delete theme');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2Icon className="h-4 w-4 animate-spin" />
          Loading saved themes…
        </CardContent>
      </Card>
    );
  }

  if (themes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <DatabaseIcon className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No saved themes yet</p>
          <p className="text-xs text-muted-foreground mt-1">Generate a theme with AI and save it to your library</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DatabaseIcon className="h-4 w-4 text-brand" />
          Saved Themes
          <Badge variant="outline" className="ml-auto text-xs">{themes.length}</Badge>
        </CardTitle>
        <CardDescription>Your saved themes, stored in the database — available across sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              name={theme.name}
              description={theme.description}
              tokens={theme.tokens}
              createdAt={theme.createdAt}
              onApply={() => {
                applyTokens(theme.tokens);
                toast.success(`Theme "${theme.name}" applied`);
              }}
              onDelete={deletingId === theme.id ? undefined : () => handleDelete(theme.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── AI Theme Generator ───────────────────────────────────────────────────────

function AIThemeGenerator({ onThemeSaved }: { onThemeSaved: () => void }) {
  const { applyTokens } = useUIThemeStore();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState<{ tokens: UIThemeTokens; name: string; description: string } | null>(null);

  const EXAMPLE_PROMPTS = [
    'Deep navy blue political party with gold accents, professional and authoritative',
    'Saffron and white Indian election campaign, vibrant and energetic',
    'Minimalist green eco-friendly party, clean and modern light theme',
    'Dark midnight theme with purple neon accents, tech-forward',
    'Warm terracotta and cream, regional grassroots party feel',
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setGenerated(null);
    try {
      const res = await nbAPI.generateAITheme(prompt.trim());
      const data = res.data?.data;
      if (!data?.tokens) throw new Error('Invalid response');
      setGenerated({ tokens: data.tokens as UIThemeTokens, name: data.themeName, description: data.themeDescription });
      toast.success(`Theme "${data.themeName}" generated!`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to generate theme';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generated) return;
    setSaving(true);
    try {
      await nbAPI.saveTheme({ name: generated.name, description: generated.description, tokens: generated.tokens });
      toast.success(`Theme "${generated.name}" saved to your library`);
      onThemeSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-brand/30 bg-brand/[0.02]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2Icon className="h-5 w-5 text-brand" />
          AI Theme Generator
        </CardTitle>
        <CardDescription>
          Describe your ideal look in plain English — AI will generate a complete matching theme
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prompt input */}
        <div className="space-y-2">
          <Label className="text-xs">Describe your theme</Label>
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Deep blue with gold accents, professional political campaign, dark mode..."
            className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50 transition-colors"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
          />
        </div>

        {/* Example prompts */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Example prompts</Label>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_PROMPTS.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="px-2.5 py-1 text-xs rounded-full border border-border hover:border-brand/40 hover:bg-brand/5 transition-colors text-left"
              >
                {ex.length > 48 ? ex.slice(0, 48) + '…' : ex}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'hsl(var(--brand-primary))', color: '#ffffff' }}
        >
          {loading ? (
            <><Loader2Icon className="h-4 w-4 animate-spin" />Generating theme…</>
          ) : (
            <><Wand2Icon className="h-4 w-4" />Generate Theme with AI</>
          )}
        </button>

        {/* Generated result */}
        {generated && (
          <ThemeCard
            name={generated.name}
            description={generated.description}
            tokens={generated.tokens}
            onApply={() => {
              applyTokens(generated.tokens);
              toast.success(`Theme "${generated.name}" applied to your app`);
            }}
            onSave={handleSave}
            saving={saving}
            onDelete={undefined}
          />
        )}

        {generated && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCwIcon className="h-3.5 w-3.5" />
            Regenerate with same prompt
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function UIThemePage() {
  const { preset, tokens, applyPreset, updateToken, resetToPreset, customTokens } = useUIThemeStore();
  const [activeTab, setActiveTab] = useState('presets');
  const [savedRefresh, setSavedRefresh] = useState(0);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const saveInputRef = useRef<HTMLInputElement>(null);
  const hasCustom = Object.keys(customTokens).length > 0;

  const handlePreset = (p: UIThemePreset) => {
    applyPreset(p);
    toast.success(`Theme "${UI_THEME_PRESETS[p].label}" applied`);
  };

  const handleReset = () => {
    resetToPreset();
    toast.success('Reset to preset defaults');
  };

  const handleSaveCurrent = async () => {
    const name = saveName.trim() || UI_THEME_PRESETS[preset].label + ' (custom)';
    setSaving(true);
    try {
      await nbAPI.saveTheme({ name, description: `Manually saved on ${new Date().toLocaleDateString('en-IN')}`, tokens });
      toast.success(`Theme "${name}" saved`);
      setSaveName('');
      setSavedRefresh((n) => n + 1);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <PaletteIcon className="h-7 w-7 text-brand" />
            UI Theme Studio
          </h1>
          <p className="text-muted-foreground">
            Customize every visual element — colours, typography, cards, sidebar, shadows and spacing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasCustom && (
            <Badge className="bg-brand/10 text-brand border-brand/20">
              <SparklesIcon className="h-3 w-3 mr-1" />
              Custom overrides active
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Reset to preset
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left — controls */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="presets" className="flex items-center gap-1.5">
              <SparklesIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Presets</span>
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex items-center gap-1.5">
              <PaletteIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Colours</span>
            </TabsTrigger>
            <TabsTrigger value="sidebar" className="flex items-center gap-1.5">
              <PanelLeftIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sidebar</span>
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex items-center gap-1.5">
              <BoxIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </TabsTrigger>
            <TabsTrigger value="typography" className="flex items-center gap-1.5">
              <TypeIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Text</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Presets ── */}
          <TabsContent value="presets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-brand" />
                  Theme Presets
                </CardTitle>
                <CardDescription>
                  One-click complete themes — picks colours, sidebar, typography and spacing together
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(Object.entries(UI_THEME_PRESETS) as [UIThemePreset, (typeof UI_THEME_PRESETS)[UIThemePreset]][]).map(([key, p]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handlePreset(key)}
                      className={`relative p-4 border rounded-xl text-left transition-all hover:shadow-md ${
                        preset === key && !hasCustom
                          ? 'border-brand ring-2 ring-brand/30 shadow-sm'
                          : 'border-border hover:border-brand/40'
                      }`}
                    >
                      {preset === key && !hasCustom && (
                        <CheckCircleIcon className="absolute top-3 right-3 h-4 w-4 text-brand" />
                      )}
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="h-8 w-8 rounded-lg shadow-sm border border-white/20"
                          style={{ backgroundColor: p.preview }}
                        />
                        <div>
                          <p className="font-semibold text-sm">{p.label}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {p.tokens.mode === 'dark' ? (
                              <MoonIcon className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <SunIcon className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className="text-xs text-muted-foreground capitalize">{p.tokens.mode}</span>
                          </div>
                        </div>
                      </div>
                      {/* Mini colour palette preview */}
                      <div className="flex gap-1">
                        {[p.tokens.brandPrimary, p.tokens.sidebarBg, p.tokens.background, p.tokens.surface, p.tokens.border].map((c, i) => (
                          <div
                            key={i}
                            className="flex-1 h-3 rounded-full border border-black/10"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <AIThemeGenerator onThemeSaved={() => setSavedRefresh((n) => n + 1)} />

            <SavedThemesPanel refreshTrigger={savedRefresh} />
          </TabsContent>

          {/* ── Colours ── */}
          <TabsContent value="colors" className="space-y-4">
            {/* Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MonitorIcon className="h-5 w-5 text-brand" />
                  Mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  {(['light', 'dark'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateToken('mode', m)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        tokens.mode === m
                          ? 'bg-brand text-white border-brand'
                          : 'bg-background border-border hover:bg-muted'
                      }`}
                    >
                      {m === 'light' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Brand colours */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Brand Colours</CardTitle>
                <CardDescription>Primary accent colour used for buttons, links, active states and highlights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <ColorSwatch label="Primary" value={tokens.brandPrimary} tokenKey="brandPrimary" />
                  <ColorSwatch label="Muted / Background tint" value={tokens.brandMuted} tokenKey="brandMuted" />
                  <ColorSwatch label="Secondary accent" value={tokens.brandSecondary} tokenKey="brandSecondary" />
                </div>
              </CardContent>
            </Card>

            {/* Surfaces */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Surfaces & Backgrounds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <ColorSwatch label="Page background" value={tokens.background} tokenKey="background" />
                  <ColorSwatch label="Card / panel surface" value={tokens.surface} tokenKey="surface" />
                  <ColorSwatch label="Border" value={tokens.border} tokenKey="border" />
                  <ColorSwatch label="Input border" value={tokens.input} tokenKey="input" />
                </div>
              </CardContent>
            </Card>

            {/* Text */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Text Colours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <ColorSwatch label="Primary text" value={tokens.foreground} tokenKey="foreground" />
                  <ColorSwatch label="Card text" value={tokens.cardForeground} tokenKey="cardForeground" />
                  <ColorSwatch label="Muted / secondary text" value={tokens.mutedFg} tokenKey="mutedFg" />
                </div>
              </CardContent>
            </Card>

            {/* Radius */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Border Radius</CardTitle>
                <CardDescription>Global rounding applied to all elements via --radius</CardDescription>
              </CardHeader>
              <CardContent>
                <SliderRow label="Radius" value={tokens.radius} min={0} max={1.5} step={0.125} unit="rem" tokenKey="radius" />
                <div className="flex gap-3 mt-4">
                  {[0, 0.25, 0.375, 0.5, 0.75, 1, 1.5].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => updateToken('radius', r)}
                      className={`h-8 w-8 border-2 flex-shrink-0 transition-colors ${
                        tokens.radius === r ? 'border-brand bg-brand/10' : 'border-border hover:border-brand/40'
                      }`}
                      style={{ borderRadius: `${r}rem` }}
                      title={`${r}rem`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Sidebar ── */}
          <TabsContent value="sidebar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PanelLeftIcon className="h-5 w-5 text-brand" />
                  Sidebar Colours
                </CardTitle>
                <CardDescription>Customise every colour token in the navigation sidebar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <ColorSwatch label="Background" value={tokens.sidebarBg} tokenKey="sidebarBg" />
                  <ColorSwatch label="Text" value={tokens.sidebarFg} tokenKey="sidebarFg" />
                  <ColorSwatch label="Active text" value={tokens.sidebarFgActive} tokenKey="sidebarFgActive" />
                  <ColorSwatch label="Border" value={tokens.sidebarBorder} tokenKey="sidebarBorder" />
                  <ColorSwatch label="Active item bg" value={tokens.sidebarActiveBg} tokenKey="sidebarActiveBg" />
                  <ColorSwatch label="Hover item bg" value={tokens.sidebarHoverBg} tokenKey="sidebarHoverBg" />
                </div>
              </CardContent>
            </Card>

            {/* Quick sidebar colour combos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Sidebar Styles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {[
                    { name: 'Deep Navy', bg: '#0F172A', fg: '#94A3B8', active: '#1E293B', activeFg: '#F8FAFC' },
                    { name: 'Charcoal', bg: '#1C1C1E', fg: '#8E8E93', active: '#2C2C2E', activeFg: '#FFFFFF' },
                    { name: 'Forest', bg: '#052E16', fg: '#6EE7B7', active: '#065F46', activeFg: '#FFFFFF' },
                    { name: 'Royal', bg: '#1E3A8A', fg: '#93C5FD', active: '#1D4ED8', activeFg: '#FFFFFF' },
                    { name: 'Crimson', bg: '#7F1D1D', fg: '#FCA5A5', active: '#DC2626', activeFg: '#FFFFFF' },
                    { name: 'Saffron', bg: '#1A1A2E', fg: '#A0A8B8', active: '#FF9933', activeFg: '#FFFFFF' },
                    { name: 'Purple', bg: '#2D1B69', fg: '#C4B5FD', active: '#6D28D9', activeFg: '#FFFFFF' },
                    { name: 'White', bg: '#FFFFFF', fg: '#6B7280', active: '#F3F4F6', activeFg: '#111827' },
                  ].map((style) => (
                    <button
                      key={style.name}
                      type="button"
                      onClick={() => {
                        updateToken('sidebarBg', style.bg);
                        updateToken('sidebarFg', style.fg);
                        updateToken('sidebarFgActive', style.activeFg);
                        updateToken('sidebarActiveBg', style.active);
                        updateToken('sidebarHoverBg', style.active + '99');
                        updateToken('sidebarBorder', style.bg);
                      }}
                      className="flex flex-col items-center gap-1.5 p-2 border rounded-lg hover:border-brand/40 transition-colors"
                    >
                      <div
                        className="h-8 w-8 rounded-md border border-black/10"
                        style={{ backgroundColor: style.bg }}
                      />
                      <span className="text-xs text-muted-foreground">{style.name}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Cards ── */}
          <TabsContent value="cards" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BoxIcon className="h-5 w-5 text-brand" />
                  Card & Panel Styling
                </CardTitle>
                <CardDescription>Control shadow depth, border visibility and card corner radius</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <OptionPicker
                  label="Shadow depth"
                  value={tokens.cardShadow}
                  tokenKey="cardShadow"
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'sm', label: 'Subtle' },
                    { value: 'md', label: 'Medium' },
                    { value: 'lg', label: 'Deep' },
                    { value: 'xl', label: 'Floating' },
                  ]}
                />

                <div className="space-y-2">
                  <Label className="text-xs">Card borders</Label>
                  <div className="flex gap-3">
                    {[true, false].map((val) => (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => updateToken('cardBorder', val)}
                        className={`px-4 py-2 text-xs rounded-lg border transition-colors ${
                          tokens.cardBorder === val
                            ? 'bg-brand text-white border-brand'
                            : 'bg-background border-border hover:bg-muted'
                        }`}
                      >
                        {val ? 'Visible' : 'Hidden'}
                      </button>
                    ))}
                  </div>
                </div>

                <SliderRow
                  label="Card border radius"
                  value={tokens.cardBorderRadius}
                  min={0}
                  max={1.5}
                  step={0.125}
                  unit="rem"
                  tokenKey="cardBorderRadius"
                />

                {/* Shadow preview */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Shadow preview</Label>
                  <div className="flex gap-4 flex-wrap">
                    {(['none', 'sm', 'md', 'lg', 'xl'] as const).map((s) => (
                      <div
                        key={s}
                        className="h-16 w-24 bg-background rounded-lg border flex items-center justify-center text-xs text-muted-foreground"
                        style={{
                          boxShadow: {
                            none: 'none',
                            sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                            md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                          }[s],
                          borderRadius: `${tokens.cardBorderRadius}rem`,
                          outline: tokens.cardShadow === s ? '2px solid hsl(var(--brand-primary))' : 'none',
                          outlineOffset: '2px',
                        }}
                        onClick={() => updateToken('cardShadow', s)}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Typography ── */}
          <TabsContent value="typography" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TypeIcon className="h-5 w-5 text-brand" />
                  Typography & Density
                </CardTitle>
                <CardDescription>Font family, text scale and UI density (padding/spacing)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Font family */}
                <div className="space-y-3">
                  <Label className="text-xs">Font family</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {([
                      { value: 'inter', label: 'Inter', preview: 'Aa — Clean & modern' },
                      { value: 'geist', label: 'Geist', preview: 'Aa — Developer friendly' },
                      { value: 'poppins', label: 'Poppins', preview: 'Aa — Rounded & friendly' },
                      { value: 'nunito', label: 'Nunito', preview: 'Aa — Soft & approachable' },
                      { value: 'roboto', label: 'Roboto', preview: 'Aa — Google standard' },
                      { value: 'lato', label: 'Lato', preview: 'Aa — Warm & stable' },
                      { value: 'opensans', label: 'Open Sans', preview: 'Aa — Neutral & readable' },
                      { value: 'montserrat', label: 'Montserrat', preview: 'Aa — Bold & geometric' },
                      { value: 'raleway', label: 'Raleway', preview: 'Aa — Elegant & thin' },
                      { value: 'ubuntu', label: 'Ubuntu', preview: 'Aa — Humanist & unique' },
                      { value: 'sourcesans', label: 'Source Sans', preview: 'Aa — Adobe professional' },
                      { value: 'firasans', label: 'Fira Sans', preview: 'Aa — Mozilla crafted' },
                      { value: 'rubik', label: 'Rubik', preview: 'Aa — Rounded geometric' },
                      { value: 'outfit', label: 'Outfit', preview: 'Aa — Modern & versatile' },
                      { value: 'system', label: 'System', preview: 'Aa — OS default' },
                    ] as const).map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => updateToken('fontFamily', f.value)}
                        className={`p-3 border rounded-lg text-left transition-colors ${
                          tokens.fontFamily === f.value
                            ? 'border-brand ring-2 ring-brand/20 bg-brand/5'
                            : 'border-border hover:border-brand/40'
                        }`}
                      >
                        <p className="font-semibold text-sm">{f.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{f.preview}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font scale */}
                <OptionPicker
                  label="Text scale"
                  value={String(tokens.fontScale) as any}
                  tokenKey="fontScale"
                  options={[
                    { value: 0.875 as any, label: 'Small (87.5%)' },
                    { value: 1.0 as any, label: 'Default (100%)' },
                    { value: 1.0625 as any, label: 'Medium (106%)' },
                    { value: 1.125 as any, label: 'Large (112.5%)' },
                  ]}
                />

                {/* Density */}
                <div className="space-y-3">
                  <Label className="text-xs">Layout density</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: 'compact', label: 'Compact', desc: 'More data, less space' },
                      { value: 'default', label: 'Default', desc: 'Balanced spacing' },
                      { value: 'comfortable', label: 'Comfortable', desc: 'More breathing room' },
                    ] as const).map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => updateToken('density', d.value)}
                        className={`p-3 border rounded-lg text-left transition-colors ${
                          tokens.density === d.value
                            ? 'border-brand ring-2 ring-brand/20 bg-brand/5'
                            : 'border-border hover:border-brand/40'
                        }`}
                      >
                        <p className="font-semibold text-sm">{d.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{d.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Typography preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Typography Preview</CardTitle>
              </CardHeader>
              <CardContent
                className="space-y-2"
                style={{ fontFamily: 'var(--font-family)' }}
              >
                <p className="text-2xl font-bold">ElectionCaffe Dashboard</p>
                <p className="text-lg font-semibold text-foreground">Constituency Overview</p>
                <p className="text-base text-foreground">Total registered voters: 24,850</p>
                <p className="text-sm text-muted-foreground">Last updated: Today at 10:42 AM · Booth 42B</p>
                <p className="text-xs text-muted-foreground">Data sourced from EC digital voter roll</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Right — sticky live preview */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutDashboardIcon className="h-4 w-4 text-brand" />
                Live Preview
              </CardTitle>
              <CardDescription className="text-xs">Updates in real-time as you change settings</CardDescription>
            </CardHeader>
            <CardContent>
              <LivePreview />
            </CardContent>
          </Card>

          {/* Current preset card */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active preset</p>
                <Badge variant="outline">{UI_THEME_PRESETS[preset].label}</Badge>
              </div>
              <div className="flex gap-1">
                {[
                  tokens.brandPrimary,
                  tokens.brandSecondary,
                  tokens.sidebarBg,
                  tokens.background,
                  tokens.surface,
                  tokens.border,
                ].map((c, i) => (
                  <div
                    key={i}
                    className="flex-1 h-4 rounded border border-black/10"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Mode: <span className="text-foreground font-medium capitalize">{tokens.mode}</span></span>
                <span>Radius: <span className="text-foreground font-medium">{tokens.radius}rem</span></span>
                <span>Font: <span className="text-foreground font-medium capitalize">{tokens.fontFamily}</span></span>
                <span>Density: <span className="text-foreground font-medium capitalize">{tokens.density}</span></span>
                <span>Shadow: <span className="text-foreground font-medium">{tokens.cardShadow}</span></span>
                <span>Borders: <span className="text-foreground font-medium">{tokens.cardBorder ? 'On' : 'Off'}</span></span>
              </div>
              {hasCustom && (
                <Button size="sm" variant="outline" className="w-full" onClick={handleReset}>
                  <RefreshCwIcon className="h-3 w-3 mr-2" />
                  Reset custom overrides
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Save current theme */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <SaveIcon className="h-4 w-4 text-brand" />
                Save Current Theme
              </CardTitle>
              <CardDescription className="text-xs">Save your adjustments to the library for later use</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                ref={saveInputRef}
                placeholder={`${UI_THEME_PRESETS[preset].label} (custom)`}
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCurrent(); }}
                className="text-sm h-8"
              />
              <Button
                size="sm"
                className="w-full"
                onClick={handleSaveCurrent}
                disabled={saving}
              >
                {saving ? (
                  <><Loader2Icon className="h-3.5 w-3.5 mr-2 animate-spin" />Saving…</>
                ) : (
                  <><BookmarkIcon className="h-3.5 w-3.5 mr-2" />Save to Library</>
                )}
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
