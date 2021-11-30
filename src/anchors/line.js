import { mergeBoxes } from "../boxes.js";
import { getLabelSegments } from "./segments.js";
import { fitLine } from "./fitting.js";

const { max } = Math;

export function getLineAnchors(geometry, extent, icon, text, layoutVals) {
  const { type, coordinates } = geometry;

  const box = mergeBoxes(icon?.bbox, text?.bbox);
  // TODO: consider icon-rotation-alignment
  const labelLength = (layoutVals.textRotationAlignment === "viewport")
    ? 0.0
    : box[2] - box[0];

  function mapLine(line) {
    return placeLineAnchors(line, extent, labelLength, layoutVals);
  }

  switch (type) {
    case "LineString":
      return mapLine(coordinates);
    case "MultiLineString":
    case "Polygon":
      return coordinates.flatMap(mapLine);
    case "MultiPolygon":
      return coordinates.flat().flatMap(mapLine);
    default:
      return [];
  }
}

function placeLineAnchors(line, extent, labelLength, styleVals) {
  const { symbolSpacing, textSize } = styleVals;

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
