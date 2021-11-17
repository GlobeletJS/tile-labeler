export { initAtlasGetter } from "./atlas/atlas.js";

import { initIcon } from "./icon/icon.js";
import { initText } from "./text/text.js";
import { initAnchors } from "./anchors/anchors.js";
import { getBuffers } from "./buffers.js";

export function initShaping(style, spriteData) {
  const getIcon = initIcon(style, spriteData);
  const getText = initText(style);
  const getAnchors = initAnchors(style);

  return function(feature, tileCoords, atlas, tree) {
    // tree is an RBush from the 'rbush' module. NOTE: will be updated!

    const icon = getIcon(feature, tileCoords);
    const text = getText(feature, tileCoords, atlas);
    if (!icon && !text) return;

    const anchors = getAnchors(feature, tileCoords, icon, text, tree);
    if (!anchors || !anchors.length) return;

    return anchors
      .map(anchor => getBuffers(icon, text, anchor, tileCoords))
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
