'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import {
  embeddedMockStlArrayBuffer,
  MOCK_EMBEDDED_STL_PATH,
  mockMetadataForPath,
} from '@/lib/dev/mock-gcode-files';
import { ensureClientRuntimeHydrated } from '@/lib/runtime-client-hydrate';
import { Button } from '@/components/ui/button';
import { GcodePreviewPanel } from '@/components/widgets/gcode-preview-panel';
import { StlPreviewPanel } from '@/components/widgets/stl-preview-panel';
import { PrusaSlicerOpenMacroButton } from '@/components/widgets/prusaslicer-widget';
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

const GCODE_EXTENSIONS = new Set(['.gcode', '.gco', '.gc']);
const STL_EXTENSIONS = new Set(['.stl']);
const LOCAL_FILE_PREFIX = 'local/';
const MAX_LOCAL_PREVIEW_BYTES = 25 * 1024 * 1024;

type LocalMockAsset = {
  path: string;
  modified: number;
  size: number;
  kind: 'stl' | 'gcode';
  gcodeText?: string;
  stlBuffer?: ArrayBuffer;
};

function fileBaseName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function fileExtension(path: string): string {
  const base = fileBaseName(path);
  const idx = base.lastIndexOf('.');
  if (idx < 0) return '';
  return base.slice(idx).toLowerCase();
}

function isStlPath(path: string): boolean {
  return STL_EXTENSIONS.has(fileExtension(path));
}

