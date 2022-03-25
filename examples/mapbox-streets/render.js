import * as yawgl from "yawgl";

export function render(data, atlas) {
  const canvas = document.getElementById("tileCanvas");
  const pixRatio = window.devicePixelRatio;
  yawgl.resizeCanvasToDisplaySize(canvas, pixRatio);
  const context = canvas.getContext("2d");

  Object.values(data).forEach(layer => layer.buffers.forEach(outlineGlyphs));

  function outlineGlyphs({ glyphPos, labelPos }) {
    const glyphs = glyphPos.slice();
    const anchors = labelPos.slice();

    while (glyphs.length) {
      const [x0, y0, angle, scalar] = anchors.splice(0, 4);
      context.strokeStyle = (scalar > 0.0) ? "red" : "blue";
      context.scale(pixRatio, pixRatio);
      context.translate(x0, y0);
      context.rotate(angle);
      const [x, y, w, h] = glyphs.splice(0, 4);
      context.strokeRect(x, y, w, h);
      context.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  console.log("Shaped layers: " + JSON.stringify(data, null, 2));
  console.log("All done!");
}
