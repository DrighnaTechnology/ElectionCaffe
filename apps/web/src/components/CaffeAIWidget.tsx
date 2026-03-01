import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { caffeAIAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { cn } from '../lib/utils';
import {
  XIcon,
  SendIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  RotateCcwIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { StepDoneAnim } from '../assets/caffe-ai/StepDoneAnim';
import { SetupCompleteAnim } from '../assets/caffe-ai/SetupCompleteAnim';

const CAFFE_AI_LOGO = '/caffe-ai-logo.png';

// Matches GUIDE_STEPS.length in the backend (step-03 through step-13 = 11 steps)
const TOTAL_STEPS = 11;

// Read active language from Google Translate cookie (e.g. googtrans=/en/hi → 'hi')
function getAppLanguage(): string {
  const match = document.cookie.match(/googtrans=\/en\/(\w+)/);
  return match?.[1] || 'en';
}

// ── Reusable CSS variable shorthand ──────────────────────────────────────────
// Sidebar variables: designed for dark header panels, works across ALL tenant themes
const C = {
  // Panel header — uses sidebar palette (dark navy), not brand-primary
  headerBg:    'hsl(var(--sidebar-bg))',
  headerText:  'hsl(var(--sidebar-foreground-active))',
  headerBorder:'hsl(var(--sidebar-border))',

  // Brand accent — used for progress, bullets, action tints, send button
  brand:       'hsl(var(--brand-primary))',
  brandFg:     'hsl(var(--brand-primary-foreground))',  // text ON brand bg
  brandTint:   'hsl(var(--brand-primary) / 0.08)',
  brandBorder: 'hsl(var(--brand-primary) / 0.30)',
  brandMuted:  'hsl(var(--brand-muted))',

  // Surface
  bg:          'hsl(var(--background))',
  card:        'hsl(var(--card))',
  cardFg:      'hsl(var(--card-foreground))',
  border:      'hsl(var(--border))',
  muted:       'hsl(var(--muted))',
  mutedFg:     'hsl(var(--muted-foreground))',
  foreground:  'hsl(var(--foreground))',
} as const;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actions?: { label: string; to: string }[];
  isLastStep?: boolean;
  isStepAdvance?: boolean;
}

const WELCOME: Message = {
  role: 'assistant',
  content:
    "Hi! I'm **CaffeAI** — your ElectionCaffe assistant.\n\nAre you **new** and need step-by-step guidance? Or do you have a **specific question**?\n\nYou can also say *\"take me to voters\"* to navigate anywhere.",
};

const QUICK_PROMPTS = [
  'Guide me through setup',
  "What's my next step?",
  'How to bulk import voters?',
  'Take me to booth committees',
];

// ── Markdown renderer ─────────────────────────────────────────────────────────
function inlineParts(line: string): React.ReactNode[] {
  return line.split(/\*\*(.+?)\*\*/g).map((p, j) =>
    j % 2 === 1 ? <strong key={j}>{p}</strong> : p
  );
}

function renderMarkdown(text: string, isUser = false): React.ReactNode[] {
  return text.split('\n').map((line, i) => {
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    if (h1 || h2 || h3) {
      const content = (h1 || h2 || h3)![1];
      return (
        <div
          key={i}
          className="font-semibold text-[0.8rem] mt-2 mb-0.5"
          style={{ color: isUser ? C.brandFg : C.brand, opacity: isUser ? 0.9 : 1 }}
        >
          {inlineParts(content)}
        </div>
      );
    }
    if (line.startsWith('|') && !line.match(/^[\s|:-]+$/)) {
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
      return (
        <div key={i} className="flex gap-2 text-[0.77rem] my-0.5 pl-1">
          {cells.map((c, j) => (
            <span key={j} className={j === 0 ? 'font-medium w-[100px] shrink-0' : 'opacity-80'}>
              {inlineParts(c)}
            </span>
          ))}
        </div>
      );
    }
    if (line.match(/^[\s|:-]+$/)) return null;
    if (line.startsWith('- ')) {
      return (
        <div key={i} className="flex items-start gap-1.5 my-0.5">
          <ChevronRightIcon
            className="mt-[2px] shrink-0"
            style={{ width: 11, height: 11, color: isUser ? C.brandFg : C.brand, opacity: isUser ? 0.75 : 1 }}
          />
          <span>{inlineParts(line.slice(2))}</span>
        </div>
      );
    }
    if (/^\d+\.\s/.test(line)) return <div key={i} className="my-0.5 pl-1">{inlineParts(line)}</div>;
    if (line === '') return <div key={i} className="h-1.5" />;
    if (line === '---') return <hr key={i} className="my-1.5 opacity-20" />;
    return <div key={i} className="my-0.5">{inlineParts(line)}</div>;
  }).filter(Boolean) as React.ReactNode[];
}

// ── Widget ────────────────────────────────────────────────────────────────────
export function CaffeAIWidget() {
  const navigate = useNavigate();
  const { currentElection } = useElectionStore();

  const [open, setOpen]             = useState(false);
  const [minimized, setMinimized]   = useState(false);
  const [messages, setMessages]     = useState<Message[]>([WELCOME]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [guidedStep, setGuidedStep] = useState<number | undefined>(undefined);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && !minimized) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, minimized]);

  useEffect(() => {
    if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, minimized]);

  const buildContext = useCallback(() => {
    if (!currentElection) return undefined;
    return {
      electionName: currentElection.name,
      electionType: currentElection.electionType,
      constituency: currentElection.constituency,
      state:        currentElection.state,
      status:       currentElection.status,
      totalVoters:  currentElection.totalVoters,
      totalBooths:  currentElection.totalBooths,
    };
  }, [currentElection]);

  const sendMessage = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!text || loading) return;

      const userMsg: Message = { role: 'user', content: text };
      const history = [...messages.filter((m) => m !== WELCOME), userMsg].map(
        ({ role, content }) => ({ role, content })
      );
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      try {
        const res  = await caffeAIAPI.chat(history, buildContext(), guidedStep, getAppLanguage());
        const data = res.data?.data;
        const reply:   string = data?.reply   || 'Sorry, something went wrong.';
        const actions: { label: string; to: string }[] = data?.actions || [];
        const navTo:   string | undefined = data?.navTo;
        const isStepAdvance = data?.nextGuidedStep !== undefined;

        if (data?.guidedStep !== undefined) setGuidedStep(data.guidedStep);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: reply, actions, isLastStep: data?.isLastStep, isStepAdvance } as Message,
        ]);
        if (navTo) setTimeout(() => navigate(navTo), 400);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Connection error. Please try again.' },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, buildContext, navigate, guidedStep]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
  };

  const resetChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMessages([WELCOME]);
    setInput('');
    setGuidedStep(undefined);
  };

  const displayStep = guidedStep !== undefined ? guidedStep + 1 : null;
  const progressPct = displayStep ? Math.round((displayStep / TOTAL_STEPS) * 100) : 0;

  return (
    <div className="notranslate" translate="no">
      {/* ── Toggle button ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => { setOpen((o) => !o); setMinimized(false); }}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 overflow-hidden"
        style={{
          background: open ? C.headerBg : C.bg,
          border:     `2px solid ${open ? C.headerBorder : C.brand}`,
          boxShadow:  `0 8px 24px hsl(var(--sidebar-bg) / 0.35)`,
        }}
        title="CaffeAI Assistant"
      >
        {open
          ? <XIcon className="w-6 h-6" style={{ color: C.headerText }} />
          : <img src={CAFFE_AI_LOGO} alt="CaffeAI" className="w-full h-full object-cover" />
        }
      </button>

      {/* ── Chat panel ────────────────────────────────────────────────────────── */}
      {open && (
        <div
          className={cn(
            'fixed bottom-24 right-6 z-50 flex flex-col rounded-2xl overflow-hidden',
            'w-[375px] transition-all duration-300',
            minimized ? 'h-[52px]' : 'h-[560px]'
          )}
          style={{
            background: C.bg,
            border:     `1px solid ${C.border}`,
            boxShadow:  `0 20px 50px hsl(var(--sidebar-bg) / 0.25), 0 4px 12px hsl(var(--foreground) / 0.06)`,
          }}
        >
          {/* ── Header — uses sidebar palette, works with any brand color ─────── */}
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5 shrink-0 cursor-pointer select-none"
            style={{ background: C.headerBg, color: C.headerText }}
            onClick={() => setMinimized((m) => !m)}
          >
            <img
              src={CAFFE_AI_LOGO}
              alt="CaffeAI"
              className="w-7 h-7 rounded-full object-cover shrink-0"
              style={{ border: `1.5px solid hsl(var(--sidebar-border))` }}
            />
            <span className="font-semibold text-sm flex-1">CaffeAI</span>

            {displayStep !== null ? (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: `hsl(var(--sidebar-active-bg))`, color: C.headerText, opacity: 0.9 }}
              >
                Step {displayStep}/{TOTAL_STEPS}
              </span>
            ) : currentElection ? (
              <span
                className="text-[10px] opacity-60 truncate max-w-[110px]"
                title={currentElection.name}
              >
                {currentElection.name}
              </span>
            ) : null}

            <button
              onClick={resetChat}
              className="opacity-50 hover:opacity-100 transition-opacity ml-1 p-0.5 rounded"
              title="New conversation"
            >
              <RotateCcwIcon className="w-3.5 h-3.5" />
            </button>
            <ChevronDownIcon
              className={cn('w-4 h-4 opacity-60 shrink-0 transition-transform duration-200', minimized && 'rotate-180')}
            />
          </div>

          {!minimized && (
            <>
              {/* Step progress bar */}
              {displayStep !== null && (
                <div className="shrink-0 h-[3px]" style={{ background: C.muted }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${progressPct}%`, background: C.brand }}
                  />
                </div>
              )}

              {/* Election context bar — Q&A mode */}
              {currentElection && displayStep === null && (
                <div
                  className="flex items-center gap-2 px-3 py-1.5 text-[11px] shrink-0 border-b"
                  style={{ background: C.muted, borderColor: C.border, color: C.mutedFg }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.brand }} />
                  <span className="truncate">
                    {currentElection.totalVoters?.toLocaleString('en-IN') ?? '—'} voters
                    &nbsp;·&nbsp;
                    {currentElection.totalBooths?.toLocaleString('en-IN') ?? '—'} booths
                    &nbsp;·&nbsp;
                    <span className="capitalize">{currentElection.status?.toLowerCase()}</span>
                  </span>
                </div>
              )}

              {/* ── Messages ───────────────────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5">
                {messages.map((msg, i) => (
                  <div key={i} className="flex flex-col gap-1.5">

                    {/* Step-advance pill (animated) */}
                    {msg.role === 'assistant' && msg.isStepAdvance && (
                      <div
                        className="flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-[11px] font-medium"
                        style={{ background: `${C.brand}1a`, color: C.brand }}
                      >
                        <StepDoneAnim size={13} />
                        Step complete
                      </div>
                    )}

                    {/* Assistant: avatar + bubble */}
                    {msg.role === 'assistant' ? (
                      <div className="flex items-end gap-2 self-start max-w-[92%]">
                        <img
                          src={CAFFE_AI_LOGO}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover shrink-0 mb-0.5"
                          style={{ border: `1px solid ${C.border}` }}
                        />
                        <div
                          className="text-[0.8rem] leading-relaxed px-3 py-2.5 rounded-2xl rounded-bl-sm border"
                          style={{ background: C.card, borderColor: C.border, color: C.cardFg }}
                        >
                          {renderMarkdown(msg.content, false)}
                        </div>
                      </div>
                    ) : (
                      /* User: bubble right-aligned, brand-primary bg */
                      <div
                        className="text-[0.8rem] leading-relaxed px-3 py-2.5 rounded-2xl rounded-br-sm self-end max-w-[82%]"
                        style={{ background: C.brand, color: C.brandFg }}
                      >
                        {renderMarkdown(msg.content, true)}
                      </div>
                    )}

                    {/* Action buttons (indent past avatar) */}
                    {msg.role === 'assistant' && msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-8 max-w-[95%]">
                        {msg.actions.map((action) => (
                          <button
                            key={action.to}
                            onClick={() => navigate(action.to)}
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all hover:opacity-80"
                            style={{ borderColor: C.brandBorder, color: C.brand, background: C.brandTint }}
                          >
                            {action.label}
                            <ArrowRightIcon className="w-3 h-3" />
                          </button>
                        ))}

                        {/* Tell me more + Done→Next */}
                        {guidedStep !== undefined && i === messages.length - 1 && !msg.isLastStep && (
                          <>
                            <button
                              onClick={() => sendMessage('Tell me more about this step')}
                              className="text-[11px] px-2.5 py-1 rounded-full border transition-all hover:opacity-80"
                              style={{ borderColor: C.border, color: C.mutedFg, background: C.muted }}
                            >
                              Tell me more
                            </button>
                            <button
                              onClick={() => sendMessage('done')}
                              className="flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full font-semibold transition-all hover:opacity-85"
                              style={{ background: C.brand, color: C.brandFg }}
                            >
                              Done
                              <ArrowRightIcon className="w-3 h-3" />
                              Next
                            </button>
                          </>
                        )}

                        {/* Setup complete */}
                        {guidedStep !== undefined && i === messages.length - 1 && msg.isLastStep && (
                          <div
                            className="flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full font-semibold"
                            style={{ background: `${C.brand}1a`, color: C.brand }}
                          >
                            <SetupCompleteAnim size={16} />
                            Setup complete
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <div
                    className="self-start flex items-center gap-1 px-3 py-3 rounded-2xl rounded-bl-sm border"
                    style={{ background: C.card, borderColor: C.border }}
                  >
                    {[0, 1, 2].map((n) => (
                      <span
                        key={n}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: C.brand,
                          animation:  `caffeai-bounce 1.2s ${n * 0.2}s infinite ease-in-out`,
                        }}
                      />
                    ))}
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick prompts — first open only */}
              {messages.length === 1 && (
                <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-[11px] px-2.5 py-1 rounded-full border transition-all hover:opacity-80"
                      style={{ borderColor: C.brandBorder, color: C.brand, background: C.brandTint }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input bar */}
              <div
                className="flex items-end gap-2 px-3 py-2.5 border-t shrink-0"
                style={{ borderColor: C.border }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything or say 'take me to voters'…"
                  rows={1}
                  className="flex-1 resize-none rounded-xl border px-3 py-2 text-[0.83rem] bg-transparent outline-none overflow-y-auto"
                  style={{
                    borderColor: C.border,
                    color:       C.foreground,
                    lineHeight:  '1.45',
                    minHeight:   '36px',
                    maxHeight:   '96px',
                  }}
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30 hover:opacity-85"
                  style={{ background: C.brand, color: C.brandFg }}
                >
                  <SendIcon className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
