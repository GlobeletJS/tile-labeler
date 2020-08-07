import { initGlyphs } from "./glyphs.js";
import { initShaping } from "./shaping.js";
import RBush from 'rbush';

export function initSymbols({ parsedStyles, glyphEndpoint }) {
  const getGlyphs = initGlyphs({ parsedStyles, glyphEndpoint });

  const shapers = parsedStyles.reduce((dict, style) => {
    let { id, type } = style;
    if (type === "symbol") dict[id] = initShaping(style);
    return dict;
  }, {});

  return function(layers, zoom) {
    return getGlyphs(layers, zoom).then(atlas => {
      const shaped = Object.entries(layers).reduce((d, [id, features]) => {
        // TODO: if getGlyphs or a previous step drops the non-symbol layers,
        // then we can drop the if below
        let shaper = shapers[id];
        if (shaper) d[id] = features.map(f => shaper(f, zoom, atlas));
        return d;
      }, {});

      const tree = new RBush();
      Object.entries(shaped).reverse().forEach(([id, features]) => {
        shaped[id] = collide(features, tree);
      });

      return { atlas: atlas.image, layers: shaped };
    });
  };
}

function collide(features, tree) {
  // NOTE: tree will be modified!!

  return features.filter(feature => {
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
  });
}
