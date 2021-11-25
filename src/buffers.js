export function getBuffers(icon, text, anchor, tileCoords) {
  const iconBuffers = getIconBuffers(icon, anchor, tileCoords);
  const textBuffers = getTextBuffers(text, anchor, tileCoords);
  return mergeBuffers(iconBuffers, textBuffers);
}

function getIconBuffers(icon, anchor, { z, x, y }) {
  if (!icon) return;

  // NOTE: mergeBuffers may overwrite tileCoords with the text buffer of the
  // same name. This is OK because the text buffer, if it exists, is longer
  const buffers = {
    spriteRect: icon.rect,
    spritePos: icon.pos,
    labelPos0: [...anchor],
    tileCoords: [x, y, z],
  };

  Object.entries(icon.bufferVals).forEach(([key, val]) => {
    buffers[key] = val;
  });

  return buffers;
}

function getTextBuffers(text, anchor, { z, x, y }) {
  if (!text) return;

  const origin = [...anchor, text.fontScalar];

  const buffers = {
    sdfRect: text.flatMap(c => c.rect),
    charPos: text.flatMap(c => c.pos),
    labelPos: text.flatMap(() => origin),
    tileCoords: text.flatMap(() => [x, y, z]),
  };

  Object.entries(text.bufferVals).forEach(([key, val]) => {
    buffers[key] = text.flatMap(() => val);
  });

  return buffers;
}

function mergeBuffers(buf1, buf2) {
  if (!buf1) return buf2;
  if (!buf2) return buf1;
  return Object.assign(buf1, buf2);
}
