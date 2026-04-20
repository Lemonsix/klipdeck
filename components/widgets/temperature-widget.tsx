'use client';

import { useStore } from '@/lib/store';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

const TEMP_WINDOW_MS = 15 * 60 * 1000;
const MAX_HOTEND = 350;
const MAX_BED = 150;

interface TemperatureWidgetProps {
  widgetId: string;
}

async function postGcodeScript(script: string): Promise<void> {
  const res = await fetch('/api/moonraker/printer/gcode/script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script }),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'G-code failed');
  }
}

function fmt(v: number | null) {
  return v === null ? '—' : v.toFixed(1);
}

export function TemperatureWidget({ widgetId: _widgetId }: TemperatureWidgetProps) {
  const { tempHead, tempBed, targetTempHead, targetTempBed, tempHistory } = useStore();

  const [headDraft, setHeadDraft] = useState('');
  const [bedDraft, setBedDraft] = useState('');
  const [editingHead, setEditingHead] = useState(false);
  const [editingBed, setEditingBed] = useState(false);
  const [headBusy, setHeadBusy] = useState(false);
  const [bedBusy, setBedBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!editingHead) {
      setHeadDraft(targetTempHead != null ? String(Math.round(targetTempHead)) : '');
    }
  }, [targetTempHead, editingHead]);

  useEffect(() => {
    if (!editingBed) {
      setBedDraft(targetTempBed != null ? String(Math.round(targetTempBed)) : '');
    }
  }, [targetTempBed, editingBed]);

  const now = Date.now();
  const chartData = tempHistory
    .filter((e) => e.timestamp >= now - TEMP_WINDOW_MS)
    .map((entry) => ({
      ts: entry.timestamp,
      time: new Date(entry.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      head: +entry.head.toFixed(1),
      bed: +entry.bed.toFixed(1),
    }));

  const applyHeadTarget = useCallback(async () => {
    const n = Number.parseInt(headDraft.trim(), 10);
    if (Number.isNaN(n) || n < 0 || n > MAX_HOTEND) {
      setErr(`Heater target must be 0-${MAX_HOTEND}`);
      return;
    }
    setErr(null);
    setHeadBusy(true);
    try {
      await postGcodeScript(`M104 S${n}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setHeadBusy(false);
    }
  }, [headDraft]);

  const applyBedTarget = useCallback(async () => {
    const n = Number.parseInt(bedDraft.trim(), 10);
    if (Number.isNaN(n) || n < 0 || n > MAX_BED) {
      setErr(`Bed target must be 0-${MAX_BED}`);
      return;
    }
    setErr(null);
    setBedBusy(true);
    try {
      await postGcodeScript(`M140 S${n}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBedBusy(false);
    }
  }, [bedDraft]);

  return (
    <div className="h-full w-full p-3 flex flex-col overflow-hidden">
      <div className="shrink-0 border-b-2 border-border pb-2 mb-2">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Temperature</h3>
      </div>

      <div className="shrink-0 border-2 border-border/60 bg-black/20 font-mono text-[11px]">
        <div className="grid grid-cols-[54px_1fr_90px_1fr] gap-1.5 px-2 py-1 border-b border-border/40 text-[10px] uppercase text-muted-foreground">
          <span>Zone</span>
          <span>Current</span>
          <span>Target</span>
          <span>Max</span>
        </div>

        <div className="grid grid-cols-[54px_1fr_90px_1fr] gap-1.5 px-2 py-1.5 items-center border-b border-border/30">
          <span className="font-bold text-primary">Heater</span>
          <span>{fmt(tempHead)}°</span>
          <Input
            value={headDraft}
            onChange={(e) => setHeadDraft(e.target.value)}
            onFocus={() => setEditingHead(true)}
            onBlur={() => setEditingHead(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void applyHeadTarget();
            }}
            disabled={headBusy || bedBusy}
            className="h-6 rounded-none border px-1.5 text-[11px]"
            inputMode="numeric"
          />
          <span>{MAX_HOTEND}°</span>
        </div>

        <div className="grid grid-cols-[54px_1fr_90px_1fr] gap-1.5 px-2 py-1.5 items-center">
          <span className="font-bold text-secondary">Bed</span>
          <span>{fmt(tempBed)}°</span>
          <Input
            value={bedDraft}
            onChange={(e) => setBedDraft(e.target.value)}
            onFocus={() => setEditingBed(true)}
            onBlur={() => setEditingBed(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void applyBedTarget();
            }}
            disabled={headBusy || bedBusy}
            className="h-6 rounded-none border px-1.5 text-[11px]"
            inputMode="numeric"
          />
          <span>{MAX_BED}°</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 mt-2 border-2 border-border/50 p-2 bg-black/40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 6, right: 6, bottom: 2, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 8, fontFamily: 'monospace' }}
              stroke="#444"
              interval="preserveStartEnd"
              minTickGap={52}
            />
            <YAxis
              domain={[0, 280]}
              tick={{ fontSize: 8, fontFamily: 'monospace' }}
              stroke="#444"
              width={28}
            />
            <Tooltip
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as { ts?: number } | undefined;
                return p?.ts != null ? new Date(p.ts).toLocaleString() : '';
              }}
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '2px solid #06b6d4',
                borderRadius: 0,
                fontFamily: 'monospace',
                fontSize: 11,
              }}
              cursor={{ stroke: '#06b6d4', strokeWidth: 1 }}
            />
            <Line type="monotone" dataKey="head" stroke="#06b6d4" dot={false} isAnimationActive={false} strokeWidth={2} name="Heater" />
            <Line type="monotone" dataKey="bed" stroke="#0d9488" dot={false} isAnimationActive={false} strokeWidth={2} name="Bed" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {err && <p className="mt-1 text-[10px] text-destructive font-mono shrink-0">{err}</p>}
    </div>
  );
}
