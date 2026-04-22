'use client';

import React, { useState, useCallback } from 'react';
import {
  Zap,
  Flame,
  Home,
  RefreshCw,
  Layers,
  Settings,
  Wrench,
  Play,
  Square,
  RotateCcw,
  Thermometer,
  Move,
  Crosshair,
  ChevronUp,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

const ICON_MAP: Record<string, LucideIcon> = {
  zap: Zap,
  flame: Flame,
  home: Home,
  refresh: RefreshCw,
  layers: Layers,
  settings: Settings,
  tool: Wrench,
  play: Play,
  stop: Square,
  reset: RotateCcw,
  temp: Thermometer,
  move: Move,
  crosshair: Crosshair,
  up: ChevronUp,
  dashboard: LayoutDashboard,
};

interface MacroWidgetProps {
  widgetId: string;
  klipperMacroName: string;
  icon?: string;
  buttonLabel?: string;
  sizeVariant?: '1x1' | '3x1';
  color?: string;
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

export function MacroWidget({
  widgetId: _widgetId,
  klipperMacroName,
  icon,
  buttonLabel,
  sizeVariant = '3x1',
  color = '#06b6d4',
}: MacroWidgetProps) {
  const { isEditMode, mockMoonrakerData } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const IconComponent = ICON_MAP[icon ?? 'zap'] ?? Zap;
  const displayLabel = buttonLabel ?? klipperMacroName;

  const run = useCallback(async () => {
    if (isEditMode || busy) return;
    setError(null);
    setBusy(true);
    try {
      if (mockMoonrakerData) {
        await new Promise((r) => setTimeout(r, 180));
        return;
      }
      await postGcodeScript(klipperMacroName);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }, [isEditMode, busy, klipperMacroName, mockMoonrakerData]);

  return (
    <div className="h-full w-full overflow-hidden group relative flex flex-col">
      <motion.button
        type="button"
        className={`w-full flex-1 min-h-0 p-2 transition-colors disabled:opacity-60 ${
          sizeVariant === '1x1'
            ? 'flex items-center justify-center'
            : 'flex items-center justify-start gap-2 px-3'
        }`}
        whileHover={isEditMode ? {} : { scale: 1.04 }}
        whileTap={isEditMode ? {} : { scale: 0.96 }}
        disabled={isEditMode || busy}
        onClick={() => void run()}
        style={{
          backgroundColor: `${color}14`,
          borderLeft: `3px solid ${color}`,
        }}
      >
        <IconComponent size={18} className="shrink-0" style={{ color }} strokeWidth={2.5} />
        {sizeVariant === '3x1' && (
          <span className="text-[11px] font-bold text-foreground uppercase tracking-wider truncate">
            {displayLabel}
          </span>
        )}
        {busy && sizeVariant === '3x1' && (
          <span className="text-[10px] font-mono text-muted-foreground uppercase ml-auto">Running…</span>
        )}
      </motion.button>
      {error && (
        <p className="text-[9px] font-mono text-destructive px-2 pb-1 text-center leading-tight line-clamp-2">
          {error}
        </p>
      )}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
