import { initStyleGetters } from "../style.js";
import { getBox, scalePadBox } from "../boxes.js";

export function initIcon(style, spriteData = {}) {
  const { image: { width, height } = {}, meta = {} } = spriteData;
  if (!width || !height) return () => undefined;

  const getStyles = initStyleGetters(iconLayoutKeys, style);

  return function(feature, tileCoords) {
    const sprite = getSprite(feature.spriteID);
    if (!sprite) return;

    return layoutSprites(sprite, getStyles(tileCoords.z, feature));
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

const iconLayoutKeys = [
  "icon-anchor",
  "icon-offset",
  "icon-padding",
  "icon-rotation-alignment",
  "icon-size",
];

function layoutSprites(sprite, styleVals) {
  const { metrics: { w, h }, spriteRect: rect } = sprite;

  const { iconAnchor, iconOffset, iconSize, iconPadding } = styleVals;
  const iconbox = getBox(w, h, iconAnchor, iconOffset);
  const bbox = scalePadBox(iconSize, iconPadding, iconbox);

  const pos = [iconbox.x, iconbox.y, w, h].map(c => c * iconSize);

  // Structure return value to match ../text
  return Object.assign([{ pos, rect }], { bbox, fontScalar: 0.0 });
}
