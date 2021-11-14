import { initStyleGetters } from "../style.js";
import { getBox, scalePadBox } from "../boxes.js";

export function initIcon(style, spriteData = {}) {
  const { image: { width, height } = {}, meta = {} } = spriteData;
  if (!width || !height) return () => undefined;

  const getStyles = initStyleGetters(iconKeys, style);

  return function(feature, tileCoords) {
    const sprite = getSprite(feature, width, height, meta);
    if (!sprite) return;

    // const { layoutVals, bufferVals } = getStyles(tileCoords.z, feature);
    const { layoutVals } = getStyles(tileCoords.z, feature);
    const icon = layoutSprite(sprite, layoutVals);
    return icon; // TODO: what about bufferVals?
  };
}

const iconKeys = {
  layout: [
    "icon-anchor",
    "icon-offset",
    "icon-padding",
    "icon-rotation-alignment",
    "icon-size",
  ],
  paint: [],
};

function getSprite({ spriteID }, width, height, meta) {
  const rawRect = meta[spriteID];
  if (!rawRect) return;

  const { x, y, width: w, height: h } = rawRect;
  const spriteRect = [x / width, y / height, w / width, h / height];
  const metrics = { w, h };

  return { spriteID, metrics, spriteRect };
}

function layoutSprite(sprite, styleVals) {
  const { metrics: { w, h }, spriteRect } = sprite;

  const { iconAnchor, iconOffset, iconSize, iconPadding } = styleVals;
  const iconbox = getBox(w, h, iconAnchor, iconOffset);
  const bbox = scalePadBox(iconSize, iconPadding, iconbox);

  const pos = [iconbox.x, iconbox.y, w, h].map(c => c * iconSize);

  return { pos, rect: spriteRect, bbox };
}
