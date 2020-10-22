import * as sdfManager from 'sdf-manager';

export function initGlyphs(glyphEndpoint) {
  const getAtlas = sdfManager.initGetter(glyphEndpoint);

  return function(layers, zoom) {
    const fonts = Object.values(layers)
      .map(layer => layer.features)
      .reduce(collectCharCodes, {});

    return getAtlas(fonts);
  };
}

function collectCharCodes(fonts, features) {
  const textFeatures = features.filter(f => f.charCodes && f.charCodes.length);
  textFeatures.forEach(f => {
    let font = fonts[f.font] || (fonts[f.font] = new Set());
    f.charCodes.forEach(font.add, font);
  });
  return fonts;
}

export function getGlyphInfo(feature, atlas) {
  const { font, charCodes } = feature;
  const positions = atlas.positions[font];

  if (!positions || !charCodes || !charCodes.length) return;

  const info = feature.charCodes.map(code => {
    let pos = positions[code];
    if (!pos) return;
    let { metrics, rect } = pos;
    return { code, metrics, rect };
  });

  return info.filter(i => i !== undefined);
}
