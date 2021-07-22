import { GLYPH_PBF_BORDER, ATLAS_PADDING } from "sdf-manager";

const RECT_BUFFER = GLYPH_PBF_BORDER + ATLAS_PADDING;

export function layoutLine(glyphs, origin, spacing, scalar) {
  let xCursor = origin[0];
  const y0 = origin[1];

  return glyphs.flatMap(g => {
    const { left, top, advance } = g.metrics;

    const dx = xCursor + left - RECT_BUFFER;
    const dy = y0 - top - RECT_BUFFER;

    xCursor += advance + spacing;

    return [dx, dy, scalar];
  });
}

export function getGlyphInfo(feature, atlas) {
  const { font, charCodes } = feature;
  const positions = atlas.positions[font];

  if (!positions || !charCodes || !charCodes.length) return;

  const info = feature.charCodes.map(code => {
    const pos = positions[code];
    if (!pos) return;
    const { metrics, rect } = pos;
    return { code, metrics, rect };
  });

  return info.filter(i => i !== undefined);
}

export function getTextBoxShift(anchor) {
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

export function getLineShift(justify, boxShiftX) {
  // Shift the start of the text line (left side) by the
  // returned value * (boundingBoxWidth - lineWidth)
  switch (justify) {
    case "auto":
      return -boxShiftX;
    case "left":
      return 0;
    case "right":
      return 1;
    case "center":
    default:
      return 0.5;
  }
}
