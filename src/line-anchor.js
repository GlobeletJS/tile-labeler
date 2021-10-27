import { getLabelSegments } from "./segments.js";
import { fitLine } from "./fitting.js";

const { max } = Math;

export function placeLineAnchors(line, extent, chars, styleVals) {
  // TODO: consider icon-rotation-alignment
  const textRotation = styleVals["text-rotation-alignment"];
  const labelLength = (textRotation === "viewport")
    ? 0.0
    : chars.bbox[2] - chars.bbox[0];

  const rawSpacing = styleVals["symbol-spacing"];
  const spacing = max(rawSpacing, labelLength + rawSpacing / 4);
  const fixedExtraOffset = styleVals["text-size"] * 2;

  const isLineContinued = line[0].some(c => c <= 0 || extent <= c);
  // TODO: correct offset for extension of line[0] beyond tile boundary
  // (MapLibre assumes continued lines start ON the boundary)
  const offset = isLineContinued ?
    (spacing / 2) :
    (labelLength / 2 + fixedExtraOffset);

  const charSize = styleVals["text-size"] / 2;
  return getLabelSegments(line, offset, spacing, labelLength, charSize)
    .map(fitLine)
    .filter(fit => fit.error < charSize)
    .map(({ anchor, angle }) => [...anchor, angle]);
}
