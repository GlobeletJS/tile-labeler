export function initStyle({ layout, paint }) {
  const layoutKeys = [
    "text-letter-spacing",
    "text-max-width",
    "text-size",
    "text-padding",
    "text-line-height",
    "text-anchor",
    "text-offset",
    "text-justify",
  ];

  const paintKeys = [
    "text-color",
    "text-opacity",
  ];

  const bufferFuncs = paintKeys
    .filter(k => paint[k].type === "property")
    .map(k => ([paint[k], camelCase(k)]));

  return function(zoom, feature) {
    const layoutVals = layoutKeys
      .reduce((d, k) => (d[k] = layout[k](zoom, feature), d), {});

    const bufferVals = bufferFuncs
      .reduce((d, [f, k]) => (d[k] = f(zoom, feature), d), {});

    return { layoutVals, bufferVals };
  };
}

function camelCase(hyphenated) {
  return hyphenated.replace(/-([a-z])/gi, (h, c) => c.toUpperCase());
}
