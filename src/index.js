export { initAtlasGetter } from "./atlas.js";

import { initShaper } from "./shaping.js";

export function initShaping(style) {
  const { layout, paint } = style;

  const shaper = initShaper(layout);

  const dataFuncs = [
    [paint["text-color"],   "color"],
    [paint["text-opacity"], "opacity"],
  ].filter(([get, key]) => get.type === "property");

  return function(feature, tileCoords, atlas, tree) {
    // tree is an RBush from the 'rbush' module. NOTE: will be updated!

    const { z, x, y } = tileCoords;
    const buffers = shaper(feature, z, atlas);
    if (!buffers) return;

    let { labelPos: [x0, y0], bbox } = buffers;
    let box = {
      minX: x0 + bbox[0],
      minY: y0 + bbox[1],
      maxX: x0 + bbox[2],
      maxY: y0 + bbox[3],
    };

    if (tree.collides(box)) return;
    tree.insert(box);

    const length = buffers.labelPos.length / 2;
    buffers.tileCoords = Array.from({ length }).flatMap(v => [x, y, z]);

    dataFuncs.forEach(([get, key]) => {
      let val = get(null, feature);
      buffers[key] = Array.from({ length }).flatMap(v => val);
    });

    // TODO: drop if outside tile?
    return buffers;
  };
}
