import Protobuf from 'pbf-esm';

class AlphaImage {
  // See maplibre-gl-js/src/util/image.js
  constructor(size, data) {
    createImage(this, size, 1, data);
  }

  resize(size) {
    resizeImage(this, size, 1);
  }

  clone() {
    return new AlphaImage(
      { width: this.width, height: this.height },
      new Uint8Array(this.data)
    );
  }

  static copy(srcImg, dstImg, srcPt, dstPt, size) {
    copyImage(srcImg, dstImg, srcPt, dstPt, size, 1);
  }
}

function createImage(image, { width, height }, channels, data) {
  if (!data) {
    data = new Uint8Array(width * height * channels);
  } else if (data.length !== width * height * channels) {
    throw new RangeError("mismatched image size");
  }
  return Object.assign(image, { width, height, data });
}

function resizeImage(image, { width, height }, channels) {
  if (width === image.width && height === image.height) return;

  const size = {
    width: Math.min(image.width, width),
    height: Math.min(image.height, height),
  };

  const newImage = createImage({}, { width, height }, channels);

  copyImage(image, newImage, { x: 0, y: 0 }, { x: 0, y: 0 }, size, channels);

  Object.assign(image, { width, height, data: newImage.data });
}

function copyImage(srcImg, dstImg, srcPt, dstPt, size, channels) {
  if (size.width === 0 || size.height === 0) return dstImg;

  if (outOfRange(srcPt, size, srcImg)) {
    throw new RangeError("out of range source coordinates for image copy");
  }
  if (outOfRange(dstPt, size, dstImg)) {
    throw new RangeError("out of range destination coordinates for image copy");
  }

  const srcData = srcImg.data;
  const dstData = dstImg.data;

  console.assert(
    srcData !== dstData,
    "copyImage: src and dst data are identical!"
  );

  for (let y = 0; y < size.height; y++) {
    const srcOffset = ((srcPt.y + y) * srcImg.width + srcPt.x) * channels;
    const dstOffset = ((dstPt.y + y) * dstImg.width + dstPt.x) * channels;
    for (let i = 0; i < size.width * channels; i++) {
      dstData[dstOffset + i] = srcData[srcOffset + i];
    }
  }

  return dstImg;
}

function outOfRange(point, size, image) {
  const { width, height } = size;
  return (
    width > image.width ||
    height > image.height ||
    point.x > image.width - width ||
    point.y > image.height - height
  );
}

const GLYPH_PBF_BORDER = 3;
const ONE_EM = 24;

function parseGlyphPbf(data) {
  // See maplibre-gl-js/src/style/parse_glyph_pbf.js
  // Input is an ArrayBuffer, which will be read as a Uint8Array
  return new Protobuf(data).readFields(readFontstacks, []);
}

function readFontstacks(tag, glyphs, pbf) {
  if (tag === 1) pbf.readMessage(readFontstack, glyphs);
}

function readFontstack(tag, glyphs, pbf) {
  if (tag !== 3) return;

  const glyph = pbf.readMessage(readGlyph, {});
  const { id, bitmap, width, height, left, top, advance } = glyph;

  const borders = 2 * GLYPH_PBF_BORDER;
  const size = { width: width + borders, height: height + borders };

  glyphs.push({
    id,
    bitmap: new AlphaImage(size, bitmap),
    metrics: { width, height, left, top, advance }
  });
}

function readGlyph(tag, glyph, pbf) {
  if (tag === 1) glyph.id = pbf.readVarint();
  else if (tag === 2) glyph.bitmap = pbf.readBytes();
  else if (tag === 3) glyph.width = pbf.readVarint();
  else if (tag === 4) glyph.height = pbf.readVarint();
  else if (tag === 5) glyph.left = pbf.readSVarint();
  else if (tag === 6) glyph.top = pbf.readSVarint();
  else if (tag === 7) glyph.advance = pbf.readVarint();
}

