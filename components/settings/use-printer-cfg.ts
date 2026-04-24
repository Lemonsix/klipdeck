'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { lintKlipperConfig } from '@/lib/klipper/lint-klipper-config';
import { DEFAULT_PRINTER_CFG_TEMPLATE } from '@/lib/klipper/default-printer-cfg';
import { DEFAULT_MACROS_CFG_TEMPLATE } from '@/lib/klipper/default-macros-cfg';
import { mergeVirtualKlipperConfig, partitionPrinterAndMacros } from '@/lib/klipper/klipper-config-bundle';

/** @deprecated legacy single-file draft; migrated once to split keys */
export const PRINTER_CFG_DRAFT_KEY = 'klipdeck-config-draft';
export const PRINTER_CFG_BASE_KEY = 'klipdeck-config-base';

export const PRINTER_CFG_DRAFT_PRINTER_KEY = 'klipdeck-config-draft-printer';
export const PRINTER_CFG_DRAFT_MACROS_KEY = 'klipdeck-config-draft-macros';
export const PRINTER_CFG_BASE_PRINTER_KEY = 'klipdeck-config-base-printer';
export const PRINTER_CFG_BASE_MACROS_KEY = 'klipdeck-config-base-macros';

async function fetchConfigFile(path: string): Promise<string | null> {
  const res = await fetch(`/api/moonraker/server/files/config?path=${encodeURIComponent(path)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { contents?: string };
  return typeof data.contents === 'string' ? data.contents : null;
}

function migrateLegacyLocalDraft(): void {
  const legacyDraft = localStorage.getItem(PRINTER_CFG_DRAFT_KEY);
  const hasNew =
    localStorage.getItem(PRINTER_CFG_DRAFT_PRINTER_KEY) || localStorage.getItem(PRINTER_CFG_DRAFT_MACROS_KEY);
  if (legacyDraft && !hasNew) {
    const { printerCfg, macrosCfg } = partitionPrinterAndMacros(legacyDraft, null, DEFAULT_MACROS_CFG_TEMPLATE);
    localStorage.setItem(PRINTER_CFG_DRAFT_PRINTER_KEY, printerCfg);
    localStorage.setItem(PRINTER_CFG_DRAFT_MACROS_KEY, macrosCfg);
    localStorage.removeItem(PRINTER_CFG_DRAFT_KEY);
  }
}

function migrateLegacyLocalBase(): void {
  const legacyBase = localStorage.getItem(PRINTER_CFG_BASE_KEY);
  const hasNew = localStorage.getItem(PRINTER_CFG_BASE_PRINTER_KEY);
  if (legacyBase && !hasNew) {
    const { printerCfg, macrosCfg } = partitionPrinterAndMacros(legacyBase, null, DEFAULT_MACROS_CFG_TEMPLATE);
    localStorage.setItem(PRINTER_CFG_BASE_PRINTER_KEY, printerCfg);
    localStorage.setItem(PRINTER_CFG_BASE_MACROS_KEY, macrosCfg);
    localStorage.removeItem(PRINTER_CFG_BASE_KEY);
  }
}

export function usePrinterCfg() {
  const [basePrinter, setBasePrinter] = useState('');
  const [baseMacros, setBaseMacros] = useState('');
  const [draftPrinter, setDraftPrinter] = useState('');
  const [draftMacros, setDraftMacros] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const persistRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      migrateLegacyLocalDraft();
      migrateLegacyLocalBase();

      try {
        const printerRaw =
          (await fetchConfigFile('printer.cfg'))?.trim() || DEFAULT_PRINTER_CFG_TEMPLATE;
        const macrosRemote = await fetchConfigFile('macros.cfg');

        const { printerCfg, macrosCfg } = partitionPrinterAndMacros(
          printerRaw,
          macrosRemote,
          DEFAULT_MACROS_CFG_TEMPLATE
        );

        if (cancelled) return;
        setBasePrinter(printerCfg);
        setBaseMacros(macrosCfg);

        const dP = localStorage.getItem(PRINTER_CFG_DRAFT_PRINTER_KEY);
        const dM = localStorage.getItem(PRINTER_CFG_DRAFT_MACROS_KEY);
        if (dP && dP.length > 0) {
          setDraftPrinter(dP);
        } else {
          setDraftPrinter(printerCfg);
        }
        if (dM && dM.length > 0) {
          setDraftMacros(dM);
        } else {
          setDraftMacros(macrosCfg);
        }

        localStorage.setItem(PRINTER_CFG_BASE_PRINTER_KEY, printerCfg);
        localStorage.setItem(PRINTER_CFG_BASE_MACROS_KEY, macrosCfg);
      } catch (e) {
        const partFallback = partitionPrinterAndMacros(
          DEFAULT_PRINTER_CFG_TEMPLATE,
          null,
          DEFAULT_MACROS_CFG_TEMPLATE
        );
        const fbP = localStorage.getItem(PRINTER_CFG_BASE_PRINTER_KEY) || partFallback.printerCfg;
        const fbM = localStorage.getItem(PRINTER_CFG_BASE_MACROS_KEY) || partFallback.macrosCfg;
        const fdP = localStorage.getItem(PRINTER_CFG_DRAFT_PRINTER_KEY) || fbP;
        const fdM = localStorage.getItem(PRINTER_CFG_DRAFT_MACROS_KEY) || fbM;
        if (cancelled) return;
        setBasePrinter(fbP);
        setBaseMacros(fbM);
        setDraftPrinter(fdP);
        setDraftMacros(fdM);
        setLoadError(e instanceof Error ? e.message : 'Unable to load config');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (persistRef.current) clearTimeout(persistRef.current);
    persistRef.current = setTimeout(() => {
      localStorage.setItem(PRINTER_CFG_DRAFT_PRINTER_KEY, draftPrinter);
      localStorage.setItem(PRINTER_CFG_DRAFT_MACROS_KEY, draftMacros);
    }, 350);
    return () => {
      if (persistRef.current) clearTimeout(persistRef.current);
    };
  }, [draftPrinter, draftMacros, loading]);

  const virtualDraft = useMemo(
    () => mergeVirtualKlipperConfig(draftPrinter, draftMacros),
    [draftPrinter, draftMacros]
  );

  const lintIssues = useMemo(() => lintKlipperConfig(virtualDraft), [virtualDraft]);
  const lintErrors = useMemo(() => lintIssues.filter((i) => i.severity === 'error'), [lintIssues]);
  const dirty = draftPrinter !== basePrinter || draftMacros !== baseMacros;
  const canSync = !loading && !syncing && dirty && lintErrors.length === 0;

  const syncToMoonraker = useCallback(async () => {
    if (!canSync) return;
    setSyncError(null);
    setSyncing(true);
    try {
      const macrosRes = await fetch('/api/moonraker/server/files/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'macros.cfg', contents: draftMacros }),
      });
      const macrosData = (await macrosRes.json()) as { error?: string };
      if (!macrosRes.ok) {
        throw new Error(macrosData.error || 'macros.cfg sync failed');
      }

      const printerRes = await fetch('/api/moonraker/server/files/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'printer.cfg', contents: draftPrinter }),
      });
      const printerData = (await printerRes.json()) as { error?: string };
      if (!printerRes.ok) {
        throw new Error(printerData.error || 'printer.cfg sync failed');
      }

      setBasePrinter(draftPrinter);
      setBaseMacros(draftMacros);
      localStorage.setItem(PRINTER_CFG_BASE_PRINTER_KEY, draftPrinter);
      localStorage.setItem(PRINTER_CFG_BASE_MACROS_KEY, draftMacros);
      localStorage.setItem(PRINTER_CFG_DRAFT_PRINTER_KEY, draftPrinter);
      localStorage.setItem(PRINTER_CFG_DRAFT_MACROS_KEY, draftMacros);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [canSync, draftPrinter, draftMacros]);

  return {
    basePrinter,
    baseMacros,
    draftPrinter,
    draftMacros,
    setDraftPrinter,
    setDraftMacros,
    /** Merged virtual config (for advanced consumers / debugging). */
    virtualDraft,
    loading,
    syncing,
    loadError,
    syncError,
    lintIssues,
    lintErrors,
    dirty,
    canSync,
    syncToMoonraker,
  };
}
