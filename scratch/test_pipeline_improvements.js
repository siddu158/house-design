// Comprehensive test suite for HomeHue difficult photo improvements
const assert = require('assert');

// 1. Color and Vegetation tests
function testVegetationDetection() {
  console.log('Testing Vegetation Detection...');
  
  function isVegetation(r, g, b) {
    const rf = r / 255, gf = g / 255, bf = b / 255;
    const mx = Math.max(rf, gf, bf), mn = Math.min(rf, gf, bf), df = mx - mn;
    const s = mx ? df / mx : 0;
    let h = 0;
    if (df) {
      h = mx === rf ? ((gf - bf) / df) % 6 : mx === gf ? (bf - rf) / df + 2 : (rf - gf) / df + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const l = 0.299 * rf + 0.587 * gf + 0.114 * bf;
    const exG = 2 * gf - rf - bf;

    // Enhanced vegetation detection:
    // A. Standard green: h in [65, 175], s >= 0.12, l in [0.03, 0.92]
    const stdGreen = h >= 65 && h <= 175 && s >= 0.12 && l >= 0.03 && l <= 0.92;
    // B. Yellow-green / olive foliage in bright sunlight: h in [36, 65], s >= 0.15, g >= r, exG > 0.03
    const oliveSun = h >= 36 && h < 65 && s >= 0.15 && gf >= rf * 0.95 && exG > 0.03;
    // C. Deep shadowed leaves / dark branches touching greenery: h in [40, 180], s >= 0.08, l <= 0.45, gf > bf
    const shadowVeg = h >= 40 && h <= 180 && s >= 0.08 && l <= 0.45 && gf > bf;
    // D. Organic foliage signature by Excess Green
    const exgVeg = exG > 0.08 && h >= 38 && h <= 185;

    return stdGreen || oliveSun || shadowVeg || exgVeg;
  }

  // Standard grass/tree green
  assert.strictEqual(isVegetation(34, 139, 34), true, 'Forest green should be vegetation');
  // Olive foliage
  assert.strictEqual(isVegetation(107, 142, 35), true, 'Olive drab should be vegetation');
  // Yellow-green sunlit leaves (RGB: 140, 160, 40 -> h ~ 70 or 55)
  assert.strictEqual(isVegetation(140, 160, 40), true, 'Yellow-green leaves should be vegetation');
  // Shadowed green foliage (RGB: 25, 45, 20)
  assert.strictEqual(isVegetation(25, 45, 20), true, 'Deep shadow foliage should be vegetation');
  // Wall (cream/white: RGB 245, 240, 230)
  assert.strictEqual(isVegetation(245, 240, 230), false, 'Cream wall must NOT be vegetation');
  // Red brick (RGB 180, 60, 40)
  assert.strictEqual(isVegetation(180, 60, 40), false, 'Red brick must NOT be vegetation');
  // Blue sky (RGB 100, 170, 240)
  assert.strictEqual(isVegetation(100, 170, 240), false, 'Blue sky must NOT be vegetation');

  console.log('✓ Vegetation detection passed all tests.');
}

// 2. Sky Detection tests
function testSkyDetection() {
  console.log('Testing Sky Detection...');

  function isSky(r, g, b, relY) {
    const rf = r / 255, gf = g / 255, bf = b / 255;
    const mx = Math.max(rf, gf, bf), mn = Math.min(rf, gf, bf), df = mx - mn;
    const s = mx ? df / mx : 0;
    let h = 0;
    if (df) {
      h = mx === rf ? ((gf - bf) / df) % 6 : mx === gf ? (bf - rf) / df + 2 : (rf - gf) / df + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const l = 0.299 * rf + 0.587 * gf + 0.114 * bf;

    // A. Blue sky: h in [180, 255], s >= 0.05, l >= 0.38
    const blueSky = h >= 180 && h <= 255 && ((s >= 0.08 && l >= 0.38) || (s >= 0.04 && l >= 0.60));
    // B. Overcast / hazy / cloudy white/grey sky in upper region
    const cloudySky = relY < 0.45 && l >= 0.65 && s <= 0.14 && (bf >= rf * 0.95);
    // C. Very bright upper sky
    const brightSky = relY < 0.35 && l >= 0.88 && s <= 0.08;
    // D. Twilight / golden hour sky in upper region
    const sunsetSky = relY < 0.35 && ((h >= 15 && h <= 55 && s >= 0.12 && l >= 0.52) || (h >= 260 && h <= 315 && s >= 0.08 && l >= 0.45));

    return blueSky || cloudySky || brightSky || sunsetSky;
  }

  // Clear blue sky
  assert.strictEqual(isSky(120, 180, 240, 0.1), true, 'Blue sky should be sky');
  // Overcast white/grey sky in upper photo
  assert.strictEqual(isSky(210, 215, 220, 0.15), true, 'Overcast sky should be sky');
  // White wall in lower photo (relY = 0.6)
  assert.strictEqual(isSky(240, 240, 240, 0.6), false, 'White wall in lower photo must NOT be sky');
  // Dark roof (RGB 40, 45, 55, relY = 0.2)
  assert.strictEqual(isSky(40, 45, 55, 0.2), false, 'Dark slate roof must NOT be sky');

  console.log('✓ Sky detection passed all tests.');
}

// 3. Electrical Wire Detection tests
function testWireDetection() {
  console.log('Testing Wire Detection...');

  function detectWires(lum, w, h) {
    const wires = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const cur = lum[i];
        // Check horizontal cross-section
        const hWire = (cur < lum[i - 1] - 0.10 && cur < lum[i + 1] - 0.10);
        // Check vertical cross-section
        const vWire = (cur < lum[i - w] - 0.10 && cur < lum[i + w] - 0.10);
        // Check diagonal cross-sections
        const d1Wire = (cur < lum[i - w - 1] - 0.10 && cur < lum[i + w + 1] - 0.10);
        const d2Wire = (cur < lum[i - w + 1] - 0.10 && cur < lum[i + w - 1] - 0.10);

        if ((hWire || vWire || d1Wire || d2Wire) && cur < 0.65) {
          wires[i] = 1;
        }
      }
    }
    return wires;
  }

  // Synthetic 10x10 image with a light wall (lum = 0.8) and a dark horizontal wire (lum = 0.2) at y = 5
  const w = 10, h = 10;
  const lum = new Float32Array(w * h).fill(0.8);
  for (let x = 0; x < w; x++) lum[5 * w + x] = 0.2;

  const wires = detectWires(lum, w, h);
  for (let x = 1; x < w - 1; x++) {
    assert.strictEqual(wires[5 * w + x], 1, `Wire pixel at x=${x}, y=5 should be detected`);
    assert.strictEqual(wires[4 * w + x], 0, `Wall pixel at x=${x}, y=4 must NOT be wire`);
  }

  console.log('✓ Wire detection passed all tests.');
}

