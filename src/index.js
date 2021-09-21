export { initAtlasGetter } from "./atlas.js";

import { getCharacters } from "./chars.js";
import { initBuffers } from "./buffers.js";

export function initShaping(style) {
  const getBuffers = initBuffers(style.paint);

  return function(feature, tileCoords, atlas, tree) {
    // tree is an RBush from the 'rbush' module. NOTE: will be updated!

    const chars = getCharacters(feature, tileCoords.z, atlas, style.layout);
    if (!chars) return;

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
    return getBuffers(feature, chars, [x0, y0], tileCoords);
  };
}
