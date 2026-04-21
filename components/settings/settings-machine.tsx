'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MoonrakerPrinterInfo } from '@/lib/moonraker/types';
import type { TempPreset } from '@/lib/runtime-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SettingsMachine() {
  const [info, setInfo] = useState<MoonrakerPrinterInfo | null>(null);
  const [infoErr, setInfoErr] = useState<string | null>(null);
  const [restartBusy, setRestartBusy] = useState(false);
  const [restartMsg, setRestartMsg] = useState<string | null>(null);
  const [presets, setPresets] = useState<TempPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [presetHotend, setPresetHotend] = useState('200');
  const [presetBed, setPresetBed] = useState('60');

  const loadInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/moonraker/printer/info');
      const data = (await res.json()) as MoonrakerPrinterInfo & { error?: string };
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'info failed');
      }
      setInfo(data as MoonrakerPrinterInfo);
      setInfoErr(null);
    } catch (e) {
      setInfo(null);
      setInfoErr(e instanceof Error ? e.message : 'info failed');
    }
  }, []);

  const loadPresets = useCallback(async () => {
    try {
      const res = await fetch('/api/runtime-config');
      const data = (await res.json()) as { config?: { tempPresets?: TempPreset[] } };
      setPresets(Array.isArray(data.config?.tempPresets) ? data.config!.tempPresets! : []);
    } catch {
      setPresets([]);
    }
  }, []);

  useEffect(() => {
    void loadInfo();
    void loadPresets();
    const t = window.setInterval(() => void loadInfo(), 5000);
    return () => window.clearInterval(t);
  }, [loadInfo, loadPresets]);

  const persistPresets = async (next: TempPreset[]) => {
    setPresets(next);
    await fetch('/api/runtime-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempPresets: next }),
    });
  };

  const addPreset = async () => {
    const name = presetName.trim() || 'Preset';
    const hotend = Number(presetHotend);
    const bed = Number(presetBed);
    if (!Number.isFinite(hotend) || !Number.isFinite(bed)) return;
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `p-${Date.now()}`;
    await persistPresets([...presets, { id, name, hotend, bed }]);
    setPresetName('');
  };

  const removePreset = async (id: string) => {
    await persistPresets(presets.filter((p) => p.id !== id));
  };

  const applyPreset = async (p: TempPreset) => {
    const script = `M140 S${p.bed}\nM104 S${p.hotend}\nM117 ${p.name}`;
    const res = await fetch('/api/moonraker/printer/gcode/script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setRestartMsg(data.error || 'gcode failed');
      return;
    }
    setRestartMsg(null);
  };

  const firmwareRestart = async () => {
    if (!window.confirm('Firmware restart? Print will abort.')) return;
    setRestartBusy(true);
    setRestartMsg(null);
    try {
      const res = await fetch('/api/moonraker/printer/firmware_restart', { method: 'POST' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'restart failed');
      }
      setRestartMsg('Restart requested');
    } catch (e) {
      setRestartMsg(e instanceof Error ? e.message : 'restart failed');
    } finally {
      setRestartBusy(false);
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-2 border-2 border-border bg-card/20 p-3">
        <h3 className="text-xs font-bold uppercase tracking-wider border-b border-border pb-1">Printer</h3>
        {infoErr && <p className="text-[10px] font-mono text-destructive">{infoErr}</p>}
        {info && (
          <dl className="grid gap-1 text-[11px] font-mono">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">State</dt>
              <dd>{info.state}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Host</dt>
              <dd className="truncate">{info.hostname}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Klipper</dt>
              <dd className="truncate text-right">{info.software_version}</dd>
            </div>
          </dl>
        )}
        <Button
          type="button"
          variant="destructive"
          className="h-8 w-full rounded-none text-xs font-bold uppercase"
          disabled={restartBusy}
          onClick={() => void firmwareRestart()}
        >
          {restartBusy ? '…' : 'Firmware restart'}
        </Button>
        {restartMsg && <p className="text-[10px] font-mono text-muted-foreground">{restartMsg}</p>}
      </div>

      <div className="space-y-2 border-2 border-border bg-card/20 p-3">
        <h3 className="text-xs font-bold uppercase tracking-wider border-b border-border pb-1">Temp presets</h3>
        <div className="flex flex-wrap gap-1">
          {presets.map((p) => (
            <div key={p.id} className="flex items-center gap-1 border border-border px-1 py-0.5">
              <Button
                type="button"
                size="sm"
                className="h-7 rounded-none px-2 text-[10px] font-bold uppercase"
                onClick={() => void applyPreset(p)}
              >
                {p.name}
              </Button>
              <span className="text-[9px] font-mono text-muted-foreground">
                {p.hotend}/{p.bed}
              </span>
              <button
                type="button"
                className="text-[10px] text-destructive px-1"
                onClick={() => void removePreset(p.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Input
            placeholder="Name"
            className="h-8 rounded-none text-xs"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
          />
          <Input
            placeholder="Hotend °C"
            className="h-8 rounded-none text-xs"
            value={presetHotend}
            onChange={(e) => setPresetHotend(e.target.value)}
          />
          <Input
            placeholder="Bed °C"
            className="h-8 rounded-none text-xs"
            value={presetBed}
            onChange={(e) => setPresetBed(e.target.value)}
          />
        </div>
        <Button type="button" className="h-8 rounded-none text-xs font-bold uppercase" onClick={() => void addPreset()}>
          Add preset
        </Button>
      </div>
    </div>
  );
}
