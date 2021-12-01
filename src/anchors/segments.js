export function getLabelSegments(line, offset, spacing, labelLength, charSize) {
  const lineLength = line[line.length - 1].dist;
  const numLabels = Math.floor((lineLength - offset) / spacing) + 1;

  // How many points for each label? One per character width.
  // if (labelLength < charSize / 2) nS = 1;
  const nS = Math.round(labelLength / charSize) + 1;
  const dS = labelLength / nS;
  const halfLen = (nS - 1) * dS / 2;

  return Array.from({ length: numLabels })
    .map((v, i) => offset + i * spacing - halfLen)
    .map(s0 => getSegment(s0, dS, nS, line))
    .filter(segment => segment !== undefined);
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
