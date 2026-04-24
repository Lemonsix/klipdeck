'use client';

import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { useStore } from '@/lib/store';
import { WIDGET_LIBRARY_ITEMS } from '@/lib/widgets/catalog';
import { CLOSE_WIDGET_LIBRARY_EVENT, setWidgetLibraryDragData } from '@/lib/widgets/library-drag';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const SECTION_ORDER = ['Control', 'Monitoring', 'Printing', 'System'] as const;

interface WidgetLibrarySheetProps {
  /** Same element pattern as nav buttons (e.g. Edit Layout); SheetTrigger merges into it. */
  trigger: ReactElement;
}

export function WidgetLibrarySheet({ trigger }: WidgetLibrarySheetProps) {
  const [open, setOpen] = useState(false);
  const widgets = useStore((s) => s.widgets);

  const usedTypes = useMemo(() => new Set(widgets.map((widget) => widget.type)), [widgets]);

  const sections = useMemo(() => {
    const entries = WIDGET_LIBRARY_ITEMS.filter((item) => !usedTypes.has(item.type));
    return SECTION_ORDER.map((section) => ({
      section,
      items: entries.filter((item) => item.section === section),
    })).filter((block) => block.items.length > 0);
  }, [usedTypes]);

  useEffect(() => {
    const onClose = () => setOpen(false);
    window.addEventListener(CLOSE_WIDGET_LIBRARY_EVENT, onClose);
    return () => window.removeEventListener(CLOSE_WIDGET_LIBRARY_EVENT, onClose);
  }, []);

  return (
    <Sheet modal={false} open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>{trigger}</SheetTrigger>
        </TooltipTrigger>
        <TooltipContent sideOffset={8} className="rounded-none border-2 border-border bg-card text-foreground p-2 max-w-72">
          <p className="text-[11px] font-bold uppercase tracking-wide">WidgetLibrary</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Arrastrá un widget desde la lista hacia el dashboard para agregarlo.
          </p>
        </TooltipContent>
      </Tooltip>
      <SheetContent
        side="right"
        overlayClassName="pointer-events-none"
        className="border-l-2 border-border sm:max-w-md"
      >
        <SheetHeader className="border-b-2 border-border pb-3">
          <SheetTitle className="text-sm font-bold uppercase tracking-wide">WidgetLibrary</SheetTitle>
          <SheetDescription className="text-xs font-mono">
            Arrastrá un widget hacia el área del dashboard y soltalo para agregarlo.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
          {sections.length === 0 ? (
            <div className="mt-4 border-2 border-border p-4 text-xs font-mono text-muted-foreground">
              All available widgets are already on the dashboard.
            </div>
          ) : (
            sections.map((block) => (
              <section key={block.section} className="pt-4">
                <h4 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  {block.section}
                </h4>
                <div className="space-y-2">
                  {block.items.map((item) => (
                    <div
                      key={item.type}
                      draggable
                      role="listitem"
                      className="border-2 border-border bg-card p-3 cursor-grab active:cursor-grabbing select-none hover:border-primary/50 transition-colors"
                      onDragStart={(e) => {
                        setWidgetLibraryDragData(e.dataTransfer, item.type);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical size={14} className="shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold uppercase tracking-wide text-foreground">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{item.description}</p>
                          <p className="text-[9px] font-mono uppercase text-primary/80 mt-2">Drag → dashboard</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
