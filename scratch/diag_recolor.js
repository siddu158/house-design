const fs = require('fs');

// Load real photo bytes
const bytes = fs.readFileSync('C:/Users/sidde/.gemini/antigravity-ide/brain/918b21dd-c8db-45e1-9563-eb47604706e6/scratch/sample_rgba.bin');
const aw = 1024, ah = 765;
const smallData = new Uint8ClampedArray(bytes);

console.log('Loaded real photo: ' + aw + 'x' + ah + ' (' + bytes.length + ' bytes)');

// Calculate luminance of photo
const n = aw * ah;
const lum = new Float32Array(n);
for (let i = 0; i < n; i++) {
  lum[i] = (.299 * smallData[i * 4] + .587 * smallData[i * 4 + 1] + .114 * smallData[i * 4 + 2]);
}

// Let's inspect a wall patch in the photo
// Wall center is around x=577, y=452
let patchLum = [];
for (let y = 430; y <= 470; y++) {
  for (let x = 550; x <= 600; x++) {
    patchLum.push(lum[y * aw + x]);
  }
}
patchLum.sort((a, b) => a - b);
const minL = patchLum[0];
const maxL = patchLum[patchLum.length - 1];
const medL = patchLum[patchLum.length >> 1];
console.log('Sample wall patch luminance: min=' + minL.toFixed(1) + ', median=' + medL.toFixed(1) + ', max=' + maxL.toFixed(1));

// Current tone-mapping formula test
function testCurrentMapping(tc, med, minV, maxV, kSun, gamma) {
  const tR = tc[0], tG = tc[1], tB = tc[2];
  console.log('Target color:', tc);
  for (const v of [minL, med, maxL, 240, 255]) {
    const rel = v / med;
    let rR, rG, rB;
    if (rel <= 1.0) {
      const sf = Math.pow(Math.max(rel, 0.04), gamma);
      rR = tR * sf; rG = tG * sf; rB = tB * sf;
    } else {
      const over = rel - 1.0;
      const frac = (kSun * over) / (1.0 + kSun * over);
      rR = tR + (255 - tR) * frac;
      rG = tG + (255 - tG) * frac;
      rB = tB + (255 - tB) * frac;
    }
    console.log('  v=' + v.toFixed(0) + ' (rel=' + rel.toFixed(2) + ') -> RGB: [' + Math.round(rR) + ', ' + Math.round(rG) + ', ' + Math.round(rB) + ']');
  }
}

console.log('\n--- Test 1: Pure White (#FFFFFF) with current mapping ---');
testCurrentMapping([255, 255, 255], medL, minL, maxL, 1.25, 0.95);

console.log('\n--- Test 2: Charcoal (#262626) with current mapping ---');
testCurrentMapping([38, 38, 38], medL, minL, maxL, 1.25, 0.95);

console.log('\n--- Test 3: Navy Blue (#1B2A4A) with current mapping ---');
testCurrentMapping([27, 42, 74], medL, minL, maxL, 1.25, 0.95);
