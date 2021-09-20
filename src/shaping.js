import { getGlyphInfo, evaluateStyle } from "./shaping-utils.js";
import { layoutLines } from "./layout.js";
import { getTextBox } from "./textbox.js";
import { splitLines } from "./splits.js";
import { ONE_EM } from "sdf-manager";

export function initShaper(style) {
  return function(feature, zoom, atlas) {
    const chars = getCharacters(feature, zoom, atlas);
    if (!chars) return;

    // TODO: The below assumes Point geometry
    const origin = [...feature.geometry.coordinates, chars.fontScalar];
    const labelPos = chars.flatMap(() => origin);

    const sdfRect = chars.flatMap(c => c.rect);
    const charPos = chars.flatMap(c => c.pos);
    const bbox = chars.bbox;

    return { labelPos, charPos, sdfRect, bbox };
  };

  function getCharacters(feature, zoom, atlas) {
    // Get the glyphs for the characters, and evaluate style properties
    const glyphs = getGlyphInfo(feature, atlas);
    if (!glyphs) return;
    const styleVals = evaluateStyle(style, zoom, feature);

    // Split into lines and position the characters
    const lines = splitLines(glyphs, styleVals);
    // TODO: What if no labelText, or it is all whitespace?
    const box = getTextBox(lines, styleVals);
    const positionedChars = layoutLines(lines, box, styleVals);

    // Compute bounding box for collision checks
    const fontScalar = styleVals["text-size"] / ONE_EM;
    const textPadding = styleVals["text-padding"];
    const bbox = [
      box.x * fontScalar - textPadding,
      box.y * fontScalar - textPadding,
      (box.x + box.w) * fontScalar + textPadding,
      (box.y + box.h) * fontScalar + textPadding
    ];

    return Object.assign(positionedChars, { fontScalar, bbox });
  }
}
