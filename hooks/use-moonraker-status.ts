'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { JsonRpcRequest, JsonRpcResponse, PrinterObjectsQueryResult } from '@/lib/moonraker/types';
import { mergePrinterStatus, motionFromStatus, tempsFromStatus } from '@/lib/moonraker/merge-status';
import type { PrinterObjectsStatus } from '@/lib/moonraker/types';
import { getMockPrinterObjectsStatus } from '@/lib/dev/mock-printer-objects-status';
import type { MockPrintScenario } from '@/lib/store';

/** Moonraker `printer.objects.subscribe`: `null` = all fields for that object. */
const MOONRAKER_SUBSCRIBE_OBJECTS: Record<string, string[] | null> = {
  extruder: ['temperature', 'target'],
  heater_bed: ['temperature', 'target'],
  toolhead: ['position', 'axis_minimum', 'axis_maximum'],
  gcode_move: ['gcode_position'],
  print_stats: null,
  virtual_sdcard: null,
  display_status: null,
  bed_mesh: ['mesh_matrix', 'mesh_min', 'mesh_max', 'profile_name', 'probed_matrix', 'profiles'],
};

function wsUrlFromPublicBase(overrideBase?: string | null): string | null {
  const base = overrideBase?.trim();
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/websocket`;
}

export type MoonrakerConnectionState =
  | 'idle'
  | 'missing_env'
  | 'connecting'
  | 'live'
  | 'mock'
  | 'error';

export interface UseMoonrakerStatusResult {
  connectionState: MoonrakerConnectionState;
  error: string | null;
  lastPrinterState: string | null;
}

/**
 * WebSocket JSON-RPC: identify → printer.objects.subscribe → notify_status_update.
 * Updates Zustand temperatures via callbacks. Optional `mockMoonrakerData` skips WS and applies in-repo mock.
 */
export function useMoonrakerStatus(
  onTemps: (
    head: number | null,
    bed: number | null,
    targetHead: number | null,
    targetBed: number | null
  ) => void,
  onTempSample: (entry: { timestamp: number; head: number; bed: number }) => void,
  onMotion: (
    x: number | null,
    y: number | null,
    z: number | null,
    minX: number | null,
    minY: number | null,
    minZ: number | null,
    maxX: number | null,
    maxY: number | null,
    maxZ: number | null
  ) => void,
  onPrinterState?: (state: string) => void,
  onPrinterObjectsStatus?: (status: PrinterObjectsStatus) => void,
  wsBaseOverride?: string | null,
  mockMoonrakerData = false,
  mockPrintScenario: MockPrintScenario = 'printing_demo'
): UseMoonrakerStatusResult {
  const [connectionState, setConnectionState] = useState<MoonrakerConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastPrinterState, setLastPrinterState] = useState<string | null>(null);

  const statusRef = useRef<PrinterObjectsStatus>({});
  const rpcIdRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const identifyIdRef = useRef<number | null>(null);
  const subscribeIdRef = useRef<number | null>(null);
  const onTempsRef = useRef(onTemps);
  const onTempSampleRef = useRef(onTempSample);
  const onMotionRef = useRef(onMotion);
  const onPrinterStateRef = useRef(onPrinterState);
  const onPrinterObjectsStatusRef = useRef(onPrinterObjectsStatus);
  /** At most one chart sample per second so 15 min window stays bounded. */
  const lastTempSampleAtRef = useRef(0);

  onTempsRef.current = onTemps;
  onTempSampleRef.current = onTempSample;
  onMotionRef.current = onMotion;
  onPrinterStateRef.current = onPrinterState;
  onPrinterObjectsStatusRef.current = onPrinterObjectsStatus;

  const applyStatus = useCallback((status: PrinterObjectsStatus) => {
    statusRef.current = status;
    const t = tempsFromStatus(status);
    onTempsRef.current(t.head, t.bed, t.targetHead, t.targetBed);
    const m = motionFromStatus(status);
    onMotionRef.current(m.x, m.y, m.z, m.minX, m.minY, m.minZ, m.maxX, m.maxY, m.maxZ);
    const ts = Date.now();
    if (t.head !== null && t.bed !== null) {
      if (ts - lastTempSampleAtRef.current >= 1000) {
        lastTempSampleAtRef.current = ts;
        onTempSampleRef.current({ timestamp: ts, head: t.head, bed: t.bed });
      }
    }
    onPrinterObjectsStatusRef.current?.(status);
  }, []);

  const nextId = () => {
    rpcIdRef.current += 1;
    return rpcIdRef.current;
  };

  useEffect(() => {
    if (mockMoonrakerData) {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // no-op
        }
        wsRef.current = null;
      }
      const mock = getMockPrinterObjectsStatus(mockPrintScenario);
      statusRef.current = mock;
      applyStatus(mock);
      const base = Date.now() - 14 * 60 * 1000;
      for (let i = 0; i < 15; i++) {
        const t = 208 + Math.sin(i * 0.4) * 6;
        const b = 58 + Math.cos(i * 0.3) * 2;
        onTempSampleRef.current({ timestamp: base + i * 60 * 1000, head: t, bed: b });
      }
      onPrinterStateRef.current?.('ready');
      setLastPrinterState('ready');
      setConnectionState('mock');
      setError(null);

      let tick: ReturnType<typeof setInterval> | undefined;
      if (mockPrintScenario === 'printing_demo') {
        let phase =
          typeof mock.virtual_sdcard?.progress === 'number' && Number.isFinite(mock.virtual_sdcard.progress)
            ? mock.virtual_sdcard.progress
            : 0.47;
        const totalLayers = 248;
        tick = setInterval(() => {
          phase += 0.014;
          if (phase > 0.985) phase = 0.05;
          const currentLayer = Math.min(totalLayers, Math.max(1, Math.floor(phase * totalLayers)));
          const dur = Math.floor(phase * 4500);
          const patch: Record<string, unknown> = {
            virtual_sdcard: {
              progress: phase,
              is_active: true,
              file_path: 'benchy_coarse.gcode',
            },
            display_status: {
              progress: phase,
              message: `Layer ${currentLayer}/${totalLayers}`,
            },
            print_stats: {
              state: 'printing',
              filename: 'benchy_coarse.gcode',
              print_duration: dur,
              total_duration: dur + 140,
              info: { current_layer: currentLayer, total_layer: totalLayers },
            },
          };
          statusRef.current = mergePrinterStatus(statusRef.current, patch);
          applyStatus(statusRef.current);
        }, 950);
      }

      return () => {
        if (tick) clearInterval(tick);
      };
    }

    const url = wsUrlFromPublicBase(wsBaseOverride);
    if (!url) {
      setConnectionState('missing_env');
      setError('Moonraker WS URL is not configured');
      return;
    }

    setConnectionState('connecting');
    setError(null);

    let stopped = false;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    const send = (req: JsonRpcRequest) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(req));
      }
    };

    ws.onopen = () => {
      if (stopped) return;
      const iid = nextId();
      identifyIdRef.current = iid;
      send({
        jsonrpc: '2.0',
        method: 'server.connection.identify',
        params: {
          client_name: 'K studio',
          version: '0.1.0',
          type: 'web',
          url: 'https://github.com/kstudio',
        },
        id: iid,
      });
    };

    ws.onerror = () => {
      if (stopped) return;
      setConnectionState('error');
      setError('WebSocket error');
    };

    ws.onclose = (ev) => {
      if (stopped) return;
      setConnectionState('error');
      setError(
        ev.reason
          ? `WebSocket closed: ${ev.reason}`
          : `WebSocket closed (code ${ev.code})`
      );
    };

    ws.onmessage = (ev) => {
      if (stopped) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(ev.data as string);
      } catch {
        setConnectionState('error');
        setError('Invalid JSON from Moonraker');
        return;
      }

      const msg = parsed as Record<string, unknown>;
      if (msg.method === 'notify_status_update' && Array.isArray(msg.params)) {
        const patch = msg.params[0] as Record<string, unknown> | undefined;
        if (patch && typeof patch === 'object') {
          statusRef.current = mergePrinterStatus(statusRef.current, patch);
          applyStatus(statusRef.current);
        }
        return;
      }

      const id = msg.id as number | undefined;
      if (id === undefined) return;

      const resp = msg as JsonRpcResponse;
      if ('error' in resp && resp.error) {
        setConnectionState('error');
        setError(resp.error.message);
        return;
      }

      if (!('result' in resp) || resp.result === undefined) return;

      if (id === identifyIdRef.current) {
        const sid = nextId();
        subscribeIdRef.current = sid;
        send({
          jsonrpc: '2.0',
          method: 'printer.objects.subscribe',
          params: {
            objects: MOONRAKER_SUBSCRIBE_OBJECTS,
          },
          id: sid,
        });
        return;
      }

      if (id === subscribeIdRef.current) {
        const result = resp.result as PrinterObjectsQueryResult;
        if (result?.status && typeof result.status === 'object') {
          statusRef.current = mergePrinterStatus({}, result.status as Record<string, unknown>);
          applyStatus(statusRef.current);
        }
        setConnectionState('live');
        return;
      }
    };

    return () => {
      stopped = true;
      ws.close();
      wsRef.current = null;
    };
  }, [applyStatus, wsBaseOverride, mockMoonrakerData, mockPrintScenario]);

  useEffect(() => {
    if (mockMoonrakerData) {
      return;
    }
    const wsBase = wsUrlFromPublicBase(wsBaseOverride);
    if (!wsBase || connectionState === 'missing_env' || connectionState === 'error') {
      return;
    }

    let cancelled = false;
    const loadInfo = async () => {
      try {
        const res = await fetch('/api/moonraker/printer/info');
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok && data?.error) {
          setLastPrinterState(null);
          return;
        }
        const state = typeof data?.state === 'string' ? data.state : null;
        setLastPrinterState(state);
        if (state && onPrinterStateRef.current) {
          onPrinterStateRef.current(state);
        }
      } catch {
        if (!cancelled) setLastPrinterState(null);
      }
    };

    loadInfo();
    const t = setInterval(loadInfo, 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [connectionState, wsBaseOverride, mockMoonrakerData]);

  return { connectionState, error, lastPrinterState };
}
