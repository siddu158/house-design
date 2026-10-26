const fs = require('fs');

const bytes = fs.readFileSync('C:/Users/sidde/.gemini/antigravity-ide/brain/918b21dd-c8db-45e1-9563-eb47604706e6/scratch/sample_rgba.bin');
const aw = 1024, ah = 765;
const smallData = new Uint8ClampedArray(bytes);

const n = aw * ah;
const lum = new Float32Array(n);
for (let i = 0; i < n; i++) {
  lum[i] = (.299 * smallData[i * 4] + .587 * smallData[i * 4 + 1] + .114 * smallData[i * 4 + 2]);
}

// Compute 3x3 local average for a small test window
function localMean3x3(L, w, h, x, y) {
  let sum = 0, count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    const ny = y + dy;
    if (ny < 0 || ny >= h) continue;
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      if (nx < 0 || nx >= w) continue;
      sum += L[ny * w + nx];
      count++;
    }
  }
  return sum / count;
}

// Check sample wall pixels around x=577, y=452
console.log('Sample wall texture values:');
for (let y = 450; y <= 455; y++) {
  let line = 'y=' + y + ': ';
  for (let x = 575; x <= 580; x++) {
    const l = lum[y * aw + x];
    const lm = localMean3x3(lum, aw, ah, x, y);
    const textDelta = l - lm;
    line += ' ' + textDelta.toFixed(1).padStart(5);
  }
  console.log(line);
}
