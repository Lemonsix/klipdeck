import type { PrinterObjectsStatus } from '@/lib/moonraker/types';

/** Klipper `bed_mesh` → plot (Moonraker printer_objects / bed_mesh). */
export interface BedMeshPlot {
  profileName: string | null;
  meshMatrix: number[][];
  meshMin: [number, number];
  meshMax: [number, number];
  rows: number;
  cols: number;
  zMin: number;
  zMax: number;
  matrixSource: 'mesh_matrix' | 'probed_matrix';
}

function parseNumberMatrix(v: unknown): number[][] | null {
  if (!Array.isArray(v) || v.length < 2) return null;
  const out: number[][] = [];
  let width = 0;
  for (const row of v) {
    if (!Array.isArray(row) || row.length < 2) return null;
    const r: number[] = [];
    for (const cell of row) {
      if (typeof cell !== 'number' || !Number.isFinite(cell)) return null;
      r.push(cell);
    }
    if (width === 0) width = r.length;
    else if (r.length !== width) return null;
    out.push(r);
  }
  return out;
}

function zRange(data: number[][]): { zMin: number; zMax: number } | null {
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const row of data) {
    for (const cell of row) {
      if (cell < zMin) zMin = cell;
      if (cell > zMax) zMax = cell;
    }
  }
  if (!Number.isFinite(zMin) || !Number.isFinite(zMax)) return null;
  return { zMin, zMax };
}

function parseCoord2(v: unknown): [number, number] | null {
  if (!Array.isArray(v) || v.length < 2) return null;
  const x = Number(v[0]);
  const y = Number(v[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [x, y];
}

export function bedMeshPlotFromStatus(status: PrinterObjectsStatus): BedMeshPlot | null {
  const raw = status.bed_mesh;
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const bm = raw as Record<string, unknown>;
  const parsedMeshMatrix = parseNumberMatrix(bm.mesh_matrix);
  const parsedProbedMatrix = parseNumberMatrix(bm.probed_matrix);
  const meshMatrix = parsedMeshMatrix ?? parsedProbedMatrix;
  const matrixSource = parsedMeshMatrix ? 'mesh_matrix' : 'probed_matrix';
  if (!meshMatrix) return null;

  const meshMin = parseCoord2(bm.mesh_min);
  const meshMax = parseCoord2(bm.mesh_max);
  if (!meshMin || !meshMax) return null;

  const [minX, minY] = meshMin;
  const [maxX, maxY] = meshMax;
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
  if (Math.abs(maxX - minX) < 1e-6 || Math.abs(maxY - minY) < 1e-6) return null;
  const rows = meshMatrix.length;
  const cols = meshMatrix[0]?.length ?? 0;
  if (rows < 2 || cols < 2) return null;

  const range = zRange(meshMatrix);
  if (!range) return null;

  const profileName =
    typeof bm.profile_name === 'string' && bm.profile_name.length > 0 ? bm.profile_name : null;

  return {
    profileName,
    meshMatrix,
    meshMin,
    meshMax,
    rows,
    cols,
    zMin: range.zMin,
    zMax: range.zMax,
    matrixSource,
  };
}
