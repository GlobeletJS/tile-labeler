const { max, abs, cos, sin, atan2 } = Math;

export function fitLine(points) {
  if (points.length < 2) {
    return { anchor: points[0].coord, angle: 0.0, error: 0.0 };
  }

  // Fit X and Y coordinates as a function of chord distance
  const xFit = linearFit(points.map(p => [p.dist, p.coord[0]]));
  const yFit = linearFit(points.map(p => [p.dist, p.coord[1]]));

  // Transform to a single anchor point and rotation angle
  const anchor = [xFit.mean, yFit.mean];
  const angle = atan2(yFit.slope, xFit.slope);

  // Compute an error metric: shift and rotate, find largest abs(y)
  const transform = setupTransform(anchor, angle);
  const error = points.map(p => abs(transform(p.coord)[1]))
    .reduce((maxErr, c) => max(maxErr, c));

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
