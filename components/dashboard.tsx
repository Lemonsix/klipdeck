'use client';

import { useStore } from '@/lib/store';
import type { Widget } from '@/lib/store';
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { GridLayout, useContainerWidth, verticalCompactor } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import { TemperatureWidget } from './widgets/temperature-widget';
import { MeshWidget } from './widgets/mesh-widget';
import { MacroWidget } from './widgets/macro-widget';
import { ConsoleWidget } from './widgets/console-widget';
import { ManualMoveWidget } from './widgets/manual-move-widget';
import { PrintWidget } from './widgets/print-widget';
import { NavigationWidget } from './widgets/navigation-widget';
import { EmergencyStopWidget } from './widgets/emergency-stop-widget';
import { PrusaSlicerWidget } from './widgets/prusaslicer-widget';
import { printJobViewFromStatus } from '@/lib/moonraker/print-job-view';
import type { PrinterObjectsStatus } from '@/lib/moonraker/types';
import { bedMeshPlotFromStatus } from '@/lib/moonraker/bed-mesh-from-status';
import { FirstRunOnboarding } from './first-run-onboarding';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, LayoutGrid, Save, Trash2 } from 'lucide-react';
import { computePackedGridPositions } from '@/lib/grid-pack-widgets';
import { useMoonrakerStatus } from '@/hooks/use-moonraker-status';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MOCK_GCODES_FILES } from '@/lib/dev/mock-gcode-files';
import { ensureClientRuntimeHydrated } from '@/lib/runtime-client-hydrate';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { createLibraryWidget } from '@/lib/widgets/catalog';
import {
  closeWidgetLibrarySheet,
  isWidgetLibraryDragEvent,
  WIDGET_LIBRARY_DRAG_MIME,
} from '@/lib/widgets/library-drag';

type WidgetType =
  | 'temperature'
  | 'macro'
  | 'mesh'
  | 'status'
  | 'console'
  | 'motion'
  | 'files'
  | 'print'
  | 'nav'
  | 'estop'
  | 'prusaslicer';
type WidgetSize = { w: number; h: number };

const WIDGET_SIZE_PRESETS: Record<WidgetType, WidgetSize[]> = {
  temperature: [{ w: 3, h: 3 }],
  macro: [{ w: 3, h: 1 }, { w: 1, h: 1 }],
  mesh: [{ w: 6, h: 6 }],
  status: [{ w: 2, h: 2 }],
  console: [{ w: 4, h: 4 }],
  motion: [{ w: 4, h: 3 }],
  files: [{ w: 6, h: 4 }],
  print: [{ w: 6, h: 6 }],
  nav: [{ w: 3, h: 3 }],
  estop: [{ w: 3, h: 1 }, { w: 1, h: 1 }],
  prusaslicer: [{ w: 1, h: 1 }],
};

function closestPreset(type: WidgetType, w: number, h: number): WidgetSize {
  const presets = WIDGET_SIZE_PRESETS[type] ?? [{ w, h }];
  return presets.reduce((best, curr) => {
    const bestDist = Math.abs(best.w - w) + Math.abs(best.h - h);
    const currDist = Math.abs(curr.w - w) + Math.abs(curr.h - h);
    return currDist < bestDist ? curr : best;
  });
}

function widgetTitle(type: WidgetType): string {
  switch (type) {
    case 'temperature':
      return 'Temperature Monitor';
    case 'estop':
      return 'Emergency Stop';
    case 'nav':
      return 'Navigation';
    case 'mesh':
      return 'Bed Mesh';
    case 'macro':
      return 'Macro Button';
    case 'console':
      return 'G-code Console';
    case 'motion':
      return 'Manual Move';
    case 'print':
      return 'Print';
    case 'prusaslicer':
      return 'PrusaSlicer';
    default:
      return type;
  }
}

