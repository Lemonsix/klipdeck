'use client';

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { motion } from 'framer-motion';

interface MeshWidgetProps {
  widgetId: string;
}

const MESH_ROWS = 7;
const MESH_COLS = 7;
const CELL_SIZE = 0.5;
const HEIGHT_SCALE = 2.8;

function generateMesh() {
  return Array.from({ length: MESH_ROWS }, (_, i) =>
    Array.from({ length: MESH_COLS }, (_, j) => {
      return +(
        Math.sin((i + j) * 0.5) * 0.15 +
        Math.cos(i * 0.7) * 0.08 +
        (((i * 7 + j * 13) % 10) / 10) * 0.06 -
        0.05
      ).toFixed(3);
    })
  );
}

function getColor(value: number): string {
  const min = -0.35;
  const max = 0.35;
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  if (normalized < 0.2) return '#0369a1';
  if (normalized < 0.4) return '#06b6d4';
  if (normalized < 0.6) return '#334155';
  if (normalized < 0.8) return '#f59e0b';
  return '#ef4444';
}

function MeshScene({ meshData }: { meshData: number[][] }) {
  const xCenter = (MESH_COLS - 1) / 2;
  const zCenter = (MESH_ROWS - 1) / 2;

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 4, 2]} intensity={0.9} />
      <group rotation={[-0.55, 0.55, 0]}>
        {meshData.map((row, i) =>
          row.map((value, j) => {
            const x = (j - xCenter) * CELL_SIZE;
            const z = (i - zCenter) * CELL_SIZE;
            const h = Math.max(0.04, Math.abs(value) * HEIGHT_SCALE + 0.04);
            const y = value >= 0 ? h / 2 : -h / 2;
            return (
              <mesh key={`${i}-${j}`} position={[x, y, z]}>
                <boxGeometry args={[CELL_SIZE * 0.86, h, CELL_SIZE * 0.86]} />
                <meshStandardMaterial color={getColor(value)} />
              </mesh>
            );
          })
        )}
      </group>
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.7} maxPolarAngle={1.4} />
    </>
  );
}

export function MeshWidget({ widgetId: _widgetId }: MeshWidgetProps) {
  const meshData = useMemo(() => generateMesh(), []);

  return (
    <div className="h-full w-full p-3 flex flex-col overflow-hidden">
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b-2 border-border pb-2 mb-3 shrink-0">
        Bed Mesh 3D
      </h3>

      <div className="flex-1 min-h-0 flex flex-col gap-2">
        <div className="flex-1 min-h-0 border-2 border-border/50 bg-black/40">
          <Canvas camera={{ position: [2.6, 2.8, 3.2], fov: 42 }}>
            <MeshScene meshData={meshData} />
          </Canvas>
        </div>

        <div className="flex items-center justify-center gap-3 text-[10px] font-mono text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-[#0369a1] border border-border/50" />
            <span>Low</span>
          </div>
          <div className="h-px w-6 bg-border" />
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-[#ef4444] border border-border/50" />
            <span>High</span>
          </div>
          <span className="text-muted-foreground/50 ml-1">mm</span>
        </div>

        <motion.p
          className="text-[10px] text-muted-foreground font-mono text-center"
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
        >
          Drag to rotate view
        </motion.p>
      </div>
    </div>
  );
}
