import * as yawgl from "yawgl";

export function render(data, atlas) {
  const canvas = document.getElementById("tileCanvas");
  const pixRatio = window.devicePixelRatio;
  yawgl.resizeCanvasToDisplaySize(canvas, pixRatio);
  const context = canvas.getContext("2d");
  context.strokeStyle = "red";

  Object.values(data).forEach(layer => layer.buffers.forEach(outlineChars));

  function outlineChars({ charPos, labelPos }) {
    const chars = charPos.slice();
    const anchors = labelPos.slice();
    while (chars.length) {
      const [x0, y0, angle] = anchors.splice(0, 4);
      context.scale(pixRatio, pixRatio);
      context.translate(x0, y0);
      context.rotate(angle);
      const [x, y, w, h] = chars.splice(0, 4);
      context.strokeRect(x, y, w, h);
      context.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  console.log("Shaped layers: " + JSON.stringify(data, null, 2));
  console.log("All done!");
}
