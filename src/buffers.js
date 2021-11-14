export function getBuffers(chars, anchor, tileCoords) {
  const origin = [...anchor, chars.fontScalar];
  const { z, x, y } = tileCoords;

  const buffers = {
    sdfRect: chars.flatMap(c => c.rect),
    charPos: chars.flatMap(c => c.pos),
    labelPos: chars.flatMap(() => origin),
    tileCoords: chars.flatMap(() => [x, y, z]),
  };

  Object.entries(chars.bufferVals).forEach(([key, val]) => {
    buffers[key] = chars.flatMap(() => val);
  });

  return buffers;
}
