'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { lintKlipperConfig } from '@/lib/klipper/lint-klipper-config';
import { DEFAULT_PRINTER_CFG_TEMPLATE } from '@/lib/klipper/default-printer-cfg';

export const PRINTER_CFG_DRAFT_KEY = 'klipdeck-config-draft';
export const PRINTER_CFG_BASE_KEY = 'klipdeck-config-base';

export function usePrinterCfg() {
  const [baseConfig, setBaseConfig] = useState('');
  const [draftConfig, setDraftConfig] = useState('');
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

      try {
        const res = await fetch('/api/moonraker/server/files/config?path=printer.cfg');
        if (!res.ok) {
          throw new Error('Moonraker config read failed');
        }
        const data = (await res.json()) as { contents?: string };
        const remote =
          typeof data.contents === 'string' && data.contents.trim().length > 0
            ? data.contents
            : DEFAULT_PRINTER_CFG_TEMPLATE;
        if (cancelled) return;
        setBaseConfig(remote);

        const draft = localStorage.getItem(PRINTER_CFG_DRAFT_KEY);
        if (draft && draft.length > 0) {
          setDraftConfig(draft);
        } else {
          setDraftConfig(remote);
        }
        localStorage.setItem(PRINTER_CFG_BASE_KEY, remote);
      } catch (e) {
        const fallbackBase = localStorage.getItem(PRINTER_CFG_BASE_KEY) || DEFAULT_PRINTER_CFG_TEMPLATE;
        const fallbackDraft = localStorage.getItem(PRINTER_CFG_DRAFT_KEY) || fallbackBase;
        if (cancelled) return;
        setBaseConfig(fallbackBase);
        setDraftConfig(fallbackDraft);
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
      localStorage.setItem(PRINTER_CFG_DRAFT_KEY, draftConfig);
    }, 350);
    return () => {
      if (persistRef.current) clearTimeout(persistRef.current);
    };
  }, [draftConfig, loading]);

  const lintIssues = useMemo(() => lintKlipperConfig(draftConfig), [draftConfig]);
  const lintErrors = useMemo(() => lintIssues.filter((i) => i.severity === 'error'), [lintIssues]);
  const dirty = draftConfig !== baseConfig;
  const canSync = !loading && !syncing && dirty && lintErrors.length === 0;

  const syncToMoonraker = useCallback(async () => {
    if (!canSync) return;
    setSyncError(null);
    setSyncing(true);
    try {
      const res = await fetch('/api/moonraker/server/files/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'printer.cfg', contents: draftConfig }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Sync failed');
      }
      setBaseConfig(draftConfig);
      localStorage.setItem(PRINTER_CFG_BASE_KEY, draftConfig);
      localStorage.setItem(PRINTER_CFG_DRAFT_KEY, draftConfig);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [canSync, draftConfig]);

  return {
    baseConfig,
    draftConfig,
    setDraftConfig,
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
