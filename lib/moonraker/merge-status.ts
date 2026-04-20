import type { PrinterObjectsStatus } from './types';

/** Moonraker sends partial nested patches; merge into accumulated status. */
export function mergePrinterStatus(
  prev: PrinterObjectsStatus,
  patch: Record<string, unknown>
): PrinterObjectsStatus {
  const out: PrinterObjectsStatus = { ...prev };
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    const ov = prev[key];
    if (
      pv !== null &&
      typeof pv === 'object' &&
      !Array.isArray(pv) &&
      ov !== null &&
      typeof ov === 'object' &&
      !Array.isArray(ov)
    ) {
      (out as Record<string, unknown>)[key] = mergePrinterStatus(
        ov as PrinterObjectsStatus,
        pv as Record<string, unknown>
      );
    } else {
      (out as Record<string, unknown>)[key] = pv;
    }
  }
  return out;
}

export function tempsFromStatus(status: PrinterObjectsStatus): {
  head: number | null;
  bed: number | null;
  targetHead: number | null;
  targetBed: number | null;
} {
  const ex = status.extruder;
  const bed = status.heater_bed;
  return {
    head: typeof ex?.temperature === 'number' ? ex.temperature : null,
    bed: typeof bed?.temperature === 'number' ? bed.temperature : null,
    targetHead: typeof ex?.target === 'number' ? ex.target : null,
    targetBed: typeof bed?.target === 'number' ? bed.target : null,
  };
}

export function motionFromStatus(status: PrinterObjectsStatus): {
  x: number | null;
  y: number | null;
  z: number | null;
  minX: number | null;
  minY: number | null;
  minZ: number | null;
  maxX: number | null;
  maxY: number | null;
  maxZ: number | null;
} {
  const toolhead = status.toolhead;
  const gcodeMove = status.gcode_move;
  const pos = Array.isArray(gcodeMove?.gcode_position)
    ? gcodeMove.gcode_position
    : toolhead?.position;
  const min = toolhead?.axis_minimum;
  const max = toolhead?.axis_maximum;
  return {
    x: typeof pos?.[0] === 'number' ? pos[0] : null,
    y: typeof pos?.[1] === 'number' ? pos[1] : null,
    z: typeof pos?.[2] === 'number' ? pos[2] : null,
    minX: typeof min?.[0] === 'number' ? min[0] : null,
    minY: typeof min?.[1] === 'number' ? min[1] : null,
    minZ: typeof min?.[2] === 'number' ? min[2] : null,
    maxX: typeof max?.[0] === 'number' ? max[0] : null,
    maxY: typeof max?.[1] === 'number' ? max[1] : null,
    maxZ: typeof max?.[2] === 'number' ? max[2] : null,
  };
}
