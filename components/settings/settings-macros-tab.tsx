'use client';

import { MacrosPanel } from '@/components/configs/macros-panel';

export function SettingsMacrosTab({
  draftMacrosCfg,
  setDraftMacrosCfg,
}: {
  draftMacrosCfg: string;
  setDraftMacrosCfg: (v: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="text-[10px] font-mono text-muted-foreground">
        Edit <code className="text-primary">macros.cfg</code> — solo bloques{' '}
        <code className="text-primary">[gcode_macro …]</code>. <code className="text-primary">printer.cfg</code>{' '}
        incluye <code className="text-primary">[include macros.cfg]</code>. Usá <strong>Sync printer.cfg + macros.cfg</strong>{' '}
        arriba para subir ambos a Moonraker.
      </p>
      <div className="min-h-[420px] flex-1 min-w-0 border-2 border-border">
        <MacrosPanel configText={draftMacrosCfg} onConfigChange={setDraftMacrosCfg} />
      </div>
    </div>
  );
}
