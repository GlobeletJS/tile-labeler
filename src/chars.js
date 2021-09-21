import { splitLines } from "./splits.js";
import { layoutLines } from "./layout.js";

export function getCharacters(feature, zoom, atlas, style) {
  // Get the glyphs for the characters, and evaluate style properties
  const glyphs = getGlyphInfo(feature, atlas);
  if (!glyphs) return;
  const styleVals = evaluateStyle(style, zoom, feature);

  // Split into lines and position the characters
  const lines = splitLines(glyphs, styleVals);
  // TODO: What if no labelText, or it is all whitespace?
  return layoutLines(lines, styleVals);
}

function getGlyphInfo(feature, atlas) {
  const { font, charCodes } = feature;
  const positions = atlas.positions[font];

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

function evaluateStyle(layout, zoom, feature) {
  return [
    "text-letter-spacing",
    "text-max-width",
    "text-size",
    "text-padding",
    "text-line-height",
    "text-anchor",
    "text-offset",
    "text-justify",
  ].reduce((d, k) => (d[k] = layout[k](zoom, feature), d), {});
}
