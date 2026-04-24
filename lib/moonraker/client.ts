import type { MoonrakerOk, MoonrakerPrinterInfo, PrinterObjectsQueryResult } from './types';
import { readRuntimeConfig } from '@/lib/runtime-config';

export class MoonrakerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoonrakerConfigError';
  }
}

export class MoonrakerRpcError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = 'MoonrakerRpcError';
    this.code = code;
  }
}

export class MoonrakerHttpError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown) {
    super(`Moonraker HTTP ${status}`);
    this.name = 'MoonrakerHttpError';
    this.status = status;
    this.body = body;
  }
}

async function getBaseUrl(): Promise<string> {
  const cfg = await readRuntimeConfig();
  const base = cfg.moonrakerUrl;
  if (!base?.trim()) {
    throw new MoonrakerConfigError('Moonraker URL is not configured in runtime settings');
  }
  return base.replace(/\/$/, '');
}

async function defaultHeaders(init?: RequestInit): Promise<Headers> {
  const h = new Headers(init?.headers);
  const method = (init?.method ?? 'GET').toUpperCase();
  const hasBody = init?.body != null && method !== 'GET' && method !== 'HEAD';
  if (hasBody && !h.has('Content-Type')) {
    h.set('Content-Type', 'application/json');
  }
  return h;
}

/**
 * Server-side fetch to Moonraker. Unwraps `{ result }` and throws on RPC/HTTP errors.
 */
export async function moonrakerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${await getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { ...init, headers: await defaultHeaders(init) });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new MoonrakerHttpError(res.status, { raw: text });
  }

  if (!res.ok) {
    throw new MoonrakerHttpError(res.status, data);
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const err = data as { error?: { code: number; message: string } };
    if (err.error?.message != null) {
      throw new MoonrakerRpcError(err.error.code ?? -1, err.error.message);
    }
  }

  if (data && typeof data === 'object' && 'result' in data) {
    return (data as MoonrakerOk<T>).result as T;
  }

  return data as T;
}

export async function moonrakerPrinterInfo(): Promise<MoonrakerPrinterInfo> {
  return moonrakerFetch<MoonrakerPrinterInfo>('/printer/info', { method: 'GET' });
}

export async function moonrakerFirmwareRestart(): Promise<void> {
  await moonrakerFetch<unknown>('/printer/firmware_restart', {
    method: 'POST',
    body: '{}',
  });
}

export async function moonrakerObjectsQuery(
  objects: Record<string, string[] | null>
): Promise<PrinterObjectsQueryResult> {
  return moonrakerFetch<PrinterObjectsQueryResult>('/printer/objects/query', {
    method: 'POST',
    body: JSON.stringify({ objects }),
  });
}

export async function moonrakerGcodeScript(script: string): Promise<string> {
  return moonrakerFetch<string>('/printer/gcode/script', {
    method: 'POST',
    body: JSON.stringify({ script }),
  });
}

