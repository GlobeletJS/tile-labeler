import RBush from "rbush";
import { initShaping } from "../../";

export function initShapers(styles, spriteData) {
  const shapers = styles
    .reduce((d, s) => (d[s.id] = initLayerShaper(s, spriteData), d), {});

  return function(layers, tileCoords, atlas) {
    const tree = new RBush();

    return Object.entries(layers)
      .reverse() // Reverse order for collision checks
      .map(([id, layer]) => {
        const shape = shapers[id];
        if (shape) console.log("Shaping layer " + id);
        if (shape) return shape(layer, tileCoords, atlas, tree);
      })
      .reverse()
      .reduce((d, l) => Object.assign(d, l), {});
  };
}

function initLayerShaper(style, spriteData) {
  const { id, type } = style;

  const transform = initShaping(style, spriteData);
  if (!transform) return;

  return function(layer, tileCoords, atlas, tree) {
    const { extent, features } = layer;

    const transformed = features.map(feature => {
      const { properties, geometry } = feature;
      return transform(feature, tileCoords, atlas, tree);
    }).filter(f => f !== undefined);

    if (!transformed.length) return;

    return { [id]: { type, extent, buffers: transformed } };
  };
}
