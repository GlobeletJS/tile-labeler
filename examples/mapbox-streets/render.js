import * as yawgl from "yawgl";

export function render(data, atlas) {
  const canvas = document.getElementById("tileCanvas");
  const pixRatio = window.devicePixelRatio;
  yawgl.resizeCanvasToDisplaySize(canvas, pixRatio);
  const context = canvas.getContext("2d");

  Object.values(data).forEach(layer => layer.buffers.forEach(drawOutlines));

  function drawOutlines({ spritePos, labelPos0, charPos, labelPos }) {
    context.strokeStyle = "blue";
    if (spritePos) outlineRects(spritePos.slice(), labelPos0.slice(), 3);
    context.strokeStyle = "red";
    if (charPos) outlineRects(charPos.slice(), labelPos.slice(), 4);
  }

  function outlineRects(rects, anchors, anchorLength) {
    while (rects.length) {
      const [x0, y0, angle] = anchors.splice(0, anchorLength);
      context.scale(pixRatio, pixRatio);
      context.translate(x0, y0);
      context.rotate(angle);
      const [x, y, w, h] = rects.splice(0, 4);
      context.strokeRect(x, y, w, h);
      context.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  console.log("Shaped layers: " + JSON.stringify(data, null, 2));
  console.log("All done!");
}
