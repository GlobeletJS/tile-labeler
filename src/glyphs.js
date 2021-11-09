export function getSprite(feature, spriteData) {
  if (!spriteData) return;
  const { image: { width = 0, height = 0 }, meta = {} } = spriteData;
  if (!width || !height) return;

  const { spriteID } = feature;
  const rawRect = meta[spriteID];
  if (!rawRect) return;

  const { x, y, width: w, height: h } = rawRect;
  const spriteRect = [x / width, y / height, w / width, h / height];
  const metrics = { w, h };

  return { spriteID, metrics, spriteRect };
}

export function getGlyphs(feature, atlas) {
  const { charCodes, font } = feature;
  const positions = atlas.positions[font];
  if (!positions || !charCodes || !charCodes.length) return;

  const { width, height } = atlas.image;

  const glyphs = charCodes.map(code => {
    const pos = positions[code];
    if (!pos) return;

    const { left, top, advance } = pos.metrics;
    const { x, y, w, h } = pos.rect;

    const sdfRect = [x / width, y / height, w / width, h / height];
    const metrics = { left, top, advance, w, h };

    return { code, metrics, sdfRect };
  }).filter(i => i !== undefined);

  if (glyphs.length) return glyphs;
}
