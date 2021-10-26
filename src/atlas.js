import * as sdfManager from "sdf-manager";
import { getTokenParser } from "./tokens.js";

export function initAtlasGetter({ parsedStyles, glyphEndpoint }) {
  const getAtlas = sdfManager.initGetter(glyphEndpoint);

  const textGetters = parsedStyles
    .filter(s => s.type === "symbol")
    .reduce((d, s) => (d[s.id] = initTextGetter(s), d), {});

  return function(layers, zoom) {
    const fonts = Object.entries(layers).reduce((d, [id, layer]) => {
      const getCharCodes = textGetters[id];
      // NOTE: MODIFIES layer.features IN PLACE
      if (getCharCodes) layer.features.forEach(f => getCharCodes(f, zoom, d));
      return d;
    }, {});

    return getAtlas(fonts);
  };
}

function initTextGetter({ layout }) {
  return function(feature, zoom, fonts) {
    // Get the label text from feature properties
    const textField = layout["text-field"](zoom, feature);
    const text = getTokenParser(textField)(feature.properties);
    if (!text) return;

    // Apply the text transform, and convert to character codes
    const transformCode = layout["text-transform"](zoom, feature);
    const transformedText = getTextTransform(transformCode)(text);
    const charCodes = transformedText.split("").map(c => c.charCodeAt(0));
    if (!charCodes.length) return;

    // Update the set of character codes for the appropriate font
    const font = layout["text-font"](zoom, feature);
    const charSet = fonts[font] || (fonts[font] = new Set());
    charCodes.forEach(charSet.add, charSet);

    // Add font name and character codes to the feature (MODIFY IN PLACE!)
    Object.assign(feature, { font, charCodes });
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
