export function getBuffers(chars, anchor, tileCoord, bufferVals) {
  const origin = [...anchor, chars.fontScalar];
  const { z, x, y } = tileCoord;

  const buffers = {
    sdfRect: chars.flatMap(c => c.rect),
    charPos: chars.flatMap(c => c.pos),
    labelPos: chars.flatMap(() => origin),
    tileCoords: chars.flatMap(() => [x, y, z]),
  };

  Object.entries(bufferVals).forEach(([key, val]) => {
    buffers[key] = chars.flatMap(() => val);
  });

  return buffers;
}
