import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface RuntimeConfig {
  moonrakerWsUrl: string;
  moonrakerUrl: string;
  openaiApiToken: string;
}

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  moonrakerWsUrl: '',
  moonrakerUrl: '',
  openaiApiToken: '',
};

const DATA_DIR = path.join(process.cwd(), 'data');
const RUNTIME_CONFIG_FILE = path.join(DATA_DIR, 'runtime-config.json');

function normalizeWsInput(v: string): string {
  const trimmed = v.trim();
  if (!trimmed) return '';
  if (/^wss?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^http/i, 'ws').replace(/\/$/, '');
  }
  return `ws://${trimmed.replace(/\/$/, '')}`;
}

function wsToHttp(ws: string): string {
  return ws
    .replace(/^ws:\/\//i, 'http://')
    .replace(/^wss:\/\//i, 'https://')
    .replace(/\/$/, '');
}

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function readRuntimeConfig(): Promise<RuntimeConfig> {
  await ensureDataDir();
  try {
    const raw = await readFile(RUNTIME_CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<RuntimeConfig>;
    return {
      ...DEFAULT_RUNTIME_CONFIG,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_RUNTIME_CONFIG };
  }
}

export async function writeRuntimeConfig(
  partial: Partial<RuntimeConfig>
): Promise<RuntimeConfig> {
  const current = await readRuntimeConfig();
  const next: RuntimeConfig = {
    ...current,
    ...partial,
  };

  if (partial.moonrakerWsUrl !== undefined) {
    const normalizedWs = normalizeWsInput(partial.moonrakerWsUrl);
    next.moonrakerWsUrl = normalizedWs;
    next.moonrakerUrl = normalizedWs ? wsToHttp(normalizedWs) : '';
  }

  await ensureDataDir();
  await writeFile(RUNTIME_CONFIG_FILE, JSON.stringify(next, null, 2), 'utf8');
  return next;
}
