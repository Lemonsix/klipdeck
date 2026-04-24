'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Center, OrbitControls } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

function StlMesh({ buffer }: { buffer: ArrayBuffer }) {
  const geometry = useMemo(() => {
    const loader = new STLLoader();
    const geo = loader.parse(buffer);
    geo.computeVertexNormals();
    return geo;
  }, [buffer]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#aeb4c8" metalness={0.12} roughness={0.5} flatShading />
    </mesh>
  );
}

interface StlPreviewPanelProps {
  buffer: ArrayBuffer | null;
  loading: boolean;
  error: string | null;
  fileName: string | null;
}

export function StlPreviewPanel({ buffer, loading, error, fileName }: StlPreviewPanelProps) {
  const overlayText = loading
    ? 'Loading STL…'
    : error
      ? `STL error: ${error}`
      : !fileName
        ? 'Select an STL'
        : !buffer
          ? 'No mesh data'
          : null;

  return (
    <div className="flex-1 min-h-0 border-2 border-border/50 bg-[#0c0c0f] min-h-[220px] flex flex-col relative">
      {buffer && !loading && !error ? (
        <div className="flex-1 min-h-[200px] w-full">
          <Canvas camera={{ position: [65, 55, 65], fov: 42 }} className="h-full w-full block">
            <color attach="background" args={['#0c0c0f']} />
            <ambientLight intensity={0.55} />
            <directionalLight position={[50, 90, 40]} intensity={0.95} />
            <Suspense fallback={null}>
              <Center>
                <StlMesh buffer={buffer} />
              </Center>
              <OrbitControls enableDamping makeDefault />
            </Suspense>
          </Canvas>
        </div>
      ) : (
        <div className="flex-1 min-h-[200px] flex items-center justify-center p-4">
          <p className="text-[11px] font-mono text-muted-foreground text-center max-w-sm">
            {overlayText ?? 'Preview'}
          </p>
        </div>
      )}
    </div>
  );
}
