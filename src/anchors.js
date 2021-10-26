import { placeLineAnchors } from "./line-anchor.js";

export function getAnchors(geometry, extent, chars, layoutVals) {
  switch (layoutVals["symbol-placement"]) {
    case "point":
      return getPointAnchors(geometry);
    case "line":
      return getLineAnchors(geometry, extent, chars, layoutVals);
    default:
      return [];
  }
}

function getPointAnchors({ type, coordinates }) {
  switch (type) {
    case "Point":
      return [[...coordinates, 0.0]]; // Add angle coordinate
    case "MultiPoint":
      return coordinates.map(c => [...c, 0.0]);
    default:
      return [];
  }
}

function getLineAnchors(geometry, extent, chars, layoutVals) {
  const { type, coordinates } = geometry;

  function mapLine(line) {
    return placeLineAnchors(line, extent, chars, layoutVals);
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
