import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface TempPreset {
  id: string;
  name: string;
  hotend: number;
  bed: number;
}

export interface RuntimeConfig {
  moonrakerWsUrl: string;
  moonrakerUrl: string;
  openaiApiToken: string;
  tempPresets: TempPreset[];
  /** Enables extra settings in UI (e.g. mock data). */
  developerMode: boolean;
  /** Feed dashboard from in-repo mock instead of Moonraker WS. */
  mockMoonrakerData: boolean;
}

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  moonrakerWsUrl: '',
  moonrakerUrl: '',
  openaiApiToken: '',
  tempPresets: [],
  developerMode: false,
  mockMoonrakerData: false,
};

const DATA_DIR = path.join(process.cwd(), 'data');
const RUNTIME_CONFIG_FILE = path.join(DATA_DIR, 'runtime-config.json');

function envBool(name: string): boolean | null {
  const v = process.env[name];
  if (v === undefined) return null;
  const normalized = v.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
}

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
    const tempPresets = Array.isArray(parsed.tempPresets)
      ? (parsed.tempPresets as TempPreset[]).filter(
          (p) =>
            p &&
            typeof p.id === 'string' &&
            typeof p.name === 'string' &&
            typeof p.hotend === 'number' &&
            typeof p.bed === 'number'
        )
      : DEFAULT_RUNTIME_CONFIG.tempPresets;
    const envDeveloperMode = envBool('KLIPDECK_DEVELOPER_MODE');
    const envMockData = envBool('KLIPDECK_MOCK_MOONRAKER_DATA');
    const developerMode = envDeveloperMode ?? false;
    const mockMoonrakerData = (envMockData ?? false) && developerMode;
    return {
      ...DEFAULT_RUNTIME_CONFIG,
      ...parsed,
      tempPresets,
      developerMode,
      mockMoonrakerData,
    };
  } catch {
    const envDeveloperMode = envBool('KLIPDECK_DEVELOPER_MODE');
    const envMockData = envBool('KLIPDECK_MOCK_MOONRAKER_DATA');
    const developerMode = envDeveloperMode ?? DEFAULT_RUNTIME_CONFIG.developerMode;
    const mockMoonrakerData = (envMockData ?? DEFAULT_RUNTIME_CONFIG.mockMoonrakerData) && developerMode;
    return {
      ...DEFAULT_RUNTIME_CONFIG,
      developerMode,
      mockMoonrakerData,
    };
  }
}

export async function writeRuntimeConfig(
  partial: Partial<RuntimeConfig>
): Promise<RuntimeConfig> {
  const current = await readRuntimeConfig();
  const envDeveloperMode = envBool('KLIPDECK_DEVELOPER_MODE');
  const envMockData = envBool('KLIPDECK_MOCK_MOONRAKER_DATA');

  const baseDeveloperMode = envDeveloperMode ?? false;
  const baseMockMoonrakerData = envMockData ?? false;

  const next: RuntimeConfig = {
    ...current,
    ...partial,
    tempPresets: partial.tempPresets !== undefined ? partial.tempPresets : current.tempPresets,
    developerMode: baseDeveloperMode,
    mockMoonrakerData:
      (envMockData ?? baseMockMoonrakerData) && baseDeveloperMode,
  };

  if (partial.moonrakerWsUrl !== undefined) {
    const normalizedWs = normalizeWsInput(partial.moonrakerWsUrl);
    next.moonrakerWsUrl = normalizedWs;
    next.moonrakerUrl = normalizedWs ? wsToHttp(normalizedWs) : '';
  }

  next.mockMoonrakerData = next.mockMoonrakerData && next.developerMode;

  await ensureDataDir();
  await writeFile(RUNTIME_CONFIG_FILE, JSON.stringify(next, null, 2), 'utf8');
  return next;
}