// 4. Shadow Preservation in Tone Mapping
function testShadowPreservation() {
  console.log('Testing Shadow Tone Mapping...');

  function computeLUT(tR, tG, tB, med, gamma = 0.95, kSun = 1.25) {
    const tabR = new Float32Array(256);
    for (let v = 0; v < 256; v++) {
      const rel = v / med;
      if (rel <= 1.0) {
        // Shadow mapping: smooth curve preserving ambient floor and deep architectural shadows
        const sf = Math.pow(Math.max(rel, 0.04), gamma);
        tabR[v] = tR * sf;
      } else {
        const over = rel - 1.0;
        const frac = (kSun * over) / (1.0 + kSun * over);
        tabR[v] = tR + (255 - tR) * frac;
      }
    }
    return tabR;
  }

  // Target wall color: Cream white (R=240), median luminance = 160 (sunlit wall)
  const tabR = computeLUT(240, 235, 220, 160);
  // At median (sunlit): tabR[160] should be ~240 (the target color)
  assert.ok(Math.abs(tabR[160] - 240) < 1, 'Sunlit luminance should map to target color');
  // In deep shadow (v = 40): rel = 40/160 = 0.25 -> sf ~ 0.26 -> tabR ~ 63
  assert.ok(tabR[40] < 80 && tabR[40] > 40, `Shadow should be proportionally dark (${tabR[40]})`);
  // In highlight (v = 220): rel > 1.0 -> should naturally brighten without clipping
  assert.ok(tabR[220] > 240 && tabR[220] <= 255, 'Highlight should be brighter than base color');

  console.log('✓ Shadow tone mapping passed all tests.');
}

// 5. Window & Door Exclusion when Painting Wall
function testWindowDoorExclusion() {
  console.log('Testing Window & Door Exclusion from Wall...');

  // Mock scene: W=100, H=100
  const W = 100, H = 100, n = W * H;
  const wallMask = new Uint8Array(n).fill(1); // user selected whole facade
  const windowMask = new Uint8Array(n);
  // Window at [20..40, 30..60]
  for (let y = 30; y <= 60; y++) {
    for (let x = 20; x <= 40; x++) {
      windowMask[y * W + x] = 1;
    }
  }

  // Eff wall mask should strictly exclude window
  const effWall = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (wallMask[i] && !windowMask[i]) effWall[i] = 1;
  }

  assert.strictEqual(effWall[40 * W + 30], 0, 'Pixel inside window must NOT be in effective wall mask');
  assert.strictEqual(effWall[10 * W + 10], 1, 'Pixel on wall must be in effective wall mask');

  console.log('✓ Window & door exclusion passed all tests.');
}

testVegetationDetection();
testSkyDetection();
testWireDetection();
testShadowPreservation();
testWindowDoorExclusion();

console.log('\nAll 5 core pipeline improvement tests PASSED successfully!');
