export function getBuffers(icon, text, anchor) {
  const iconBuffers = buildBuffers(icon, anchor);
  const textBuffers = buildBuffers(text, anchor);
  return [iconBuffers, textBuffers].filter(b => b !== undefined);
}

function buildBuffers(glyphs, anchor) {
  if (!glyphs) return;

  const origin = [...anchor, glyphs.fontScalar];

  return {
    glyphRect: glyphs.flatMap(g => g.rect),
    glyphPos: glyphs.flatMap(g => g.pos),
    labelPos: glyphs.flatMap(() => origin),
  };
}
