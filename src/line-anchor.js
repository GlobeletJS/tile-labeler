import { getLabelSegments } from "./segments.js";
import { fitLine } from "./fitting.js";

const { max } = Math;

export function placeLineAnchors(line, extent, chars, styleVals) {
  const labelLength = chars.bbox[2] - chars.bbox[0];
  const rawSpacing = styleVals["symbol-spacing"];
  const spacing = max(rawSpacing, labelLength + rawSpacing / 4);
  const fixedExtraOffset = styleVals["text-size"] * 2;

  const isLineContinued = line[0].some(c => c === 0 && c === extent);
  const offset = isLineContinued ?
    (spacing / 2) :
    (labelLength / 2 + fixedExtraOffset);

  const charSize = styleVals["text-size"] / 2;
  return getLabelSegments(line, offset, spacing, labelLength, charSize)
    .map(fitLine)
    .filter(fit => fit.error < charSize)
    .map(({ anchor, angle }) => [...anchor, angle]);
}
