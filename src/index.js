export { initAtlasGetter } from "./atlas/atlas.js";

import { initIcon } from "./icon/icon.js";
import { initText } from "./text/text.js";
import { initAnchors } from "./anchors/anchors.js";
import { getBuffers } from "./buffers.js";

export function initShaping(style, spriteData) {
  const getIcon = initIcon(style, spriteData);
  const getText = initText(style);
  const getAnchors = initAnchors(style);

  return { serialize, getLength };

  function serialize(feature, tileCoords, atlas, tree) {
    // tree is an RBush from the 'rbush' module. NOTE: will be updated!

    const icon = getIcon(feature, tileCoords);
    const text = getText(feature, tileCoords, atlas);
    if (!icon && !text) return;

    const anchors = getAnchors(feature, tileCoords, icon, text, tree);
    if (!anchors || !anchors.length) return;

    return anchors
      .flatMap(anchor => getBuffers(icon, text, anchor))
      .reduce(combineBuffers, {});
  }

  function getLength(buffers) {
    return buffers.labelPos.length / 4;
  }
}

function combineBuffers(dict, buffers) {
  Object.keys(buffers).forEach(k => {
    const base = dict[k] || (dict[k] = []);
    buffers[k].forEach(v => base.push(v));
  });
  return dict;
}
