'use client';

import { useCallback, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PrusaSlicerWidgetProps {
  widgetId: string;
}

export const PRUSA_SLICER_ORANGE = '#E05D2E';

/** Paths from PrusaSlicer `resources/icons/PrusaSlicer.svg` (AGPL-3.0); circle omitted. */
export function PrusaSlicerMark({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 800"
      className={className}
      style={style}
      aria-hidden
    >
      <path d="M599.3,186.8c-93.9-93.9-246.1-93.9-340,0s-93.9,246.1,0,340Z" fill="currentColor" fillOpacity={1} />
      <path d="M202.7,612.5c93.9,93.9,246.1,93.9,340,0s93.9-246.1,0-340" fill="currentColor" fillOpacity={0.38} />
    </svg>
  );
}

/** Same interaction shell as `MacroWidget` 1×1: tinted bg, 3px left accent, centered icon; orange brand. */
export function PrusaSlicerOpenMacroButton({
  disabled,
  busy,
  className,
}: {
  disabled?: boolean;
  busy?: boolean;
  className?: string;
}) {
  const isEditMode = useStore((s) => s.isEditMode);
  const open = useCallback(() => {
    window.location.href = 'prusaslicer://open';
  }, []);

  return (
    <div
      className={cn(
        'group relative flex min-h-0 flex-col overflow-hidden',
        className ?? 'h-20 w-20 shrink-0'
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            type="button"
            className="w-full flex-1 min-h-0 p-2 flex items-center justify-center transition-colors disabled:opacity-60"
            style={{
              backgroundColor: `${PRUSA_SLICER_ORANGE}14`,
              borderLeft: `3px solid ${PRUSA_SLICER_ORANGE}`,
            }}
            whileHover={isEditMode ? {} : { scale: 1.04 }}
            whileTap={isEditMode ? {} : { scale: 0.96 }}
            disabled={isEditMode || busy || disabled}
            onClick={open}
          >
            {busy ? (
              <span className="text-[10px] font-mono text-muted-foreground uppercase">…</span>
            ) : (
              <PrusaSlicerMark className="size-[28px] shrink-0" style={{ color: PRUSA_SLICER_ORANGE }} />
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent sideOffset={8} className="rounded-none border-2 border-border bg-card text-foreground p-2 max-w-72">
          <p className="text-[11px] font-bold uppercase tracking-wide">Open in PrusaSlicer</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Abre PrusaSlicer para cortar STL y generar G-code. Usa el protocolo <code className="text-foreground">prusaslicer://open</code>.
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function PrusaSlicerWidget({ widgetId }: PrusaSlicerWidgetProps) {
  return (
    <div data-widget-id={widgetId} className="h-full w-full min-h-0 p-0">
      <PrusaSlicerOpenMacroButton className="h-full w-full" />
    </div>
  );
}