function initGlyphCache(endpoint) {
  const fonts = {};

  function getBlock(font, range) {
    const first = range * 256;
    const last = first + 255;
    const href = endpoint
      .replace("{fontstack}", font.split(" ").join("%20"))
      .replace("{range}", first + "-" + last);

    return fetch(href)
      .then(getArrayBuffer)
      .then(parseGlyphPbf)
      .then(glyphs => glyphs.reduce((d, g) => (d[g.id] = g, d), {}));
  }

  return function(font, code) {
    // 1. Find the 256-char block containing this code
    if (code > 65535) throw Error("glyph codes > 65535 not supported");
    const range = Math.floor(code / 256);

    // 2. Get the Promise for the retrieval and parsing of the block
    const blocks = fonts[font] || (fonts[font] = {});
    const block = blocks[range] || (blocks[range] = getBlock(font, range));

    // 3. Return a Promise that resolves to the requested glyph
    // NOTE: may be undefined! if the API returns a sparse or empty block
    return block.then(glyphs => glyphs[code]);
  };
}

function getArrayBuffer(response) {
  if (!response.ok) throw Error(response.status + " " + response.statusText);
  return response.arrayBuffer();
}

function potpack(boxes) {

    // calculate total box area and maximum box width
    let area = 0;
    let maxWidth = 0;

    for (const box of boxes) {
        area += box.w * box.h;
        maxWidth = Math.max(maxWidth, box.w);
    }

    // sort the boxes for insertion by height, descending
    boxes.sort((a, b) => b.h - a.h);

    // aim for a squarish resulting container,
    // slightly adjusted for sub-100% space utilization
    const startWidth = Math.max(Math.ceil(Math.sqrt(area / 0.95)), maxWidth);

    // start with a single empty space, unbounded at the bottom
    const spaces = [{x: 0, y: 0, w: startWidth, h: Infinity}];

    let width = 0;
    let height = 0;

    for (const box of boxes) {
        // look through spaces backwards so that we check smaller spaces first
        for (let i = spaces.length - 1; i >= 0; i--) {
            const space = spaces[i];

            // look for empty spaces that can accommodate the current box
            if (box.w > space.w || box.h > space.h) continue;

            // found the space; add the box to its top-left corner
            // |-------|-------|
            // |  box  |       |
            // |_______|       |
            // |         space |
            // |_______________|
            box.x = space.x;
            box.y = space.y;

            height = Math.max(height, box.y + box.h);
            width = Math.max(width, box.x + box.w);

            if (box.w === space.w && box.h === space.h) {
                // space matches the box exactly; remove it
                const last = spaces.pop();
                if (i < spaces.length) spaces[i] = last;

            } else if (box.h === space.h) {
                // space matches the box height; update it accordingly
                // |-------|---------------|
                // |  box  | updated space |
                // |_______|_______________|
                space.x += box.w;
                space.w -= box.w;

            } else if (box.w === space.w) {
                // space matches the box width; update it accordingly
                // |---------------|
                // |      box      |
                // |_______________|
                // | updated space |
                // |_______________|
                space.y += box.h;
                space.h -= box.h;

            } else {
                // otherwise the box splits the space into two spaces
                // |-------|-----------|
                // |  box  | new space |
                // |_______|___________|
                // | updated space     |
                // |___________________|
                spaces.push({
                    x: space.x + box.w,
                    y: space.y,
                    w: space.w - box.w,
                    h: box.h
                });
                space.y += box.h;
                space.h -= box.h;
            }
            break;
        }
    }

    return {
        w: width, // container width
        h: height, // container height
        fill: (area / (width * height)) || 0 // space utilization
    };
}

const ATLAS_PADDING = 1;

