import {
  getGlyphInfo,
  layoutLine,
  getTextBoxShift,
  getLineShift
} from "./shaping-utils.js";
import { measureLine, splitLines } from "./splits.js";
import { ONE_EM } from "sdf-manager";

export function initShaper(layout) {
  return function(feature, zoom, atlas) {
    // For each feature, compute a list of info for each character:
    // - x0, y0  defining overall label position
    // - dx, dy  delta positions relative to label position
    // - x, y, w, h  defining the position of the glyph within the atlas

    // 1. Get the glyphs for the characters
    const glyphs = getGlyphInfo(feature, atlas);
    if (!glyphs) return;

    // 2. Split into lines
    const spacing = layout["text-letter-spacing"](zoom, feature) * ONE_EM;
    const maxWidth = layout["text-max-width"](zoom, feature) * ONE_EM;
    const lines = splitLines(glyphs, spacing, maxWidth);
    // TODO: What if no labelText, or it is all whitespace?

    // 3. Get dimensions of lines and overall text box
    const lineWidths = lines.map(line => measureLine(line, spacing));
    const lineHeight = layout["text-line-height"](zoom, feature) * ONE_EM;

    const boxSize = [Math.max(...lineWidths), lines.length * lineHeight];
    const textOffset = layout["text-offset"](zoom, feature)
      .map(c => c * ONE_EM);
    const boxShift = getTextBoxShift( layout["text-anchor"](zoom, feature) );
    const boxOrigin = boxShift.map((c, i) => c * boxSize[i] + textOffset[i]);

    // 4. Compute origins for each line
    const justify = layout["text-justify"](zoom, feature);
    const lineShiftX = getLineShift(justify, boxShift[0]);
    const lineOrigins = lineWidths.map((lineWidth, i) => {
      const x = (boxSize[0] - lineWidth) * lineShiftX + boxOrigin[0];
      const y = i * lineHeight + boxOrigin[1];
      return [x, y];
    });

    // 5. Compute top left corners of the glyphs in each line,
    //    appending the font size scalar for final positioning
    const scalar = layout["text-size"](zoom, feature) / ONE_EM;
    const charPos = lines
      .flatMap((l, i) => layoutLine(l, lineOrigins[i], spacing, scalar));

    // 6. Fill in label origins for each glyph. TODO: assumes Point geometry
    const origin = feature.geometry.coordinates.slice();
    const labelPos = lines.flat()
      .flatMap(() => origin);

    // 7. Collect all the glyph rects
    const sdfRect = lines.flat()
      .flatMap(g => Object.values(g.rect));

    // 8. Compute bounding box for collision checks
    const textPadding = layout["text-padding"](zoom, feature);
    const bbox = [
      boxOrigin[0] * scalar - textPadding,
      boxOrigin[1] * scalar - textPadding,
      (boxOrigin[0] + boxSize[0]) * scalar + textPadding,
      (boxOrigin[1] + boxSize[1]) * scalar + textPadding
    ];

    return { labelPos, charPos, sdfRect, bbox };
  };
}
