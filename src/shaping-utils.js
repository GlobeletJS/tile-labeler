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

  const info = charCodes.map(code => {
    const pos = positions[code];
    if (!pos) return;
    const { metrics, rect } = pos;
    return { code, metrics, rect };
  });

  return info.filter(i => i !== undefined);
}
