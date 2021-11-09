import { ONE_EM } from "sdf-manager";

export function getTextBox(lines, styleVals) {
  const { textLineHeight, textSize,
    textAnchor, textOffset, textPadding } = styleVals;

  // Get dimensions and relative position of text area in glyph pixels
  const w = Math.max(...lines.map(l => l.width));
  const h = lines.length * textLineHeight * ONE_EM;

  const offset = textOffset.map(c => c * ONE_EM);
  const { x, y, sx } = getCorner(w, h, textAnchor, offset);

  const bbox = scalePadBox(textSize / ONE_EM, textPadding, x, y, w, h);

  return { x, y, w, h, shiftX: sx, bbox };
}

export function getIconBox(sprite, styleVals) {
  if (!sprite) return;

  const { iconAnchor, iconOffset, iconSize, iconPadding } = styleVals;
  const { metrics: { w, h }, spriteRect } = sprite;

  const { x, y } = getCorner(w, h, iconAnchor, iconOffset);

  const bbox = scalePadBox(iconSize, iconPadding, x, y, w, h);

  const pos = [x, y, w, h].map(c => c * iconSize);

  return { pos, rect: spriteRect, bbox };
}

function getCorner(w, h, anchor, offset) {
  const [sx, sy] = getBoxShift(anchor);
  const x = sx * w + offset[0];
  const y = sy * h + offset[1];
  return { x, y, sx };
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
