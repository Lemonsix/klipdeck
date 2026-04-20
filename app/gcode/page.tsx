'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GCodeEditor } from '@/components/gcode-editor';
import { MacrosPanel } from '@/components/configs/macros-panel';
import { lintKlipperConfig } from '@/lib/klipper/lint-klipper-config';

const DRAFT_KEY = 'klipdeck-config-draft';
const BASE_KEY = 'klipdeck-config-base';

const defaultTemplate = `[printer]
kinematics: corexy
max_velocity: 300
max_accel: 3500
max_z_velocity: 15
max_z_accel: 100

[mcu]
serial: /dev/serial/by-id/replace-me

[stepper_x]
step_pin: PB9
dir_pin: !PC13
enable_pin: !PC14
microsteps: 16
rotation_distance: 40
endstop_pin: ^PA5
position_endstop: 0
position_max: 235
homing_speed: 50

[stepper_y]
step_pin: PB8
dir_pin: !PB7
enable_pin: !PC15
microsteps: 16
rotation_distance: 40
endstop_pin: ^PA6
position_endstop: 0
position_max: 235
homing_speed: 50

[stepper_z]
step_pin: PB6
dir_pin: !PB5
enable_pin: !PB4
microsteps: 16
rotation_distance: 8
endstop_pin: probe:z_virtual_endstop
position_min: -2
position_max: 250
homing_speed: 8

[extruder]
step_pin: PB3
dir_pin: !PA15
enable_pin: !PA8
microsteps: 16
rotation_distance: 7.5
nozzle_diameter: 0.400
filament_diameter: 1.750
heater_pin: PA2
sensor_type: EPCOS 100K B57560G104F
sensor_pin: PA1
control: pid
pid_kp: 22.2
pid_ki: 1.08
pid_kd: 114
min_temp: 0
max_temp: 270

[heater_bed]
heater_pin: PA3
sensor_type: EPCOS 100K B57560G104F
sensor_pin: PA0
control: pid
pid_kp: 54.0
pid_ki: 0.77
pid_kd: 948.0
min_temp: 0
max_temp: 130

[gcode_macro HOME_XY]
description: Home X and Y
gcode:
  G28 X Y
  M117 Homed XY
`;

export default function GCodePage() {
  const [baseConfig, setBaseConfig] = useState('');
  const [draftConfig, setDraftConfig] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const persistRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const res = await fetch('/api/moonraker/server/files/config?path=printer.cfg');
        if (!res.ok) {
          throw new Error('Moonraker config read failed');
        }
        const data = (await res.json()) as { contents?: string };
        const remote = typeof data.contents === 'string' && data.contents.trim().length > 0
          ? data.contents
          : defaultTemplate;
        if (cancelled) return;
        setBaseConfig(remote);

        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft && draft.length > 0) {
          setDraftConfig(draft);
        } else {
          setDraftConfig(remote);
        }
        localStorage.setItem(BASE_KEY, remote);
      } catch (e) {
        const fallbackBase = localStorage.getItem(BASE_KEY) || defaultTemplate;
        const fallbackDraft = localStorage.getItem(DRAFT_KEY) || fallbackBase;
        if (cancelled) return;
        setBaseConfig(fallbackBase);
        setDraftConfig(fallbackDraft);
        setLoadError(e instanceof Error ? e.message : 'Unable to load config');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (persistRef.current) clearTimeout(persistRef.current);
    persistRef.current = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, draftConfig);
    }, 350);
    return () => {
      if (persistRef.current) clearTimeout(persistRef.current);
    };
  }, [draftConfig, loading]);

  const lintIssues = useMemo(() => lintKlipperConfig(draftConfig), [draftConfig]);
  const lintErrors = lintIssues.filter((i) => i.severity === 'error');
  const dirty = draftConfig !== baseConfig;
  const canSync = !loading && !syncing && dirty && lintErrors.length === 0;

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, draftConfig);
  };

  const syncToMoonraker = async () => {
    if (!canSync) return;
    setSyncError(null);
    setSyncing(true);
    try {
      const res = await fetch('/api/moonraker/server/files/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'printer.cfg', contents: draftConfig }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Sync failed');
      }
      setBaseConfig(draftConfig);
      localStorage.setItem(BASE_KEY, draftConfig);
      localStorage.setItem(DRAFT_KEY, draftConfig);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <motion.div
        className="h-1 bg-gradient-to-r from-primary via-secondary to-primary"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8 }}
      />

      <div className="px-6 pt-4 pb-3 border-b-2 border-border bg-card/30">
        <h2 className="text-lg font-black uppercase tracking-wider text-foreground">Configs</h2>
        <p className="text-xs font-mono text-muted-foreground">
          Draft accumulates local changes. Sync is blocked while lint has errors.
        </p>
        {loadError && <p className="text-[11px] font-mono text-destructive mt-1">Load: {loadError}</p>}
        {syncError && <p className="text-[11px] font-mono text-destructive mt-1">Sync: {syncError}</p>}
      </div>

      <div className="flex-1 min-h-0 p-4 grid grid-cols-12 gap-4">
        <div className="col-span-8 min-h-0">
          <GCodeEditor
            value={draftConfig}
            onChange={setDraftConfig}
            onSaveDraft={saveDraft}
            onSync={syncToMoonraker}
            lintIssues={lintIssues}
            syncing={syncing}
            canSync={canSync}
            dirty={dirty}
          />
        </div>
        <div className="col-span-4 min-h-0">
          <MacrosPanel configText={draftConfig} onConfigChange={setDraftConfig} />
        </div>
      </div>
    </div>
  );
}
