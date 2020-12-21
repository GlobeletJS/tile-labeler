export { initAtlasGetter } from "./atlas.js";

import { initShaper } from "./shaping.js";

export function initShaping(style) {
  const shaper = initShaper(style);

  return function(feature, tileCoords, atlas, tree) {
    // tree is an RBush from the 'rbush' module. NOTE: will be updated!

    const { z, x, y } = tileCoords;
    const buffers = shaper(feature, z, atlas);
    if (!buffers) return;

    let { origins: [x0, y0], bbox } = buffers;
    let box = {
      minX: x0 + bbox[0],
      minY: y0 + bbox[1],
      maxX: x0 + bbox[2],
      maxY: y0 + bbox[3],
    };

    if (tree.collides(box)) return;
    tree.insert(box);

    const length = buffers.origins.length / 2;
    buffers.tileCoords = Array.from({ length }).flatMap(v => [x, y, z]);

    // TODO: drop if outside tile?
    return buffers;
  };
}
