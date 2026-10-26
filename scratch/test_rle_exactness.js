const fs = require('fs');

const Morph = {
  rle(m) {
    const o = [];
    let c = 0, n = 0;
    for (let i = 0; i < m.length; i++) {
      if (m[i] === c) n++;
      else { o.push(n); c = m[i]; n = 1; }
    }
    o.push(n);
    return o;
  },
  unrle(a, len) {
    if (!Array.isArray(a) || a.some(v => !Number.isInteger(v) || v < 0) || a.reduce((s, v) => s + v, 0) !== len) return null;
    const m = new Uint8Array(len);
    let c = 0, p = 0;
    for (const n of a) {
      if (c) m.fill(1, p, p + n);
      p += n;
      c ^= 1;
    }
    return m;
  }
};

function testRleExactness() {
  const len = 1024 * 765;
  const original = new Uint8Array(len);
  // Add some realistic mask patches (strokes, cuts, shapes)
  for (let y = 100; y < 400; y++) {
    for (let x = 150; x < 600; x++) {
      if ((x - 300) ** 2 + (y - 250) ** 2 < 80 ** 2) continue; // cutout
      original[y * 1024 + x] = 1;
    }
  }

  const encoded = Morph.rle(original);
  console.log('Original mask length:', original.length);
  console.log('RLE encoded array length:', encoded.length);
  console.log('Compression ratio:', (original.length / (encoded.length * 4)).toFixed(1) + 'x');

  const decoded = Morph.unrle(encoded, len);
  let mismatches = 0;
  for (let i = 0; i < len; i++) {
    if (decoded[i] !== original[i]) mismatches++;
  }
  console.log('Mismatches after unrle:', mismatches);
  console.log('Bit-exact test:', mismatches === 0 ? 'PASS (100% Identical)' : 'FAIL');
}

testRleExactness();
