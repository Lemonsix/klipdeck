'use client';

import { useStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ExternalLink } from 'lucide-react';

const KLIPPER_DOCS = [
  {
    title: 'G-Codes',
    href: 'https://www.klipper3d.org/G-Codes.html',
    description: 'G-Code commands Klipper supports',
  },
  {
    title: 'Command Reference',
    href: 'https://www.klipper3d.org/Command_Reference.html',
    description: 'Built-in commands and conventions',
  },
  {
    title: 'Status Reference',
    href: 'https://www.klipper3d.org/Status_Reference.html',
    description: 'Printer object status fields',
  },
  {
    title: 'Config Reference',
    href: 'https://www.klipper3d.org/Config_Reference.html',
    description: 'printer.cfg sections and options',
  },
  {
    title: 'Command templates & macros',
    href: 'https://www.klipper3d.org/Command_Templates.html',
    description: 'gcode_macro and callable templates',
  },
] as const;

export function SettingsPanel() {
  const { openaiApiToken, setOpenaiToken, moonrakerWsUrl, setMoonrakerWsUrl } = useStore();
  const [showApiToken, setShowApiToken] = useState(false);
  const [moonrakerTest, setMoonrakerTest] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [moonrakerTestMsg, setMoonrakerTestMsg] = useState<string>('');

  const normalizeWsInput = (v: string): string => {
    const trimmed = v.trim();
    if (!trimmed) return '';
    if (/^wss?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, '');
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed.replace(/^http/i, 'ws').replace(/\/$/, '');
    }
    return `ws://${trimmed.replace(/\/$/, '')}`;
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/runtime-config');
        const data = (await res.json()) as {
          config?: { moonrakerWsUrl?: string; openaiApiToken?: string };
        };
        if (cancelled) return;
        setMoonrakerWsUrl(data.config?.moonrakerWsUrl ?? '');
        setOpenaiToken(data.config?.openaiApiToken ?? '');
      } catch {
        // no-op
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [setMoonrakerWsUrl, setOpenaiToken]);

  const persistRuntimeConfig = async (partial: {
    moonrakerWsUrl?: string;
    openaiApiToken?: string;
  }) => {
    await fetch('/api/runtime-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
  };

  const persistToken = (token: string) => {
    setOpenaiToken(token);
    void persistRuntimeConfig({ openaiApiToken: token });
  };

  const persistMoonrakerWs = (url: string) => {
    setMoonrakerWsUrl(url);
    setMoonrakerTest('idle');
    setMoonrakerTestMsg('');
    void persistRuntimeConfig({ moonrakerWsUrl: url });
  };

  const runMoonrakerTest = async () => {
    const normalized = normalizeWsInput(moonrakerWsUrl);
    if (!/^wss?:\/\//i.test(normalized)) {
      setMoonrakerTest('error');
      setMoonrakerTestMsg('Invalid URL');
      return;
    }

    setMoonrakerTest('checking');
    setMoonrakerTestMsg('Checking...');

    await new Promise<void>((resolve) => {
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
        resolve();
      }, 5000);

      ws.onopen = () => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        setMoonrakerTest('ok');
        setMoonrakerTestMsg('Connected');
        ws.close();
        resolve();
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
        resolve();
      };
    });
  };

  return (
    <div className="min-h-screen bg-background overflow-auto">
      <div className="max-w-4xl mx-auto pb-12">
        <div className="px-6 pt-6 space-y-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-black text-foreground uppercase tracking-wider mb-2">Settings</h1>
            <p className="text-muted-foreground">
              API key for the editor assistant and links to official Klipper documentation. Define macros in your
              Klipper config and mirror snippets in the Scripts editor; dashboard buttons run macro names on the
              printer.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border-2 border-border p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wider border-b-2 border-border pb-3">
              API Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Moonraker WS URL
                </label>
                <input
                  type="text"
                  value={moonrakerWsUrl}
                  onChange={(e) => persistMoonrakerWs(e.target.value)}
                  placeholder="ws://192.168.1.20:7125"
                  className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground font-mono mt-1">
                  Used by live telemetry in dashboard.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => void runMoonrakerTest()}
                    className="px-3 py-1.5 bg-secondary text-secondary-foreground font-bold border-2 border-secondary hover:bg-secondary/90 transition-colors text-xs uppercase"
                  >
                    Test live
                  </motion.button>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {moonrakerTest === 'ok' && 'OK'}
                    {moonrakerTest === 'checking' && moonrakerTestMsg}
                    {moonrakerTest === 'error' && moonrakerTestMsg}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  OpenAI API Token (for AI assistant in Scripts editor)
                </label>
                <div className="relative flex-1">
                  <input
                    type={showApiToken ? 'text' : 'password'}
                    value={openaiApiToken}
                    onChange={(e) => persistToken(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono text-sm"
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={() => setShowApiToken(!showApiToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    title={showApiToken ? 'Hide' : 'Show'}
                  >
                    {showApiToken ? <EyeOff size={18} /> : <Eye size={18} />}
                  </motion.button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground bg-black/20 border-l-2 border-primary px-3 py-2">
                Runtime config is stored locally on this host (no .env required).
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border-2 border-border p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wider border-b-2 border-border pb-3 mb-4">
              Klipper documentation
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Command behavior depends on your printer configuration. Use the official Klipper site as the source of
              truth (not duplicated here).
            </p>
            <ul className="space-y-3">
              {KLIPPER_DOCS.map((doc) => (
                <li key={doc.href}>
                  <a
                    href={doc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 border-2 border-border p-4 hover:border-primary/60 transition-colors bg-black/10"
                  >
                    <ExternalLink
                      size={18}
                      className="text-primary shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform"
                    />
                    <span>
                      <span className="font-bold text-foreground uppercase tracking-wide text-sm block">{doc.title}</span>
                      <span className="text-xs text-muted-foreground">{doc.description}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
