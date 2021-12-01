import { mergeBoxes } from "../boxes.js";
import { getLabelSegments } from "./segments.js";
import { fitLine } from "./fitting.js";

export function getLineAnchors(geometry, extent, icon, text, layoutVals) {
  const { max, PI, round } = Math;
  const { type, coordinates } = geometry;

  const {
    iconRotationAlignment, iconKeepUpright,
    textRotationAlignment, textKeepUpright,
    symbolSpacing, textSize,
  } = layoutVals;

  // ASSUME(!): alignment and keepUpright are consistent for icon and text
  const alignment = (text) ? textRotationAlignment : iconRotationAlignment;
  const keepUpright = (text) ? textKeepUpright : iconKeepUpright;

  const box = mergeBoxes(icon?.bbox, text?.bbox);
  const labelLength = (alignment === "viewport") ? 0.0 : box[2] - box[0];
  const spacing = max(symbolSpacing, labelLength + symbolSpacing / 4);

  switch (type) {
    case "LineString":
      return placeLineAnchors(coordinates);
    case "MultiLineString":
    case "Polygon":
      return coordinates.flatMap(placeLineAnchors);
    case "MultiPolygon":
      return coordinates.flat().flatMap(placeLineAnchors);
    default:
      return [];
  }

  function placeLineAnchors(line) {
    const isLineContinued = line[0].some(c => c <= 0 || extent <= c);
    // TODO: correct offset for extension of line[0] beyond tile boundary
    // (MapLibre assumes continued lines start ON the boundary)
    const offset = isLineContinued ?
      (spacing / 2) :
      (labelLength / 2 + textSize * 2);

    return getLabelSegments(line, offset, spacing, labelLength, textSize / 2)
      .map(fitLine)
      .filter(fit => fit.error < textSize / 2)
      .map(({ anchor, angle }) => ([...anchor, flip(angle)]));
  }

  function flip(angle) {
    return (keepUpright) ? angle - round(angle / PI) * PI : angle;
  }
}
