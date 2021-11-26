import { initStyleGetters } from "../style.js";
import { getBox, scalePadBox } from "../boxes.js";

export function initIcon(style, spriteData = {}) {
  const { image: { width, height } = {}, meta = {} } = spriteData;
  if (!width || !height) return () => undefined;

  const getStyles = initStyleGetters(iconKeys, style);

  return function(feature, tileCoords) {
    const sprite = getSprite(feature.spriteID);
    if (!sprite) return;

    const { layoutVals, bufferVals } = getStyles(tileCoords.z, feature);
    const icon = layoutSprite(sprite, layoutVals);
    return Object.assign(icon, { bufferVals }); // TODO: rethink this
  };

  function getSprite(spriteID) {
    const rawRect = meta[spriteID];
    if (!rawRect) return;

    const { x, y, width: w, height: h, pixelRatio = 1 } = rawRect;
    const spriteRect = [x / width, y / height, w / width, h / height];
    const scale = 1.0 / Math.max(1.0, pixelRatio);
    const metrics = { w: w * scale, h: h * scale };

    return { spriteID, metrics, spriteRect };
  }
}

const iconKeys = {
  layout: [
    "icon-anchor",
    "icon-offset",
    "icon-padding",
    "icon-rotation-alignment",
    "icon-size",
  ],
  paint: [
    "icon-opacity",
  ],
};

function layoutSprite(sprite, styleVals) {
  const { metrics: { w, h }, spriteRect } = sprite;

  const { iconAnchor, iconOffset, iconSize, iconPadding } = styleVals;
  const iconbox = getBox(w, h, iconAnchor, iconOffset);
  const bbox = scalePadBox(iconSize, iconPadding, iconbox);

  const pos = [iconbox.x, iconbox.y, w, h].map(c => c * iconSize);

  return { pos, rect: spriteRect, bbox };
}
