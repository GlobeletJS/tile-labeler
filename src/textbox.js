import { ONE_EM } from "sdf-manager";

export function getTextBox(lines, styleVals) {
  // Get dimensions and relative position of text area in glyph pixels
  const w = Math.max(...lines.map(l => l.width));
  const h = lines.length * styleVals["text-line-height"] * ONE_EM;

  const [sx, sy] = getBoxShift(styleVals["text-anchor"]);
  const x = sx * w + styleVals["text-offset"][0] * ONE_EM;
  const y = sy * h + styleVals["text-offset"][1] * ONE_EM;

  const scale = styleVals["text-size"] / ONE_EM;
  const pad = styleVals["text-padding"];
  const bbox = scalePadBox(scale, pad, x, y, w, h);

  return { x, y, w, h, shiftX: sx, bbox };
}

export function getIconBox(sprite, styleVals) {
  if (!sprite) return;
  const { metrics: { w, h }, spriteRect } = sprite;

  const [sx, sy] = getBoxShift(styleVals["icon-anchor"]);
  const x = sx * w + styleVals["icon-offset"][0];
  const y = sy * h + styleVals["icon-offset"][1];

  const scale = styleVals["icon-size"];
  const pad = styleVals["icon-padding"];
  const bbox = scalePadBox(scale, pad, x, y, w, h);

  const pos = [x, y, w, h].map(c => c * scale);

  return { pos, rect: spriteRect, bbox };
}

function scalePadBox(scale, pad, x, y, w, h) {
  return [
    x * scale - pad,
    y * scale - pad,
    (x + w) * scale + pad,
    (y + h) * scale + pad,
  ];
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
