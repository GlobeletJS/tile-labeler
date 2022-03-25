const { min, max, cos, sin } = Math;

export function buildCollider(placement) {
  return (placement === "line") ? lineCollision : pointCollision;
}

function pointCollision(icon, text, anchor, tree) {
  const [x0, y0] = anchor;
  const boxes = [icon, text]
    .filter(label => label !== undefined)
    .map(label => formatBox(x0, y0, label.bbox));

  if (boxes.some(tree.collides, tree)) return true;
  // TODO: drop if outside tile?
  boxes.forEach(tree.insert, tree);
}

function formatBox(x0, y0, bbox) {
  return {
    minX: x0 + bbox[0],
    minY: y0 + bbox[1],
    maxX: x0 + bbox[2],
    maxY: y0 + bbox[3],
  };
}

function lineCollision(icon, text, anchor, tree) {
  const [x0, y0, angle] = anchor;

  const cos_a = cos(angle);
  const sin_a = sin(angle);
  const rotate = ([x, y]) => [x * cos_a - y * sin_a, x * sin_a + y * cos_a];

  const boxes = [icon, text].flat()
    .filter(glyph => glyph !== undefined)
    .map(g => getGlyphBbox(g.pos, rotate))
    .map(bbox => formatBox(x0, y0, bbox));

  if (boxes.some(tree.collides, tree)) return true;
  boxes.forEach(tree.insert, tree);
}

function getGlyphBbox([x, y, w, h], rotate) {
  const corners = [
    [x, y], [x + w, y],
    [x, y + h], [x + w, y + h]
  ].map(rotate);
  const xvals = corners.map(c => c[0]);
  const yvals = corners.map(c => c[1]);

  return [min(...xvals), min(...yvals), max(...xvals), max(...yvals)];
}
