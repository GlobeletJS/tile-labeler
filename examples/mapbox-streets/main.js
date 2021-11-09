import * as tileStencil from "tile-stencil";
import * as tileRetriever from "tile-retriever";
import * as tileMixer from "tile-mixer";
import { initAtlasGetter } from "../../";
import { initShapers } from "./shapers.js";
import { render } from "./render.js";

const styleHref = "./streets-v8-noInteractive.json";
const mapboxToken = "pk.eyJ1IjoiamhlbWJkIiwiYSI6ImNqcHpueHpyZjBlMjAzeG9kNG9oNzI2NTYifQ.K7fqhk2Z2YZ8NIV94M-5nA";
const tileCoords = { z: 13, x: 1310, y: 3166 };

export function main() {
  tileStencil.loadStyle(styleHref, mapboxToken).then(getTile);
}

function getTile(style) {
  const source = style.sources.composite;
  const retrieve = tileRetriever.init({ source });
  retrieve(tileCoords, (error, data) => setup(error, data, style));
}

function setup(error, data, style) {
  if (error) throw error;

  const { spriteData, glyphs, layers: rawLayers } = style;
  const layers = rawLayers
    .filter(l => l.source && l.source === "composite")
    .filter(l => l.type === "symbol");
  const mixer = tileMixer.init({ layers });
  const mixed = mixer(data, tileCoords.z);

  console.log("Remixed layers: " + JSON.stringify(mixed, null, 2));

  const parsedStyles = layers.map(tileStencil.getStyleFuncs);
  const shapers = initShapers(parsedStyles, spriteData);
  const getAtlas = initAtlasGetter({ parsedStyles, glyphEndpoint: glyphs });

  getAtlas(mixed, tileCoords.z).then(atlas => {
    const processed = shapers(mixed, tileCoords, atlas);
    render(processed, atlas.image);
  });
}
