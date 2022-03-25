export function initStyleGetters(keys, { layout }) {
  const styleFuncs = keys.map(k => ([layout[k], camelCase(k)]));

  return function(z, feature) {
    return styleFuncs.reduce((d, [g, k]) => (d[k] = g(z, feature), d), {});
  };
}

function camelCase(hyphenated) {
  return hyphenated.replace(/-([a-z])/gi, (h, c) => c.toUpperCase());
}

export const styleKeys = [
  "icon-opacity",
  "text-color",
  "text-opacity",
  "text-halo-blur",
  "text-halo-color",
  "text-halo-width",
];