function pointFromDragEvent(event: unknown): { x: number; y: number } | null {
  if (event instanceof MouseEvent) {
    return { x: event.clientX, y: event.clientY };
  }
  if (event instanceof TouchEvent) {
    const touch = event.touches[0] ?? event.changedTouches[0];
    if (!touch) return null;
    return { x: touch.clientX, y: touch.clientY };
  }
  return null;
}

export function Dashboard() {
  const {
    widgets,
    isEditMode,
    setEditMode,
    updateWidget,
    setTemperatures,
    setMotionState,
    addTempHistory,
    moonrakerWsUrl,
    setPrintJobView,
    setBedMeshPlot,
    mockMoonrakerData,
    mockPrintScenario,
    setMockGcodeFiles,
    removeWidget,
    addWidget,
  } = useStore();
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [libraryDropActive, setLibraryDropActive] = useState(false);
  const trashZoneRef = useRef<HTMLDivElement>(null);
  const isOverTrashRef = useRef(false);

  const clearTrashDragState = useCallback(() => {
    setDraggedWidgetId(null);
    setIsOverTrash(false);
    isOverTrashRef.current = false;
  }, []);

  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: false });

  useEffect(() => {
    void ensureClientRuntimeHydrated();
  }, []);

  useEffect(() => {
    if (mockMoonrakerData) {
      setMockGcodeFiles(MOCK_GCODES_FILES);
    } else {
      setMockGcodeFiles(null);
    }
  }, [mockMoonrakerData, setMockGcodeFiles]);

  const onPrinterObjectsStatus = useCallback(
    (status: PrinterObjectsStatus) => {
      setPrintJobView(printJobViewFromStatus(status));
      setBedMeshPlot(bedMeshPlotFromStatus(status));
    },
    [setPrintJobView, setBedMeshPlot]
  );

  const { connectionState, error: moonrakerError } = useMoonrakerStatus(
    setTemperatures,
    addTempHistory,
    setMotionState,
    undefined,
    onPrinterObjectsStatus,
    moonrakerWsUrl || undefined,
    mockMoonrakerData,
    mockPrintScenario
  );

  const layout: Layout = widgets.map((w) => {
    const normalized = closestPreset(w.type as WidgetType, w.w, w.h);
    const isButtonLike = w.type === 'macro' || w.type === 'estop';
    const isNav = w.type === 'nav';
    return {
      i: w.id,
      x: w.x,
      y: w.y,
      w: normalized.w,
      h: normalized.h,
      minW: isButtonLike ? 1 : normalized.w,
      minH: isButtonLike ? 1 : normalized.h,
      maxW: isButtonLike ? 3 : normalized.w,
      maxH: isButtonLike ? 1 : normalized.h,
      isDraggable: isEditMode,
      isResizable: isEditMode && isButtonLike && !isNav,
    };
  });

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      newLayout.forEach((item) => {
        const existing = widgets.find((w) => w.id === item.i);
        if (!existing) return;

        const normalized = closestPreset(existing.type as WidgetType, item.w, item.h);
        const nextW = normalized.w;
        const nextH = normalized.h;
        const isButtonLike = existing.type === 'macro' || existing.type === 'estop';
        const nextConfig = isButtonLike
          ? {
              ...(existing.config ?? {}),
              sizeVariant: nextW === 1 ? '1x1' : '3x1',
            }
          : existing.config;

        if (
          existing.x !== item.x ||
          existing.y !== item.y ||
          existing.w !== nextW ||
          existing.h !== nextH ||
          (isButtonLike &&
            (existing.config as { sizeVariant?: string } | undefined)?.sizeVariant !==
              (nextConfig as { sizeVariant?: string }).sizeVariant)
        ) {
          updateWidget(item.i, {
            x: item.x,
            y: item.y,
            w: nextW,
            h: nextH,
            config: nextConfig,
          });
        }
      });
    },
    [widgets, updateWidget]
  );

  useEffect(() => {
    widgets.forEach((w) => {
      if (w.type === 'mesh' && (w.w !== 6 || w.h !== 6)) {
        updateWidget(w.id, { w: 6, h: 6 });
      }
      if (w.type === 'print' && (w.w !== 6 || w.h !== 6)) {
        updateWidget(w.id, { w: 6, h: 6 });
      }
      if (w.type === 'files') {
        updateWidget(w.id, { type: 'print', w: 6, h: 6 });
      }
      if (w.type === 'prusaslicer' && (w.w !== 1 || w.h !== 1)) {
        updateWidget(w.id, { w: 1, h: 1 });
      }
    });
  }, [widgets, updateWidget]);

  useEffect(() => {
    if (!isEditMode) {
      clearTrashDragState();
    }
  }, [isEditMode, clearTrashDragState]);

  const updateTrashHover = useCallback((event: unknown) => {
    const point = pointFromDragEvent(event);
    const zone = trashZoneRef.current;
    if (!point || !zone) return;
    const rect = zone.getBoundingClientRect();
    const over =
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom;
    if (isOverTrashRef.current !== over) {
      isOverTrashRef.current = over;
      setIsOverTrash(over);
    }
  }, []);

  const handleDragStart = useCallback(
    (...args: unknown[]) => {
      const item = args[2] as { i?: string } | undefined;
      const widgetId = typeof item?.i === 'string' ? item.i : null;
      const widget = widgetId ? widgets.find((entry) => entry.id === widgetId) : undefined;
      if (!widget || widget.type === 'nav') {
        clearTrashDragState();
        return;
      }
      setDraggedWidgetId(widgetId);
      setIsOverTrash(false);
      isOverTrashRef.current = false;
      updateTrashHover(args[4]);
    },
    [widgets, clearTrashDragState, updateTrashHover]
  );

  const handleDrag = useCallback(
    (...args: unknown[]) => {
      if (!draggedWidgetId) return;
      updateTrashHover(args[4]);
    },
    [draggedWidgetId, updateTrashHover]
  );

  const handleDragStop = useCallback(() => {
    if (draggedWidgetId && isOverTrashRef.current) {
      removeWidget(draggedWidgetId);
    }
    clearTrashDragState();
  }, [draggedWidgetId, removeWidget, clearTrashDragState]);

  useEffect(() => {
    const onDragEndWindow = () => setLibraryDropActive(false);
    window.addEventListener('dragend', onDragEndWindow);
    return () => window.removeEventListener('dragend', onDragEndWindow);
  }, []);

  const handleLibraryDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!isWidgetLibraryDragEvent(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setLibraryDropActive(true);
  }, []);

  const handleLibraryDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!isWidgetLibraryDragEvent(e)) return;
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setLibraryDropActive(false);
  }, []);

  const handleLibraryDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (!isWidgetLibraryDragEvent(e)) return;
      e.preventDefault();
      setLibraryDropActive(false);
      const raw = e.dataTransfer.getData(WIDGET_LIBRARY_DRAG_MIME).trim();
      if (!raw) return;
      const type = raw as Widget['type'];
      const state = useStore.getState();
      if (state.widgets.some((w) => w.type === type)) return;
      const nextWidget = createLibraryWidget(type, state.widgets);
      addWidget(nextWidget);
      closeWidgetLibrarySheet();
    },
    [addWidget]
  );

  const handleAutoLayout = useCallback(() => {
    const cols = 12;
    const items = widgets.map((w) => {
      const { w: nw, h: nh } = closestPreset(w.type as WidgetType, w.w, w.h);
      return { id: w.id, w: nw, h: nh };
    });
    const positions = computePackedGridPositions(items, cols);
    widgets.forEach((existing) => {
      const pos = positions.get(existing.id);
      if (!pos) return;
      const normalized = closestPreset(existing.type as WidgetType, existing.w, existing.h);
      const nextW = normalized.w;
      const nextH = normalized.h;
      const isButtonLike = existing.type === 'macro' || existing.type === 'estop';
      const nextConfig = isButtonLike
        ? {
            ...(existing.config ?? {}),
            sizeVariant: nextW === 1 ? '1x1' : '3x1',
          }
        : existing.config;

      if (
        existing.x !== pos.x ||
        existing.y !== pos.y ||
        existing.w !== nextW ||
        existing.h !== nextH ||
        (isButtonLike &&
          (existing.config as { sizeVariant?: string } | undefined)?.sizeVariant !==
            (nextConfig as { sizeVariant?: string }).sizeVariant)
      ) {
        updateWidget(existing.id, {
          x: pos.x,
          y: pos.y,
          w: nextW,
          h: nextH,
          config: nextConfig,
        });
      }
    });
  }, [widgets, updateWidget]);

  return (
    <div
      className={`relative w-full min-h-full bg-background ${libraryDropActive ? 'ring-2 ring-inset ring-primary' : ''}`}
      onDragOver={handleLibraryDragOver}
      onDragLeave={handleLibraryDragLeave}
      onDrop={handleLibraryDrop}
    >
      <FirstRunOnboarding />
      <div className="px-6 pt-6 pb-10">
        {(connectionState === 'missing_env' ||
          connectionState === 'error' ||
          connectionState === 'connecting') && (
          <Alert
            variant={connectionState === 'connecting' ? 'default' : 'destructive'}
            className="mb-4 border-2 rounded-none"
          >
            <AlertTitle className="font-mono text-xs uppercase tracking-wide">
              {connectionState === 'missing_env' && 'Moonraker (WS) not configured'}
              {connectionState === 'connecting' && 'Connecting to Moonraker…'}
              {connectionState === 'error' && 'Moonraker connection failed'}
            </AlertTitle>
            <AlertDescription className="font-mono text-xs mt-1">
              {connectionState === 'missing_env' &&
                'Set Moonraker WS URL in onboarding/settings (e.g. ws://192.168.x.x:7125).'}
              {connectionState === 'connecting' && 'WebSocket handshake and subscription in progress.'}
              {connectionState === 'error' && (moonrakerError ?? 'Check host, port, and moonraker.conf (trusted clients / CORS).')}
            </AlertDescription>
          </Alert>
        )}

        {/* Edit mode banner */}
        <AnimatePresence>
          {isEditMode && (
            <motion.div
              key="edit-banner"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-primary/10 border-l-4 border-primary text-foreground px-4 py-3 text-xs font-mono uppercase tracking-wide flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <GripVertical size={14} className="text-primary shrink-0" />
                  Drag the handle bar to move — resize from bottom-right corner
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleAutoLayout}
                        className="px-2 py-1 border-2 border-border bg-card text-foreground hover:bg-muted transition-colors text-[10px] font-bold tracking-wide flex items-center gap-1"
                      >
                        <LayoutGrid size={12} />
                        Auto-layout
                      </button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8} className="rounded-none border-2 border-border bg-card text-foreground p-2 max-w-72">
                      <p className="text-[11px] font-bold uppercase tracking-wide">Empaquetar grilla</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Reacomoda widgets en la grilla de 12 columnas para reducir altura y huecos.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setEditMode(false)}
                        className="px-2 py-1 border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/80 transition-colors text-[10px] font-bold tracking-wide flex items-center gap-1"
                      >
                        <Save size={12} />
                        Done
                      </button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8} className="rounded-none border-2 border-border bg-card text-foreground p-2 max-w-72">
                      <p className="text-[11px] font-bold uppercase tracking-wide">Guardar layout</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Finaliza edición y conserva la posición actual de widgets.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid — useContainerWidth measures the actual width */}
        <div ref={containerRef} className="w-full">
          {mounted && (
            <GridLayout
              layout={layout}
              onLayoutChange={handleLayoutChange}
              onDragStart={handleDragStart}
              onDrag={handleDrag}
              onDragStop={handleDragStop}
              width={width}
              gridConfig={{
                cols: 12,
                rowHeight: 80,
                margin: [12, 12],
                containerPadding: [0, 0],
                maxRows: Infinity,
              }}
              dragConfig={{
                enabled: isEditMode,
                bounded: false,
                handle: '.widget-drag-handle',
                threshold: 5,
              }}
              resizeConfig={{
                enabled: isEditMode,
                handles: ['se'],
              }}
              compactor={verticalCompactor}
              autoSize={true}
            >
              {widgets.map((widget) => (
                <div key={widget.id} className="relative overflow-hidden">
                  {/* Drag handle — only visible in edit mode */}
                  {isEditMode && (
                    <div className="widget-drag-handle absolute top-0 left-0 right-0 z-20 h-8 flex items-center px-3 gap-2 cursor-grab active:cursor-grabbing bg-primary/15 border-b-2 border-primary/50 hover:bg-primary/25 transition-colors select-none">
                      <GripVertical size={13} className="text-primary shrink-0" />
                      <span className="text-xs font-bold text-primary uppercase tracking-wider truncate">
                        {widgetTitle(widget.type as WidgetType)}
                      </span>
                    </div>
                  )}

                  {/* Widget content panel */}
                  <div
                    className={`absolute left-0 right-0 bottom-0 border-2 transition-colors ${
                      isEditMode
                        ? 'border-primary/40 bg-card'
                        : 'border-border bg-card hover:border-primary/30'
                    }`}
                    style={{ top: isEditMode ? 32 : 0 }}
                  >
                    {widget.type === 'temperature' && <TemperatureWidget widgetId={widget.id} />}
                    {widget.type === 'estop' && (
                      <EmergencyStopWidget
                        widgetId={widget.id}
                        sizeVariant={widget.config?.sizeVariant === '1x1' ? '1x1' : '3x1'}
                      />
                    )}
                    {widget.type === 'nav' && <NavigationWidget widgetId={widget.id} />}
                    {widget.type === 'mesh' && <MeshWidget widgetId={widget.id} />}
                    {widget.type === 'macro' && widget.config?.klipperMacroName != null && (
                      <MacroWidget
                        widgetId={widget.id}
                        klipperMacroName={String(widget.config.klipperMacroName)}
                        icon={
                          typeof widget.config.icon === 'string' ? widget.config.icon : undefined
                        }
                        color={
                          typeof widget.config.color === 'string' ? widget.config.color : undefined
                        }
                        sizeVariant={
                          widget.config.sizeVariant === '1x1' ? '1x1' : '3x1'
                        }
                        buttonLabel={
                          typeof widget.config.buttonLabel === 'string'
                            ? widget.config.buttonLabel
                            : undefined
                        }
                      />
                    )}
                    {widget.type === 'console' && <ConsoleWidget widgetId={widget.id} />}
                    {widget.type === 'motion' && <ManualMoveWidget widgetId={widget.id} />}
                    {widget.type === 'print' && <PrintWidget widgetId={widget.id} />}
                    {widget.type === 'prusaslicer' && <PrusaSlicerWidget widgetId={widget.id} />}
                  </div>
                </div>
              ))}
            </GridLayout>
          )}
        </div>
      </div>
      {isEditMode && (
        <div
          ref={trashZoneRef}
          className={`fixed bottom-4 right-4 z-[110] border-2 px-4 py-3 shadow-lg transition-all ${
            draggedWidgetId
              ? isOverTrash
                ? 'bg-destructive border-destructive text-destructive-foreground scale-105'
                : 'bg-card border-destructive/70 text-foreground'
              : 'bg-card border-border text-muted-foreground'
          }`}
        >
          <div className="flex items-center gap-2">
            <Trash2 size={16} />
            <div className="text-[11px] font-bold uppercase tracking-wide">
              {isOverTrash ? 'Drop to delete' : 'Trash'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
