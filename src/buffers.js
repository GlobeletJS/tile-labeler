export function getBuffers(icon, text, anchor) {
  const iconBuffers = getIconBuffers(icon, text, anchor);
  const textBuffers = getTextBuffers(icon, text, anchor);
  return [iconBuffers, textBuffers].filter(b => b !== undefined);
}

function getIconBuffers(icon, text, anchor) {
  if (!icon) return;

  const buffers = {
    glyphRect: icon.rect,
    glyphPos: icon.pos,
    labelPos: [...anchor, 0.0],
  };

  addVals(buffers, icon.bufferVals, 1);
  if (text) addVals(buffers, text.bufferVals, 1);

  return buffers;
}

function getTextBuffers(icon, text, anchor) {
  if (!text) return;

  const origin = [...anchor, text.fontScalar];

  const buffers = {
    glyphRect: text.flatMap(c => c.rect),
    glyphPos: text.flatMap(c => c.pos),
    labelPos: text.flatMap(() => origin),
  };

  addVals(buffers, text.bufferVals, text.length);
  if (icon) addVals(buffers, icon.bufferVals, text.length);

  return buffers;
}

function addVals(buffers, vals, length) {
  Object.entries(vals).forEach(([key, val]) => {
    buffers[key] = Array(length).fill(val);
  });
}
