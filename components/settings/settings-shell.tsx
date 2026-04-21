'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SettingsNav, type SettingsTabId, isSettingsTabId } from '@/components/settings/settings-nav';
import { SettingsGeneral } from '@/components/settings/settings-general';
import { SettingsPrinterForms } from '@/components/settings/settings-printer-forms';
import { SettingsMacrosTab } from '@/components/settings/settings-macros-tab';
import { SettingsMachine } from '@/components/settings/settings-machine';
import { SettingsDocs } from '@/components/settings/settings-docs';
import { usePrinterCfg } from '@/components/settings/use-printer-cfg';
import { Button } from '@/components/ui/button';

export function SettingsShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab');
  const active: SettingsTabId = isSettingsTabId(rawTab) ? rawTab : 'general';

  const setTab = (tab: SettingsTabId) => {
    router.replace(`/settings?tab=${tab}`);
  };

  const cfg = usePrinterCfg();

  const showCfgSync = active === 'printer' || active === 'macros';

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-background">
      <header className="flex shrink-0 items-baseline justify-between gap-2 border-b-2 border-border px-2 py-1.5">
        <h1 className="text-lg font-black uppercase tracking-wider text-foreground">Settings</h1>
        <span className="text-[10px] font-mono text-muted-foreground">
          tab:{' '}
          <select
            className="border border-border bg-input px-1 py-0.5 font-mono text-[10px] uppercase md:hidden"
            value={active}
            onChange={(e) => setTab(e.target.value as SettingsTabId)}
          >
            <option value="general">General</option>
            <option value="printer">Printer</option>
            <option value="macros">Macros</option>
            <option value="machine">Machine</option>
            <option value="docs">Docs</option>
          </select>
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="hidden min-h-0 md:block">
          <SettingsNav active={active} />
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
          {showCfgSync && (
            <div className="mb-2 flex flex-wrap items-center gap-2 border-b-2 border-border bg-black/30 px-2 py-1.5">
              <Button
                type="button"
                size="sm"
                className="h-7 rounded-none text-[10px] font-bold uppercase"
                disabled={!cfg.canSync}
                onClick={() => void cfg.syncToMoonraker()}
              >
                {cfg.syncing ? 'Syncing…' : 'Sync printer.cfg'}
              </Button>
              <span className="text-[10px] font-mono text-muted-foreground">
                {cfg.loading && 'Loading…'}
                {!cfg.loading && cfg.dirty && `${cfg.lintErrors.length} errors block sync`}
                {!cfg.loading && !cfg.dirty && 'In sync'}
              </span>
              {cfg.loadError && <span className="text-[10px] font-mono text-destructive">{cfg.loadError}</span>}
              {cfg.syncError && <span className="text-[10px] font-mono text-destructive">{cfg.syncError}</span>}
            </div>
          )}
          {active === 'general' && <SettingsGeneral />}
          {active === 'printer' && (
            <SettingsPrinterForms
              draftConfig={cfg.draftConfig}
              setDraftConfig={cfg.setDraftConfig}
              loading={cfg.loading}
            />
          )}
          {active === 'macros' && (
            <SettingsMacrosTab draftConfig={cfg.draftConfig} setDraftConfig={cfg.setDraftConfig} />
          )}
          {active === 'machine' && <SettingsMachine />}
          {active === 'docs' && <SettingsDocs />}
        </main>
      </div>
    </div>
  );
}
