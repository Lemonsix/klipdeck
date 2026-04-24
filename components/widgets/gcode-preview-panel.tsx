'use client';

import { useEffect, useRef, useState } from 'react';
import { init, type WebGLPreview } from 'gcode-preview';

interface GcodePreviewPanelProps {
  gcode: string | null;
  loading: boolean;
  error: string | null;
  fileName: string | null;
}

export function GcodePreviewPanel({ gcode, loading, error, fileName }: GcodePreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<WebGLPreview | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || previewRef.current) return;
    const preview = init({
      canvas: canvasRef.current,
      backgroundColor: '#0c0c0f',
      renderTravel: false,
      lineWidth: 2,
      buildVolume: { x: 220, y: 220, z: 260 },
      initialCameraPosition: [260, 260, 260],
    });
    preview.controls.enabled = false;
    preview.render();
    previewRef.current = preview;

    return () => {
      preview.dispose();
      previewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const preview = previewRef.current;
    if (!preview) return;

    const resize = () => preview.resize();
    resize();

    const observer = new ResizeObserver(() => resize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [gcode]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    setParseError(null);
    preview.clear();
    if (!gcode || !gcode.trim()) {
      preview.render();
      return;
    }

    try {
      preview.processGCode(gcode);
      preview.render();
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse GCODE');
    }
  }, [gcode]);

  const overlayText = loading
    ? 'Loading preview...'
    : error
      ? `Preview error: ${error}`
      : parseError
        ? `Preview parse error: ${parseError}`
        : !fileName
          ? 'Select a file to preview'
          : !gcode
            ? 'No preview available'
            : null;

  return (
    <div className="flex-1 min-h-0 border-2 border-border/50 bg-[#0c0c0f] min-h-[220px] flex items-center justify-center p-2">
      <div ref={containerRef} className="relative h-full max-h-full aspect-square w-full max-w-full">
        <canvas ref={canvasRef} className="h-full w-full block" />
        {overlayText && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/65 px-4 text-center">
            <p className="text-[11px] font-mono text-muted-foreground">{overlayText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
