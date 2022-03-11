import { mergeBoxes } from "../boxes.js";
import { addDistances, getDistanceToEdge } from "./distance.js";
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

  const iconbox = (icon) ? icon.bbox : undefined;
  const textbox = (text) ? text.bbox : undefined;
  const box = mergeBoxes(iconbox, textbox);
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
    const pts = addDistances(line);
    const distToEdge = getDistanceToEdge(pts, extent);

    const offset = (distToEdge >= 0) ?
      (distToEdge + spacing / 2) :
      (labelLength / 2 + textSize * 2);

    return getLabelSegments(pts, offset, spacing, labelLength, textSize / 2)
      .map(fitLine)
      .filter(fit => fit.error < textSize / 2)
      .map(({ anchor, angle }) => ([...anchor, flip(angle)]));
  }

  function flip(angle) {
    return (keepUpright) ? angle - round(angle / PI) * PI : angle;
  }
}
