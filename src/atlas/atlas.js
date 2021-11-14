import * as sdfManager from "sdf-manager";
import { initPreprocessor } from "./preprocess.js";

export function initAtlasGetter({ parsedStyles, glyphEndpoint }) {
  const getAtlas = sdfManager.initGetter(glyphEndpoint);

  const preprocessors = parsedStyles
    .filter(s => s.type === "symbol")
    .reduce((d, s) => (d[s.id] = initPreprocessor(s), d), {});

  return function(layers, zoom) {
    // Add character codes and sprite IDs. MODIFIES layer.features IN PLACE
    Object.entries(layers).forEach(([id, layer]) => {
      const preprocessor = preprocessors[id];
      if (!preprocessor) return;
      layer.features = layer.features.map(f => preprocessor(f, zoom))
        .filter(f => f !== undefined);
    });

    const fonts = Object.values(layers)
      .flatMap(l => l.features)
      .filter(f => (f.charCodes && f.charCodes.length))
      .reduce(updateFonts, {});

    return getAtlas(fonts);
  };
}

function updateFonts(fonts, feature) {
  const { font, charCodes } = feature;
  const charSet = fonts[font] || (fonts[font] = new Set());
  charCodes.forEach(charSet.add, charSet);
  return fonts;
}
