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
