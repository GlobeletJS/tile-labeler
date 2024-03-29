import { ONE_EM } from "sdf-manager";
import { whitespace } from "./split-utils.js";
import { getBreakPoints } from "./linebreaks.js";

export function splitLines(glyphs, styleVals) {
  // glyphs is an Array of Objects with properties { code, metrics }
  const { textLetterSpacing, textMaxWidth, symbolPlacement } = styleVals;
  const spacing = textLetterSpacing * ONE_EM;
  const totalWidth = measureLine(glyphs, spacing);
  if (totalWidth == 0.0) return [];

  const lineCount = (symbolPlacement === "point" && textMaxWidth > 0)
    ? Math.ceil(totalWidth / textMaxWidth / ONE_EM)
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
