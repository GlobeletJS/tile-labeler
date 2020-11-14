export const whitespace = {
  // From mapbox-gl-js/src/symbol/shaping.js
  [0x09]: true, // tab
  [0x0a]: true, // newline
  [0x0b]: true, // vertical tab
  [0x0c]: true, // form feed
  [0x0d]: true, // carriage return
  [0x20]: true, // space
};

export const breakable = {
  // From mapbox-gl-js/src/symbol/shaping.js
  [0x0a]:   true, // newline
  [0x20]:   true, // space
  [0x26]:   true, // ampersand
  [0x28]:   true, // left parenthesis
  [0x29]:   true, // right parenthesis
  [0x2b]:   true, // plus sign
  [0x2d]:   true, // hyphen-minus
  [0x2f]:   true, // solidus
  [0xad]:   true, // soft hyphen
  [0xb7]:   true, // middle dot
  [0x200b]: true, // zero-width space
  [0x2010]: true, // hyphen
  [0x2013]: true, // en dash
  [0x2027]: true  // interpunct
};
