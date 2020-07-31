# tile-labeler

Convert map label features into WebGL buffers for rendering

Feature layout is guided by a [Mapbox style document], as parsed by
[tile-stencil]. The returned buffers are consistent with the format
returned by [tile-mixer].

[Mapbox style document]: https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/#symbol
[tile-stencil]: https://github.com/GlobeletJS/tile-stencil
[tile-mixer]: https://github.com/GlobeletJS/tile-mixer

## Installation
tile-labeler is provided as an ESM import
```javascript
import * as tileLabeler from 'tile-labeler';
```

## Syntax
```javascript
const labeler = tileLabeler.initSymbols(params);
```

## Parameters
The supplied parameters object has the following properties:
- `parsedStyles` (Array): An array of Mapbox style layers, with style functions
  already parsed by [tile-stencil]
- `glyphEndpoint` (String): The URL template from the [glyphs] property of a
  Mapbox style document. Any Mapbox-specific domains or API keys must have been
  already expanded by [tile-stencil]

[glyphs]: https://docs.mapbox.com/mapbox-gl-js/style-spec/glyphs/

## API
The returned labeler function inputs tile data, and returns a Promise that
resolves to the data needed to render the symbols in the data.
For example:
```javascript
labeler(data, zoom).then(({ atlas, layers }) => {
  // Send atlas and layer data to renderer
});
```

The parameters for the labeler function are:
- `data` (Object): A dictionary of arrays of tile features, keyed on the 
  `.id` property of the style for that layer. (NOTE: this is probably NOT
  the natural order of the tile data&mdash;it should be pre-filtered. 
  See filter-source.js in tile-mixer.)
- `zoom` (Number): The zoom level at which style `layout` functions will be
  evaluated

The data returned from the labeler function includes:
- `{ width, height, data } = atlas`: The signed distance field (SDF) data to
  be loaded as an Alpha texture. `data` is a Uint16Array
- `layers` (Object): A dictionary of arrays of features, keyed on `style.id`,
  where each feature has properties `{ properties, buffers }`
