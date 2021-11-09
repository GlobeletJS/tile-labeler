export function initStyle({ layout, paint }) {
  const layoutKeys = [
    "icon-anchor",
    "icon-offset",
    "icon-padding",
    "icon-rotation-alignment",
    "icon-size",
    "symbol-placement",
    "symbol-spacing",
    "text-anchor",
    "text-justify",
    "text-letter-spacing",
    "text-line-height",
    "text-max-width",
    "text-offset",
    "text-padding",
    "text-rotation-alignment",
    "text-size",
  ];

  const layoutFuncs = layoutKeys
    .map(k => ([camelCase(k), layout[k]]));

  const paintKeys = [
    "text-color",
    "text-opacity",
  ];

  const bufferFuncs = paintKeys
    .filter(k => paint[k].type === "property")
    .map(k => ([camelCase(k), paint[k]]));

  return function(zoom, feature) {
    const layoutVals = layoutFuncs
      .reduce((d, [k, f]) => (d[k] = f(zoom, feature), d), {});

    const bufferVals = bufferFuncs
      .reduce((d, [k, f]) => (d[k] = f(zoom, feature), d), {});

    return { layoutVals, bufferVals };
  };
}

function camelCase(hyphenated) {
  return hyphenated.replace(/-([a-z])/gi, (h, c) => c.toUpperCase());
}
