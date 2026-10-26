const fs = require('fs');

// Test edge anti-aliasing on a synthetic diagonal edge
function testEdgeAntiAliasing() {
  const W = 10, H = 10;
  const e = new Uint8Array(W * H);
  // Create a diagonal mask (y >= x)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (y >= x) e[y * W + x] = 1;
    }
  }

  // Compute subpixel anti-aliasing inside the mask
  const a = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (!e[idx]) {
        a[idx] = 0.0;
        continue;
      }
      // Count 3x3 neighborhood inside mask
      let inCount = 0, total = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= W) continue;
          total++;
          if (e[ny * W + nx]) inCount++;
        }
      }
      if (inCount === total) {
        a[idx] = 1.0; // fully interior
      } else {
        // Boundary pixel inside the mask: subpixel coverage smoothly mapped between 0.65 and 1.0
        // Ensuring no unpainted gaps/halos, but smoothing the 1-pixel jagged step
        const cov = inCount / total; // between ~0.33 and 0.88
        a[idx] = Math.max(0.65, Math.min(1.0, cov * 1.15));
      }
    }
  }

  console.log('Mask (e):');
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) row += e[y * W + x] ? '1 ' : '. ';
    console.log(row);
  }

  console.log('\nSubpixel Alpha (a):');
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) {
      const v = a[y * W + x];
      row += v === 0 ? ' .   ' : v.toFixed(2) + ' ';
    }
    console.log(row);
  }

  // Verify: outside is strictly 0.0
  let leak = false;
  for (let i = 0; i < W * H; i++) {
    if (!e[i] && a[i] > 0) leak = true;
  }
  console.log('\nLeak outside mask:', leak ? 'FAIL' : 'PASS (0 leaks)');
}

testEdgeAntiAliasing();
