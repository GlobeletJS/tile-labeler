import { getLabelSegments } from "./segments.js";
import { fitLine } from "./fitting.js";

const { max } = Math;

export function placeLineAnchors(line, extent, chars, styleVals) {
  // TODO: consider icon-rotation-alignment
  const { textRotationAlignment, symbolSpacing, textSize } = styleVals;

  const labelLength = (textRotationAlignment === "viewport")
    ? 0.0
    : chars.bbox[2] - chars.bbox[0];

  const spacing = max(symbolSpacing, labelLength + symbolSpacing / 4);

  const isLineContinued = line[0].some(c => c <= 0 || extent <= c);
  // TODO: correct offset for extension of line[0] beyond tile boundary
  // (MapLibre assumes continued lines start ON the boundary)
  const offset = isLineContinued ?
    (spacing / 2) :
    (labelLength / 2 + textSize * 2);

  return getLabelSegments(line, offset, spacing, labelLength, textSize / 2)
    .map(fitLine)
    .filter(fit => fit.error < textSize / 2)
    .map(({ anchor, angle }) => [...anchor, angle]);
}
