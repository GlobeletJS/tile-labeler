import { splitLines } from "./splits.js";
import { ONE_EM } from "sdf-manager";
import { getBox, scalePadBox } from "./boxes.js";
import { layoutLines } from "./layout-text.js";

export function layout(glyphs, sprite, styleVals) {
  // Split text into lines
  // TODO: what if splitLines returns nothing?
  const lines = splitLines(glyphs, styleVals);

  // Get dimensions and relative position of text area (in glyph pixels)
  const { textLineHeight, textAnchor, textOffset } = styleVals;
  const w = Math.max(...lines.map(l => l.width));
  const h = lines.length * textLineHeight * ONE_EM;
  const textbox = getBox(w, h, textAnchor, textOffset.map(c => c * ONE_EM));

  // Position characters within text area
  const chars = layoutLines(lines, textbox, styleVals);

  // Get padded text box (for collision checks)
  const { textSize, textPadding } = styleVals;
  const textBbox = scalePadBox(textSize / ONE_EM, textPadding, textbox);

  return Object.assign(chars, { bbox: textBbox });
}

export function layoutSprite(sprite, styleVals) {
  const { metrics: { w, h }, spriteRect } = sprite;

  const { iconAnchor, iconOffset, iconSize, iconPadding } = styleVals;
  const iconbox = getBox(w, h, iconAnchor, iconOffset);
  const bbox = scalePadBox(iconSize, iconPadding, iconbox);

  const pos = [iconbox.x, iconbox.y, w, h].map(c => c * iconSize);

  return { pos, rect: spriteRect, bbox };
}
