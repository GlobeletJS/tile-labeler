import { getTokenParser } from "./tokens.js";

export function initPreprocessor({ layout }) {
  const styleKeys = [
    "text-field",
    "text-transform",
    "text-font",
    "icon-image",
  ];

  return function(feature, zoom) {
    const styleVals = styleKeys
      .reduce((d, k) => (d[k] = layout[k](zoom, feature), d), {});
    const { properties } = feature;

    const spriteID = getTokenParser(styleVals["icon-image"])(properties);
    const text = getTokenParser(styleVals["text-field"])(properties);
    const haveText = (typeof text === "string" && text.length > 0);

    if (!haveText && spriteID === undefined) return;

    if (!haveText) return Object.assign(feature, { spriteID });

    const labelText = getTextTransform(styleVals["text-transform"])(text);
    const charCodes = labelText.split("").map(c => c.charCodeAt(0));
    const font = styleVals["text-font"];
    return Object.assign({ spriteID, charCodes, font }, feature);
  };
}

function getTextTransform(code) {
  switch (code) {
    case "uppercase":
      return f => f.toUpperCase();
    case "lowercase":
      return f => f.toLowerCase();
    case "none":
    default:
      return f => f;
  }
}
