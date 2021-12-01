export function segmentIntersectsTile([x0, y0], [x1, y1], extent) {
  // 1. Check if the line is all on one side of the tile
  if (x0 < 0 && x1 < 0) return false;
  if (x0 > extent && x1 > extent) return false;
  if (y0 < 0 && y1 < 0) return false;
  if (y0 > extent && y1 > extent) return false;

  // 2. Check if the tile corner points are all on one side of the line
  // See https://stackoverflow.com/a/293052/10082269
  const a = y1 - y0;
  const b = x0 - x1;
  const c = x1 * y0 - x0 * y1;
  const lineTest = ([x, y]) => Math.sign(a * x + b * y + c);

  const corners = [[extent, 0], [extent, extent], [0, extent]]; // Skips [0, 0]
  const first = lineTest([0, 0]);
  if (corners.some(c => lineTest(c) !== first)) return true;
}

export function getIntersections(segment, extent) {
  const [[x0, y0], [x1, y1]] = segment;

  function interpY(x) {
    const y = interpC(y0, y1, getT(x0, x, x1));
    if (y !== undefined) return [x, y];
  }

  function interpX(y) {
    const x = interpC(x0, x1, getT(y0, y, y1));
    if (x !== undefined) return [x, y];
  }

  function interpC(c0, c1, t) {
    if (t < 0.0 || 1.0 < t) return;
    return c0 + t * (c1 - c0);
  }

  const b = interpX(0);
  const r = interpY(extent);
  const t = interpX(extent);
  const l = interpY(0);

  return [b, r, t, l].filter(p => p !== undefined)
    .filter(p => p.every(c => 0 <= c && c <= extent));
}

function getT(x0, x, x1) {
  return (x0 == x1) ? Infinity : (x - x0) / (x1 - x0);
}