function isGcodePath(path: string): boolean {
  return GCODE_EXTENSIONS.has(fileExtension(path));
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

function mockGcodeForPath(path: string): string {
  return [
    '; Mock preview file',
    `; ${path}`,
    'G90',
    'G21',
    'G1 Z0.2 F600',
    'G1 X10 Y10 F3000',
    'G1 X70 Y10 E3.5 F1200',
    'G1 X70 Y70 E7.0 F1200',
    'G1 X10 Y70 E10.5 F1200',
    'G1 X10 Y10 E14.0 F1200',
    'G1 Z0.4 F600',
    'G1 X15 Y15 F3000',
    'G1 X65 Y15 E16.2 F1200',
    'G1 X65 Y65 E18.4 F1200',
    'G1 X15 Y65 E20.6 F1200',
    'G1 X15 Y15 E22.8 F1200',
  ].join('\n');
}

type Panel = 'picker' | 'printing' | 'done';

export function PrintWidget({ widgetId: _widgetId }: PrintWidgetProps) {
  const printJobView = useStore((s) => s.printJobView);
  const mockMoonrakerData = useStore((s) => s.mockMoonrakerData);
  const mockPrintScenario = useStore((s) => s.mockPrintScenario);
  const setMockPrintScenario = useStore((s) => s.setMockPrintScenario);

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
  const [gcode, setGcode] = useState<string | null>(null);
  const [gcodeLoading, setGcodeLoading] = useState(false);
  const [gcodeError, setGcodeError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<'pause' | 'resume' | 'cancel' | null>(null);
  const [localMockAssets, setLocalMockAssets] = useState<LocalMockAsset[]>([]);
  const [stlBuffer, setStlBuffer] = useState<ArrayBuffer | null>(null);
  const [stlPreviewLoading, setStlPreviewLoading] = useState(false);
  const [stlPreviewError, setStlPreviewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localMockInputRef = useRef<HTMLInputElement>(null);
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
      await ensureClientRuntimeHydrated();
      const { mockMoonrakerData: mock, mockGcodeFiles: mockList } = useStore.getState();
      if (mock) {
        const next = [...(mockList ?? [])].sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0));
        setFiles(next);
      } else {
        const res = await fetch('/api/moonraker/server/files/gcodes');
        const data = (await res.json()) as { error?: string; files?: FileEntry[] };
        if (!res.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load files');
        }
        const next = Array.isArray(data.files) ? data.files : [];
        next.sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0));
        setFiles(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles, mockMoonrakerData]);

  const displayFiles = useMemo(() => {
    const localEntries: FileEntry[] = localMockAssets.map((a) => ({
      path: a.path,
      modified: a.modified,
      size: a.size,
    }));
    return [...localEntries, ...files].sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0));
  }, [files, localMockAssets]);

  const loadMetadata = useCallback(async (file: FileEntry) => {
    setMetadataLoading(true);
    setMetadata(null);
    if (isStlPath(file.path)) {
      setMetadataLoading(false);
      return;
    }
    if (useStore.getState().mockMoonrakerData) {
      const m = mockMetadataForPath(file.path);
      setMetadata({
        estimatedTimeSec: m.estimatedTimeSec,
        filamentMm: m.filamentMm,
      });
      setMetadataLoading(false);
      return;
    }
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

  const loadGcode = useCallback(async (file: FileEntry) => {
    setGcodeLoading(true);
    setGcodeError(null);
    setGcode(null);
    if (!isGcodePath(file.path)) {
      setGcodeLoading(false);
      return;
    }
    const local = localMockAssets.find((a) => a.path === file.path && a.kind === 'gcode');
    if (local?.gcodeText != null) {
      setGcode(local.gcodeText);
      setGcodeLoading(false);
      return;
    }
    if (useStore.getState().mockMoonrakerData) {
      setGcode(mockGcodeForPath(file.path));
      setGcodeLoading(false);
      return;
    }
    try {
      const encoded = encodeURIComponent(file.path);
      const res = await fetch(`/api/moonraker/server/files/gcode?filename=${encoded}`);
      const data = (await res.json()) as {
        error?: string;
        contents?: string;
      };
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load gcode');
      }
      setGcode(typeof data.contents === 'string' ? data.contents : null);
    } catch (e) {
      setGcodeError(e instanceof Error ? e.message : String(e));
    } finally {
      setGcodeLoading(false);
    }
  }, [localMockAssets]);

  const loadStlBuffer = useCallback((file: FileEntry) => {
    setStlPreviewError(null);
    setStlPreviewLoading(true);
    setStlBuffer(null);
    if (!isStlPath(file.path)) {
      setStlPreviewLoading(false);
      return;
    }
    try {
      const local = localMockAssets.find((a) => a.path === file.path && a.kind === 'stl');
      if (local?.stlBuffer) {
        setStlBuffer(local.stlBuffer.slice(0));
        return;
      }
      if (file.path === MOCK_EMBEDDED_STL_PATH) {
        setStlBuffer(embeddedMockStlArrayBuffer());
        return;
      }
    } catch (e) {
      setStlPreviewError(e instanceof Error ? e.message : String(e));
    } finally {
      setStlPreviewLoading(false);
    }
  }, [localMockAssets]);

  const selectFile = useCallback(
    (file: FileEntry) => {
      setSelected(file);
      void loadMetadata(file);
      if (isStlPath(file.path)) {
        setGcode(null);
        setGcodeError(null);
        loadStlBuffer(file);
      } else {
        setStlBuffer(null);
        setStlPreviewError(null);
        void loadGcode(file);
      }
    },
    [loadMetadata, loadGcode, loadStlBuffer]
  );

  const startPrint = useCallback(async () => {
    if (!selected || printing) return;
    if (useStore.getState().mockMoonrakerData) {
      setModalOpen(false);
      setError(null);
      setMockPrintScenario('printing_demo');
      return;
    }
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
  }, [selected, printing, setMockPrintScenario]);

  const handleLocalMockPick = useCallback(() => {
    localMockInputRef.current?.click();
  }, []);

  const handleLocalMockChange = useCallback(async () => {
    const input = localMockInputRef.current;
    const list = input?.files;
    if (!list || list.length === 0) return;
    setError(null);
    const added: LocalMockAsset[] = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_LOCAL_PREVIEW_BYTES) {
        setError(`Skipped (too large): ${file.name}`);
        continue;
      }
      const ext = fileExtension(file.name);
      const path = `${LOCAL_FILE_PREFIX}${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`;
      const ts = Math.floor(Date.now() / 1000);
      if (STL_EXTENSIONS.has(ext)) {
        const buf = await file.arrayBuffer();
        added.push({ path, modified: ts, size: file.size, kind: 'stl', stlBuffer: buf });
      } else if (GCODE_EXTENSIONS.has(ext)) {
        const text = await file.text();
        added.push({ path, modified: ts, size: file.size, kind: 'gcode', gcodeText: text });
      }
    }
    if (added.length) {
      setLocalMockAssets((prev) => [...added, ...prev]);
    }
    if (input) input.value = '';
  }, []);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUploadChange = useCallback(async () => {
    if (useStore.getState().mockMoonrakerData) {
      setError('Mock mode: upload disabled');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
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
    if (useStore.getState().mockMoonrakerData) {
      return;
    }
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
  const selectedIsStl = selected ? isStlPath(selected.path) : false;

  const displayName = printJobView.filename ? fileBaseName(printJobView.filename) : '—';
  const layerLine =
    printJobView.currentLayer != null || printJobView.totalLayer != null
      ? `Layer ${printJobView.currentLayer ?? '—'} / ${printJobView.totalLayer ?? '—'}`
      : null;
  const isPaused = printJobView.jobState === 'paused';

  if (panel === 'printing' || panel === 'done') {
    const pct = printJobView.progressPct ?? 0;
    const stateLabel = printJobView.jobState ?? (panel === 'done' ? 'idle' : '…');
    const elapsedSec = printJobView.printDurationSec;
    const remainingSec = (() => {
      if (
        typeof printJobView.totalDurationSec === 'number' &&
        Number.isFinite(printJobView.totalDurationSec) &&
        typeof elapsedSec === 'number' &&
        Number.isFinite(elapsedSec)
      ) {
        return Math.max(0, printJobView.totalDurationSec - elapsedSec);
      }
      if (typeof elapsedSec === 'number' && Number.isFinite(elapsedSec) && pct > 0) {
        const estTotal = elapsedSec / (pct / 100);
        return Math.max(0, estTotal - elapsedSec);
      }
      return null;
    })();

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

        {mockMoonrakerData && (
          <div className="flex flex-wrap items-center gap-1 shrink-0 border border-border/60 px-2 py-1.5 bg-muted/25">
            <span className="text-[9px] font-mono uppercase text-muted-foreground">Mock job</span>
            <Button
              type="button"
              size="sm"
              variant={mockPrintScenario === 'printing_demo' ? 'default' : 'outline'}
              className="h-6 rounded-none border-2 px-2 text-[9px] font-mono uppercase"
              onClick={() => setMockPrintScenario('printing_demo')}
            >
              Printing
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mockPrintScenario === 'idle' ? 'default' : 'outline'}
              className="h-6 rounded-none border-2 px-2 text-[9px] font-mono uppercase"
              onClick={() => setMockPrintScenario('idle')}
            >
              Idle (picker)
            </Button>
          </div>
        )}

        {error && <p className="text-[11px] text-destructive font-mono shrink-0">{error}</p>}

        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto">
          <div>
            <p className="text-[10px] font-mono uppercase text-muted-foreground">File</p>
            <p className="text-sm font-semibold text-foreground truncate mt-0.5">{displayName}</p>
          </div>

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
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono uppercase text-muted-foreground">
              <div>
                <span className="block">State</span>
                <span className="block text-foreground mt-0.5">{stateLabel}</span>
              </div>
              <div>
                <span className="block">Elapsed</span>
                <span className="block text-foreground mt-0.5">
                  {formatDuration(elapsedSec)}
                </span>
              </div>
              <div>
                <span className="block">Remaining</span>
                <span className="block text-foreground mt-0.5">
                  {formatDuration(remainingSec)}
                </span>
              </div>
            </div>
            {layerLine && (
              <p className="text-[10px] font-mono uppercase text-muted-foreground">{layerLine}</p>
            )}
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
          {mockMoonrakerData && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 rounded-none border-2 text-[10px] font-mono uppercase"
              onClick={handleLocalMockPick}
            >
              Load local
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".gcode,.gco,.gc,.stl"
            multiple
            onChange={() => void handleUploadChange()}
          />
          <input
            ref={localMockInputRef}
            type="file"
            className="hidden"
            accept=".gcode,.gco,.gc,.stl"
            multiple
            onChange={() => void handleLocalMockChange()}
          />
        </div>
      </div>

      {mockMoonrakerData && (
        <div className="flex flex-wrap items-center gap-1 border border-border/60 px-2 py-1.5 bg-muted/25 shrink-0">
          <span className="text-[9px] font-mono uppercase text-muted-foreground">Mock job</span>
          <Button
            type="button"
            size="sm"
            variant={mockPrintScenario === 'printing_demo' ? 'default' : 'outline'}
            className="h-6 rounded-none border-2 px-2 text-[9px] font-mono uppercase"
            onClick={() => setMockPrintScenario('printing_demo')}
          >
            Printing
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mockPrintScenario === 'idle' ? 'default' : 'outline'}
            className="h-6 rounded-none border-2 px-2 text-[9px] font-mono uppercase"
            onClick={() => setMockPrintScenario('idle')}
          >
            Idle (picker)
          </Button>
        </div>
      )}

      {error && <p className="text-[11px] text-destructive font-mono">{error}</p>}

      <div className="flex-1 min-h-0 flex flex-col gap-2">
        {selectedIsStl ? (
          <StlPreviewPanel
            buffer={stlBuffer}
            loading={stlPreviewLoading}
            error={stlPreviewError}
            fileName={selected ? fileBaseName(selected.path) : null}
          />
        ) : (
          <GcodePreviewPanel
            gcode={gcode}
            loading={gcodeLoading}
            error={gcodeError}
            fileName={selected ? fileBaseName(selected.path) : null}
          />
        )}

        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
          <div className="border border-border p-2">
            <p className="text-muted-foreground uppercase">Selected</p>
            <p className="text-foreground mt-1 truncate">
              {selected ? fileBaseName(selected.path) : 'None'}
            </p>
          </div>
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

        <div className={selectedIsStl ? 'w-full flex flex-col items-end gap-1' : 'flex justify-end'}>
          {selectedIsStl ? (
            <>
              <PrusaSlicerOpenMacroButton disabled={!selected || printing} busy={printing} />
              {selected?.path.startsWith(LOCAL_FILE_PREFIX) && (
                <p className="text-[9px] font-mono text-muted-foreground text-right max-w-md">
                  Local file: open in PrusaSlicer with File → Open (browser does not expose a disk path).
                </p>
              )}
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              className="rounded-none border-2 text-[10px] font-mono uppercase"
              disabled={!selected || printing}
              onClick={() => setModalOpen(true)}
            >
              {printing ? 'Starting...' : 'Start selected'}
            </Button>
          )}
        </div>

        <div className="flex-1 min-h-[120px] overflow-y-auto border-2 border-border/60 bg-black/30">
          {loading ? (
            <div className="p-3 text-xs text-muted-foreground font-mono">Loading files...</div>
          ) : displayFiles.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground font-mono">No files in gcodes.</div>
          ) : (
            <ul className="divide-y divide-border/50">
              {displayFiles.map((file) => {
                const isSelected = selected?.path === file.path;
                const ext = fileExtension(file.path);
                return (
                  <li key={file.path}>
                    <button
                      type="button"
                      className={`w-full text-left p-2.5 transition-colors ${
                        isSelected ? 'bg-primary/20 border-l-2 border-primary' : 'hover:bg-primary/10'
                      }`}
                      onClick={() => selectFile(file)}
                    >
                      <p className="text-xs font-semibold text-foreground truncate">{fileBaseName(file.path)}</p>
                      <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span>{`${formatBytes(file.size)}${ext ? ` • ${ext.slice(1).toUpperCase()}` : ''}`}</span>
                        <span>
                          {file.modified
                            ? new Date(file.modified * 1000).toLocaleString()
                            : 'unknown date'}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
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
