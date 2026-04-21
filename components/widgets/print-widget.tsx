'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { isActiveJob } from '@/lib/moonraker/print-job-view';

interface PrintWidgetProps {
  widgetId: string;
}

type FileEntry = {
  path: string;
  modified: number | null;
  size: number | null;
};

type FileMetadata = {
  estimatedTimeSec: number | null;
  filamentMm: number | null;
};

function fileBaseName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function formatBytes(bytes: number | null): string {
  if (bytes == null || Number.isNaN(bytes)) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatFilament(filamentMm: number | null): string {
  if (filamentMm == null || !Number.isFinite(filamentMm) || filamentMm <= 0) return 'N/A';
  return `${(filamentMm / 1000).toFixed(1)} m`;
}

type Panel = 'picker' | 'printing' | 'done';

export function PrintWidget({ widgetId: _widgetId }: PrintWidgetProps) {
  const printJobView = useStore((s) => s.printJobView);

  const [panel, setPanel] = useState<Panel>(() => (isActiveJob(printJobView) ? 'printing' : 'picker'));
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [selected, setSelected] = useState<FileEntry | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<'pause' | 'resume' | 'cancel' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** After local start, WS can lag; avoid flipping to "done" before Moonraker reports the job. */
  const blockAutoDoneUntilRef = useRef(0);

  useEffect(() => {
    if (panel === 'picker' && isActiveJob(printJobView)) {
      setPanel('printing');
    }
    if (panel === 'done' && isActiveJob(printJobView)) {
      setPanel('printing');
    }
    if (panel === 'printing' && !isActiveJob(printJobView)) {
      const terminal =
        printJobView.jobState === 'complete' ||
        printJobView.jobState === 'cancelled' ||
        printJobView.jobState === 'error';
      if (!terminal && Date.now() < blockAutoDoneUntilRef.current) return;
      setPanel('done');
    }
  }, [printJobView, panel]);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/moonraker/server/files/gcodes');
      const data = (await res.json()) as { error?: string; files?: FileEntry[] };
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load files');
      }
      const next = Array.isArray(data.files) ? data.files : [];
      next.sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0));
      setFiles(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  const openConfirm = useCallback(async (file: FileEntry) => {
    setSelected(file);
    setModalOpen(true);
    setMetadataLoading(true);
    setMetadata(null);
    try {
      const encoded = encodeURIComponent(file.path);
      const res = await fetch(`/api/moonraker/server/files/metadata?filename=${encoded}`);
      const data = (await res.json()) as {
        error?: string;
        metadata?: FileMetadata;
      };
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load metadata');
      }
      setMetadata(data.metadata ?? null);
    } catch {
      setMetadata(null);
    } finally {
      setMetadataLoading(false);
    }
  }, []);

  const startPrint = useCallback(async () => {
    if (!selected || printing) return;
    setPrinting(true);
    try {
      const res = await fetch('/api/moonraker/printer/print/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selected.path }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to start print');
      }
      setModalOpen(false);
      blockAutoDoneUntilRef.current = Date.now() + 3000;
      setPanel('printing');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPrinting(false);
    }
  }, [selected, printing]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUploadChange = useCallback(async () => {
    const filesList = fileInputRef.current?.files;
    if (!filesList || filesList.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(filesList)) {
        const form = new FormData();
        form.append('file', file, file.name);
        const res = await fetch('/api/moonraker/server/files/gcodes', {
          method: 'POST',
          body: form,
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : `Upload failed: ${file.name}`);
        }
      }
      await fetchFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploading(false);
    }
  }, [fetchFiles]);

  const postPrintAction = useCallback(async (path: string) => {
    const res = await fetch(path, { method: 'POST' });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : 'Request failed');
    }
  }, []);

  const onPause = useCallback(async () => {
    setActionBusy('pause');
    setError(null);
    try {
      await postPrintAction('/api/moonraker/printer/print/pause');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionBusy(null);
    }
  }, [postPrintAction]);

  const onResume = useCallback(async () => {
    setActionBusy('resume');
    setError(null);
    try {
      await postPrintAction('/api/moonraker/printer/print/resume');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionBusy(null);
    }
  }, [postPrintAction]);

  const onCancel = useCallback(async () => {
    setActionBusy('cancel');
    setError(null);
    try {
      await postPrintAction('/api/moonraker/printer/print/cancel');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionBusy(null);
    }
  }, [postPrintAction]);

  const selectedMeta = useMemo(() => {
    return {
      eta: formatDuration(metadata?.estimatedTimeSec ?? null),
      filament: formatFilament(metadata?.filamentMm ?? null),
    };
  }, [metadata]);

  const displayName = printJobView.filename ? fileBaseName(printJobView.filename) : '—';
  const layerLine =
    printJobView.currentLayer != null || printJobView.totalLayer != null
      ? `Layer ${printJobView.currentLayer ?? '—'} / ${printJobView.totalLayer ?? '—'}`
      : null;
  const isPaused = printJobView.jobState === 'paused';

  if (panel === 'printing' || panel === 'done') {
    const pct = printJobView.progressPct ?? 0;
    const stateLabel = printJobView.jobState ?? (panel === 'done' ? 'idle' : '…');

    return (
      <div className="h-full w-full p-3 flex flex-col gap-3 overflow-hidden min-h-0">
        <div className="flex items-center justify-between border-b-2 border-border pb-2 shrink-0">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Print</h3>
          {panel === 'done' && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 rounded-none border-2 text-[10px] font-mono uppercase"
              onClick={() => {
                setPanel('picker');
                void fetchFiles();
              }}
            >
              New print
            </Button>
          )}
        </div>

        {error && <p className="text-[11px] text-destructive font-mono shrink-0">{error}</p>}

        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto">
          <div>
            <p className="text-[10px] font-mono uppercase text-muted-foreground">File</p>
            <p className="text-sm font-semibold text-foreground truncate mt-0.5">{displayName}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="border-2 border-border p-2">
              <p className="text-muted-foreground uppercase text-[10px]">State</p>
              <p className="text-foreground mt-1 uppercase">{stateLabel}</p>
            </div>
            <div className="border-2 border-border p-2">
              <p className="text-muted-foreground uppercase text-[10px]">Elapsed</p>
              <p className="text-foreground mt-1">
                {formatDuration(printJobView.printDurationSec)}
              </p>
            </div>
          </div>

          {layerLine && (
            <p className="text-xs font-mono text-muted-foreground">{layerLine}</p>
          )}

          {printJobView.displayMessage && (
            <p className="text-[11px] font-mono text-primary/90 border-l-2 border-primary pl-2">
              {printJobView.displayMessage}
            </p>
          )}

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono uppercase text-muted-foreground">
              <span>Progress</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 border-2 border-border bg-black/40">
              <div
                className="h-full bg-primary transition-[width] duration-300"
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              />
            </div>
          </div>

          {panel === 'printing' && isActiveJob(printJobView) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {isPaused ? (
                <Button
                  type="button"
                  size="sm"
                  className="rounded-none border-2 text-[10px] font-mono uppercase"
                  disabled={actionBusy != null}
                  onClick={() => void onResume()}
                >
                  {actionBusy === 'resume' ? '…' : 'Resume'}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-none border-2 text-[10px] font-mono uppercase"
                  disabled={actionBusy != null}
                  onClick={() => void onPause()}
                >
                  {actionBusy === 'pause' ? '…' : 'Pause'}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="rounded-none border-2 text-[10px] font-mono uppercase"
                disabled={actionBusy != null}
                onClick={() => void onCancel()}
              >
                {actionBusy === 'cancel' ? '…' : 'Cancel'}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-3 flex flex-col gap-2 overflow-hidden min-h-0">
      <div className="flex items-center justify-between border-b-2 border-border pb-2">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Print</h3>
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-none border-2 text-[10px] font-mono uppercase"
            onClick={() => void fetchFiles()}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 rounded-none border-2 text-[10px] font-mono uppercase"
            onClick={handleUploadClick}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".gcode,.gco,.gc"
            multiple
            onChange={() => void handleUploadChange()}
          />
        </div>
      </div>

      {error && <p className="text-[11px] text-destructive font-mono">{error}</p>}

      <div className="flex-1 min-h-[120px] overflow-y-auto border-2 border-border/60 bg-black/30">
        {loading ? (
          <div className="p-3 text-xs text-muted-foreground font-mono">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground font-mono">No files in gcodes.</div>
        ) : (
          <ul className="divide-y divide-border/50">
            {files.map((file) => (
              <li key={file.path}>
                <button
                  type="button"
                  className="w-full text-left p-2.5 hover:bg-primary/10 transition-colors"
                  onClick={() => void openConfirm(file)}
                >
                  <p className="text-xs font-semibold text-foreground truncate">{fileBaseName(file.path)}</p>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>{formatBytes(file.size)}</span>
                    <span>
                      {file.modified
                        ? new Date(file.modified * 1000).toLocaleString()
                        : 'unknown date'}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={modalOpen} onOpenChange={setModalOpen}>
        <AlertDialogContent className="rounded-none border-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono uppercase text-base">Start print?</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs">
              {selected ? fileBaseName(selected.path) : 'Selected file'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="border border-border p-2">
              <p className="text-muted-foreground uppercase">Approx time</p>
              <p className="text-foreground mt-1">
                {metadataLoading ? 'Loading...' : selectedMeta.eta}
              </p>
            </div>
            <div className="border border-border p-2">
              <p className="text-muted-foreground uppercase">Filament</p>
              <p className="text-foreground mt-1">
                {metadataLoading ? 'Loading...' : selectedMeta.filament}
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-2">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none border-2"
              onClick={(e) => {
                e.preventDefault();
                void startPrint();
              }}
            >
              {printing ? 'Starting...' : 'Start print'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
