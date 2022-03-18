export function getBuffers(icon, text, anchor) {
  const iconBuffers = getIconBuffers(icon, anchor);
  const textBuffers = getTextBuffers(text, anchor);
  return mergeBuffers(iconBuffers, textBuffers);
}

function getIconBuffers(icon, anchor) {
  if (!icon) return;

  const buffers = {
    spriteRect: icon.rect,
    spritePos: icon.pos,
    labelPos0: [...anchor],
  };

  Object.entries(icon.bufferVals).forEach(([key, val]) => {
    buffers[key] = val;
  });

  return buffers;
}

function getTextBuffers(text, anchor) {
  if (!text) return;

  const origin = [...anchor, text.fontScalar];

  const buffers = {
    sdfRect: text.flatMap(c => c.rect),
    charPos: text.flatMap(c => c.pos),
    labelPos: text.flatMap(() => origin),
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
