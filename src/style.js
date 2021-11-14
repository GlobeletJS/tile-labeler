export function initStyleGetters(keys, { layout, paint }) {
  const layoutFuncs = keys.layout
    .map(k => ([camelCase(k), layout[k]]));

  const bufferFuncs = keys.paint
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
