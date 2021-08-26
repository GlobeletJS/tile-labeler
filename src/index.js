export { initAtlasGetter } from "./atlas.js";

import { initShaper } from "./shaping.js";

export function initShaping(style) {
  const { layout, paint } = style;

  const shaper = initShaper(layout);

  const styleKeys = ["text-color", "text-opacity"];
  const dataFuncs = styleKeys.filter(k => paint[k].type === "property")
    .map(k => ([paint[k], camelCase(k)]));

  return function(feature, tileCoords, atlas, tree) {
    // tree is an RBush from the 'rbush' module. NOTE: will be updated!

    const { z, x, y } = tileCoords;
    const buffers = shaper(feature, z, atlas);
    if (!buffers) return;

    const { labelPos: [x0, y0], bbox } = buffers;
    const box = {
      minX: x0 + bbox[0],
      minY: y0 + bbox[1],
      maxX: x0 + bbox[2],
      maxY: y0 + bbox[3],
    };

    if (tree.collides(box)) return;
    tree.insert(box);

    const length = buffers.labelPos.length / 2;
    buffers.tileCoords = Array.from({ length }).flatMap(() => [x, y, z]);

    dataFuncs.forEach(([get, key]) => {
      const val = get(null, feature);
      buffers[key] = Array.from({ length }).flatMap(() => val);
    });

    // TODO: drop if outside tile?
    return buffers;
  };
}

function camelCase(hyphenated) {
  return hyphenated.replace(/-([a-z])/gi, (h, c) => c.toUpperCase());
}
