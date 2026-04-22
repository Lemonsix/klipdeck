'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Settings, Code2, Home, Edit2, Save } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavigationWidgetProps {
  widgetId: string;
}

export function NavigationWidget({ widgetId: _widgetId }: NavigationWidgetProps) {
  const isEditMode = useStore((s) => s.isEditMode);
  const setEditMode = useStore((s) => s.setEditMode);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const isActive = (path: string) => pathname === path;
  const macrosActive = pathname === '/settings' && tab === 'macros';
  const configActive = pathname === '/settings' && tab !== 'macros';

  return (
    <div className="h-full w-full p-3 flex flex-col overflow-hidden">
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b-2 border-border pb-2 mb-3 shrink-0">
        KlipDeck
      </h3>
      <div className="flex-1 min-h-0 flex flex-col gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/"
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-all ${
                isActive('/')
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-foreground hover:border-primary hover:bg-primary/5'
              }`}
            >
              <Home size={14} />
              Dashboard
            </Link>
          </TooltipTrigger>
          <TooltipContent sideOffset={8} className="rounded-none border-2 border-border bg-card text-foreground p-2 max-w-64">
            <p className="text-[11px] font-bold uppercase tracking-wide">Dashboard</p>
            <p className="text-[10px] text-muted-foreground mt-1">Vista principal con widgets de control y monitoreo.</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/settings?tab=macros"
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-all ${
                macrosActive
                  ? 'bg-secondary text-secondary-foreground border-secondary'
                  : 'border-border text-foreground hover:border-secondary hover:bg-secondary/5'
              }`}
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
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-all ${
                configActive
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'border-border text-foreground hover:border-accent hover:bg-accent/5'
              }`}
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

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setEditMode(!isEditMode)}
              className={`mt-auto flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-all ${
                isEditMode
                  ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/80'
                  : 'border-border text-foreground hover:border-primary hover:bg-primary/5'
              }`}
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