export async function moonrakerReadConfigFile(path = 'printer.cfg'): Promise<string> {
  const cleanPath = path.replace(/^\/+/, '');
  const url = `${await getBaseUrl()}/server/files/config/${cleanPath}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: new Headers(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new MoonrakerHttpError(res.status, { raw: text });
  }
  return text;
}

export async function moonrakerWriteConfigFile(
  path: string,
  contents: string
): Promise<{ item?: unknown }> {
  const cleanPath = path.replace(/^\/+/, '');
  const fileName = cleanPath.split('/').pop() || 'printer.cfg';
  const form = new FormData();
  form.append('root', 'config');
  form.append('path', cleanPath);
  form.append('print', 'false');
  form.append(
    'file',
    new Blob([contents], { type: 'text/plain; charset=utf-8' }),
    fileName
  );

  const res = await fetch(`${await getBaseUrl()}/server/files/upload`, {
    method: 'POST',
    headers: new Headers(),
    body: form,
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new MoonrakerHttpError(res.status, data);
  }
  if (data && typeof data === 'object' && 'error' in data) {
    const err = data as { error?: { code: number; message: string } };
    if (err.error?.message != null) {
      throw new MoonrakerRpcError(err.error.code ?? -1, err.error.message);
    }
  }
  if (data && typeof data === 'object' && 'result' in data) {
    return (data as MoonrakerOk<{ item?: unknown }>).result;
  }
  return { item: data };
}

export interface MoonrakerGcodeFile {
  path: string;
  modified: number | null;
  size: number | null;
}

const ALLOWED_LIBRARY_EXTENSIONS = new Set(['.gcode', '.gco', '.gc', '.stl']);

function asObject(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
}

function extensionFromPath(path: string): string {
  const lastSegment = path.split('/').pop() ?? path;
  const idx = lastSegment.lastIndexOf('.');
  if (idx < 0) return '';
  return lastSegment.slice(idx).toLowerCase();
}

function isSupportedLibraryFile(path: string): boolean {
  return ALLOWED_LIBRARY_EXTENSIONS.has(extensionFromPath(path));
}

export async function moonrakerListGcodeFiles(): Promise<MoonrakerGcodeFile[]> {
  const result = await moonrakerFetch<unknown>('/server/files/list?root=gcodes', {
    method: 'GET',
  });
  if (!Array.isArray(result)) return [];
  return result
    .map((entry) => {
      const obj = asObject(entry);
      const path = typeof obj.path === 'string' ? obj.path : '';
      const modified = typeof obj.modified === 'number' ? obj.modified : null;
      const size = typeof obj.size === 'number' ? obj.size : null;
      return { path, modified, size };
    })
    .filter((f) => f.path.length > 0 && isSupportedLibraryFile(f.path));
}

export interface MoonrakerFileMetadata {
  estimatedTimeSec: number | null;
  filamentMm: number | null;
}

export async function moonrakerGetFileMetadata(filename: string): Promise<MoonrakerFileMetadata> {
  const encoded = encodeURIComponent(filename);
  const result = await moonrakerFetch<unknown>(`/server/files/metadata?filename=${encoded}`, {
    method: 'GET',
  });
  const obj = asObject(result);
  return {
    estimatedTimeSec:
      typeof obj.estimated_time === 'number' ? obj.estimated_time : null,
    filamentMm:
      typeof obj.filament_total === 'number' ? obj.filament_total : null,
  };
}

export async function moonrakerReadGcodeFile(filename: string): Promise<string> {
  const cleanPath = filename.replace(/^\/+/, '');
  const encodedPath = cleanPath
    .split('/')
    .filter((part) => part.length > 0)
    .map((part) => encodeURIComponent(part))
    .join('/');
  const url = `${await getBaseUrl()}/server/files/gcodes/${encodedPath}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: new Headers(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new MoonrakerHttpError(res.status, { raw: text });
  }
  return text;
}

export async function moonrakerStartPrint(filename: string): Promise<void> {
  await moonrakerFetch<unknown>('/printer/print/start', {
    method: 'POST',
    body: JSON.stringify({ filename }),
  });
}

export async function moonrakerPrintPause(): Promise<void> {
  await moonrakerFetch<unknown>('/printer/print/pause', {
    method: 'POST',
    body: '{}',
  });
}

export async function moonrakerPrintResume(): Promise<void> {
  await moonrakerFetch<unknown>('/printer/print/resume', {
    method: 'POST',
    body: '{}',
  });
}

export async function moonrakerPrintCancel(): Promise<void> {
  await moonrakerFetch<unknown>('/printer/print/cancel', {
    method: 'POST',
    body: '{}',
  });
}

export async function moonrakerEmergencyStop(): Promise<void> {
  await moonrakerFetch<unknown>('/printer/emergency_stop', {
    method: 'POST',
    body: '{}',
  });
}

export async function moonrakerUploadGcodeFile(file: File): Promise<void> {
  if (!isSupportedLibraryFile(file.name)) {
    throw new MoonrakerConfigError('Unsupported file type. Allowed: .gcode, .gco, .gc, .stl');
  }
  const form = new FormData();
  form.append('root', 'gcodes');
  form.append('print', 'false');
  form.append('file', file, file.name);
  const res = await fetch(`${await getBaseUrl()}/server/files/upload`, {
    method: 'POST',
    headers: new Headers(),
    body: form,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new MoonrakerHttpError(res.status, data);
  }
  if (data && typeof data === 'object' && 'error' in data) {
    const err = data as { error?: { code: number; message: string } };
    if (err.error?.message != null) {
      throw new MoonrakerRpcError(err.error.code ?? -1, err.error.message);
    }
  }
}
