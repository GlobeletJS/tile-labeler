import { getGlyphInfo, evaluateStyle } from "./shaping-utils.js";
import { layoutLines } from "./layout.js";
import { getTextBox } from "./textbox.js";
import { splitLines } from "./splits.js";
import { ONE_EM } from "sdf-manager";

export function initShaper(style) {
  return function(feature, zoom, atlas) {
    // For each feature, compute a list of info for each character:
    // - x0, y0  defining overall label position
    // - dx, dy  delta positions relative to label position
    // - x, y, w, h  defining the position of the glyph within the atlas

    // 1. Get the glyphs for the characters
    const glyphs = getGlyphInfo(feature, atlas);
    if (!glyphs) return;

    // 2. Evaluate style properties
    const styleVals = evaluateStyle(style, zoom, feature);

    // 3. Split into lines and position the characters
    const lines = splitLines(glyphs, styleVals);
    // TODO: What if no labelText, or it is all whitespace?
    const box = getTextBox(lines, styleVals);
    const charPos = layoutLines(lines, box, styleVals);

    // 4. Fill in label origins for each glyph. TODO: assumes Point geometry
    const scalar = styleVals["text-size"] / ONE_EM;
    const origin = [...feature.geometry.coordinates, scalar];
    const labelPos = lines.flat().flatMap(() => origin);

    // 5. Collect all the glyph rects, normalizing by atlas dimensions
    const { width, height } = atlas.image;
    const sdfRect = lines.flat().flatMap(g => {
      const { x, y, w, h } = g.rect;
      return [x / width, y / height, w / width, h / height];
    });

    // 6. Compute bounding box for collision checks
    const textPadding = styleVals["text-padding"];
    const bbox = [
      box.x * scalar - textPadding,
      box.y * scalar - textPadding,
      (box.x + box.w) * scalar + textPadding,
      (box.y + box.h) * scalar + textPadding
    ];

    return { labelPos, charPos, sdfRect, bbox };
  };
}
