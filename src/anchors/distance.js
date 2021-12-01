import { segmentIntersectsTile, getIntersections } from "./intersection.js";

export function addDistances(line) {
  let cumulative = 0.0;
  const distances = line.slice(1).map((c, i) => {
    cumulative += dist(line[i], c);
    return { coord: c, dist: cumulative };
  });
  distances.unshift({ coord: line[0], dist: 0.0 });
  return distances;
}

export function getDistanceToEdge(line, extent) {
  // Does the line start inside the tile? Find the distance from edge (<0)
  const fromEdge = line[0].coord
    .map(c => Math.max(-c, c - extent)) // Use closer of [0, extent]
    .reduce((a, c) => Math.max(a, c));  // Use closer of [x, y]
  if (fromEdge < 0) return fromEdge;

  // Line starts outside. Find segment intersecting the tile
  const i = line.slice(1).findIndex((p, i) => {
    return segmentIntersectsTile(line[i].coord, p.coord, extent);
  });
  if (i < 0) return 0; // Line stays outside tile

  // Find the first intersection of this segment with the tile boundary
  const edge = findBoundaryPoint(line[i], line[i + 1], extent);

  return edge.dist;
}

function findBoundaryPoint(p0, p1, extent) {
  // The segment from p0 to p1 intersects the square from [0, 0] to
  // [extent, extent]. Find the intersecting point closest to p0
  const intersections = getIntersections([p0.coord, p1.coord], extent);
  if (!intersections.length) return { dist: 0 };

  return intersections
    .map(p => ({ coord: p, dist: p0.dist + dist(p0.coord, p) }))
    .reduce((a, c) => (c.dist < a.dist) ? c : a);
}

function dist([x0, y0], [x1, y1]) {
  return Math.hypot(x1 - x0, y1 - y0);
}
