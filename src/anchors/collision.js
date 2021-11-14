const { min, max, cos, sin } = Math;

export function buildCollider(placement) {
  return (placement === "line") ? lineCollision : pointCollision;
}

function pointCollision(chars, anchor, tree) {
  const [x0, y0] = anchor;
  const box = formatBox(x0, y0, chars.bbox);

  if (tree.collides(box)) return true;
  // TODO: drop if outside tile?
  tree.insert(box);
}

function formatBox(x0, y0, bbox) {
  return {
    minX: x0 + bbox[0],
    minY: y0 + bbox[1],
    maxX: x0 + bbox[2],
    maxY: y0 + bbox[3],
  };
}

function lineCollision(chars, anchor, tree) {
  const [x0, y0, angle] = anchor;

  const cos_a = cos(angle);
  const sin_a = sin(angle);
  const rotate = ([x, y]) => [x * cos_a - y * sin_a, x * sin_a + y * cos_a];

  const boxes = chars.map(c => getCharBbox(c.pos, rotate))
    .map(bbox => formatBox(x0, y0, bbox));

  if (boxes.some(tree.collides, tree)) return true;
  boxes.forEach(tree.insert, tree);
}

function getCharBbox([x, y, w, h], rotate) {
  const corners = [
    [x, y], [x + w, y],
    [x, y + h], [x + w, y + h]
  ].map(rotate);
  const xvals = corners.map(c => c[0]);
  const yvals = corners.map(c => c[1]);

  return [min(...xvals), min(...yvals), max(...xvals), max(...yvals)];
}
