import { MOCK_GCODES_FILES } from '@/lib/dev/mock-gcode-files';
import { useStore } from '@/lib/store';

let hydratePromise: Promise<void> | null = null;

function parseRuntimeConfigJson(text: string): {
  developerMode: boolean;
  mockMoonrakerData: boolean;
} {
  try {
    const data = (text.trim() ? JSON.parse(text) : {}) as {
      config?: { developerMode?: boolean; mockMoonrakerData?: boolean };
    };
    return {
      developerMode: Boolean(data.config?.developerMode),
      mockMoonrakerData: Boolean(data.config?.mockMoonrakerData),
    };
  } catch {
    return { developerMode: false, mockMoonrakerData: false };
  }
}

/**
 * Loads `/api/runtime-config` once and syncs Zustand so child widgets do not
 * call Moonraker before the dashboard parent effect runs (React runs child
 * effects before parent effects).
 */
export function ensureClientRuntimeHydrated(): Promise<void> {
  if (!hydratePromise) {
    hydratePromise = (async () => {
      try {
        const res = await fetch('/api/runtime-config');
        const text = await res.text();
        const { developerMode, mockMoonrakerData } = parseRuntimeConfigJson(text);
        const s = useStore.getState();
        s.setDeveloperMode(developerMode);
        s.setMockMoonrakerData(mockMoonrakerData);
        if (mockMoonrakerData) {
          s.setMockGcodeFiles(MOCK_GCODES_FILES);
        } else {
          s.setMockGcodeFiles(null);
        }
      } catch {
        // keep store defaults
      }
    })();
  }
  return hydratePromise;
}
