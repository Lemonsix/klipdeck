'use client';

import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useStore } from '@/lib/store';
import type { BedMeshPlot } from '@/lib/moonraker/bed-mesh-from-status';

interface MeshWidgetProps {
  widgetId: string;
}

function fmtCoord(n: number): string {
  return Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1);
}

function meshZRange(zMin: number, zMax: number): { zMin: number; zMax: number } {
  if (!Number.isFinite(zMin) || !Number.isFinite(zMax) || zMin === zMax) {
    const pad = 0.15;
    return { zMin: -pad, zMax: pad };
  }
  const pad = Math.max(0.02, (zMax - zMin) * 0.12);
  return { zMin: zMin - pad, zMax: zMax + pad };
}

function colorForZ(z: number, zMin: number, zMax: number): THREE.Color {
  const t = zMax > zMin ? (z - zMin) / (zMax - zMin) : 0.5;
  return new THREE.Color().lerpColors(new THREE.Color('#2563eb'), new THREE.Color('#dc2626'), t);
}

function buildSurfaceGeometry(
  data: number[][],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  zScale: number,
  zCenter: number,
  zMin: number,
  zMax: number
): THREE.BufferGeometry {
  const rows = data.length;
  const cols = data[0]?.length ?? 0;
  const geo = new THREE.BufferGeometry();
  if (rows < 2 || cols < 2) return geo;

  const spanX = xMax - xMin;
  const spanY = yMax - yMin;
  const vtxCount = rows * cols;
  const positions = new Float32Array(vtxCount * 3);
  const colors = new Float32Array(vtxCount * 3);

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const idx = (i * cols + j) * 3;
      const x = xMin + (j / (cols - 1)) * spanX;
      const yBed = yMin + (i / (rows - 1)) * spanY;
      const z = data[i]![j]!;
      const y = (z - zCenter) * zScale + zCenter;
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = yBed;
      const col = colorForZ(z, zMin, zMax);
      colors[idx] = col.r;
      colors[idx + 1] = col.g;
      colors[idx + 2] = col.b;
    }
  }

  const quads = (rows - 1) * (cols - 1);
  const indices = new Uint32Array(quads * 6);
  let q = 0;
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j;
      const b = i * cols + j + 1;
      const c = (i + 1) * cols + j + 1;
      const d = (i + 1) * cols + j;
      indices[q++] = a;
      indices[q++] = b;
      indices[q++] = c;
      indices[q++] = a;
      indices[q++] = c;
      indices[q++] = d;
    }
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(Array.from(indices));
  geo.computeVertexNormals();
  return geo;
}

function buildBoxEdgesGeometry(
  spanX: number,
  spanY: number,
  zMin: number,
  zMax: number
): THREE.EdgesGeometry {
  const box = new THREE.BoxGeometry(spanX, zMax - zMin, spanY);
  const edges = new THREE.EdgesGeometry(box);
  box.dispose();
  return edges;
}

function FixedPlotCamera({
  cx,
  cy,
  cz,
  spanX,
  spanY,
  spanZ,
}: {
  cx: number;
  cy: number;
  cz: number;
  spanX: number;
  spanY: number;
  spanZ: number;
}) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const vFov =
      'fov' in camera ? THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) : Math.PI / 3;
    const aspect = Math.max(size.width / Math.max(1, size.height), 0.01);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const minFov = Math.max(Math.min(vFov, hFov), 0.35);
    const radius = Math.max(1, Math.sqrt(spanX * spanX + spanY * spanY + spanZ * spanZ) * 0.5);
    const dist = (radius / Math.sin(minFov / 2)) * 1.15;
    const az = Math.PI / 4;
    const el = Math.PI / 4.2;
    const cosEl = Math.cos(el);
    const x = cx + dist * cosEl * Math.sin(az);
    const y = cy + dist * Math.sin(el);
    const z = cz + dist * cosEl * Math.cos(az);
    camera.position.set(x, y, z);
    camera.up.set(0, 1, 0);
    camera.lookAt(cx, cy, cz);
    if ('fov' in camera) {
      (camera as THREE.PerspectiveCamera).fov = 28;
      camera.updateProjectionMatrix();
    }
  }, [camera, cx, cy, cz, spanX, spanY, spanZ, size.height, size.width]);
  return null;
}

