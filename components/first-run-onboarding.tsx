'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Server, KeyRound, Rocket, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ONBOARDING_DONE_KEY = 'klipdeck-onboarding-complete';
const CONFIG_DRAFT_KEY = 'klipdeck-config-draft';
const CONFIG_BASE_KEY = 'klipdeck-config-base';

const DEFAULT_CFG = `[printer]\nkinematics: corexy\nmax_velocity: 300\nmax_accel: 3500\nmax_z_velocity: 15\nmax_z_accel: 100\n\n[mcu]\nserial: /dev/serial/by-id/replace-me\n\n[gcode_macro HOME_XY]\ndescription: Home X and Y\ngcode:\n  G28 X Y\n  M117 Homed XY\n`;

function normalizeWsInput(v: string): string {
  const trimmed = v.trim();
  if (!trimmed) return '';
  if (/^wss?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^http/i, 'ws').replace(/\/$/, '');
  }
  return `ws://${trimmed.replace(/\/$/, '')}`;
}

export function FirstRunOnboarding() {
  const { setMoonrakerWsUrl, setOpenaiToken, setDeveloperMode, setMockMoonrakerData } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [wsUrl, setWsUrl] = useState('');
  const [openaiToken, setOpenaiTokenDraft] = useState('');
  const [moonrakerTest, setMoonrakerTest] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [moonrakerTestMsg, setMoonrakerTestMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const done = localStorage.getItem(ONBOARDING_DONE_KEY) === 'true';
      try {
        const res = await fetch('/api/runtime-config');
        const data = (await res.json()) as {
          config?: {
            moonrakerWsUrl?: string;
            openaiApiToken?: string;
            developerMode?: boolean;
            mockMoonrakerData?: boolean;
          };
        };
        if (cancelled) return;
        const savedWs = data.config?.moonrakerWsUrl ?? '';
        const savedToken = data.config?.openaiApiToken ?? '';
        if (savedWs) setMoonrakerWsUrl(savedWs);
        if (savedToken) setOpenaiToken(savedToken);
        const developerMode = Boolean(data.config?.developerMode);
        const mockMoonrakerData = Boolean(data.config?.mockMoonrakerData);
        setDeveloperMode(developerMode);
        setMockMoonrakerData(mockMoonrakerData);

        if (developerMode && mockMoonrakerData) {
          setIsOpen(false);
          return;
        }
        if (!done) {
          setWsUrl(savedWs);
          setOpenaiTokenDraft(savedToken);
          setIsOpen(true);
        }
      } catch {
        if (!done) setIsOpen(true);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [setMoonrakerWsUrl, setOpenaiToken, setDeveloperMode, setMockMoonrakerData]);

  const testMoonrakerLive = useCallback(async () => {
    const normalized = normalizeWsInput(wsUrl);
    if (!/^wss?:\/\//i.test(normalized)) {
      setMoonrakerTest('error');
      setMoonrakerTestMsg('Invalid URL');
      return false;
    }

    setMoonrakerTest('checking');
    setMoonrakerTestMsg('Checking...');

    return await new Promise<boolean>((resolve) => {
      let done = false;
      const ws = new WebSocket(`${normalized}/websocket`);
      const timer = window.setTimeout(() => {
        if (done) return;
        done = true;
        setMoonrakerTest('error');
        setMoonrakerTestMsg('Timeout');
        try {
          ws.close();
        } catch {
          // no-op
        }
        resolve(false);
      }, 5000);

      ws.onopen = () => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        setMoonrakerTest('ok');
        setMoonrakerTestMsg('Connected');
        ws.close();
        resolve(true);
      };
      ws.onerror = () => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        setMoonrakerTest('error');
        setMoonrakerTestMsg('Connection failed');
        try {
          ws.close();
        } catch {
          // no-op
        }
        resolve(false);
      };
    });
  }, [wsUrl]);

  useEffect(() => {
    if (step !== 1) return;
    const normalized = normalizeWsInput(wsUrl);
    if (!/^wss?:\/\//i.test(normalized)) {
      setMoonrakerTest('idle');
      setMoonrakerTestMsg('');
      return;
    }
    const timer = window.setTimeout(() => {
      void testMoonrakerLive();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [wsUrl, step, testMoonrakerLive]);

  const steps = useMemo(
    () => [
      {
        title: 'Welcome to KlipDeck',
        subtitle: 'Quick setup in under 1 minute',
        icon: Sparkles,
      },
      {
        title: 'Moonraker server',
        subtitle: 'Set websocket endpoint for live telemetry',
        icon: Server,
      },
      {
        title: 'OpenAI key (optional)',
        subtitle: 'Enable AI help for Klipper configs',
        icon: KeyRound,
      },
      {
        title: 'Ready to go',
        subtitle: 'We will save your initial setup and defaults',
        icon: Rocket,
      },
    ],
    []
  );

  const canNext =
    step !== 1 || moonrakerTest === 'ok';

  const finish = async () => {
    const normalizedWs = normalizeWsInput(wsUrl);

    localStorage.setItem(ONBOARDING_DONE_KEY, 'true');

    if (!localStorage.getItem(CONFIG_BASE_KEY)) {
      localStorage.setItem(CONFIG_BASE_KEY, DEFAULT_CFG);
    }
    if (!localStorage.getItem(CONFIG_DRAFT_KEY)) {
      localStorage.setItem(CONFIG_DRAFT_KEY, localStorage.getItem(CONFIG_BASE_KEY) || DEFAULT_CFG);
    }

    setMoonrakerWsUrl(normalizedWs);
    setOpenaiToken(openaiToken.trim());
    await fetch('/api/runtime-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moonrakerWsUrl: normalizedWs,
        openaiApiToken: openaiToken.trim(),
      }),
    });
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const current = steps[step];
  const CurrentIcon = current.icon;

  return (
    <div className="fixed inset-0 z-[120] pointer-events-auto">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div className="relative h-full w-full flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.24 }}
            className="w-full max-w-2xl border-2 border-primary/50 bg-card shadow-2xl"
          >
            <div className="h-1 bg-gradient-to-r from-primary via-secondary to-primary" />

            <div className="p-6 md:p-7">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <CurrentIcon size={18} className="text-primary" />
                  <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    First-time setup · step {step + 1}/{steps.length}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-7 border ${
                        i <= step ? 'bg-primary border-primary' : 'bg-transparent border-border'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <h2 className="text-2xl font-black uppercase tracking-wider text-foreground">{current.title}</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6">{current.subtitle}</p>

              {step === 0 && (
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    We will ask for your Moonraker endpoint, optional OpenAI key, and create starter config defaults.
                  </p>
                  <div className="border-2 border-border/60 bg-black/20 p-3 font-mono text-xs text-muted-foreground">
                    You can change everything later in Settings/Configs.
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Moonraker URL
                  </label>
                  <Input
                    value={wsUrl}
                    onChange={(e) => {
                      setWsUrl(e.target.value);
                      setMoonrakerTest('idle');
                      setMoonrakerTestMsg('');
                    }}
                    placeholder="ws://192.168.1.20:7125"
                    className="h-10 rounded-none border-2 font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Required. Supports ws://, wss://, http:// or host:port (auto-normalize).
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-none h-8 px-3 text-xs"
                      onClick={() => void testMoonrakerLive()}
                      disabled={moonrakerTest === 'checking'}
                    >
                      {moonrakerTest === 'checking' ? 'Testing...' : 'Test live'}
                    </Button>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {moonrakerTest === 'ok' && 'OK'}
                      {moonrakerTest === 'error' && moonrakerTestMsg}
                      {moonrakerTest === 'checking' && moonrakerTestMsg}
                    </span>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    OpenAI API key (optional)
                  </label>
                  <Input
                    value={openaiToken}
                    onChange={(e) => setOpenaiTokenDraft(e.target.value)}
                    placeholder="sk-..."
                    className="h-10 rounded-none border-2 font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Used only to assist editing your cfg/macros.
                  </p>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <div className="border-2 border-border/60 bg-black/20 p-3 font-mono text-xs space-y-1.5">
                    <p>
                      <span className="text-muted-foreground">Moonraker:</span>{' '}
                      <span className="text-primary">{normalizeWsInput(wsUrl) || 'not set'}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">OpenAI:</span>{' '}
                      <span className="text-primary">{openaiToken.trim() ? 'configured' : 'skipped'}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Defaults:</span>{' '}
                      <span className="text-primary">starter printer.cfg + draft</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-7 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                >
                  <ArrowLeft size={14} /> Back
                </Button>

                {step < steps.length - 1 ? (
                  <Button
                    type="button"
                    className="rounded-none"
                    disabled={!canNext}
                    onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                  >
                    Next <ArrowRight size={14} />
                  </Button>
                ) : (
                  <Button type="button" className="rounded-none" onClick={finish}>
                    <Check size={14} /> Start KlipDeck
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