function buildAtlas(fonts) {
  // See maplibre-gl-js/src/render/glyph_atlas.js

  // Construct position objects (metrics and rects) for each glyph
  const positions = Object.entries(fonts)
    .reduce((pos, [font, glyphs]) => {
      pos[font] = getPositions(glyphs);
      return pos;
    }, {});

  // Figure out how to pack all the bitmaps into one image
  // NOTE: modifies the rects in the positions object, in place!
  const rects = Object.values(positions)
    .flatMap(fontPos => Object.values(fontPos))
    .map(p => p.rect);
  const { w, h } = potpack(rects);

  // Using the updated rects, copy all the bitmaps into one image
  const image = new AlphaImage({ width: w || 1, height: h || 1 });
  Object.entries(fonts).forEach(([font, glyphs]) => {
    const fontPos = positions[font];
    glyphs.forEach(glyph => copyGlyphBitmap(glyph, fontPos, image));
  });

  return { image, positions };
}

function getPositions(glyphs) {
  return glyphs.reduce((dict, glyph) => {
    const pos = getPosition(glyph);
    if (pos) dict[glyph.id] = pos;
    return dict;
  }, {});
}

function getPosition(glyph) {
  const { bitmap: { width, height }, metrics } = glyph;
  if (width === 0 || height === 0) return;

  // Construct a preliminary rect, positioned at the origin for now
  const w = width + 2 * ATLAS_PADDING;
  const h = height + 2 * ATLAS_PADDING;
  const rect = { x: 0, y: 0, w, h };

  return { metrics, rect };
}

function copyGlyphBitmap(glyph, positions, image) {
  const { id, bitmap } = glyph;
  const position = positions[id];
  if (!position) return;

  const srcPt = { x: 0, y: 0 };
  const { x, y } = position.rect;
  const dstPt = { x: x + ATLAS_PADDING, y: y + ATLAS_PADDING };
  AlphaImage.copy(bitmap, image, srcPt, dstPt, bitmap);
}

function initGetter(urlTemplate, key) {
  // Check if url is valid
  const urlOK = (
    (typeof urlTemplate === "string" || urlTemplate instanceof String) &&
    urlTemplate.slice(0, 4) === "http"
  );
  if (!urlOK) return console.log("sdf-manager: no valid glyphs URL!");

  // Put in the API key, if supplied
  const endpoint = (key)
    ? urlTemplate.replace("{key}", key)
    : urlTemplate;

  const getGlyph = initGlyphCache(endpoint);

  return function(fontCodes) {
    // fontCodes = { font1: [code1, code2...], font2: ... }
    const fontGlyphs = {};

    const promises = Object.entries(fontCodes).map(([font, codes]) => {
      const requests = Array.from(codes, code => getGlyph(font, code));

      return Promise.all(requests).then(glyphs => {
        fontGlyphs[font] = glyphs.filter(g => g !== undefined);
      });
    });

    return Promise.all(promises).then(() => {
      return buildAtlas(fontGlyphs);
    });
  };
}

function getTokenParser(tokenText) {
  if (!tokenText) return () => undefined;
  const tokenPattern = /{([^{}]+)}/g;

  // We break tokenText into pieces that are either plain text or tokens,
  // then construct an array of functions to parse each piece
  const tokenFuncs = [];
  let charIndex  = 0;
  while (charIndex < tokenText.length) {
    // Find the next token
    const result = tokenPattern.exec(tokenText);

    if (!result) {
      // No tokens left. Parse the plain text after the last token
      const str = tokenText.substring(charIndex);
      tokenFuncs.push(() => str);
      break;
    } else if (result.index > charIndex) {
      // There is some plain text before the token
      const str = tokenText.substring(charIndex, result.index);
      tokenFuncs.push(() => str);
    }

    // Add a function to process the current token
    const token = result[1];
    tokenFuncs.push(props => props[token]);
    charIndex = tokenPattern.lastIndex;
  }

  // We now have an array of functions returning either a text string or
  // a feature property
  // Return a function that assembles everything
  return function(properties) {
    return tokenFuncs.reduce(concat, "");
    function concat(str, tokenFunc) {
      const text = tokenFunc(properties) || "";
      return str += text;
    }
  };
}

