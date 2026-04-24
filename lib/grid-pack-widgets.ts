export type PackItem = { id: string; w: number; h: number };

function collides(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

/**
 * First-fit decreasing area: places each rectangle at the top-most, then left-most free cell.
 * Coordinates are grid units (same as react-grid-layout).
 */
export function computePackedGridPositions(
  items: PackItem[],
  cols: number,
  maxScanY = 512
): Map<string, { x: number; y: number }> {
  const sorted = [...items].sort((a, b) => {
    const da = b.w * b.h - a.w * a.h;
    if (da !== 0) return da;
    return a.id.localeCompare(b.id);
  });

  const placed: { id: string; x: number; y: number; w: number; h: number }[] = [];
  const out = new Map<string, { x: number; y: number }>();

  for (const it of sorted) {
    const w = Math.max(1, Math.min(it.w, cols));
    const h = Math.max(1, it.h);
    let chosen = { x: 0, y: 0 };
    let found = false;
    for (let y = 0; y < maxScanY && !found; y++) {
      for (let x = 0; x <= cols - w; x++) {
        const candidate = { x, y, w, h };
        const hit = placed.some((p) =>
          collides(
            { x: candidate.x, y: candidate.y, w: candidate.w, h: candidate.h },
            { x: p.x, y: p.y, w: p.w, h: p.h }
          )
        );
        if (!hit) {
          chosen = { x, y };
          placed.push({ id: it.id, x, y, w, h });
          found = true;
          break;
        }
      }
    }
    out.set(it.id, chosen);
  }

  return out;
}
