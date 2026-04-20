import { create } from 'zustand';

export interface Widget {
  id: string;
  type: 'temperature' | 'macro' | 'mesh' | 'status' | 'console' | 'motion' | 'files';
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, unknown>;
}

interface WidgetStore {
  widgets: Widget[];
  isEditMode: boolean;
  selectedWidget: string | null;
  tempHead: number | null;
  tempBed: number | null;
  targetTempHead: number | null;
  targetTempBed: number | null;
  motionX: number | null;
  motionY: number | null;
  motionZ: number | null;
  motionMinX: number | null;
  motionMinY: number | null;
  motionMinZ: number | null;
  motionMaxX: number | null;
  motionMaxY: number | null;
  motionMaxZ: number | null;
  tempHistory: { timestamp: number; head: number; bed: number }[];
  openaiApiToken: string;
  moonrakerWsUrl: string;

  // Widget actions
  addWidget: (widget: Widget) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  setEditMode: (enabled: boolean) => void;

  // Temperature actions
  setTemperatures: (
    head: number | null,
    bed: number | null,
    targetHead: number | null,
    targetBed: number | null
  ) => void;
  setMotionState: (
    x: number | null,
    y: number | null,
    z: number | null,
    minX: number | null,
    minY: number | null,
    minZ: number | null,
    maxX: number | null,
    maxY: number | null,
    maxZ: number | null
  ) => void;
  addTempHistory: (entry: { timestamp: number; head: number; bed: number }) => void;

  // Settings
  setOpenaiToken: (token: string) => void;
  setMoonrakerWsUrl: (url: string) => void;
}

export const useStore = create<WidgetStore>((set) => ({
  widgets: [
    {
      id: 'temp-1',
      type: 'temperature',
      x: 0,
      y: 0,
      w: 3,
      h: 6,
      config: { showGraph: true },
    },
    {
      id: 'macro-1',
      type: 'macro',
      x: 4,
      y: 0,
      w: 3,
      h: 1,
      config: {
        klipperMacroName: 'HOME_XY',
        buttonLabel: 'Home',
        icon: 'home',
        sizeVariant: '3x1',
        color: '#06b6d4',
      },
    },
    {
      id: 'console-1',
      type: 'console',
      x: 0,
      y: 5,
      w: 8,
      h: 4,
      config: {},
    },
    {
      id: 'motion-1',
      type: 'motion',
      x: 8,
      y: 2,
      w: 4,
      h: 3,
      config: {},
    },
    {
      id: 'mesh-1',
      type: 'mesh',
      x: 8,
      y: 5,
      w: 4,
      h: 4,
      config: {},
    },
    {
      id: 'files-1',
      type: 'files',
      x: 0,
      y: 9,
      w: 6,
      h: 4,
      config: {},
    },
  ],
  isEditMode: false,
  selectedWidget: null,
  tempHead: null,
  tempBed: null,
  targetTempHead: null,
  targetTempBed: null,
  motionX: null,
  motionY: null,
  motionZ: null,
  motionMinX: null,
  motionMinY: null,
  motionMinZ: null,
  motionMaxX: null,
  motionMaxY: null,
  motionMaxZ: null,
  tempHistory: [],
  openaiApiToken: '',
  moonrakerWsUrl: '',

  addWidget: (widget) =>
    set((state) => ({
      widgets: [...state.widgets, widget],
    })),

  removeWidget: (id) =>
    set((state) => ({
      widgets: state.widgets.filter((w) => w.id !== id),
    })),

  updateWidget: (id, updates) =>
    set((state) => ({
      widgets: state.widgets.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      ),
    })),

  setEditMode: (enabled) =>
    set(() => ({
      isEditMode: enabled,
    })),

  setTemperatures: (head, bed, targetHead, targetBed) =>
    set(() => ({
      tempHead: head,
      tempBed: bed,
      targetTempHead: targetHead,
      targetTempBed: targetBed,
    })),

  setMotionState: (x, y, z, minX, minY, minZ, maxX, maxY, maxZ) =>
    set(() => ({
      motionX: x,
      motionY: y,
      motionZ: z,
      motionMinX: minX,
      motionMinY: minY,
      motionMinZ: minZ,
      motionMaxX: maxX,
      motionMaxY: maxY,
      motionMaxZ: maxZ,
    })),

  addTempHistory: (entry) =>
    set((state) => {
      const windowMs = 15 * 60 * 1000;
      const cutoff = Date.now() - windowMs;
      const kept = state.tempHistory.filter((e) => e.timestamp >= cutoff);
      const next = [...kept, entry];
      return { tempHistory: next.slice(-1000) };
    }),

  setOpenaiToken: (token) =>
    set(() => ({
      openaiApiToken: token,
    })),

  setMoonrakerWsUrl: (url) =>
    set(() => ({
      moonrakerWsUrl: url,
    })),
}));
