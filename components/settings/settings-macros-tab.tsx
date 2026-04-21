'use client';

import { MacrosPanel } from '@/components/configs/macros-panel';

export function SettingsMacrosTab({
  draftConfig,
  setDraftConfig,
}: {
  draftConfig: string;
  setDraftConfig: (v: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="text-[10px] font-mono text-muted-foreground">
        Edit <code className="text-primary">[gcode_macro …]</code> blocks. Use <strong>Sync printer.cfg</strong> in the
        Printer tab to push changes to Moonraker.
      </p>
      <div className="min-h-[420px] flex-1 min-w-0 border-2 border-border">
        <MacrosPanel configText={draftConfig} onConfigChange={setDraftConfig} />
      </div>
    </div>
  );
}
