'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { Input } from '@/components/ui/input';

interface ManualMoveWidgetProps {
  widgetId: string;
}

type Axis = 'X' | 'Y' | 'Z';

async function postGcodeScript(script: string): Promise<void> {
  const res = await fetch('/api/moonraker/printer/gcode/script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script }),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Request failed');
  }
}

function fmt(v: number | null) {
  return v === null ? '—' : v.toFixed(2);
}

export function ManualMoveWidget({ widgetId: _widgetId }: ManualMoveWidgetProps) {
  const {
    motionX,
    motionY,
    motionZ,
    motionMinX,
    motionMinY,
    motionMinZ,
    motionMaxX,
    motionMaxY,
    motionMaxZ,
    mockMoonrakerData,
  } = useStore();
  const [xDraft, setXDraft] = useState('');
  const [yDraft, setYDraft] = useState('');
  const [zDraft, setZDraft] = useState('');
  const [busyAxis, setBusyAxis] = useState<Axis | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setXDraft((prev) => (prev.length > 0 ? prev : motionX !== null ? motionX.toFixed(2) : ''));
  }, [motionX]);
  useEffect(() => {
    setYDraft((prev) => (prev.length > 0 ? prev : motionY !== null ? motionY.toFixed(2) : ''));
  }, [motionY]);
  useEffect(() => {
    setZDraft((prev) => (prev.length > 0 ? prev : motionZ !== null ? motionZ.toFixed(2) : ''));
  }, [motionZ]);

  const sendAxis = useCallback(
    async (axis: Axis, draft: string, min: number | null, max: number | null) => {
      const n = Number.parseFloat(draft.trim());
      if (!Number.isFinite(n)) {
        setErr(`Axis ${axis}: invalid number`);
        return;
      }
      if (min !== null && n < min) {
        setErr(`Axis ${axis}: min ${min.toFixed(2)}`);
        return;
      }
      if (max !== null && n > max) {
        setErr(`Axis ${axis}: max ${max.toFixed(2)}`);
        return;
      }
      if (mockMoonrakerData) {
        setErr('Mock mode: moves disabled');
        return;
      }
      setErr(null);
      setBusyAxis(axis);
      try {
        const feed = axis === 'Z' ? 900 : 6000;
        await postGcodeScript(`G90\nG0 ${axis}${n.toFixed(3)} F${feed}`);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Move failed');
      } finally {
        setBusyAxis(null);
      }
    },
    [mockMoonrakerData]
  );

  return (
    <div className="h-full w-full p-3 flex flex-col overflow-hidden">
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b-2 border-border pb-2 mb-3 shrink-0">
        Manual Move
      </h3>

      <div className="border-2 border-border/60 bg-black/20 font-mono text-[11px]">
        <div className="grid grid-cols-[34px_1fr_1fr_104px_1fr] gap-1.5 px-2 py-1.5 border-b border-border/40 text-[10px] uppercase text-muted-foreground">
          <span>Axis</span>
          <span>Min</span>
          <span>Current</span>
          <span>Target</span>
          <span>Max</span>
        </div>

        <div className="grid grid-cols-[34px_1fr_1fr_104px_1fr] gap-1.5 items-center px-2 py-1.5 border-b border-border/30">
          <span className="font-bold text-primary">X</span>
          <span className="text-foreground">{fmt(motionMinX)}</span>
          <span className="text-foreground">{fmt(motionX)}</span>
          <Input
            value={xDraft}
            onChange={(e) => setXDraft(e.target.value)}
            placeholder="x"
            className="h-6 rounded-none border text-[11px] px-1.5"
            disabled={busyAxis !== null}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void sendAxis('X', xDraft, motionMinX, motionMaxX);
            }}
          />
          <span className="text-foreground">{fmt(motionMaxX)}</span>
        </div>

        <div className="grid grid-cols-[34px_1fr_1fr_104px_1fr] gap-1.5 items-center px-2 py-1.5 border-b border-border/30">
          <span className="font-bold text-secondary">Y</span>
          <span className="text-foreground">{fmt(motionMinY)}</span>
          <span className="text-foreground">{fmt(motionY)}</span>
          <Input
            value={yDraft}
            onChange={(e) => setYDraft(e.target.value)}
            placeholder="y"
            className="h-6 rounded-none border text-[11px] px-1.5"
            disabled={busyAxis !== null}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void sendAxis('Y', yDraft, motionMinY, motionMaxY);
            }}
          />
          <span className="text-foreground">{fmt(motionMaxY)}</span>
        </div>

        <div className="grid grid-cols-[34px_1fr_1fr_104px_1fr] gap-1.5 items-center px-2 py-1.5">
          <span className="font-bold text-accent">Z</span>
          <span className="text-foreground">{fmt(motionMinZ)}</span>
          <span className="text-foreground">{fmt(motionZ)}</span>
          <Input
            value={zDraft}
            onChange={(e) => setZDraft(e.target.value)}
            placeholder="z"
            className="h-6 rounded-none border text-[11px] px-1.5"
            disabled={busyAxis !== null}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void sendAxis('Z', zDraft, motionMinZ, motionMaxZ);
            }}
          />
          <span className="text-foreground">{fmt(motionMaxZ)}</span>
        </div>
      </div>

      {err && <p className="mt-2 text-[10px] font-mono text-destructive shrink-0">{err}</p>}
    </div>
  );
}
