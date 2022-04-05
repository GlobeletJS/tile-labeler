(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.tileLabeler = {}));
})(this, (function (exports) { 'use strict';

  var ieee754 = {};

  /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */

  ieee754.read = function (buffer, offset, isLE, mLen, nBytes) {
    var e, m;
    var eLen = (nBytes * 8) - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var nBits = -7;
    var i = isLE ? (nBytes - 1) : 0;
    var d = isLE ? -1 : 1;
    var s = buffer[offset + i];

    i += d;

    e = s & ((1 << (-nBits)) - 1);
    s >>= (-nBits);
    nBits += eLen;
    for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

    m = e & ((1 << (-nBits)) - 1);
    e >>= (-nBits);
    nBits += mLen;
    for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : ((s ? -1 : 1) * Infinity)
    } else {
      m = m + Math.pow(2, mLen);
      e = e - eBias;
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
  };

  ieee754.write = function (buffer, value, offset, isLE, mLen, nBytes) {
    var e, m, c;
    var eLen = (nBytes * 8) - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
    var i = isLE ? 0 : (nBytes - 1);
    var d = isLE ? 1 : -1;
    var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

    value = Math.abs(value);

    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0;
      e = eMax;
    } else {
      e = Math.floor(Math.log(value) / Math.LN2);
      if (value * (c = Math.pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }
      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * Math.pow(2, 1 - eBias);
      }
      if (value * c >= 2) {
        e++;
        c /= 2;
      }

      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = ((value * c) - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }

    for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

    e = (e << mLen) | m;
    eLen += mLen;
    for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

    buffer[offset + i - d] |= s * 128;
  };

  function readVarintRemainder(l, s, p) {
      var buf = p.buf,
          h, b;

      b = buf[p.pos++]; h  = (b & 0x70) >> 4;  if (b < 0x80) return toNum(l, h, s);
      b = buf[p.pos++]; h |= (b & 0x7f) << 3;  if (b < 0x80) return toNum(l, h, s);
      b = buf[p.pos++]; h |= (b & 0x7f) << 10; if (b < 0x80) return toNum(l, h, s);
      b = buf[p.pos++]; h |= (b & 0x7f) << 17; if (b < 0x80) return toNum(l, h, s);
      b = buf[p.pos++]; h |= (b & 0x7f) << 24; if (b < 0x80) return toNum(l, h, s);
      b = buf[p.pos++]; h |= (b & 0x01) << 31; if (b < 0x80) return toNum(l, h, s);

      throw new Error('Expected varint not more than 10 bytes');
  }

  function toNum(low, high, isSigned) {
      if (isSigned) {
          return high * 0x100000000 + (low >>> 0);
      }

      return ((high >>> 0) * 0x100000000) + (low >>> 0);
  }

  function writeBigVarint(val, pbf) {
      var low, high;

      if (val >= 0) {
          low  = (val % 0x100000000) | 0;
          high = (val / 0x100000000) | 0;
      } else {
          low  = ~(-val % 0x100000000);
          high = ~(-val / 0x100000000);

          if (low ^ 0xffffffff) {
              low = (low + 1) | 0;
          } else {
              low = 0;
              high = (high + 1) | 0;
          }
      }

      if (val >= 0x10000000000000000 || val < -0x10000000000000000) {
          throw new Error('Given varint doesn\'t fit into 10 bytes');
      }

      pbf.realloc(10);

      writeBigVarintLow(low, high, pbf);
      writeBigVarintHigh(high, pbf);
  }

  function writeBigVarintLow(low, high, pbf) {
      pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7;
      pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7;
      pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7;
      pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7;
      pbf.buf[pbf.pos]   = low & 0x7f;
  }

  function writeBigVarintHigh(high, pbf) {
      var lsb = (high & 0x07) << 4;

      pbf.buf[pbf.pos++] |= lsb         | ((high >>>= 3) ? 0x80 : 0); if (!high) return;
      pbf.buf[pbf.pos++]  = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return;
      pbf.buf[pbf.pos++]  = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return;
      pbf.buf[pbf.pos++]  = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return;
      pbf.buf[pbf.pos++]  = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return;
      pbf.buf[pbf.pos++]  = high & 0x7f;
  }

  // Buffer code below from https://github.com/feross/buffer, MIT-licensed

  function readUtf8(buf, pos, end) {
      var str = '';
      var i = pos;

      while (i < end) {
          var b0 = buf[i];
          var c = null; // codepoint
          var bytesPerSequence =
              b0 > 0xEF ? 4 :
              b0 > 0xDF ? 3 :
              b0 > 0xBF ? 2 : 1;

          if (i + bytesPerSequence > end) break;

          var b1, b2, b3;

          if (bytesPerSequence === 1) {
              if (b0 < 0x80) c = b0;
          } else if (bytesPerSequence === 2) {
              b1 = buf[i + 1];
              if ((b1 & 0xC0) === 0x80) {
                  c = (b0 & 0x1F) << 0x6 | (b1 & 0x3F);
                  if (c <= 0x7F) c = null;
              }
          } else if (bytesPerSequence === 3) {
              b1 = buf[i + 1];
              b2 = buf[i + 2];
              if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80) {
                  c = (b0 & 0xF) << 0xC | (b1 & 0x3F) << 0x6 | (b2 & 0x3F);
                  if (c <= 0x7FF || (c >= 0xD800 && c <= 0xDFFF)) c = null;
              }
          } else if (bytesPerSequence === 4) {
              b1 = buf[i + 1];
              b2 = buf[i + 2];
              b3 = buf[i + 3];
              if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80) {
                  c = (b0 & 0xF) << 0x12 | (b1 & 0x3F) << 0xC | (b2 & 0x3F) << 0x6 | (b3 & 0x3F);
                  if (c <= 0xFFFF || c >= 0x110000) c = null;
              }
          }

          if (c === null) {
              c = 0xFFFD;
              bytesPerSequence = 1;

          } else if (c > 0xFFFF) {
              c -= 0x10000;
              str += String.fromCharCode(c >>> 10 & 0x3FF | 0xD800);
              c = 0xDC00 | c & 0x3FF;
          }

          str += String.fromCharCode(c);
          i += bytesPerSequence;
      }

      return str;
  }

  function writeUtf8(buf, str, pos) {
      for (var i = 0, c, lead; i < str.length; i++) {
          c = str.charCodeAt(i); // code point

          if (c > 0xD7FF && c < 0xE000) {
              if (lead) {
                  if (c < 0xDC00) {
                      buf[pos++] = 0xEF;
                      buf[pos++] = 0xBF;
                      buf[pos++] = 0xBD;
                      lead = c;
                      continue;
                  } else {
                      c = lead - 0xD800 << 10 | c - 0xDC00 | 0x10000;
                      lead = null;
                  }
              } else {
                  if (c > 0xDBFF || (i + 1 === str.length)) {
                      buf[pos++] = 0xEF;
                      buf[pos++] = 0xBF;
                      buf[pos++] = 0xBD;
                  } else {
                      lead = c;
                  }
                  continue;
              }
          } else if (lead) {
              buf[pos++] = 0xEF;
              buf[pos++] = 0xBF;
              buf[pos++] = 0xBD;
              lead = null;
          }

          if (c < 0x80) {
              buf[pos++] = c;
          } else {
              if (c < 0x800) {
                  buf[pos++] = c >> 0x6 | 0xC0;
              } else {
                  if (c < 0x10000) {
                      buf[pos++] = c >> 0xC | 0xE0;
                  } else {
                      buf[pos++] = c >> 0x12 | 0xF0;
                      buf[pos++] = c >> 0xC & 0x3F | 0x80;
                  }
                  buf[pos++] = c >> 0x6 & 0x3F | 0x80;
              }
              buf[pos++] = c & 0x3F | 0x80;
          }
      }
      return pos;
  }

  // Buffer code below from https://github.com/feross/buffer, MIT-licensed

  function readUInt32(buf, pos) {
      return ((buf[pos]) |
          (buf[pos + 1] << 8) |
          (buf[pos + 2] << 16)) +
          (buf[pos + 3] * 0x1000000);
  }

  function writeInt32(buf, val, pos) {
      buf[pos] = val;
      buf[pos + 1] = (val >>> 8);
      buf[pos + 2] = (val >>> 16);
      buf[pos + 3] = (val >>> 24);
  }

  function readInt32(buf, pos) {
      return ((buf[pos]) |
          (buf[pos + 1] << 8) |
          (buf[pos + 2] << 16)) +
          (buf[pos + 3] << 24);
  }

  function Pbf(buf) {
      this.buf = ArrayBuffer.isView(buf) ? buf : new Uint8Array(buf || 0);
      this.pos = 0;
      this.type = 0;
      this.length = this.buf.length;
  }

  Pbf.Varint  = 0; // varint: int32, int64, uint32, uint64, sint32, sint64, bool, enum
  Pbf.Fixed64 = 1; // 64-bit: double, fixed64, sfixed64
  Pbf.Bytes   = 2; // length-delimited: string, bytes, embedded messages, packed repeated fields
  Pbf.Fixed32 = 5; // 32-bit: float, fixed32, sfixed32

  var SHIFT_LEFT_32 = (1 << 16) * (1 << 16),
      SHIFT_RIGHT_32 = 1 / SHIFT_LEFT_32;

  // Threshold chosen based on both benchmarking and knowledge about browser string
  // data structures (which currently switch structure types at 12 bytes or more)
  var TEXT_DECODER_MIN_LENGTH = 12;
  var utf8TextDecoder = new TextDecoder('utf-8');

  Pbf.prototype = {

      destroy: function() {
          this.buf = null;
      },

      // === READING =================================================================

      readFields: function(readField, result, end) {
          end = end || this.length;

          while (this.pos < end) {
              var val = this.readVarint(),
                  tag = val >> 3,
                  startPos = this.pos;

              this.type = val & 0x7;
              readField(tag, result, this);

              if (this.pos === startPos) this.skip(val);
          }
          return result;
      },

      readMessage: function(readField, result) {
          return this.readFields(readField, result, this.readVarint() + this.pos);
      },

      readFixed32: function() {
          var val = readUInt32(this.buf, this.pos);
          this.pos += 4;
          return val;
      },

      readSFixed32: function() {
          var val = readInt32(this.buf, this.pos);
          this.pos += 4;
          return val;
      },

      // 64-bit int handling is based on github.com/dpw/node-buffer-more-ints (MIT-licensed)

      readFixed64: function() {
          var val = readUInt32(this.buf, this.pos) + readUInt32(this.buf, this.pos + 4) * SHIFT_LEFT_32;
          this.pos += 8;
          return val;
      },

      readSFixed64: function() {
          var val = readUInt32(this.buf, this.pos) + readInt32(this.buf, this.pos + 4) * SHIFT_LEFT_32;
          this.pos += 8;
          return val;
      },

      readFloat: function() {
          var val = ieee754.read(this.buf, this.pos, true, 23, 4);
          this.pos += 4;
          return val;
      },

      readDouble: function() {
          var val = ieee754.read(this.buf, this.pos, true, 52, 8);
          this.pos += 8;
          return val;
      },

      readVarint: function(isSigned) {
          var buf = this.buf,
              val, b;

          b = buf[this.pos++]; val  =  b & 0x7f;        if (b < 0x80) return val;
          b = buf[this.pos++]; val |= (b & 0x7f) << 7;  if (b < 0x80) return val;
          b = buf[this.pos++]; val |= (b & 0x7f) << 14; if (b < 0x80) return val;
          b = buf[this.pos++]; val |= (b & 0x7f) << 21; if (b < 0x80) return val;
          b = buf[this.pos];   val |= (b & 0x0f) << 28;

          return readVarintRemainder(val, isSigned, this);
      },

      readVarint64: function() { // for compatibility with v2.0.1
          return this.readVarint(true);
      },

      readSVarint: function() {
          var num = this.readVarint();
          return num % 2 === 1 ? (num + 1) / -2 : num / 2; // zigzag encoding
      },

      readBoolean: function() {
          return Boolean(this.readVarint());
      },

      readString: function() {
          var end = this.readVarint() + this.pos;
          var pos = this.pos;
          this.pos = end;

          if (end - pos >= TEXT_DECODER_MIN_LENGTH && utf8TextDecoder) {
              // longer strings are fast with the built-in browser TextDecoder API
              return utf8TextDecoder.decode(this.buf.subarray(pos, end));
          }
          // short strings are fast with our custom implementation
          return readUtf8(this.buf, pos, end);
      },

      readBytes: function() {
          var end = this.readVarint() + this.pos,
              buffer = this.buf.subarray(this.pos, end);
          this.pos = end;
          return buffer;
      },

      // verbose for performance reasons; doesn't affect gzipped size

      readPackedVarint: function(arr = [], isSigned) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readVarint(isSigned));
          var end = readPackedEnd(this);
          while (this.pos < end) arr.push(this.readVarint(isSigned));
          return arr;
      },
      readPackedSVarint: function(arr = []) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readSVarint());
          var end = readPackedEnd(this);
          while (this.pos < end) arr.push(this.readSVarint());
          return arr;
      },
      readPackedBoolean: function(arr = []) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readBoolean());
          var end = readPackedEnd(this);
          while (this.pos < end) arr.push(this.readBoolean());
          return arr;
      },
      readPackedFloat: function(arr = []) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readFloat());
          var end = readPackedEnd(this);
          while (this.pos < end) arr.push(this.readFloat());
          return arr;
      },
      readPackedDouble: function(arr = []) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readDouble());
          var end = readPackedEnd(this);
          while (this.pos < end) arr.push(this.readDouble());
          return arr;
      },
      readPackedFixed32: function(arr = []) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readFixed32());
          var end = readPackedEnd(this);
          while (this.pos < end) arr.push(this.readFixed32());
          return arr;
      },
      readPackedSFixed32: function(arr = []) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readSFixed32());
          var end = readPackedEnd(this);
          while (this.pos < end) arr.push(this.readSFixed32());
          return arr;
      },
      readPackedFixed64: function(arr = []) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readFixed64());
          var end = readPackedEnd(this);
          while (this.pos < end) arr.push(this.readFixed64());
          return arr;
      },
      readPackedSFixed64: function(arr = []) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readSFixed64());
          var end = readPackedEnd(this);
          while (this.pos < end) arr.push(this.readSFixed64());
          return arr;
      },

      skip: function(val) {
          var type = val & 0x7;
          if (type === Pbf.Varint) while (this.buf[this.pos++] > 0x7f) {}
          else if (type === Pbf.Bytes) this.pos = this.readVarint() + this.pos;
          else if (type === Pbf.Fixed32) this.pos += 4;
          else if (type === Pbf.Fixed64) this.pos += 8;
          else throw new Error('Unimplemented type: ' + type);
      },

      // === WRITING =================================================================

      writeTag: function(tag, type) {
          this.writeVarint((tag << 3) | type);
      },

      realloc: function(min) {
          var length = this.length || 16;

          while (length < this.pos + min) length *= 2;

          if (length !== this.length) {
              var buf = new Uint8Array(length);
              buf.set(this.buf);
              this.buf = buf;
              this.length = length;
          }
      },

      finish: function() {
          this.length = this.pos;
          this.pos = 0;
          return this.buf.subarray(0, this.length);
      },

      writeFixed32: function(val) {
          this.realloc(4);
          writeInt32(this.buf, val, this.pos);
          this.pos += 4;
      },

      writeSFixed32: function(val) {
          this.realloc(4);
          writeInt32(this.buf, val, this.pos);
          this.pos += 4;
      },

      writeFixed64: function(val) {
          this.realloc(8);
          writeInt32(this.buf, val & -1, this.pos);
          writeInt32(this.buf, Math.floor(val * SHIFT_RIGHT_32), this.pos + 4);
          this.pos += 8;
      },

      writeSFixed64: function(val) {
          this.realloc(8);
          writeInt32(this.buf, val & -1, this.pos);
          writeInt32(this.buf, Math.floor(val * SHIFT_RIGHT_32), this.pos + 4);
          this.pos += 8;
      },

      writeVarint: function(val) {
          val = +val || 0;

          if (val > 0xfffffff || val < 0) {
              writeBigVarint(val, this);
              return;
          }

          this.realloc(4);

          this.buf[this.pos++] =           val & 0x7f  | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return;
          this.buf[this.pos++] = ((val >>>= 7) & 0x7f) | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return;
          this.buf[this.pos++] = ((val >>>= 7) & 0x7f) | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return;
          this.buf[this.pos++] =   (val >>> 7) & 0x7f;
      },

      writeSVarint: function(val) {
          this.writeVarint(val < 0 ? -val * 2 - 1 : val * 2);
      },

      writeBoolean: function(val) {
          this.writeVarint(Boolean(val));
      },

      writeString: function(str) {
          str = String(str);
          this.realloc(str.length * 4);

          this.pos++; // reserve 1 byte for short string length

          var startPos = this.pos;
          // write the string directly to the buffer and see how much was written
          this.pos = writeUtf8(this.buf, str, this.pos);
          var len = this.pos - startPos;

          if (len >= 0x80) makeRoomForExtraLength(startPos, len, this);

          // finally, write the message length in the reserved place and restore the position
          this.pos = startPos - 1;
          this.writeVarint(len);
          this.pos += len;
      },

      writeFloat: function(val) {
          this.realloc(4);
          ieee754.write(this.buf, val, this.pos, true, 23, 4);
          this.pos += 4;
      },

      writeDouble: function(val) {
          this.realloc(8);
          ieee754.write(this.buf, val, this.pos, true, 52, 8);
          this.pos += 8;
      },

      writeBytes: function(buffer) {
          var len = buffer.length;
          this.writeVarint(len);
          this.realloc(len);
          for (var i = 0; i < len; i++) this.buf[this.pos++] = buffer[i];
      },

      writeRawMessage: function(fn, obj) {
          this.pos++; // reserve 1 byte for short message length

          // write the message directly to the buffer and see how much was written
          var startPos = this.pos;
          fn(obj, this);
          var len = this.pos - startPos;

          if (len >= 0x80) makeRoomForExtraLength(startPos, len, this);

          // finally, write the message length in the reserved place and restore the position
          this.pos = startPos - 1;
          this.writeVarint(len);
          this.pos += len;
      },

      writeMessage: function(tag, fn, obj) {
          this.writeTag(tag, Pbf.Bytes);
          this.writeRawMessage(fn, obj);
      },

      writePackedVarint:   function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedVarint, arr);   },
      writePackedSVarint:  function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedSVarint, arr);  },
      writePackedBoolean:  function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedBoolean, arr);  },
      writePackedFloat:    function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedFloat, arr);    },
      writePackedDouble:   function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedDouble, arr);   },
      writePackedFixed32:  function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedFixed32, arr);  },
      writePackedSFixed32: function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedSFixed32, arr); },
      writePackedFixed64:  function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedFixed64, arr);  },
      writePackedSFixed64: function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedSFixed64, arr); },

      writeBytesField: function(tag, buffer) {
          this.writeTag(tag, Pbf.Bytes);
          this.writeBytes(buffer);
      },
      writeFixed32Field: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed32);
          this.writeFixed32(val);
      },
      writeSFixed32Field: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed32);
          this.writeSFixed32(val);
      },
      writeFixed64Field: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed64);
          this.writeFixed64(val);
      },
      writeSFixed64Field: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed64);
          this.writeSFixed64(val);
      },
      writeVarintField: function(tag, val) {
          this.writeTag(tag, Pbf.Varint);
          this.writeVarint(val);
      },
      writeSVarintField: function(tag, val) {
          this.writeTag(tag, Pbf.Varint);
          this.writeSVarint(val);
      },
      writeStringField: function(tag, str) {
          this.writeTag(tag, Pbf.Bytes);
          this.writeString(str);
      },
      writeFloatField: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed32);
          this.writeFloat(val);
      },
      writeDoubleField: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed64);
          this.writeDouble(val);
      },
      writeBooleanField: function(tag, val) {
          this.writeVarintField(tag, Boolean(val));
      }
  };

  function readPackedEnd(pbf) {
      return pbf.type === Pbf.Bytes ?
          pbf.readVarint() + pbf.pos : pbf.pos + 1;
  }

  function makeRoomForExtraLength(startPos, len, pbf) {
      var extraLen =
          len <= 0x3fff ? 1 :
          len <= 0x1fffff ? 2 :
          len <= 0xfffffff ? 3 : Math.floor(Math.log(len) / (Math.LN2 * 7));

      // if 1 byte isn't enough for encoding message length, shift the data to the right
      pbf.realloc(extraLen);
      for (var i = pbf.pos - 1; i >= startPos; i--) pbf.buf[i + extraLen] = pbf.buf[i];
  }

  function writePackedVarint(arr, pbf)   { arr.forEach(pbf.writeVarint, pbf);   }
  function writePackedSVarint(arr, pbf)  { arr.forEach(pbf.writeSVarint, pbf);  }
  function writePackedFloat(arr, pbf)    { arr.forEach(pbf.writeFloat, pbf);    }
  function writePackedDouble(arr, pbf)   { arr.forEach(pbf.writeDouble, pbf);   }
  function writePackedBoolean(arr, pbf)  { arr.forEach(pbf.writeBoolean, pbf);  }
  function writePackedFixed32(arr, pbf)  { arr.forEach(pbf.writeFixed32, pbf);  }
  function writePackedSFixed32(arr, pbf) { arr.forEach(pbf.writeSFixed32, pbf); }
  function writePackedFixed64(arr, pbf)  { arr.forEach(pbf.writeFixed64, pbf);  }
  function writePackedSFixed64(arr, pbf) { arr.forEach(pbf.writeSFixed64, pbf); }

  class AlphaImage {
    // See maplibre-gl-js/src/util/image.js
    constructor(size, data) {
      createImage(this, size, 1, data);
    }

    resize(size) {
      resizeImage(this, size, 1);
    }

    clone() {
      return new AlphaImage(
        { width: this.width, height: this.height },
        new Uint8Array(this.data)
      );
    }

    static copy(srcImg, dstImg, srcPt, dstPt, size) {
      copyImage(srcImg, dstImg, srcPt, dstPt, size, 1);
    }
  }

  function createImage(image, { width, height }, channels, data) {
    if (!data) {
      data = new Uint8Array(width * height * channels);
    } else if (data.length !== width * height * channels) {
      throw new RangeError("mismatched image size");
    }
    return Object.assign(image, { width, height, data });
  }

  function resizeImage(image, { width, height }, channels) {
    if (width === image.width && height === image.height) return;

    const size = {
      width: Math.min(image.width, width),
      height: Math.min(image.height, height),
    };

    const newImage = createImage({}, { width, height }, channels);

    copyImage(image, newImage, { x: 0, y: 0 }, { x: 0, y: 0 }, size, channels);

    Object.assign(image, { width, height, data: newImage.data });
  }

  function copyImage(srcImg, dstImg, srcPt, dstPt, size, channels) {
    if (size.width === 0 || size.height === 0) return dstImg;

    if (outOfRange(srcPt, size, srcImg)) {
      throw new RangeError("out of range source coordinates for image copy");
    }
    if (outOfRange(dstPt, size, dstImg)) {
      throw new RangeError("out of range destination coordinates for image copy");
    }

    const srcData = srcImg.data;
    const dstData = dstImg.data;

    console.assert(
      srcData !== dstData,
      "copyImage: src and dst data are identical!"
    );

    for (let y = 0; y < size.height; y++) {
      const srcOffset = ((srcPt.y + y) * srcImg.width + srcPt.x) * channels;
      const dstOffset = ((dstPt.y + y) * dstImg.width + dstPt.x) * channels;
      for (let i = 0; i < size.width * channels; i++) {
        dstData[dstOffset + i] = srcData[srcOffset + i];
      }
    }

    return dstImg;
  }

  function outOfRange(point, size, image) {
    const { width, height } = size;
    return (
      width > image.width ||
      height > image.height ||
      point.x > image.width - width ||
      point.y > image.height - height
    );
  }

  const GLYPH_PBF_BORDER = 3;
  const ONE_EM = 24;

  function parseGlyphPbf(data) {
    // See maplibre-gl-js/src/style/parse_glyph_pbf.js
    // Input is an ArrayBuffer, which will be read as a Uint8Array
    return new Pbf(data).readFields(readFontstacks, []);
  }

  function readFontstacks(tag, glyphs, pbf) {
    if (tag === 1) pbf.readMessage(readFontstack, glyphs);
  }

  function readFontstack(tag, glyphs, pbf) {
    if (tag !== 3) return;

    const glyph = pbf.readMessage(readGlyph, {});
    const { id, bitmap, width, height, left, top, advance } = glyph;

    const borders = 2 * GLYPH_PBF_BORDER;
    const size = { width: width + borders, height: height + borders };

    glyphs.push({
      id,
      bitmap: new AlphaImage(size, bitmap),
      metrics: { width, height, left, top, advance }
    });
  }

  function readGlyph(tag, glyph, pbf) {
    if (tag === 1) glyph.id = pbf.readVarint();
    else if (tag === 2) glyph.bitmap = pbf.readBytes();
    else if (tag === 3) glyph.width = pbf.readVarint();
    else if (tag === 4) glyph.height = pbf.readVarint();
    else if (tag === 5) glyph.left = pbf.readSVarint();
    else if (tag === 6) glyph.top = pbf.readSVarint();
    else if (tag === 7) glyph.advance = pbf.readVarint();
  }

  function initGlyphCache(endpoint) {
    const fonts = {};

    function getBlock(font, range) {
      const first = range * 256;
      const last = first + 255;
      const href = endpoint
        .replace("{fontstack}", font.split(" ").join("%20"))
        .replace("{range}", first + "-" + last);

      return fetch(href)
        .then(getArrayBuffer)
        .then(parseGlyphPbf)
        .then(glyphs => glyphs.reduce((d, g) => (d[g.id] = g, d), {}));
    }

    return function(font, code) {
      // 1. Find the 256-char block containing this code
      if (code > 65535) throw Error("glyph codes > 65535 not supported");
      const range = Math.floor(code / 256);

      // 2. Get the Promise for the retrieval and parsing of the block
      const blocks = fonts[font] || (fonts[font] = {});
      const block = blocks[range] || (blocks[range] = getBlock(font, range));

      // 3. Return a Promise that resolves to the requested glyph
      // NOTE: may be undefined! if the API returns a sparse or empty block
      return block.then(glyphs => glyphs[code]);
    };
  }

  function getArrayBuffer(response) {
    if (!response.ok) throw Error(response.status + " " + response.statusText);
    return response.arrayBuffer();
  }

  function potpack(boxes) {

      // calculate total box area and maximum box width
      let area = 0;
      let maxWidth = 0;

      for (const box of boxes) {
          area += box.w * box.h;
          maxWidth = Math.max(maxWidth, box.w);
      }

      // sort the boxes for insertion by height, descending
      boxes.sort((a, b) => b.h - a.h);

      // aim for a squarish resulting container,
      // slightly adjusted for sub-100% space utilization
      const startWidth = Math.max(Math.ceil(Math.sqrt(area / 0.95)), maxWidth);

      // start with a single empty space, unbounded at the bottom
      const spaces = [{x: 0, y: 0, w: startWidth, h: Infinity}];

      let width = 0;
      let height = 0;

      for (const box of boxes) {
          // look through spaces backwards so that we check smaller spaces first
          for (let i = spaces.length - 1; i >= 0; i--) {
              const space = spaces[i];

              // look for empty spaces that can accommodate the current box
              if (box.w > space.w || box.h > space.h) continue;

              // found the space; add the box to its top-left corner
              // |-------|-------|
              // |  box  |       |
              // |_______|       |
              // |         space |
              // |_______________|
              box.x = space.x;
              box.y = space.y;

              height = Math.max(height, box.y + box.h);
              width = Math.max(width, box.x + box.w);

              if (box.w === space.w && box.h === space.h) {
                  // space matches the box exactly; remove it
                  const last = spaces.pop();
                  if (i < spaces.length) spaces[i] = last;

              } else if (box.h === space.h) {
                  // space matches the box height; update it accordingly
                  // |-------|---------------|
                  // |  box  | updated space |
                  // |_______|_______________|
                  space.x += box.w;
                  space.w -= box.w;

              } else if (box.w === space.w) {
                  // space matches the box width; update it accordingly
                  // |---------------|
                  // |      box      |
                  // |_______________|
                  // | updated space |
                  // |_______________|
                  space.y += box.h;
                  space.h -= box.h;

              } else {
                  // otherwise the box splits the space into two spaces
                  // |-------|-----------|
                  // |  box  | new space |
                  // |_______|___________|
                  // | updated space     |
                  // |___________________|
                  spaces.push({
                      x: space.x + box.w,
                      y: space.y,
                      w: space.w - box.w,
                      h: box.h
                  });
                  space.y += box.h;
                  space.h -= box.h;
              }
              break;
          }
      }

      return {
          w: width, // container width
          h: height, // container height
          fill: (area / (width * height)) || 0 // space utilization
      };
  }

  const ATLAS_PADDING = 1;

  function buildAtlas(fonts) {
    // See maplibre-gl-js/src/render/glyph_atlas.js

    // Construct position objects (metrics and rects) for each glyph
    const positions = Object.entries(fonts)
      .reduce((pos, [font, glyphs]) => {
        pos[font] = getPositions(glyphs);
        return pos;
      }, {});

    // Figure out how to pack all the bitmaps into one image
    // NOTE: modifies the rects in the positions object, in place!
    const rects = Object.values(positions)
      .flatMap(fontPos => Object.values(fontPos))
      .map(p => p.rect);
    const { w, h } = potpack(rects);

    // Using the updated rects, copy all the bitmaps into one image
    const image = new AlphaImage({ width: w || 1, height: h || 1 });
    Object.entries(fonts).forEach(([font, glyphs]) => {
      const fontPos = positions[font];
      glyphs.forEach(glyph => copyGlyphBitmap(glyph, fontPos, image));
    });

    return { image, positions };
  }

  function getPositions(glyphs) {
    return glyphs.reduce((dict, glyph) => {
      const pos = getPosition(glyph);
      if (pos) dict[glyph.id] = pos;
      return dict;
    }, {});
  }

  function getPosition(glyph) {
    const { bitmap: { width, height }, metrics } = glyph;
    if (width === 0 || height === 0) return;

    // Construct a preliminary rect, positioned at the origin for now
    const w = width + 2 * ATLAS_PADDING;
    const h = height + 2 * ATLAS_PADDING;
    const rect = { x: 0, y: 0, w, h };

    return { metrics, rect };
  }

  function copyGlyphBitmap(glyph, positions, image) {
    const { id, bitmap } = glyph;
    const position = positions[id];
    if (!position) return;

    const srcPt = { x: 0, y: 0 };
    const { x, y } = position.rect;
    const dstPt = { x: x + ATLAS_PADDING, y: y + ATLAS_PADDING };
    AlphaImage.copy(bitmap, image, srcPt, dstPt, bitmap);
  }

  function initGetter(urlTemplate, key) {
    // Check if url is valid
    const urlOK = (
      (typeof urlTemplate === "string" || urlTemplate instanceof String) &&
      urlTemplate.slice(0, 4) === "http"
    );
    if (!urlOK) return console.log("sdf-manager: no valid glyphs URL!");

    // Put in the API key, if supplied
    const endpoint = (key)
      ? urlTemplate.replace("{key}", key)
      : urlTemplate;

    const getGlyph = initGlyphCache(endpoint);

    return function(fontCodes) {
      // fontCodes = { font1: [code1, code2...], font2: ... }
      const fontGlyphs = {};

      const promises = Object.entries(fontCodes).map(([font, codes]) => {
        const requests = Array.from(codes, code => getGlyph(font, code));

        return Promise.all(requests).then(glyphs => {
          fontGlyphs[font] = glyphs.filter(g => g !== undefined);
        });
      });

      return Promise.all(promises).then(() => {
        return buildAtlas(fontGlyphs);
      });
    };
  }

  function getTokenParser(tokenText) {
    if (!tokenText) return () => undefined;
    const tokenPattern = /{([^{}]+)}/g;

    // We break tokenText into pieces that are either plain text or tokens,
    // then construct an array of functions to parse each piece
    const tokenFuncs = [];
    let charIndex  = 0;
    while (charIndex < tokenText.length) {
      // Find the next token
      const result = tokenPattern.exec(tokenText);

      if (!result) {
        // No tokens left. Parse the plain text after the last token
        const str = tokenText.substring(charIndex);
        tokenFuncs.push(() => str);
        break;
      } else if (result.index > charIndex) {
        // There is some plain text before the token
        const str = tokenText.substring(charIndex, result.index);
        tokenFuncs.push(() => str);
      }

      // Add a function to process the current token
      const token = result[1];
      tokenFuncs.push(props => props[token]);
      charIndex = tokenPattern.lastIndex;
    }

    // We now have an array of functions returning either a text string or
    // a feature property
    // Return a function that assembles everything
    return function(properties) {
      return tokenFuncs.reduce(concat, "");
      function concat(str, tokenFunc) {
        const text = tokenFunc(properties) || "";
        return str += text;
      }
    };
  }

  function initPreprocessor({ layout }) {
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

  function initAtlasGetter({ parsedStyles, glyphEndpoint }) {
    const getAtlas = initGetter(glyphEndpoint);

    const preprocessors = parsedStyles
      .filter(s => s.type === "symbol")
      .reduce((d, s) => (d[s.id] = initPreprocessor(s), d), {});

    return function(layers, zoom) {
      // Add character codes and sprite IDs. MODIFIES layer.features IN PLACE
      Object.entries(layers).forEach(([id, layer]) => {
        const preprocessor = preprocessors[id];
        if (!preprocessor) return;
        layer.features = layer.features.map(f => preprocessor(f, zoom))
          .filter(f => f !== undefined);
      });

      const fonts = Object.values(layers)
        .flatMap(l => l.features)
        .filter(f => (f.charCodes && f.charCodes.length))
        .reduce(updateFonts, {});

      return getAtlas(fonts);
    };
  }

  function updateFonts(fonts, feature) {
    const { font, charCodes } = feature;
    const charSet = fonts[font] || (fonts[font] = new Set());
    charCodes.forEach(charSet.add, charSet);
    return fonts;
  }

  function initStyleGetters(keys, { layout }) {
    const styleFuncs = keys.map(k => ([layout[k], camelCase(k)]));

    return function(z, feature) {
      return styleFuncs.reduce((d, [g, k]) => (d[k] = g(z, feature), d), {});
    };
  }

  function camelCase(hyphenated) {
    return hyphenated.replace(/-([a-z])/gi, (h, c) => c.toUpperCase());
  }

  const styleKeys = [
    "icon-opacity",
    "text-color",
    "text-opacity",
    "text-halo-blur",
    "text-halo-color",
    "text-halo-width",
  ];

  function getBox(w, h, anchor, offset) {
    const [sx, sy] = getBoxShift(anchor);
    const x = sx * w + offset[0];
    const y = sy * h + offset[1];
    return { x, y, w, h, shiftX: sx };
  }

  function getBoxShift(anchor) {
    // Shift the top-left corner of the box by the returned value * box dimensions
    switch (anchor) {
      case "top-left":
        return [0.0, 0.0];
      case "top-right":
        return [-1.0, 0.0];
      case "top":
        return [-0.5, 0.0];
      case "bottom-left":
        return [0.0, -1.0];
      case "bottom-right":
        return [-1.0, -1.0];
      case "bottom":
        return [-0.5, -1.0];
      case "left":
        return [0.0, -0.5];
      case "right":
        return [-1.0, -0.5];
      case "center":
      default:
        return [-0.5, -0.5];
    }
  }

  function scalePadBox(scale, pad, { x, y, w, h }) {
    return [
      x * scale - pad,
      y * scale - pad,
      (x + w) * scale + pad,
      (y + h) * scale + pad,
    ];
  }

  function mergeBoxes(b1, b2) {
    if (!b1) return b2;
    if (!b2) return b1;

    const { min, max } = Math;

    return [
      min(b1[0], b2[0]),
      min(b1[1], b2[1]),
      max(b1[2], b2[2]),
      max(b1[3], b2[3]),
    ];
  }

  function initIcon(style, spriteData = {}) {
    const { image: { width, height } = {}, meta = {} } = spriteData;
    if (!width || !height) return () => undefined;

    const getStyles = initStyleGetters(iconLayoutKeys, style);

    return function(feature, tileCoords) {
      const sprite = getSprite(feature.spriteID);
      if (!sprite) return;

      return layoutSprites(sprite, getStyles(tileCoords.z, feature));
    };

    function getSprite(spriteID) {
      const rawRect = meta[spriteID];
      if (!rawRect) return;

      const { x, y, width: w, height: h, pixelRatio = 1 } = rawRect;
      const spriteRect = [x / width, y / height, w / width, h / height];
      const scale = 1.0 / Math.max(1.0, pixelRatio);
      const metrics = { w: w * scale, h: h * scale };

      return { spriteID, metrics, spriteRect };
    }
  }

  const iconLayoutKeys = [
    "icon-anchor",
    "icon-offset",
    "icon-padding",
    "icon-rotation-alignment",
    "icon-size",
  ];

  function layoutSprites(sprite, styleVals) {
    const { metrics: { w, h }, spriteRect: rect } = sprite;

    const { iconAnchor, iconOffset, iconSize, iconPadding } = styleVals;
    const iconbox = getBox(w, h, iconAnchor, iconOffset);
    const bbox = scalePadBox(iconSize, iconPadding, iconbox);

    const pos = [iconbox.x, iconbox.y, w, h].map(c => c * iconSize);

    // Structure return value to match ../text
    return Object.assign([{ pos, rect }], { bbox, fontScalar: 0.0 });
  }

  const whitespace = {
    // From maplibre-gl-js/src/symbol/shaping.js
    [0x09]: true, // tab
    [0x0a]: true, // newline
    [0x0b]: true, // vertical tab
    [0x0c]: true, // form feed
    [0x0d]: true, // carriage return
    [0x20]: true, // space
  };

  const breakable = {
    // From maplibre-gl-js/src/symbol/shaping.js
    [0x0a]: true, // newline
    [0x20]: true, // space
    [0x26]: true, // ampersand
    [0x28]: true, // left parenthesis
    [0x29]: true, // right parenthesis
    [0x2b]: true, // plus sign
    [0x2d]: true, // hyphen-minus
    [0x2f]: true, // solidus
    [0xad]: true, // soft hyphen
    [0xb7]: true, // middle dot
    [0x200b]: true, // zero-width space
    [0x2010]: true, // hyphen
    [0x2013]: true, // en dash
    [0x2027]: true  // interpunct
  };

  function getBreakPoints(glyphs, spacing, targetWidth) {
    const potentialLineBreaks = [];
    const last = glyphs.length - 1;
    let cursor = 0;

    glyphs.forEach((g, i) => {
      const { code, metrics: { advance } } = g;
      if (!whitespace[code]) cursor += advance + spacing;

      if (i == last) return;
      // if (!breakable[code]&& !charAllowsIdeographicBreaking(code)) return;
      if (!breakable[code]) return;

      const breakInfo = evaluateBreak(
        i + 1,
        cursor,
        targetWidth,
        potentialLineBreaks,
        calculatePenalty(code, glyphs[i + 1].code),
        false
      );
      potentialLineBreaks.push(breakInfo);
    });

    const lastBreak = evaluateBreak(
      glyphs.length,
      cursor,
      targetWidth,
      potentialLineBreaks,
      0,
      true
    );

    return leastBadBreaks(lastBreak);
  }

  function leastBadBreaks(lastBreak) {
    if (!lastBreak) return [];
    return leastBadBreaks(lastBreak.priorBreak).concat(lastBreak.index);
  }

  function evaluateBreak(index, x, targetWidth, breaks, penalty, isLastBreak) {
    // Start by assuming the supplied (index, x) is the first break
    const init = {
      index, x,
      priorBreak: null,
      badness: calculateBadness(x)
    };

    // Now consider all previous possible break points, and
    // return the pair corresponding to the best combination of breaks
    return breaks.reduce((best, prev) => {
      const badness = calculateBadness(x - prev.x) + prev.badness;
      if (badness < best.badness) {
        best.priorBreak = prev;
        best.badness = badness;
      }
      return best;
    }, init);

    function calculateBadness(width) {
      const raggedness = (width - targetWidth) ** 2;

      if (!isLastBreak) return raggedness + Math.abs(penalty) * penalty;

      // Last line: prefer shorter than average
      return (width < targetWidth)
        ? raggedness / 2
        : raggedness * 2;
    }
  }

  function calculatePenalty(code, nextCode) {
    let penalty = 0;
    // Force break on newline
    if (code === 0x0a) penalty -= 10000;
    // Penalize open parenthesis at end of line
    if (code === 0x28 || code === 0xff08) penalty += 50;
    // Penalize close parenthesis at beginning of line
    if (nextCode === 0x29 || nextCode === 0xff09) penalty += 50;

    return penalty;
  }

  function splitLines(glyphs, styleVals) {
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

  const RECT_BUFFER = GLYPH_PBF_BORDER + ATLAS_PADDING;

  function layoutLines(lines, box, styleVals) {
    const lineHeight = styleVals.textLineHeight * ONE_EM;
    const lineShiftX = getLineShift(styleVals.textJustify, box.shiftX);
    const spacing = styleVals.textLetterSpacing * ONE_EM;
    const fontScalar = styleVals.textSize / ONE_EM;

    const chars = lines.flatMap((line, i) => {
      const x = (box.w - line.width) * lineShiftX + box.x;
      const y = i * lineHeight + box.y;
      return layoutLine(line, [x, y], spacing, fontScalar);
    });

    return Object.assign(chars, { fontScalar });
  }

  function layoutLine(glyphs, origin, spacing, scalar) {
    let xCursor = origin[0];
    const y0 = origin[1];

    return glyphs.map(g => {
      const { left, top, advance, w, h } = g.metrics;

      const dx = xCursor + left - RECT_BUFFER;
      // A 2.5 pixel shift in Y is needed to match MapLibre results
      // TODO: figure out why???
      const dy = y0 - top - RECT_BUFFER - 2.5;

      xCursor += advance + spacing;

      const pos = [dx, dy, w, h].map(c => c * scalar);
      const rect = g.sdfRect;

      return { pos, rect };
    });
  }

  function getLineShift(justify, boxShiftX) {
    switch (justify) {
      case "auto":
        return -boxShiftX;
      case "left":
        return 0;
      case "right":
        return 1;
      case "center":
      default:
        return 0.5;
    }
  }

  function layout(glyphs, styleVals) {
    // Split text into lines
    // TODO: what if splitLines returns nothing?
    const lines = splitLines(glyphs, styleVals);

    // Get dimensions and relative position of text area (in glyph pixels)
    const { textLineHeight, textAnchor, textOffset } = styleVals;
    const w = Math.max(...lines.map(l => l.width));
    const h = lines.length * textLineHeight * ONE_EM;
    const textbox = getBox(w, h, textAnchor, textOffset.map(c => c * ONE_EM));

    // Position characters within text area
    const chars = layoutLines(lines, textbox, styleVals);

    // Get padded text box (for collision checks)
    const { textSize, textPadding } = styleVals;
    const textBbox = scalePadBox(textSize / ONE_EM, textPadding, textbox);

    return Object.assign(chars, { bbox: textBbox });
  }

  function initText(style) {
    const getStyles = initStyleGetters(textLayoutKeys, style);

    return function(feature, tileCoords, atlas) {
      const glyphs = getGlyphs(feature, atlas);
      if (!glyphs || !glyphs.length) return;

      return layout(glyphs, getStyles(tileCoords.z, feature));
    };
  }

  const textLayoutKeys = [
    "symbol-placement", // TODO: both here and in ../anchors/anchors.js
    "text-anchor",
    "text-justify",
    "text-letter-spacing",
    "text-line-height",
    "text-max-width",
    "text-offset",
    "text-padding",
    "text-rotation-alignment",
    "text-size",
  ];

  function getGlyphs(feature, atlas) {
    if (!atlas) return;
    const { charCodes, font } = feature;
    const positions = atlas.positions[font];
    if (!positions || !charCodes || !charCodes.length) return;

    const { width, height } = atlas.image;

    return charCodes.map(code => {
      const pos = positions[code];
      if (!pos) return;

      const { left, top, advance } = pos.metrics;
      const { x, y, w, h } = pos.rect;

      const sdfRect = [x / width, y / height, w / width, h / height];
      const metrics = { left, top, advance, w, h };

      return { code, metrics, sdfRect };
    }).filter(i => i !== undefined);
  }

  const { min, max: max$1, cos: cos$1, sin: sin$1 } = Math;

  function buildCollider(placement) {
    return (placement === "line") ? lineCollision : pointCollision;
  }

  function pointCollision(icon, text, anchor, tree) {
    const [x0, y0] = anchor;
    const boxes = [icon, text]
      .filter(label => label !== undefined)
      .map(label => formatBox(x0, y0, label.bbox));

    if (boxes.some(tree.collides, tree)) return true;
    // TODO: drop if outside tile?
    boxes.forEach(tree.insert, tree);
  }

  function formatBox(x0, y0, bbox) {
    return {
      minX: x0 + bbox[0],
      minY: y0 + bbox[1],
      maxX: x0 + bbox[2],
      maxY: y0 + bbox[3],
    };
  }

  function lineCollision(icon, text, anchor, tree) {
    const [x0, y0, angle] = anchor;

    const cos_a = cos$1(angle);
    const sin_a = sin$1(angle);
    const rotate = ([x, y]) => [x * cos_a - y * sin_a, x * sin_a + y * cos_a];

    const boxes = [icon, text].flat()
      .filter(glyph => glyph !== undefined)
      .map(g => getGlyphBbox(g.pos, rotate))
      .map(bbox => formatBox(x0, y0, bbox));

    if (boxes.some(tree.collides, tree)) return true;
    boxes.forEach(tree.insert, tree);
  }

  function getGlyphBbox([x, y, w, h], rotate) {
    const corners = [
      [x, y], [x + w, y],
      [x, y + h], [x + w, y + h]
    ].map(rotate);
    const xvals = corners.map(c => c[0]);
    const yvals = corners.map(c => c[1]);

    return [min(...xvals), min(...yvals), max$1(...xvals), max$1(...yvals)];
  }

  function segmentIntersectsTile([x0, y0], [x1, y1], extent) {
    // 1. Check if the line is all on one side of the tile
    if (x0 < 0 && x1 < 0) return false;
    if (x0 > extent && x1 > extent) return false;
    if (y0 < 0 && y1 < 0) return false;
    if (y0 > extent && y1 > extent) return false;

    // 2. Check if the tile corner points are all on one side of the line
    // See https://stackoverflow.com/a/293052/10082269
    const a = y1 - y0;
    const b = x0 - x1;
    const c = x1 * y0 - x0 * y1;
    const lineTest = ([x, y]) => Math.sign(a * x + b * y + c);

    const corners = [[extent, 0], [extent, extent], [0, extent]]; // Skips [0, 0]
    const first = lineTest([0, 0]);
    if (corners.some(c => lineTest(c) !== first)) return true;
  }

  function getIntersections(segment, extent) {
    const [[x0, y0], [x1, y1]] = segment;

    function interpY(x) {
      const y = interpC(y0, y1, getT(x0, x, x1));
      if (y !== undefined) return [x, y];
    }

    function interpX(y) {
      const x = interpC(x0, x1, getT(y0, y, y1));
      if (x !== undefined) return [x, y];
    }

    function interpC(c0, c1, t) {
      if (t < 0.0 || 1.0 < t) return;
      return c0 + t * (c1 - c0);
    }

    const b = interpX(0);
    const r = interpY(extent);
    const t = interpX(extent);
    const l = interpY(0);

    return [b, r, t, l].filter(p => p !== undefined)
      .filter(p => p.every(c => 0 <= c && c <= extent));
  }

  function getT(x0, x, x1) {
    return (x0 == x1) ? Infinity : (x - x0) / (x1 - x0);
  }

  function addDistances(line) {
    let cumulative = 0.0;
    const distances = line.slice(1).map((c, i) => {
      cumulative += dist(line[i], c);
      return { coord: c, dist: cumulative };
    });
    distances.unshift({ coord: line[0], dist: 0.0 });
    return distances;
  }

  function getDistanceToEdge(line, extent) {
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

  function getLabelSegments(line, offset, spacing, labelLength, charSize) {
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

  const { max, abs, cos, sin, atan2 } = Math;

  function fitLine(points) {
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

  function getLineAnchors(geometry, extent, icon, text, layoutVals) {
    const { max, PI, round } = Math;
    const { type, coordinates } = geometry;

    const {
      iconRotationAlignment, iconKeepUpright,
      textRotationAlignment, textKeepUpright,
      symbolSpacing, textSize,
    } = layoutVals;

    // ASSUME(!): alignment and keepUpright are consistent for icon and text
    const alignment = (text) ? textRotationAlignment : iconRotationAlignment;
    const keepUpright = (text) ? textKeepUpright : iconKeepUpright;

    const iconbox = (icon) ? icon.bbox : undefined;
    const textbox = (text) ? text.bbox : undefined;
    const box = mergeBoxes(iconbox, textbox);
    const labelLength = (alignment === "viewport") ? 0.0 : box[2] - box[0];
    const spacing = max(symbolSpacing, labelLength + symbolSpacing / 4);

    switch (type) {
      case "LineString":
        return placeLineAnchors(coordinates);
      case "MultiLineString":
      case "Polygon":
        return coordinates.flatMap(placeLineAnchors);
      case "MultiPolygon":
        return coordinates.flat().flatMap(placeLineAnchors);
      default:
        return [];
    }

    function placeLineAnchors(line) {
      const pts = addDistances(line);
      const distToEdge = getDistanceToEdge(pts, extent);

      const offset = (distToEdge >= 0) ?
        (distToEdge + spacing / 2) :
        (labelLength / 2 + textSize * 2);

      return getLabelSegments(pts, offset, spacing, labelLength, textSize / 2)
        .map(fitLine)
        .filter(fit => fit.error < textSize / 2)
        .map(({ anchor, angle }) => ([...anchor, flip(angle)]));
    }

    function flip(angle) {
      return (keepUpright) ? angle - round(angle / PI) * PI : angle;
    }
  }

  function initAnchors(style) {
    const getStyles = initStyleGetters(symbolLayoutKeys, style);

    return function(feature, tileCoords, icon, text, tree) {
      const layoutVals = getStyles(tileCoords.z, feature);
      const collides = buildCollider(layoutVals.symbolPlacement);

      // TODO: get extent from tile?
      return getAnchors(feature.geometry, 512, icon, text, layoutVals)
        .filter(anchor => !collides(icon, text, anchor, tree));
    };
  }

  const symbolLayoutKeys = [
    "symbol-placement",
    "symbol-spacing",
    // TODO: these are in 2 places: here and in the text getter
    "text-rotation-alignment",
    "text-size",
    "icon-rotation-alignment",
    "icon-keep-upright",
    "text-keep-upright",
  ];

  function getAnchors(geometry, extent, icon, text, layoutVals) {
    switch (layoutVals.symbolPlacement) {
      case "point":
        return getPointAnchors(geometry);
      case "line":
        return getLineAnchors(geometry, extent, icon, text, layoutVals);
      default:
        return [];
    }
  }

  function getPointAnchors({ type, coordinates }) {
    switch (type) {
      case "Point":
        return [[...coordinates, 0.0]]; // Add angle coordinate
      case "MultiPoint":
        return coordinates.map(c => [...c, 0.0]);
      default:
        return [];
    }
  }

  function getBuffers(icon, text, anchor) {
    const iconBuffers = buildBuffers(icon, anchor);
    const textBuffers = buildBuffers(text, anchor);
    return [iconBuffers, textBuffers].filter(b => b !== undefined);
  }

  function buildBuffers(glyphs, anchor) {
    if (!glyphs) return;

    const origin = [...anchor, glyphs.fontScalar];

    return {
      glyphRect: glyphs.flatMap(g => g.rect),
      glyphPos: glyphs.flatMap(g => g.pos),
      labelPos: glyphs.flatMap(() => origin),
    };
  }

  function initShaping(style, spriteData) {
    const getIcon = initIcon(style, spriteData);
    const getText = initText(style);
    const getAnchors = initAnchors(style);

    return { serialize, getLength, styleKeys };

    function serialize(feature, tileCoords, atlas, tree) {
      // tree is an RBush from the 'rbush' module. NOTE: will be updated!

      const icon = getIcon(feature, tileCoords);
      const text = getText(feature, tileCoords, atlas);
      if (!icon && !text) return;

      const anchors = getAnchors(feature, tileCoords, icon, text, tree);
      if (!anchors || !anchors.length) return;

      return anchors
        .flatMap(anchor => getBuffers(icon, text, anchor))
        .reduce(combineBuffers, {});
    }

    function getLength(buffers) {
      return buffers.labelPos.length / 4;
    }
  }

  function combineBuffers(dict, buffers) {
    Object.keys(buffers).forEach(k => {
      const base = dict[k] || (dict[k] = []);
      buffers[k].forEach(v => base.push(v));
    });
    return dict;
  }

  exports.initAtlasGetter = initAtlasGetter;
  exports.initShaping = initShaping;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
