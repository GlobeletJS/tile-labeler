import { GLYPH_PBF_BORDER, ATLAS_PADDING, ONE_EM } from "sdf-manager";

const RECT_BUFFER = GLYPH_PBF_BORDER + ATLAS_PADDING;

export function layoutLines(lines, box, styleVals) {
  const spacing = styleVals["text-letter-spacing"] * ONE_EM;
  const scalar = styleVals["text-size"] / ONE_EM;

  return lines.flatMap((line, i) => {
    const x = (box.w - line.width) * box.lineShiftX + box.x;
    const y = i * box.lineHeight + box.y;
    return layoutLine(line, [x, y], spacing, scalar);
  });
}

function layoutLine(glyphs, origin, spacing, scalar) {
  let xCursor = origin[0];
  const y0 = origin[1];

  return glyphs.flatMap(g => {
    const { left, top, advance } = g.metrics;
    const { w, h } = g.rect;

    const dx = xCursor + left - RECT_BUFFER;
    const dy = y0 - top - RECT_BUFFER;

    xCursor += advance + spacing;

    return [dx, dy, w, h].map(c => c * scalar);
  });
}
