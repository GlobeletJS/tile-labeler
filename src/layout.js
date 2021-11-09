import { GLYPH_PBF_BORDER, ATLAS_PADDING, ONE_EM } from "sdf-manager";
import { splitLines } from "./splits.js";
import { getTextBox } from "./textbox.js";

const RECT_BUFFER = GLYPH_PBF_BORDER + ATLAS_PADDING;

export function layoutLines(glyphs, styleVals) {
  // TODO: what if splitLines returns nothing?
  const lines = splitLines(glyphs, styleVals);
  const box = getTextBox(lines, styleVals);

  const lineHeight = styleVals.textLineHeight * ONE_EM;
  const lineShiftX = getLineShift(styleVals.textJustify, box.shiftX);
  const spacing = styleVals.textLetterSpacing * ONE_EM;
  const fontScalar = styleVals.textSize / ONE_EM;

  const chars = lines.flatMap((line, i) => {
    const x = (box.w - line.width) * lineShiftX + box.x;
    const y = i * lineHeight + box.y;
    return layoutLine(line, [x, y], spacing, fontScalar);
  });

  return Object.assign(chars, { fontScalar, bbox: box.bbox });
}

function layoutLine(glyphs, origin, spacing, scalar) {
  let xCursor = origin[0];
  const y0 = origin[1];

  return glyphs.map(g => {
    const { left, top, advance, w, h } = g.metrics;

    const dx = xCursor + left - RECT_BUFFER;
    // A 2.5 pixel shift in Y is needed to match MapLibre results
    // TODO: figure out why???
    const dy = y0 - top - RECT_BUFFER - 2.5;

    xCursor += advance + spacing;

    const pos = [dx, dy, w, h].map(c => c * scalar);
    const rect = g.sdfRect;

    return { pos, rect };
  });
}

function getLineShift(justify, boxShiftX) {
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
