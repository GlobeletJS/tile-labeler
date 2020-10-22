import { getTokenParser } from "./tokens.js";

export function initText(parsedStyles) {
  const transforms = parsedStyles
    .filter(s => s.type === "symbol")
    .reduce((d, s) => (d[s.id] = initTextGetter(s), d), {});

  return function(layers, zoom) {
    return Object.entries(layers).reduce((d, [id, layer]) => {
      const transform = transforms[id];
      if (!transform) return d;
      
      let { type, extent, features } = layer;
      let mapped = features.map(f => transform(f, zoom));

      if (mapped.length) d[id] = { type, extent, features: mapped };
      return d;
    }, {});
  };
}

function initTextGetter(style) {
  const layout = style.layout;

  return function(feature, zoom) {
    const { geometry, properties } = feature;

    const textField = layout["text-field"](zoom, feature);
    const text = getTokenParser(textField)(properties);
    if (!text) return feature;

    const transformCode = layout["text-transform"](zoom, feature);
    const transform = getTextTransform(transformCode);

    const charCodes = transform(text).split("").map(c => c.charCodeAt(0));
    
    const font = layout["text-font"](zoom, feature);

    return { geometry, properties, font, charCodes };
  };
}

function getTextTransform(code) {
  switch (code) {
    case "uppercase":
      return f => f.toUpperCase();
    case "lowercase":
      return f => f.toLowerCase();
    case "none":
    default:
      return f => f;
  }
}