function initAtlasGetter({ parsedStyles, glyphEndpoint }) {
  const getAtlas = initGetter(glyphEndpoint);

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

function initStyle({ layout, paint }) {
  const layoutKeys = [
    "text-letter-spacing",
    "text-max-width",
    "text-size",
    "text-padding",
    "text-line-height",
    "text-anchor",
    "text-offset",
    "text-justify",
    "text-rotation-alignment",
    "symbol-placement",
    "symbol-spacing",
  ];

  const paintKeys = [
    "text-color",
    "text-opacity",
  ];

  const bufferFuncs = paintKeys
    .filter(k => paint[k].type === "property")
    .map(k => ([paint[k], camelCase(k)]));

  return function(zoom, feature) {
    const layoutVals = layoutKeys
      .reduce((d, k) => (d[k] = layout[k](zoom, feature), d), {});

    const bufferVals = bufferFuncs
      .reduce((d, [f, k]) => (d[k] = f(zoom, feature), d), {});

    return { layoutVals, bufferVals };
  };
}

function camelCase(hyphenated) {
  return hyphenated.replace(/-([a-z])/gi, (h, c) => c.toUpperCase());
}

function getGlyphInfo(feature, atlas) {
  const { font, charCodes } = feature;
  const positions = atlas.positions[font];

  if (!positions || !charCodes || !charCodes.length) return;

  const { width, height } = atlas.image;

  return charCodes.map(code => {
    const pos = positions[code];
    if (!pos) return;

    const { left, top, advance } = pos.metrics;
    const { x, y, w, h } = pos.rect;

    const sdfRect = [x / width, y / height, w / width, h / height];
    const metrics = { left, top, advance, w, h };

    return { code, metrics, sdfRect };
  }).filter(i => i !== undefined);
}

const whitespace = {
  // From maplibre-gl-js/src/symbol/shaping.js
  [0x09]: true, // tab
  [0x0a]: true, // newline
  [0x0b]: true, // vertical tab
  [0x0c]: true, // form feed
  [0x0d]: true, // carriage return
  [0x20]: true, // space
};

const breakable = {
  // From maplibre-gl-js/src/symbol/shaping.js
  [0x0a]: true, // newline
  [0x20]: true, // space
  [0x26]: true, // ampersand
  [0x28]: true, // left parenthesis
  [0x29]: true, // right parenthesis
  [0x2b]: true, // plus sign
  [0x2d]: true, // hyphen-minus
  [0x2f]: true, // solidus
  [0xad]: true, // soft hyphen
  [0xb7]: true, // middle dot
  [0x200b]: true, // zero-width space
  [0x2010]: true, // hyphen
  [0x2013]: true, // en dash
  [0x2027]: true  // interpunct
};

function getBreakPoints(glyphs, spacing, targetWidth) {
  const potentialLineBreaks = [];
  const last = glyphs.length - 1;
  let cursor = 0;

  glyphs.forEach((g, i) => {
    const { code, metrics: { advance } } = g;
    if (!whitespace[code]) cursor += advance + spacing;

    if (i == last) return;
    // if (!breakable[code]&& !charAllowsIdeographicBreaking(code)) return;
    if (!breakable[code]) return;

    const breakInfo = evaluateBreak(
      i + 1,
      cursor,
      targetWidth,
      potentialLineBreaks,
      calculatePenalty(code, glyphs[i + 1].code),
      false
    );
    potentialLineBreaks.push(breakInfo);
  });

  const lastBreak = evaluateBreak(
    glyphs.length,
    cursor,
    targetWidth,
    potentialLineBreaks,
    0,
    true
  );

  return leastBadBreaks(lastBreak);
}

function leastBadBreaks(lastBreak) {
  if (!lastBreak) return [];
  return leastBadBreaks(lastBreak.priorBreak).concat(lastBreak.index);
}

function evaluateBreak(index, x, targetWidth, breaks, penalty, isLastBreak) {
  // Start by assuming the supplied (index, x) is the first break
  const init = {
    index, x,
    priorBreak: null,
    badness: calculateBadness(x)
  };

  // Now consider all previous possible break points, and
  // return the pair corresponding to the best combination of breaks
  return breaks.reduce((best, prev) => {
    const badness = calculateBadness(x - prev.x) + prev.badness;
    if (badness < best.badness) {
      best.priorBreak = prev;
      best.badness = badness;
    }
    return best;
  }, init);

  function calculateBadness(width) {
    const raggedness = (width - targetWidth) ** 2;

    if (!isLastBreak) return raggedness + Math.abs(penalty) * penalty;

    // Last line: prefer shorter than average
    return (width < targetWidth)
      ? raggedness / 2
      : raggedness * 2;
  }
}

function calculatePenalty(code, nextCode) {
  let penalty = 0;
  // Force break on newline
  if (code === 0x0a) penalty -= 10000;
  // Penalize open parenthesis at end of line
  if (code === 0x28 || code === 0xff08) penalty += 50;
  // Penalize close parenthesis at beginning of line
  if (nextCode === 0x29 || nextCode === 0xff09) penalty += 50;

  return penalty;
}

function splitLines(glyphs, styleVals) {
  // glyphs is an Array of Objects with properties { code, metrics }
  const spacing = styleVals["text-letter-spacing"] * ONE_EM;
  const totalWidth = measureLine(glyphs, spacing);
  if (totalWidth == 0.0) return [];

  const maxWidth = styleVals["text-max-width"] * ONE_EM;
  const placement = styleVals["symbol-placement"];
  const lineCount = (placement === "point" && maxWidth > 0)
    ? Math.ceil(totalWidth / maxWidth)
    : 1;

  // TODO: skip break calculations if lineCount == 1
  const targetWidth = totalWidth / lineCount;
  const breakPoints = getBreakPoints(glyphs, spacing, targetWidth);

  return breakLines(glyphs, breakPoints, spacing);
}

function breakLines(glyphs, breakPoints, spacing) {
  let start = 0;

  return breakPoints.map(lineBreak => {
    const line = glyphs.slice(start, lineBreak);

    // Trim whitespace from both ends
    while (line.length && whitespace[line[0].code]) line.shift();
    while (trailingWhiteSpace(line)) line.pop();

    line.width = measureLine(line, spacing);
    start = lineBreak;
    return line;
  });
}

function trailingWhiteSpace(line) {
  const len = line.length;
  if (!len) return false;
  return whitespace[line[len - 1].code];
}

function measureLine(glyphs, spacing) {
  if (glyphs.length < 1) return 0;

  // No initial value for reduce--so no spacing added for 1st char
  return glyphs.map(g => g.metrics.advance)
    .reduce((a, c) => a + c + spacing);
}

function getTextBox(lines, styleVals) {
  const [sx, sy] = getTextBoxShift(styleVals["text-anchor"]);

  // Get dimensions and relative position of text area in glyph pixels
  const w = Math.max(...lines.map(l => l.width));
  const h = lines.length * styleVals["text-line-height"] * ONE_EM;
  const x = sx * w + styleVals["text-offset"][0] * ONE_EM;
  const y = sy * h + styleVals["text-offset"][1] * ONE_EM;

  // Get total bounding box after scale and pad
  const scale = styleVals["text-size"] / ONE_EM;
  const pad = styleVals["text-padding"];
  const bbox = [
    x * scale - pad,
    y * scale - pad,
    (x + w) * scale + pad,
    (y + h) * scale + pad,
  ];

  return { x, y, w, h, shiftX: sx, bbox };
}

function getTextBoxShift(anchor) {
  // Shift the top-left corner of the text bounding box
  // by the returned value * bounding box dimensions
  switch (anchor) {
    case "top-left":
      return [0.0, 0.0];
    case "top-right":
      return [-1.0, 0.0];
    case "top":
      return [-0.5, 0.0];
    case "bottom-left":
      return [0.0, -1.0];
    case "bottom-right":
      return [-1.0, -1.0];
    case "bottom":
      return [-0.5, -1.0];
    case "left":
      return [0.0, -0.5];
    case "right":
      return [-1.0, -0.5];
    case "center":
    default:
      return [-0.5, -0.5];
  }
}

const RECT_BUFFER = GLYPH_PBF_BORDER + ATLAS_PADDING;

function layoutLines(glyphs, styleVals) {
  // TODO: what if splitLines returns nothing?
  const lines = splitLines(glyphs, styleVals);
  const box = getTextBox(lines, styleVals);

  const lineHeight = styleVals["text-line-height"] * ONE_EM;
  const lineShiftX = getLineShift(styleVals["text-justify"], box.shiftX);
  const spacing = styleVals["text-letter-spacing"] * ONE_EM;
  const fontScalar = styleVals["text-size"] / ONE_EM;

  const chars = lines.flatMap((line, i) => {
    const x = (box.w - line.width) * lineShiftX + box.x;
    const y = i * lineHeight + box.y;
    return layoutLine(line, [x, y], spacing, fontScalar);
  });

  return Object.assign(chars, { fontScalar, bbox: box.bbox });
}

function layoutLine(glyphs, origin, spacing, scalar) {
  let xCursor = origin[0];
  const y0 = origin[1];

  return glyphs.map(g => {
    const { left, top, advance, w, h } = g.metrics;

    const dx = xCursor + left - RECT_BUFFER;
    // A 2.5 pixel shift in Y is needed to match MapLibre results
    // TODO: figure out why???
    const dy = y0 - top - RECT_BUFFER - 2.5;

    xCursor += advance + spacing;

    const pos = [dx, dy, w, h].map(c => c * scalar);
    const rect = g.sdfRect;

    return { pos, rect };
  });
}

function getLineShift(justify, boxShiftX) {
  switch (justify) {
    case "auto":
      return -boxShiftX;
    case "left":
      return 0;
    case "right":
      return 1;
    case "center":
    default:
      return 0.5;
  }
}

const { min, max: max$2, cos: cos$1, sin: sin$1 } = Math;

function pointCollision(chars, anchor, tree) {
  const [x0, y0] = anchor;
  const box = formatBox(x0, y0, chars.bbox);

  if (tree.collides(box)) return true;
  // TODO: drop if outside tile?
  tree.insert(box);
}

function formatBox(x0, y0, bbox) {
  return {
    minX: x0 + bbox[0],
    minY: y0 + bbox[1],
    maxX: x0 + bbox[2],
    maxY: y0 + bbox[3],
  };
}

function lineCollision(chars, anchor, tree) {
  const [x0, y0, angle] = anchor;

  const cos_a = cos$1(angle);
  const sin_a = sin$1(angle);
  const rotate = ([x, y]) => [x * cos_a - y * sin_a, x * sin_a + y * cos_a];

  const boxes = chars.map(c => getCharBbox(c.pos, rotate))
    .map(bbox => formatBox(x0, y0, bbox));

  if (boxes.some(tree.collides, tree)) return true;
  boxes.forEach(tree.insert, tree);
}

function getCharBbox([x, y, w, h], rotate) {
  const corners = [
    [x, y], [x + w, y],
    [x, y + h], [x + w, y + h]
  ].map(rotate);
  const xvals = corners.map(c => c[0]);
  const yvals = corners.map(c => c[1]);

  return [min(...xvals), min(...yvals), max$2(...xvals), max$2(...yvals)];
}

function getLabelSegments(line, offset, spacing, labelLength, charSize) {
  const points = addDistances(line);
  const lineLength = points[points.length - 1].dist;
  const numLabels = Math.floor((lineLength - offset) / spacing) + 1;

  // How many points for each label? One per character width.
  // if (labelLength < charSize / 2) nS = 1;
  const nS = Math.round(labelLength / charSize) + 1;
  const dS = labelLength / nS;
  const halfLen = (nS - 1) * dS / 2;

  return Array.from({ length: numLabels })
    .map((v, i) => offset + i * spacing - halfLen)
    .map(s0 => getSegment(s0, dS, nS, points))
    .filter(segment => segment !== undefined);
}

function addDistances(line) {
  let cumulative = 0.0;
  const distances = line.slice(1).map((c, i) => {
    cumulative += dist(line[i], c);
    return { coord: c, dist: cumulative };
  });
  distances.unshift({ coord: line[0], dist: 0.0 });
  return distances;
}

function dist([x0, y0], [x1, y1]) {
  return Math.hypot(x1 - x0, y1 - y0);
}

function getSegment(s0, dS, nS, points) {
  const len = (nS - 1) * dS;
  const i0 = points.findIndex(p => p.dist > s0);
  const i1 = points.findIndex(p => p.dist > s0 + len);
  if (i0 < 0 || i1 < 0) return;

  const segment = points.slice(i0 - 1, i1 + 1);

  return Array.from({ length: nS }, (v, n) => {
    const s = s0 + n * dS;
    const i = segment.findIndex(p => p.dist > s);
    return interpolate(s, segment.slice(i - 1, i + 1));
  });
}

function interpolate(dist, points) {
  const [d0, d1] = points.map(p => p.dist);
  const t = (dist - d0) / (d1 - d0);
  const [p0, p1] = points.map(p => p.coord);
  const coord = p0.map((c, i) => c + t * (p1[i] - c));
  return { coord, dist };
}

const { max: max$1, abs, cos, sin, atan2 } = Math;

function fitLine(points) {
  if (points.length < 2) {
    return { anchor: points[0].coord, angle: 0.0, error: 0.0 };
  }

  // Fit X and Y coordinates as a function of chord distance
  const xFit = linearFit(points.map(p => [p.dist, p.coord[0]]));
  const yFit = linearFit(points.map(p => [p.dist, p.coord[1]]));

  // Transform to a single anchor point and rotation angle
  const anchor = [xFit.mean, yFit.mean];
  const angle = (xFit.slope < 0)
    ? atan2(-yFit.slope, -xFit.slope)
    : atan2(yFit.slope, xFit.slope);

  // Compute an error metric: shift and rotate, find largest abs(y)
  const transform = setupTransform(anchor, angle);
  const error = points.map(p => abs(transform(p.coord)[1]))
    .reduce((maxErr, c) => max$1(maxErr, c));

  return { anchor, angle, error };
}

function linearFit(coords) {
  const n = coords.length;
  if (n < 1) return;

  const x_avg = coords.map(c => c[0]).reduce((a, c) => a + c, 0) / n;
  const y_avg = coords.map(c => c[1]).reduce((a, c) => a + c, 0) / n;

  const ss_xx = coords.map(([x]) => x * x)
    .reduce((a, c) => a + c) - n * x_avg * x_avg;
  const ss_xy = coords.map(([x, y]) => x * y)
    .reduce((a, c) => a + c) - n * x_avg * y_avg;

  const slope = ss_xy / ss_xx;
  const intercept = y_avg - slope * x_avg;
  return { slope, intercept, mean: y_avg };
}

function setupTransform([ax, ay], angle) {
  // Note: we use negative angle to rotate the coordinates (not the points)
  const cos_a = cos(-angle);
  const sin_a = sin(-angle);

  return function([x, y]) {
    const xT = x - ax;
    const yT = y - ay;
    const xR = cos_a * xT - sin_a * yT;
    const yR = sin_a * xT + cos_a * yT;
    return [xR, yR];
  };
}

const { max } = Math;

function placeLineAnchors(line, extent, chars, styleVals) {
  // TODO: consider icon-rotation-alignment
  const textRotation = styleVals["text-rotation-alignment"];
  const labelLength = (textRotation === "viewport")
    ? 0.0
    : chars.bbox[2] - chars.bbox[0];

  const rawSpacing = styleVals["symbol-spacing"];
  const spacing = max(rawSpacing, labelLength + rawSpacing / 4);
  const fixedExtraOffset = styleVals["text-size"] * 2;

  const isLineContinued = line[0].some(c => c <= 0 || extent <= c);
  // TODO: correct offset for extension of line[0] beyond tile boundary
  // (MapLibre assumes continued lines start ON the boundary)
  const offset = isLineContinued ?
    (spacing / 2) :
    (labelLength / 2 + fixedExtraOffset);

  const charSize = styleVals["text-size"] / 2;
  return getLabelSegments(line, offset, spacing, labelLength, charSize)
    .map(fitLine)
    .filter(fit => fit.error < charSize)
    .map(({ anchor, angle }) => [...anchor, angle]);
}

function getAnchors(geometry, extent, chars, layoutVals) {
  switch (layoutVals["symbol-placement"]) {
    case "point":
      return getPointAnchors(geometry);
    case "line":
      return getLineAnchors(geometry, extent, chars, layoutVals);
    default:
      return [];
  }
}

function getPointAnchors({ type, coordinates }) {
  switch (type) {
    case "Point":
      return [[...coordinates, 0.0]]; // Add angle coordinate
    case "MultiPoint":
      return coordinates.map(c => [...c, 0.0]);
    default:
      return [];
  }
}

function getLineAnchors(geometry, extent, chars, layoutVals) {
  const { type, coordinates } = geometry;

  function mapLine(line) {
    return placeLineAnchors(line, extent, chars, layoutVals);
  }

  switch (type) {
    case "LineString":
      return mapLine(coordinates);
    case "MultiLineString":
    case "Polygon":
      return coordinates.flatMap(mapLine);
    case "MultiPolygon":
      return coordinates.flat().flatMap(mapLine);
    default:
      return [];
  }
}

function getBuffers(chars, anchor, tileCoord, bufferVals) {
  const origin = [...anchor, chars.fontScalar];
  const { z, x, y } = tileCoord;

  const buffers = {
    sdfRect: chars.flatMap(c => c.rect),
    charPos: chars.flatMap(c => c.pos),
    labelPos: chars.flatMap(() => origin),
    tileCoords: chars.flatMap(() => [x, y, z]),
  };

  Object.entries(bufferVals).forEach(([key, val]) => {
    buffers[key] = chars.flatMap(() => val);
  });

  return buffers;
}

function initShaping(style) {
  const getStyleVals = initStyle(style);

  return function(feature, tileCoords, atlas, tree) {
    // tree is an RBush from the 'rbush' module. NOTE: will be updated!

    const glyphs = getGlyphInfo(feature, atlas);
    if (!glyphs) return;

    const { layoutVals, bufferVals } = getStyleVals(tileCoords.z, feature);
    const chars = layoutLines(glyphs, layoutVals);

    const collides = (layoutVals["symbol-placement"] === "line")
      ? lineCollision
      : pointCollision;

    // TODO: get extent from tile?
    const anchors = getAnchors(feature.geometry, 512, chars, layoutVals)
      .filter(anchor => !collides(chars, anchor, tree));

    if (!anchors || !anchors.length) return;

    return anchors
      .map(anchor => getBuffers(chars, anchor, tileCoords, bufferVals))
      .reduce(combineBuffers);
  };
}

function combineBuffers(dict, buffers) {
  Object.keys(dict).forEach(k => {
    const base = dict[k];
    buffers[k].forEach(v => base.push(v));
  });
  return dict;
}

export { initAtlasGetter, initShaping };
