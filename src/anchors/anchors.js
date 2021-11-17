import { initStyleGetters } from "../style.js";
import { buildCollider } from "./collision.js";
import { getLineAnchors } from "./line.js";

export function initAnchors(style) {
  const getStyles = initStyleGetters(symbolKeys, style);

  return function(feature, tileCoords, icon, text, tree) {
    const { layoutVals } = getStyles(tileCoords.z, feature);
    const collides = buildCollider(layoutVals.symbolPlacement);

    // TODO: get extent from tile?
    return getAnchors(feature.geometry, 512, text, layoutVals)
      .filter(anchor => !collides(icon, text, anchor, tree));
  };
}

const symbolKeys = {
  layout: [
    "symbol-placement",
    "symbol-spacing",
    // TODO: these are in 2 places: here and in the text getter
    "text-rotation-alignment",
    "text-size",
  ],
  paint: [],
};

function getAnchors(geometry, extent, text, layoutVals) {
  switch (layoutVals.symbolPlacement) {
    case "point":
      return getPointAnchors(geometry);
    case "line":
      return getLineAnchors(geometry, extent, text, layoutVals);
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