function MeshScene({ plot }: { plot: BedMeshPlot }) {
  const [xMin, yMin] = plot.meshMin;
  const [xMax, yMax] = plot.meshMax;
  const meshData = plot.meshMatrix;
  const spanX = xMax - xMin;
  const spanY = yMax - yMin;
  const zCenterRaw = (plot.zMin + plot.zMax) / 2;
  const zScale = 140;

  const zScaledMin = (plot.zMin - zCenterRaw) * zScale + zCenterRaw;
  const zScaledMax = (plot.zMax - zCenterRaw) * zScale + zCenterRaw;
  const { zMin, zMax } = useMemo(() => meshZRange(zScaledMin, zScaledMax), [zScaledMax, zScaledMin]);
  const surfaceGeo = useMemo(
    () =>
      buildSurfaceGeometry(meshData, xMin, xMax, yMin, yMax, zScale, zCenterRaw, plot.zMin, plot.zMax),
    [meshData, xMin, xMax, yMin, yMax, zScale, zCenterRaw, plot.zMin, plot.zMax]
  );
  const boxEdges = useMemo(
    () => buildBoxEdgesGeometry(spanX, spanY, zMin, zMax),
    [spanX, spanY, zMin, zMax]
  );
  const meshWireGeo = useMemo(() => new THREE.EdgesGeometry(surfaceGeo, 22), [surfaceGeo]);

  const cx = (xMin + xMax) / 2;
  const cy = (zMin + zMax) / 2;
  const cz = (yMin + yMax) / 2;
  const spanZ = zMax - zMin;

  const boxCenter = useMemo(
    () => new THREE.Vector3(cx, cy, cz),
    [cx, cy, cz]
  );

  const padCoord = Math.max(4, Math.min(spanX, spanY) * 0.03);

  return (
    <>
      <FixedPlotCamera cx={cx} cy={cy} cz={cz} spanX={spanX} spanY={spanY} spanZ={spanZ} />
      <color attach="background" args={['#0c0c0f']} />

      <mesh geometry={surfaceGeo}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>

      <lineSegments geometry={meshWireGeo}>
        <lineBasicMaterial
          color="#0f172a"
          transparent
          opacity={0.35}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </lineSegments>

      <lineSegments position={boxCenter} geometry={boxEdges}>
        <lineBasicMaterial color="#64748b" transparent opacity={0.85} />
      </lineSegments>

      <Text position={[cx, zMin, yMin - padCoord * 1.9]} fontSize={10} color="#94a3b8" anchorX="center" anchorY="middle">
        Coordinate surface
      </Text>
    </>
  );
}

export function MeshWidget({ widgetId: _widgetId }: MeshWidgetProps) {
  const bedMeshPlot = useStore((s) => s.bedMeshPlot);

  return (
    <div className="h-full w-full p-3 flex flex-col overflow-hidden">
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b-2 border-border pb-2 mb-3 shrink-0">
        Bed Mesh 3D
      </h3>

      <div className="flex-1 min-h-0 flex flex-col gap-2">
        {bedMeshPlot ? (
          <>
            <div className="flex-1 min-h-0 border-2 border-border/50 bg-[#0c0c0f] min-h-[200px] pointer-events-none select-none flex">
              <div className="flex-1 min-w-0 relative">
                <Canvas
                  gl={{ antialias: true, alpha: false }}
                  camera={{ near: 0.1, far: 5000, position: [0, 0, 400], fov: 28 }}
                >
                  <MeshScene plot={bedMeshPlot} />
                </Canvas>
                <div className="absolute inset-x-2 bottom-1 pointer-events-none">
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-300">
                    <span>X {fmtCoord(bedMeshPlot.meshMin[0])}</span>
                    <span>X {fmtCoord(bedMeshPlot.meshMax[0])}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                    <span>Y {fmtCoord(bedMeshPlot.meshMin[1])}</span>
                    <span>Y {fmtCoord(bedMeshPlot.meshMax[1])}</span>
                  </div>
                </div>
              </div>
              <div className="w-14 border-l border-border/40 px-2 py-3 flex flex-col items-center justify-center gap-2 bg-[#101014]">
                <span className="text-[9px] font-mono text-zinc-300 leading-none">
                  {bedMeshPlot.zMax.toFixed(4)}
                </span>
                <div
                  className="w-3 h-full min-h-20 rounded-sm"
                  style={{ background: 'linear-gradient(to top, #2563eb 0%, #22d3ee 35%, #f59e0b 70%, #dc2626 100%)' }}
                />
                <span className="text-[9px] font-mono text-zinc-300 leading-none">
                  {bedMeshPlot.zMin.toFixed(4)}
                </span>
                <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wide">Z</span>
              </div>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground text-center truncate">
              {bedMeshPlot.profileName ? `Perfil: ${bedMeshPlot.profileName}` : 'Perfil (vacío)'} ·{' '}
              {bedMeshPlot.rows}×{bedMeshPlot.cols} · Moonraker{' '}
              <code className="text-muted-foreground/80">bed_mesh.{bedMeshPlot.matrixSource}</code>
            </p>
          </>
        ) : (
          <div className="flex-1 min-h-0 border-2 border-border/50 bg-muted/20 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-xs text-muted-foreground">
              Sin datos de <code className="text-foreground/90">bed_mesh</code>: necesitás{' '}
              <code className="text-foreground/90">[bed_mesh]</code> en Klipper y un mesh cargado (
              <code className="text-foreground/90">mesh_matrix</code> + <code className="text-foreground/90">mesh_min</code>/
              <code className="text-foreground/90">mesh_max</code> vía Moonraker).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
