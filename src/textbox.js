import { ONE_EM } from "sdf-manager";

export function getTextBox(lines, styleVals) {
  const [sx, sy] = getTextBoxShift(styleVals["text-anchor"]);

  // Get dimensions and relative position of text area in glyph pixels
  const w = Math.max(...lines.map(l => l.width));
  const h = lines.length * styleVals["text-line-height"] * ONE_EM;
  const x = sx * w + styleVals["text-offset"][0] * ONE_EM;
  const y = sy * h + styleVals["text-offset"][1] * ONE_EM;

  // Get total bounding box after scale and pad
  const scale = styleVals["text-size"] / ONE_EM;
  const pad = styleVals["text-padding"];
  const bbox = [
    x * scale - pad,
    y * scale - pad,
    (x + w) * scale + pad,
    (y + h) * scale + pad,
  ];

  return { x, y, w, h, shiftX: sx, bbox };
}

function getTextBoxShift(anchor) {
  // Shift the top-left corner of the text bounding box
  // by the returned value * bounding box dimensions
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
