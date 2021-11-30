export function getBox(w, h, anchor, offset) {
  const [sx, sy] = getBoxShift(anchor);
  const x = sx * w + offset[0];
  const y = sy * h + offset[1];
  return { x, y, w, h, shiftX: sx };
}

function getBoxShift(anchor) {
  // Shift the top-left corner of the box by the returned value * box dimensions
  switch (anchor) {
    case "top-left":
      return [0.0, 0.0];
    case "top-right":
      return [-1.0, 0.0];
    case "top":
      return [-0.5, 0.0];
    case "bottom-left":
      return [0.0, -1.0];
    case "bottom-right":
      return [-1.0, -1.0];
    case "bottom":
      return [-0.5, -1.0];
    case "left":
      return [0.0, -0.5];
    case "right":
      return [-1.0, -0.5];
    case "center":
    default:
      return [-0.5, -0.5];
  }
}

export function scalePadBox(scale, pad, { x, y, w, h }) {
  return [
    x * scale - pad,
    y * scale - pad,
    (x + w) * scale + pad,
    (y + h) * scale + pad,
  ];
}

export function mergeBoxes(b1, b2) {
  if (!b1) return b2;
  if (!b2) return b1;

  const { min, max } = Math;

  return [
    min(b1[0], b2[0]),
    min(b1[1], b2[1]),
    max(b1[2], b2[2]),
    max(b1[3], b2[3]),
  ];
}
