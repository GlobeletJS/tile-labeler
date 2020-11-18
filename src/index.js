export { initAtlasGetter } from "./atlas.js";

import { initShaper } from "./shaping.js";

export function initShaping(style) {
  const shaper = initShaper(style);

  return function(feature, zoom, atlas, tree) {
    // tree is an RBush from the 'rbush' module. NOTE: will be updated!

    const buffers = shaper(feature, zoom, atlas);
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

    // TODO: drop if outside tile?
    return buffers;
  };
}
