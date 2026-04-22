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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';

const TEMP_WINDOW_MS = 15 * 60 * 1000;
const MAX_HOTEND = 350;
const MAX_BED = 150;
const SPARK_H = 160;

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
  const { tempHead, tempBed, targetTempHead, targetTempBed, tempHistory, mockMoonrakerData } =
    useStore();

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

  const yDomain = useMemo((): [number, number] => {
    if (chartData.length === 0) return [0, 120];
    let lo = Infinity;
    let hi = -Infinity;
    for (const row of chartData) {
      lo = Math.min(lo, row.head, row.bed);
      hi = Math.max(hi, row.head, row.bed);
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 120];
    const pad = Math.max(4, (hi - lo) * 0.1);
    return [Math.max(0, lo - pad), hi + pad];
  }, [chartData]);

  const applyHeadTarget = useCallback(async () => {
    const n = Number.parseInt(headDraft.trim(), 10);
    if (Number.isNaN(n) || n < 0 || n > MAX_HOTEND) {
      setErr(`Heater target must be 0-${MAX_HOTEND}`);
      return;
    }
    if (mockMoonrakerData) {
      setErr('Mock mode: heater commands disabled');
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
  }, [headDraft, mockMoonrakerData]);

  const applyBedTarget = useCallback(async () => {
    const n = Number.parseInt(bedDraft.trim(), 10);
    if (Number.isNaN(n) || n < 0 || n > MAX_BED) {
      setErr(`Bed target must be 0-${MAX_BED}`);
      return;
    }
    if (mockMoonrakerData) {
      setErr('Mock mode: heater commands disabled');
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
  }, [bedDraft, mockMoonrakerData]);

  const hasHistory = chartData.length > 0;

  return (
    <div className="h-full w-full flex flex-col min-h-0 p-1.5 gap-1.5 overflow-hidden">
      <div className="shrink-0 flex items-baseline justify-between gap-2 border-b border-border/50 pb-1">
        <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Temperature
        </h3>
        <span className="text-[8px] font-mono text-muted-foreground/70">°C</span>
      </div>

      <div className="shrink-0 grid grid-cols-2 gap-1.5 min-w-0">
        <div className="min-w-0 rounded-sm border border-primary/30 bg-primary/5 pl-1.5 pr-1 pt-1 pb-1">
          <div className="flex items-center justify-between gap-0.5 mb-0.5">
            <span className="text-[9px] font-bold text-primary shrink-0">Hotend</span>
            <span className="text-[8px] text-muted-foreground font-mono tabular-nums">
              max {MAX_HOTEND}
            </span>
          </div>
          <div className="flex items-end justify-between gap-1">
            <span className="text-lg font-semibold tabular-nums leading-none text-foreground tracking-tight">
              {fmt(tempHead)}
              <span className="text-[10px] font-normal text-muted-foreground ml-0.5">°</span>
            </span>
            <Input
              value={headDraft}
              onChange={(e) => setHeadDraft(e.target.value)}
              onFocus={() => setEditingHead(true)}
              onBlur={() => setEditingHead(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void applyHeadTarget();
              }}
              disabled={headBusy || bedBusy}
              className="h-7 w-[3.25rem] shrink-0 rounded-none border border-border px-1 text-center text-xs font-mono font-semibold py-0"
              inputMode="numeric"
              title="Target °C"
            />
          </div>
        </div>

        <div className="min-w-0 rounded-sm border border-secondary/30 bg-secondary/5 pl-1.5 pr-1 pt-1 pb-1">
          <div className="flex items-center justify-between gap-0.5 mb-0.5">
            <span className="text-[9px] font-bold text-secondary shrink-0">Bed</span>
            <span className="text-[8px] text-muted-foreground font-mono tabular-nums">
              max {MAX_BED}
            </span>
          </div>
          <div className="flex items-end justify-between gap-1">
            <span className="text-lg font-semibold tabular-nums leading-none text-foreground tracking-tight">
              {fmt(tempBed)}
              <span className="text-[10px] font-normal text-muted-foreground ml-0.5">°</span>
            </span>
            <Input
              value={bedDraft}
              onChange={(e) => setBedDraft(e.target.value)}
              onFocus={() => setEditingBed(true)}
              onBlur={() => setEditingBed(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void applyBedTarget();
              }}
              disabled={headBusy || bedBusy}
              className="h-7 w-[3.25rem] shrink-0 rounded-none border border-border px-1 text-center text-xs font-mono font-semibold py-0"
              inputMode="numeric"
              title="Target °C"
            />
          </div>
        </div>
      </div>

      <div
        className="shrink-0 w-full overflow-hidden rounded-sm border border-border/30 bg-black/40"
        style={{ height: SPARK_H }}
      >
        {!hasHistory ? (
          <div
            className="flex h-full items-center justify-center px-2 text-center text-[9px] font-mono text-muted-foreground/80"
            style={{ height: SPARK_H }}
          >
            Waiting for samples…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={SPARK_H}>
            <LineChart
              data={chartData}
              margin={{ top: 2, right: 4, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <YAxis
                domain={yDomain}
                tick={{ fontSize: 7, fontFamily: 'monospace', fill: '#737373' }}
                stroke="transparent"
                width={28}
                tickCount={4}
                axisLine={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 6, fontFamily: 'monospace', fill: '#737373' }}
                stroke="transparent"
                interval="preserveStartEnd"
                minTickGap={36}
                tickLine={false}
                height={12}
              />
              <Tooltip
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as { ts?: number } | undefined;
                  return p?.ts != null ? new Date(p.ts).toLocaleString() : '';
                }}
                contentStyle={{
                  backgroundColor: '#171717',
                  border: '1px solid #404040',
                  borderRadius: 2,
                  fontFamily: 'monospace',
                  fontSize: 10,
                  padding: '4px 8px',
                }}
                cursor={{ stroke: '#ffffff22', strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="bed"
                stroke="#14b8a6"
                strokeOpacity={0.65}
                strokeWidth={1.25}
                dot={false}
                isAnimationActive={false}
                name="Bed"
                strokeDasharray="3 2"
              />
              <Line
                type="monotone"
                dataKey="head"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="Heater"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {err && (
        <p className="shrink-0 truncate text-[9px] text-destructive font-mono leading-tight">
          {err}
        </p>
      )}
    </div>
  );
}
