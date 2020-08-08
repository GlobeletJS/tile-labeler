import * as sdfManager from 'sdf-manager';

export function initGlyphs(glyphEndpoint) {
  const getAtlas = sdfManager.initGetter(glyphEndpoint);

  return function(layers, zoom) {
    const fonts = Object.values(layers).reduce(collectCharCodes, {});

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
  // TODO: ASSUMES this feature has .font and .charCodes

  const positions = atlas.positions[feature.font];

  const info = feature.charCodes.map(code => {
    let pos = positions[code];
    if (!pos) return;
    let { metrics, rect } = pos;
    return { code, metrics, rect };
  });

  return info.filter(i => i !== undefined);
}
