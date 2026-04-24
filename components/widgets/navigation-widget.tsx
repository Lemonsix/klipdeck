'use client';

import Link from 'next/link';
import { Settings, Code2, Edit2, Save, BookPlus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WidgetLibrarySheet } from '@/components/widgets/widget-library-sheet';

interface NavigationWidgetProps {
  widgetId: string;
}

export function NavigationWidget({ widgetId }: NavigationWidgetProps) {
  const isEditMode = useStore((s) => s.isEditMode);
  const setEditMode = useStore((s) => s.setEditMode);
  const buttonClass =
    'flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide border-2 border-border text-foreground hover:border-primary hover:bg-primary/5 transition-all';

  return (
    <div data-widget-id={widgetId} className="h-full w-full p-3 flex flex-col overflow-hidden">
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b-2 border-border pb-2 mb-3 shrink-0">
        KlipDeck
      </h3>
      <div className="flex-1 min-h-0 flex flex-col gap-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/settings?tab=macros"
              className={buttonClass}
            >
              <Code2 size={14} />
              Macros
            </Link>
          </TooltipTrigger>
          <TooltipContent sideOffset={8} className="rounded-none border-2 border-border bg-card text-foreground p-2 max-w-64">
            <p className="text-[11px] font-bold uppercase tracking-wide">Macros</p>
            <p className="text-[10px] text-muted-foreground mt-1">Editá macros y comandos frecuentes de Klipper.</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/settings"
              className={buttonClass}
            >
              <Settings size={14} />
              Config
            </Link>
          </TooltipTrigger>
          <TooltipContent sideOffset={8} className="rounded-none border-2 border-border bg-card text-foreground p-2 max-w-64">
            <p className="text-[11px] font-bold uppercase tracking-wide">Config</p>
            <p className="text-[10px] text-muted-foreground mt-1">Parámetros de conexión, máquina y ajustes generales.</p>
          </TooltipContent>
        </Tooltip>

        <WidgetLibrarySheet
          trigger={
            <button type="button" className={buttonClass}>
              <BookPlus size={14} />
              WidgetLibrary
            </button>
          }
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setEditMode(!isEditMode)}
              className={buttonClass}
            >
              {isEditMode ? (
                <>
                  <Save size={14} />
                  Done
                </>
              ) : (
                <>
                  <Edit2 size={14} />
                  Edit Layout
                </>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={8} className="rounded-none border-2 border-border bg-card text-foreground p-2 max-w-64">
            <p className="text-[11px] font-bold uppercase tracking-wide">{isEditMode ? 'Guardar layout' : 'Editar layout'}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {isEditMode
                ? 'Cierra el modo edición y conserva posiciones/tamaños de widgets.'
                : 'Permite mover y redimensionar widgets compatibles.'}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
