const fs = require('fs');

// Load sample photo (1024 x 765)
const bytes = fs.readFileSync('C:/Users/sidde/.gemini/antigravity-ide/brain/918b21dd-c8db-45e1-9563-eb47604706e6/scratch/sample_rgba.bin');
const W = 1024, H = 765, N = W * H;
const srcData = new Uint8ClampedArray(bytes);

// Create a realistic synthetic wall mask: a large central section (x: 200..800, y: 150..650)
// with a window cutout (x: 350..450, y: 300..450) and a door cutout (x: 550..650, y: 400..650)
const wallMask = new Uint8Array(N);
const windowMask = new Uint8Array(N);
const doorMask = new Uint8Array(N);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = y * W + x;
    // Window
    if (x >= 350 && x <= 450 && y >= 300 && y <= 450) {
      windowMask[idx] = 1;
    }
    // Door
    else if (x >= 550 && x <= 650 && y >= 400 && y <= 650) {
      doorMask[idx] = 1;
    }
    // Wall
    else if (x >= 200 && x <= 800 && y >= 150 && y <= 650) {
      wallMask[idx] = 1;
    }
  }
}

console.log('Testing full render pipeline with real photo data...');
console.log('Wall pixels:', wallMask.filter(v => v === 1).length);
console.log('Window pixels:', windowMask.filter(v => v === 1).length);
console.log('Door pixels:', doorMask.filter(v => v === 1).length);

// Helper for computing 3x3 box blur of luminance for texture extraction
function computeLocalLuminance(lum, W, H, radius) {
  const out = new Float32Array(W * H);
  // Fast 2-pass 1D box blur
  const tmp = new Float32Array(W * H);
  const r = radius || 2;
  const win = 2 * r + 1;

  // Horizontal pass
  for (let y = 0; y < H; y++) {
    const row = y * W;
    let sum = 0;
    for (let x = 0; x < r; x++) sum += lum[row + Math.min(W - 1, x)];
    for (let x = 0; x <= r; x++) sum += lum[row + x];
    for (let x = 0; x < W; x++) {
      const left = Math.max(0, x - r - 1);
      const right = Math.min(W - 1, x + r);
      sum += lum[row + right] - lum[row + left];
      tmp[row + x] = sum / win;
    }
  }

  // Vertical pass
  for (let x = 0; x < W; x++) {
    let sum = 0;
    for (let y = 0; y < r; y++) sum += tmp[Math.min(H - 1, y) * W + x];
    for (let y = 0; y <= r; y++) sum += tmp[y * W + x];
    for (let y = 0; y < H; y++) {
      const top = Math.max(0, y - r - 1);
      const bottom = Math.min(H - 1, y + r);
      sum += tmp[bottom * W + x] - tmp[top * W + x];
      out[y * W + x] = sum / win;
    }
  }
  return out;
}

// Compute luminance array
const lum = new Float32Array(N);
for (let i = 0; i < N; i++) {
  lum[i] = .299 * srcData[i * 4] + .587 * srcData[i * 4 + 1] + .114 * srcData[i * 4 + 2];
}

const localLum = computeLocalLuminance(lum, W, H, 2);

// Test texture delta range on wall
let minDelta = 999, maxDelta = -999, sumAbs = 0, count = 0;
for (let i = 0; i < N; i++) {
  if (wallMask[i]) {
    const d = lum[i] - localLum[i];
    if (d < minDelta) minDelta = d;
    if (d > maxDelta) maxDelta = d;
    sumAbs += Math.abs(d);
    count++;
  }
}
console.log('Texture relief on wall: min=' + minDelta.toFixed(1) + ', max=' + maxDelta.toFixed(1) + ', meanAbs=' + (sumAbs / count).toFixed(2));
