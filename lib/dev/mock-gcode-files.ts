/** Static G-code list for dev “mock Moonraker” mode (no host). */
export type MockGcodeFileEntry = {
  path: string;
  modified: number | null;
  size: number | null;
};

export const MOCK_GCODES_FILES: MockGcodeFileEntry[] = [
  { path: 'benchy_coarse.gcode', modified: 1_713_456_000, size: 1_842_000 },
  { path: 'spiral_vase.gcode', modified: 1_713_360_000, size: 412_000 },
  { path: 'calibration/cube_20mm.gcode', modified: 1_713_200_000, size: 28_400 },
];

export const MOCK_GCODES_METADATA: Record<
  string,
  { estimatedTimeSec: number | null; filamentMm: number | null }
> = {
  'benchy_coarse.gcode': { estimatedTimeSec: 3_200, filamentMm: 4_200_000 },
  'spiral_vase.gcode': { estimatedTimeSec: 5_400, filamentMm: 8_100_000 },
  'calibration/cube_20mm.gcode': { estimatedTimeSec: 420, filamentMm: 180_000 },
};

export function mockMetadataForPath(path: string): {
  estimatedTimeSec: number | null;
  filamentMm: number | null;
} {
  return (
    MOCK_GCODES_METADATA[path] ?? {
      estimatedTimeSec: 900,
      filamentMm: 500_000,
    }
  );
}
