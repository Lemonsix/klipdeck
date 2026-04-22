'use client';

import { useCallback, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface EmergencyStopWidgetProps {
  widgetId: string;
  sizeVariant?: '1x1' | '3x1';
}

export function EmergencyStopWidget({
  widgetId: _widgetId,
  sizeVariant = '3x1',
}: EmergencyStopWidgetProps) {
  const isEditMode = useStore((s) => s.isEditMode);
  const mockMoonrakerData = useStore((s) => s.mockMoonrakerData);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onEmergencyStop = useCallback(async () => {
    if (isEditMode || busy) return;
    setError(null);
    setBusy(true);
    try {
      if (mockMoonrakerData) {
        setError('Mock mode: emergency stop disabled');
        return;
      }
      const res = await fetch('/api/moonraker/printer/emergency-stop', { method: 'POST' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? 'Emergency stop failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Emergency stop failed');
    } finally {
      setBusy(false);
    }
  }, [isEditMode, busy, mockMoonrakerData]);

  return (
    <div className="h-full w-full overflow-hidden group relative flex flex-col">
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            type="button"
            onClick={() => void onEmergencyStop()}
            disabled={isEditMode || busy}
            className={`w-full flex-1 min-h-0 p-2 transition-colors disabled:opacity-60 ${
              sizeVariant === '1x1'
                ? 'flex items-center justify-center'
                : 'flex items-center justify-start gap-2 px-3'
            }`}
            whileHover={isEditMode ? {} : { scale: 1.04 }}
            whileTap={isEditMode ? {} : { scale: 0.96 }}
            style={{
              backgroundColor: '#dc262614',
              borderLeft: '3px solid #dc2626',
            }}
          >
            <AlertTriangle size={18} className="shrink-0 text-red-500" strokeWidth={2.5} />
            {sizeVariant === '3x1' && (
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider truncate">
                Emergency Stop
              </span>
            )}
            {busy && sizeVariant === '3x1' && (
              <span className="text-[10px] font-mono text-muted-foreground uppercase ml-auto">Running…</span>
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent sideOffset={8} className="rounded-none border-2 border-border bg-card text-foreground p-2 max-w-72">
          <p className="text-[11px] font-bold uppercase tracking-wide">Emergency Stop</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Detiene inmediatamente la impresora. Usa Moonraker <code>/printer/emergency_stop</code>.
          </p>
        </TooltipContent>
      </Tooltip>
      {error && (
        <p className="text-[9px] font-mono text-destructive px-2 pb-1 text-center leading-tight line-clamp-2">
          {error}
        </p>
      )}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ backgroundColor: '#dc2626' }}
      />
    </div>
  );
}
