'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { mockMetadataForPath } from '@/lib/dev/mock-gcode-files';
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

interface FilesWidgetProps {
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
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function filamentGramsFromMm(filamentMm: number | null): number | null {
  if (filamentMm == null || !Number.isFinite(filamentMm) || filamentMm <= 0) return null;
  const radiusMm = 1.75 / 2;
  const areaMm2 = Math.PI * radiusMm * radiusMm;
  const densityGPerMm3 = 0.00124;
  return areaMm2 * filamentMm * densityGPerMm3;
}

function formatFilament(filamentMm: number | null): string {
  if (filamentMm == null || !Number.isFinite(filamentMm) || filamentMm <= 0) return 'N/A';
  const meters = filamentMm / 1000;
  const grams = filamentGramsFromMm(filamentMm);
  if (grams == null) return `${meters.toFixed(1)} m`;
  return `${meters.toFixed(1)} m (~${grams.toFixed(1)} g)`;
}

export function FilesWidget({ widgetId: _widgetId }: FilesWidgetProps) {
  const mockMoonrakerData = useStore((s) => s.mockMoonrakerData);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [selected, setSelected] = useState<FileEntry | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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

  const openConfirm = useCallback(async (file: FileEntry) => {
    setSelected(file);
    setModalOpen(true);
    setMetadataLoading(true);
    setMetadata(null);
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

  const startPrint = useCallback(async () => {
    if (!selected || printing) return;
    if (useStore.getState().mockMoonrakerData) {
      setModalOpen(false);
      setError(null);
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

  const selectedMeta = useMemo(() => {
    return {
      eta: formatDuration(metadata?.estimatedTimeSec ?? null),
      filament: formatFilament(metadata?.filamentMm ?? null),
    };
  }, [metadata]);

  return (
    <div className="h-full w-full p-3 flex flex-col gap-2 overflow-hidden min-h-0">
      <div className="flex items-center justify-between border-b-2 border-border pb-2">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Print files</h3>
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
