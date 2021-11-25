import { initStyleGetters } from "../style.js";
import { layout } from "./layout.js";

export function initText(style) {
  const getStyles = initStyleGetters(textKeys, style);

  return function(feature, tileCoords, atlas) {
    const glyphs = getGlyphs(feature, atlas);
    if (!glyphs || !glyphs.length) return;

    const { layoutVals, bufferVals } = getStyles(tileCoords.z, feature);
    const chars = layout(glyphs, layoutVals);
    return Object.assign(chars, { bufferVals }); // TODO: rethink this
  };
}

const textKeys = {
  layout: [
    "symbol-placement", // TODO: both here and in ../anchors/anchors.js
    "text-anchor",
    "text-justify",
    "text-letter-spacing",
    "text-line-height",
    "text-max-width",
    "text-offset",
    "text-padding",
    "text-rotation-alignment",
    "text-size",
  ],
  paint: [
    "text-color",
    "text-opacity",
    "text-halo-blur",
    "text-halo-color",
    "text-halo-width",
  ],
};

function getGlyphs(feature, atlas) {
  const { charCodes, font } = feature;
  const positions = atlas?.positions[font];
  if (!positions || !charCodes || !charCodes.length) return;

  const { width, height } = atlas.image;

  return charCodes.map(code => {
    const pos = positions[code];
    if (!pos) return;

    const { left, top, advance } = pos.metrics;
    const { x, y, w, h } = pos.rect;

    const sdfRect = [x / width, y / height, w / width, h / height];
    const metrics = { left, top, advance, w, h };

    return { code, metrics, sdfRect };
  }).filter(i => i !== undefined);
}
