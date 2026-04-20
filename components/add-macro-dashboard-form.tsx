'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import {
  LayoutDashboard,
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
  Check,
} from 'lucide-react';

const ICON_OPTIONS = [
  { id: 'zap', label: 'Zap', Icon: Zap },
  { id: 'flame', label: 'Flame', Icon: Flame },
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'refresh', label: 'Refresh', Icon: RefreshCw },
  { id: 'layers', label: 'Layers', Icon: Layers },
  { id: 'settings', label: 'Settings', Icon: Settings },
  { id: 'tool', label: 'Tool', Icon: Wrench },
  { id: 'play', label: 'Play', Icon: Play },
  { id: 'stop', label: 'Stop', Icon: Square },
  { id: 'reset', label: 'Reset', Icon: RotateCcw },
  { id: 'temp', label: 'Temp', Icon: Thermometer },
  { id: 'move', label: 'Move', Icon: Move },
  { id: 'crosshair', label: 'Level', Icon: Crosshair },
  { id: 'up', label: 'Up', Icon: ChevronUp },
  { id: 'dashboard', label: 'Widget', Icon: LayoutDashboard },
];

const COLOR_PALETTE = [
  '#06b6d4',
  '#0ea5e9',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#a855f7',
  '#f43f5e',
] as const;

export interface MacroDashboardFormProps {
  klipperMacroName: string;
  /** Initial label when opening from editor CodeLens */
  defaultButtonLabel?: string;
  /** Initial icon id */
  defaultIcon?: string;
  defaultColor?: string;
  defaultSizeVariant?: '1x1' | '3x1';
  /** Called after successful add or when closing inline popover */
  onDone?: () => void;
  /** Layout: default card padding */
  className?: string;
}

export function MacroDashboardForm({
  klipperMacroName,
  defaultButtonLabel,
  defaultIcon = 'zap',
  defaultColor = '#06b6d4',
  defaultSizeVariant = '3x1',
  onDone,
  className = '',
}: MacroDashboardFormProps) {
  const { addWidget, widgets } = useStore();
  const [selectedIcon, setSelectedIcon] = useState(defaultIcon);
  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const [sizeVariant, setSizeVariant] = useState<'1x1' | '3x1'>(defaultSizeVariant);
  const [label, setLabel] = useState(defaultButtonLabel ?? klipperMacroName);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLabel(defaultButtonLabel ?? klipperMacroName);
    setSelectedIcon(defaultIcon);
    setSelectedColor(defaultColor);
    setSizeVariant(defaultSizeVariant);
  }, [klipperMacroName, defaultButtonLabel, defaultIcon, defaultColor, defaultSizeVariant]);

  const alreadyAdded = widgets.some(
    (w) => w.type === 'macro' && w.config?.klipperMacroName === klipperMacroName
  );

  const handleAdd = () => {
    const maxY = widgets.reduce((acc, w) => Math.max(acc, w.y + w.h), 0);
    const size = sizeVariant === '1x1' ? { w: 1, h: 1 } : { w: 3, h: 1 };

    addWidget({
      id: `macro-${klipperMacroName}-${Date.now()}`,
      type: 'macro',
      x: 0,
      y: maxY,
      w: size.w,
      h: size.h,
      config: {
        klipperMacroName,
        icon: selectedIcon,
        color: selectedColor,
        sizeVariant,
        buttonLabel: label.trim() || klipperMacroName,
      },
    });

    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onDone?.();
    }, 1200);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <p className="text-xs font-mono text-muted-foreground break-all">
        Macro: <span className="text-primary font-bold">{klipperMacroName}</span>
      </p>

      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wide font-bold mb-1.5 block">
          Button Label
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={24}
          className="w-full px-2.5 py-1.5 bg-input border-2 border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors font-mono"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wide font-bold mb-1.5 block">
          Size
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setSizeVariant('1x1')}
            className={`border-2 py-1.5 text-xs font-mono ${
              sizeVariant === '1x1'
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
          >
            1x1
          </button>
          <button
            type="button"
            onClick={() => setSizeVariant('3x1')}
            className={`border-2 py-1.5 text-xs font-mono ${
              sizeVariant === '3x1'
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
          >
            3x1
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wide font-bold mb-1.5 block">Icon</label>
        <div className="grid grid-cols-5 gap-1.5">
          {ICON_OPTIONS.map(({ id, label: iconLabel, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedIcon(id)}
              title={iconLabel}
              className={`flex flex-col items-center gap-0.5 p-1.5 border-2 transition-colors ${
                selectedIcon === id
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              <span className="text-[9px] leading-none font-mono truncate w-full text-center">{iconLabel}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wide font-bold mb-1.5 block">
          Color
        </label>
        <div className="grid grid-cols-8 gap-1.5">
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color)}
              className={`h-6 border-2 ${selectedColor === color ? 'border-foreground' : 'border-border'}`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className="border-2 border-border/50 p-2 flex items-center gap-3 bg-black/20">
        <span className="text-xs text-muted-foreground font-mono uppercase">Preview:</span>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 border-2 ${sizeVariant === '1x1' ? 'w-10 justify-center' : 'w-full max-w-40'}`}
          style={{
            borderColor: selectedColor,
            backgroundColor: `${selectedColor}20`,
          }}
        >
          {(() => {
            const found = ICON_OPTIONS.find((o) => o.id === selectedIcon);
            return found ? <found.Icon size={14} className="shrink-0" style={{ color: selectedColor }} /> : null;
          })()}
          {sizeVariant === '3x1' && (
            <span className="text-xs font-bold text-foreground truncate">{label || klipperMacroName}</span>
          )}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        type="button"
        onClick={handleAdd}
        disabled={alreadyAdded || added}
        className={`w-full py-2 font-bold border-2 text-sm transition-colors flex items-center justify-center gap-2 ${
          added
            ? 'bg-green-600 border-green-600 text-white'
            : alreadyAdded
              ? 'bg-muted border-border text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
        }`}
      >
        {added ? (
          <>
            <Check size={14} /> Added!
          </>
        ) : alreadyAdded ? (
          'Already on dashboard'
        ) : (
          <>
            <LayoutDashboard size={14} /> Add to Dashboard
          </>
        )}
      </motion.button>
    </div>
  );
}

/** Popover trigger + panel (e.g. next to a macro name in docs). */
export function AddMacroDashboardPopover({
  klipperMacroName,
  defaultButtonLabel,
}: {
  klipperMacroName: string;
  defaultButtonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`text-left font-bold text-sm leading-tight transition-colors hover:text-primary focus:outline-none flex items-center gap-1.5 group ${
          open ? 'text-primary' : 'text-foreground'
        }`}
        title="Add as dashboard button"
      >
        <span className="underline-offset-2 decoration-dotted decoration-primary/40 group-hover:underline">
          {klipperMacroName}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 z-50 w-72 bg-card border-2 border-primary shadow-xl shadow-black/50"
          >
            <div className="absolute -top-[9px] left-4 w-4 h-4 bg-card border-t-2 border-l-2 border-primary rotate-45" />
            <div className="p-4">
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Add to Dashboard</p>
              <MacroDashboardForm
                klipperMacroName={klipperMacroName}
                defaultButtonLabel={defaultButtonLabel}
                onDone={() => setOpen(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
