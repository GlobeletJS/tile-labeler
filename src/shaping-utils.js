export function evaluateStyle(layout, zoom, feature) {
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

export function getGlyphInfo(feature, atlas) {
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
