import { initText } from "./text.js";
import { initGlyphs } from "./glyphs.js";
import { initShaping } from "./shaping.js";
import RBush from 'rbush';

export function initSymbols({ parsedStyles, glyphEndpoint }) {
  const getText = initText(parsedStyles);
  const getGlyphs = initGlyphs(glyphEndpoint);
  const shapeText = initShapers(parsedStyles);

  return function(layers, zoom) {
    const textLayers = getText(layers, zoom);

    return getGlyphs(textLayers)
      .then(atlas => shapeText(textLayers, zoom, atlas));
  };
}

function initShapers(styles) {
  const shapers = styles
    .filter(s => s.type === "symbol")
    .reduce((d, s) => (d[s.id] = initShaping(s), d), {});

  return function(textLayers, zoom, atlas) {
    const shaped = Object.entries(textLayers).reduce((d, [id, features]) => {
      d[id] = features.map(f => shapers[id](f, zoom, atlas));
      return d;
    }, {});

    const tree = new RBush();
    Object.entries(shaped).reverse().forEach(([id, features]) => {
      shaped[id] = features.filter(f => collide(f, tree));
    });

    return { atlas: atlas.image, layers: shaped };
  };
}

function collide(feature, tree) {
  // NOTE: tree will be modified!!

  let { origins, bbox } = feature.buffers;
  let [ x0, y0 ] = origins;
  let box = {
    minX: x0 + bbox[0],
    minY: y0 + bbox[1],
    maxX: x0 + bbox[2],
    maxY: y0 + bbox[3],
  };

  if (tree.collides(box)) return false;

  tree.insert(box);
  return true; // TODO: drop feature if outside tile?
}
