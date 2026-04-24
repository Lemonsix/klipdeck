'use client';

import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
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
  const mid = (zMin + zMax) / 2;
  return new THREE.Color(z <= mid ? '#2563eb' : '#dc2626');
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
      const yBed = yMax - (i / (rows - 1)) * spanY;
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
    const dist = (radius / Math.sin(minFov / 2)) * 0.95;
    const az = Math.PI / 4;
    const el = Math.PI / 6;
    const cosEl = Math.cos(el);
    const x = cx + dist * cosEl * Math.sin(az);
    const y = cy + dist * Math.sin(el) - spanZ * 0.08;
    const z = cz + dist * cosEl * Math.cos(az);
    const pos = new THREE.Vector3(x, y, z);
    const target = new THREE.Vector3(cx, cy, cz);
    camera.up.set(0, 1, 0);
    const forward = target.clone().sub(pos).normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
    const camUp = new THREE.Vector3().crossVectors(right, forward).normalize();
    const viewportPan = camUp.multiplyScalar(-Math.max(spanY * 0.11, 10));
    pos.add(viewportPan);
    target.add(viewportPan);
    camera.position.copy(pos);
    camera.lookAt(target);
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
  const axisY = zMin;
  const xAxisZ = yMax + padCoord * 2.2;
  const yAxisX = xMax + padCoord * 1.6;

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

      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([xMin, axisY, xAxisZ, xMax, axisY, xAxisZ]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#94a3b8" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([yAxisX, axisY, yMin, yAxisX, axisY, yMax]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#94a3b8" />
      </line>

      <Billboard position={[xMin, axisY, xAxisZ]} follow>
        <Text fontSize={9} color="#cbd5e1" anchorX="left" anchorY="middle">
          {fmtCoord(xMin)}
        </Text>
      </Billboard>
      <Billboard position={[xMax, axisY, xAxisZ]} follow>
        <Text fontSize={9} color="#cbd5e1" anchorX="right" anchorY="middle">
          {fmtCoord(xMax)}
        </Text>
      </Billboard>
      <Billboard position={[cx, axisY, xAxisZ + padCoord * 0.55]} follow>
        <Text fontSize={9} color="#94a3b8" anchorX="center" anchorY="middle">
          X
        </Text>
      </Billboard>

      <Billboard position={[yAxisX, axisY, yMin]} follow>
        <Text fontSize={9} color="#cbd5e1" anchorX="left" anchorY="middle">
          {fmtCoord(yMax)}
        </Text>
      </Billboard>
      <Billboard position={[yAxisX, axisY, yMax]} follow>
        <Text fontSize={9} color="#cbd5e1" anchorX="left" anchorY="middle">
          {fmtCoord(yMin)}
        </Text>
      </Billboard>
      <Billboard position={[yAxisX + padCoord * 0.45, axisY, cz]} follow>
        <Text fontSize={9} color="#94a3b8" anchorX="left" anchorY="middle">
          Y
        </Text>
      </Billboard>
    </>
  );
}

export function MeshWidget({ widgetId: _widgetId }: MeshWidgetProps) {
  const bedMeshPlot = useStore((s) => s.bedMeshPlot);

  return (
    <div className="h-full w-full p-3 flex flex-col overflow-hidden">
      <h3 className="text-xs font-bold text-foreground border-b-2 border-border pb-2 mb-3 shrink-0 truncate">
        {bedMeshPlot ? (
          <>
            <span className="tracking-tight">Bed Mesh</span>
            <span className="font-mono text-[11px] font-semibold text-muted-foreground">
              {' - profile: '}
              <span className="text-foreground">{bedMeshPlot.profileName || '(none)'}</span>
            </span>
          </>
        ) : (
          <span className="uppercase tracking-wider">Bed Mesh</span>
        )}
      </h3>

      <div className="flex-1 min-h-0 flex flex-col gap-2">
        {bedMeshPlot ? (
          <div className="flex-1 min-h-0 border-2 border-border/50 bg-[#0c0c0f] min-h-[200px] pointer-events-none select-none flex items-center justify-center p-2">
              <div className="relative h-full max-h-full aspect-square w-full max-w-full">
                <Canvas
                  gl={{ antialias: true, alpha: false }}
                  camera={{ near: 0.1, far: 5000, position: [0, 0, 400], fov: 28 }}
                >
                  <MeshScene plot={bedMeshPlot} />
                </Canvas>
                <div className="absolute right-1 top-2 bottom-2 w-12 px-1.5 flex flex-col items-center justify-center gap-2 bg-[#101014]/80 border border-border/40">
                  <span className="text-[9px] font-mono text-zinc-300 leading-none">
                    {bedMeshPlot.zMax.toFixed(4)}
                  </span>
                  <div
                    className="w-3 h-full min-h-20 rounded-sm"
                    style={{ background: 'linear-gradient(to top, #2563eb 0%, #dc2626 100%)' }}
                  />
                  <span className="text-[9px] font-mono text-zinc-300 leading-none">
                    {bedMeshPlot.zMin.toFixed(4)}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wide">Z</span>
                </div>
              </div>
            </div>
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
