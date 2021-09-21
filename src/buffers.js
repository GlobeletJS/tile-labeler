export function initBuffers(paint) {
  const styleKeys = ["text-color", "text-opacity"];
  const dataFuncs = styleKeys.filter(k => paint[k].type === "property")
    .map(k => ([paint[k], camelCase(k)]));

  return function(feature, chars, anchor, tileCoord) {
    const origin = [...anchor, chars.fontScalar];
    const { z, x, y } = tileCoord;

    const buffers = {
      sdfRect: chars.flatMap(c => c.rect),
      charPos: chars.flatMap(c => c.pos),
      labelPos: chars.flatMap(() => origin),
      tileCoords: chars.flatMap(() => [x, y, z]),
    };

    dataFuncs.forEach(([get, key]) => {
      const val = get(null, feature);
      buffers[key] = chars.flatMap(() => val);
    });

    return buffers;
  };
}

function camelCase(hyphenated) {
  return hyphenated.replace(/-([a-z])/gi, (h, c) => c.toUpperCase());
}
