'use client';

import { useStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

export function SettingsGeneral() {
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
    void load();
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
    <div className="space-y-4 border-2 border-border bg-card/30 p-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-foreground border-b border-border pb-2">
        Connection
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
            Moonraker WS URL
          </label>
          <input
            type="text"
            value={moonrakerWsUrl}
            onChange={(e) => persistMoonrakerWs(e.target.value)}
            placeholder="ws://192.168.1.20:7125"
            className="w-full px-2 py-1.5 bg-input border-2 border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary font-mono text-xs"
          />
          <div className="mt-1 flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => void runMoonrakerTest()}
              className="px-2 py-1 bg-secondary text-secondary-foreground font-bold border-2 border-secondary text-[10px] uppercase"
            >
              Test
            </motion.button>
            <span className="text-[10px] font-mono text-muted-foreground">
              {moonrakerTest === 'ok' && 'OK'}
              {moonrakerTest === 'checking' && moonrakerTestMsg}
              {moonrakerTest === 'error' && moonrakerTestMsg}
            </span>
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
            OpenAI API token
          </label>
          <div className="relative">
            <input
              type={showApiToken ? 'text' : 'password'}
              value={openaiApiToken}
              onChange={(e) => persistToken(e.target.value)}
              placeholder="sk-..."
              className="w-full px-2 py-1.5 pr-9 bg-input border-2 border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowApiToken(!showApiToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title={showApiToken ? 'Hide' : 'Show'}
            >
              {showApiToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground font-mono border-l-2 border-primary pl-2">
        Stored in data/runtime-config.json on this host.
      </p>
    </div>
  );
}
