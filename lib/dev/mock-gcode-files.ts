/** Static G-code list for dev “mock Moonraker” mode (no host). */
export type MockGcodeFileEntry = {
  path: string;
  modified: number | null;
  size: number | null;
};

/** Tiny ASCII STL (one facet) for mock list preview without binary assets. */
export const MOCK_EMBEDDED_STL_PATH = 'dev/mock_triangle.stl';

export const MOCK_STL_TRIANGLE_ASCII = `solid mock
facet normal 0 0 1
 outer loop
  vertex 0 0 0
  vertex 25 0 0
  vertex 12.5 22 0
 endloop
endfacet
endsolid mock
`;

export function embeddedMockStlArrayBuffer(): ArrayBuffer {
  const bytes = new TextEncoder().encode(MOCK_STL_TRIANGLE_ASCII);
  const out = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(out).set(bytes);
  return out;
}

export const MOCK_GCODES_FILES: MockGcodeFileEntry[] = [
  { path: 'benchy_coarse.gcode', modified: 1_713_456_000, size: 1_842_000 },
  { path: 'spiral_vase.gcode', modified: 1_713_360_000, size: 412_000 },
  { path: 'calibration/cube_20mm.gcode', modified: 1_713_200_000, size: 28_400 },
  {
    path: MOCK_EMBEDDED_STL_PATH,
    modified: 1_713_100_000,
    size: new TextEncoder().encode(MOCK_STL_TRIANGLE_ASCII).length,
  },
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
