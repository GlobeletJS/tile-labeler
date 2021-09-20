import { ONE_EM } from "sdf-manager";
import { whitespace } from "./split-utils.js";
import { getBreakPoints } from "./linebreaks.js";

export function splitLines(glyphs, styleVals) {
  // glyphs is an Array of Objects with properties { code, metrics }
  const spacing = styleVals["text-letter-spacing"] * ONE_EM;
  const totalWidth = measureLine(glyphs, spacing);

  const maxWidth = styleVals["text-max-width"] * ONE_EM;
  const lineCount = Math.ceil(totalWidth / maxWidth);
  if (lineCount < 1) return [];

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
