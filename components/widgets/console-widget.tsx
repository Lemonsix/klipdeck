'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const MAX_LINES = 80;

interface ConsoleWidgetProps {
  widgetId: string;
}

type LogLine = {
  id: string;
  ts: number;
  kind: 'in' | 'ok' | 'err';
  text: string;
};

async function postGcodeScript(script: string): Promise<string> {
  const res = await fetch('/api/moonraker/printer/gcode/script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script }),
  });
  const data = (await res.json()) as { error?: string; result?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Request failed');
  }
  const r = data.result;
  return typeof r === 'string' && r.length > 0 ? r : '(ok)';
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function ConsoleWidget({ widgetId: _widgetId }: ConsoleWidgetProps) {
  const mockMoonrakerData = useStore((s) => s.mockMoonrakerData);
  const [draft, setDraft] = useState('');
  const [lines, setLines] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const append = useCallback((kind: LogLine['kind'], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setLines((prev) => {
      const next: LogLine[] = [...prev, { id, ts: Date.now(), kind, text }];
      return next.slice(-MAX_LINES);
    });
  }, []);

  const send = useCallback(async () => {
    const script = draft.trim();
    if (!script || busy) return;
    append('in', script);
    setDraft('');
    setBusy(true);
    try {
      if (mockMoonrakerData) {
        append('ok', '(mock ok)');
        return;
      }
      const out = await postGcodeScript(script);
      append('ok', out);
    } catch (e) {
      append('err', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [draft, busy, append, mockMoonrakerData]);

  return (
    <div className="h-full w-full p-3 flex flex-col gap-2 overflow-hidden min-h-0">
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b-2 border-border pb-2 shrink-0">
        G-code console
      </h3>
      <div
        ref={scrollRef}
        className="flex-1 min-h-[120px] overflow-y-auto border-2 border-border/60 bg-black/50 p-2 font-mono text-[11px] leading-relaxed"
      >
        {lines.length === 0 ? (
          <p className="text-muted-foreground italic">No commands yet.</p>
        ) : (
          lines.map((line) => (
            <div key={line.id} className="mb-1.5 break-words whitespace-pre-wrap">
              <span className="text-muted-foreground select-none">{formatTime(line.ts)} </span>
              {line.kind === 'in' && (
                <span>
                  <span className="text-secondary font-bold">&gt; </span>
                  <span className="text-foreground">{line.text}</span>
                </span>
              )}
              {line.kind === 'ok' && (
                <span>
                  <span className="text-primary font-bold">← </span>
                  <span className="text-foreground/90">{line.text}</span>
                </span>
              )}
              {line.kind === 'err' && (
                <span>
                  <span className="text-destructive font-bold">! </span>
                  <span className="text-destructive">{line.text}</span>
                </span>
              )}
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>

      <div className="flex gap-2 shrink-0">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="M114 / HOME_XY / G28 …"
          disabled={busy}
          className="h-9 rounded-none border-2 font-mono text-xs flex-1"
        />
        <Button
          type="button"
          size="sm"
          className="h-9 rounded-none border-2 font-mono text-xs uppercase shrink-0"
          disabled={busy || !draft.trim()}
          onClick={() => void send()}
        >
          {busy ? '…' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
