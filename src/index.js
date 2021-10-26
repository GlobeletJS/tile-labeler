export { initAtlasGetter } from "./atlas.js";

import { initStyle } from "./style.js";
import { getGlyphInfo } from "./glyphs.js";
import { layoutLines } from "./layout.js";
import { lineCollision, pointCollision } from "./collision.js";
import { getAnchors } from "./anchors.js";
import { getBuffers } from "./buffers.js";

export function initShaping(style) {
  const getStyleVals = initStyle(style);

  return function(feature, tileCoords, atlas, tree) {
    // tree is an RBush from the 'rbush' module. NOTE: will be updated!

    const glyphs = getGlyphInfo(feature, atlas);
    if (!glyphs) return;

    const { layoutVals, bufferVals } = getStyleVals(tileCoords.z, feature);
    const chars = layoutLines(glyphs, layoutVals);

    const collides = (layoutVals["symbol-placement"] === "line")
      ? lineCollision
      : pointCollision;

    // TODO: get extent from tile?
    const anchors = getAnchors(feature.geometry, 512, chars, layoutVals)
      .filter(anchor => !collides(chars, anchor, tree));

    if (!anchors || !anchors.length) return;

    return anchors
      .map(anchor => getBuffers(chars, anchor, tileCoords, bufferVals))
      .reduce(combineBuffers);
  };
}

function combineBuffers(dict, buffers) {
  Object.keys(dict).forEach(k => {
    const base = dict[k];
    buffers[k].forEach(v => base.push(v));
  });
  return dict;
}
