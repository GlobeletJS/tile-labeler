export { initAtlasGetter } from "./atlas.js";

import { initStyle } from "./style.js";
import { getGlyphInfo } from "./glyphs.js";
import { layoutLines } from "./layout.js";
import { getBuffers } from "./buffers.js";

export function initShaping(style) {
  const getStyleVals = initStyle(style);

  return function(feature, tileCoords, atlas, tree) {
    // tree is an RBush from the 'rbush' module. NOTE: will be updated!

    const glyphs = getGlyphInfo(feature, atlas);
    if (!glyphs) return;

    const { layoutVals, bufferVals } = getStyleVals(tileCoords.z, feature);
    const chars = layoutLines(glyphs, layoutVals);

    const [x0, y0] = feature.geometry.coordinates;
    const bbox = chars.bbox;

    const box = {
      minX: x0 + bbox[0],
      minY: y0 + bbox[1],
      maxX: x0 + bbox[2],
      maxY: y0 + bbox[3],
    };

    if (tree.collides(box)) return;
    tree.insert(box);

    // TODO: drop if outside tile?
    return getBuffers(chars, [x0, y0], tileCoords, bufferVals);
  };
}
