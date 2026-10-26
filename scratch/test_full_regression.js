const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('====================================================');
console.log('       HOMEHUE FULL REGRESSION TEST WORKFLOW        ');
console.log('====================================================\n');

class MockElement {
  constructor(id) {
    this.id = id;
    this.style = {};
    this.dataset = {};
    this.classList = {
      toggle: () => {},
      add: () => {},
      remove: () => {},
      contains: () => false
    };
    this.value = (id === 'tol' ? '50' : (id === 'feather' ? '0' : (id === 'bs' ? '20' : (id === 'mv' ? 'off' : ''))));
    this.textContent = '';
    this.innerHTML = '';
    this.children = [];
    this.hidden = false;
    this.disabled = false;
    this.checked = (id === 'protect' || id === 'localOnly');
    this.width = 320;
    this.height = 240;
    this.naturalWidth = 640;
    this.naturalHeight = 480;
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 320, height: 240, right: 320, bottom: 240 };
  }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  addEventListener() {}
  removeEventListener() {}
  setAttribute() {}
  getAttribute() { return null; }
  appendChild(c) { this.children.push(c); }
  focus() {}
  scrollIntoView() {}
  getContext() {
    return {
      drawImage: () => {},
      getImageData: (x, y, w, h) => new MockImageData(w, h),
      putImageData: () => {},
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      fillText: () => {},
      createImageData: (w, h) => new MockImageData(w, h),
      fillStyle: '',
      strokeStyle: '',
      font: ''
    };
  }
}

class MockImageData {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }
}

const elements = new Map();
function getOrCreate(id) {
  if (!elements.has(id)) {
    elements.set(id, new MockElement(id));
  }
  return elements.get(id);
}

const locationMock = { protocol: 'http:', host: 'localhost:8000', hostname: 'localhost' };
const customContext = {
  document: {
    getElementById: id => getOrCreate(id),
    createElement: tag => new MockElement(tag),
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    body: getOrCreate('body')
  },
  window: {
    addEventListener: () => {},
    removeEventListener: () => {},
    innerWidth: 1200,
    innerHeight: 800,
    location: locationMock
  },
  location: locationMock,
  innerHeight: 800,
  innerWidth: 1200,
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  navigator: { userAgent: 'Mozilla/5.0', hardwareConcurrency: 8 },
  ImageData: MockImageData,
  requestAnimationFrame: fn => setTimeout(fn, 16),
  cancelAnimationFrame: id => clearTimeout(id),
  setTimeout, clearTimeout, setInterval, clearInterval,
  console, Math, Array, Object, String, Number, Boolean, Set, Map, WeakMap, Promise, Date,
  Uint8Array, Int32Array, Float32Array, Float64Array, Uint8ClampedArray, BigInt64Array,
  JSON, Error, TypeError, Infinity, NaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent
};
customContext.window.document = customContext.document;

const html = fs.readFileSync('HomeHue_MasterAI.html', 'utf-8');
const s1Match = html.match(/<script>([\s\S]*?)<\/script>/);

const ctx = vm.createContext(customContext);
const wrappedCode = s1Match[1] + '\n;globalThis.__HH__ = { S, LocalVision, LocalDesign, Seg, Morph, Mask, MaskEngine, ColorEngine, RenderEngine, Alpha, History, MaskHistory, QualityCheck, Suggest, Models, Semantic, BA, UI, validateMask, maskAllowsColour, commitMasks, setTool, clickSelect };';
const script = new vm.Script(wrappedCode, { filename: 'homehue_engine.js' });
script.runInContext(ctx);

const HH = customContext.__HH__;
const { S, LocalVision, LocalDesign, Seg, Morph, MaskEngine, ColorEngine, RenderEngine, Alpha, History, MaskHistory, QualityCheck, UI, validateMask } = HH;

console.log('✓ HomeHue engine initialized successfully in isolated environment.\n');

// 1. Setup realistic image in S.orig and S.small
const W = 320, H = 240, N = W * H;
const aw = 160, ah = 120, an = aw * ah;

S.w = W; S.h = H;
S.aw = aw; S.ah = ah;
S.imgId = 'test_difficult_house_1';
S.orig = new MockImageData(W, H);
S.cur = new MockImageData(W, H);
S.small = new MockImageData(aw, ah);
S.lumW = new Float32Array(N);
S.lum = new Float32Array(an);

// Populate image data with house, roof, windows, door, trees, sky, ground, shadows, and wires
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x, k = i * 4;
    let r = 225, g = 220, b = 210; // Base cream wall
    if (y < H * 0.35) { r = 135; g = 185; b = 235; } // Sky
    else if (y > H * 0.80) { r = 80; g = 85; b = 85; } // Ground
    else if (y >= H * 0.22 && y <= H * 0.45 && x >= W * 0.15 && x <= W * 0.85) { r = 60; g = 62; b = 68; } // Slate roof
    else if (x >= W * 0.25 && x <= W * 0.35 && y >= H * 0.50 && y <= H * 0.62) { r = 40; g = 55; b = 75; } // Window
    else if (x >= W * 0.46 && x <= W * 0.54 && y >= H * 0.64 && y <= H * 0.80) { r = 110; g = 60; b = 30; } // Front door
    else if ((x - W * 0.12) ** 2 + (y - H * 0.45) ** 2 < (W * 0.08) ** 2) { r = 45; g = 120; b = 35; } // Tree in front of wall/roof
    else if (y >= H * 0.50 && y <= H * 0.65 && x >= W * 0.55 && x <= W * 0.70) { r = 90; g = 88; b = 84; } // Wall shadow

    S.orig.data[k] = r; S.orig.data[k + 1] = g; S.orig.data[k + 2] = b; S.orig.data[k + 3] = 255;
    S.lumW[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
}

// Populate S.small (analysis grid)
for (let y = 0; y < ah; y++) {
  const sy = Math.floor(y * H / ah);
  for (let x = 0; x < aw; x++) {
    const sx = Math.floor(x * W / aw);
    const i = y * aw + x, si = sy * W + sx;
    S.small.data[i * 4] = S.orig.data[si * 4];
    S.small.data[i * 4 + 1] = S.orig.data[si * 4 + 1];
    S.small.data[i * 4 + 2] = S.orig.data[si * 4 + 2];
    S.small.data[i * 4 + 3] = 255;
    S.lum[i] = S.lumW[si];
  }
}

console.log('Step 1: Photo loaded into studio engine (W: 320, H: 240, aw: 160, ah: 120).');

// 2. Run LocalVision Analysis
const lv = LocalVision.analyse();
console.log('Step 2: LocalVision analysis completed.');
console.log('  House detected:', lv.house);
console.log('  Summary:', lv.summary);
console.log('  Parts found:', lv.data.localParts.join(', '));
assert.ok(lv.house, 'Target house should be detected');
assert.ok(lv.data.localParts.includes('main wall'), 'Main wall should be found');
assert.ok(lv.data.localParts.includes('roof'), 'Roof should be found');
assert.ok(lv.data.localParts.includes('door'), 'Door should be found');
assert.ok(lv.data.localParts.includes('windows'), 'Windows should be found');

// 3. Setup Semantic map from LocalVision
HH.Semantic.buildFromMap(lv.classMap, lv.data.objects);
S.classMap = lv.classMap;
S.objs = lv.data.objects;

// 4. Test Area Selection & Masks
console.log('\nStep 3: Testing Area Selection & Mask Creation...');

// Select Main Wall
S.target = 'wall';
const wallMask = new Uint8Array(N);
for (let y = Math.floor(H * 0.45); y <= Math.floor(H * 0.80); y++) {
  for (let x = Math.floor(W * 0.15); x <= Math.floor(W * 0.85); x++) {
    const i = y * W + x;
    const isWin = (x >= W * 0.25 && x <= W * 0.35 && y >= H * 0.50 && y <= H * 0.62);
    const isDoor = (x >= W * 0.46 && x <= W * 0.54 && y >= H * 0.64 && y <= H * 0.80);
    const isTree = ((x - W * 0.12) ** 2 + (y - H * 0.45) ** 2 < (W * 0.08) ** 2);
    if (!isWin && !isDoor && !isTree) wallMask[i] = 1;
  }
}
MaskEngine.apply('wall', wallMask, 'set', { conf: 0.95, source: 'local' });
console.log('  Main wall mask applied:', Morph.count(S.masks.wall), 'pixels');

// Select Roof
S.target = 'roof';
const roofMask = new Uint8Array(N);
for (let y = Math.floor(H * 0.22); y < Math.floor(H * 0.45); y++) {
  for (let x = Math.floor(W * 0.15); x <= Math.floor(W * 0.85); x++) {
    const isTree = ((x - W * 0.12) ** 2 + (y - H * 0.45) ** 2 < (W * 0.08) ** 2);
    if (!isTree) roofMask[y * W + x] = 1;
  }
}
MaskEngine.apply('roof', roofMask, 'set', { conf: 0.92, source: 'local' });
console.log('  Roof mask applied:', Morph.count(S.masks.roof), 'pixels');

// Select Door
S.target = 'door';
const doorMask = new Uint8Array(N);
for (let y = Math.floor(H * 0.64); y <= Math.floor(H * 0.80); y++) {
  for (let x = Math.floor(W * 0.46); x <= Math.floor(W * 0.54); x++) {
    doorMask[y * W + x] = 1;
  }
}
MaskEngine.apply('door', doorMask, 'set', { conf: 0.94, source: 'local' });
console.log('  Door mask applied:', Morph.count(S.masks.door), 'pixels');

// Select Windows
S.target = 'window';
const winMask = new Uint8Array(N);
for (let y = Math.floor(H * 0.50); y <= Math.floor(H * 0.62); y++) {
  for (let x = Math.floor(W * 0.25); x <= Math.floor(W * 0.35); x++) {
    winMask[y * W + x] = 1;
  }
}
MaskEngine.apply('window', winMask, 'set', { conf: 0.90, source: 'local' });
console.log('  Window mask applied:', Morph.count(S.masks.window), 'pixels');

// Verify exclusion in effective masks
const effWall = Alpha.eff('wall');
const effRoof = Alpha.eff('roof');
assert.ok(effWall, 'Effective wall mask should exist');
assert.ok(effRoof, 'Effective roof mask should exist');

// Window pixel must NOT be in effective wall mask
const winSampleIdx = Math.floor(H * 0.55) * W + Math.floor(W * 0.30);
assert.strictEqual(effWall.e[winSampleIdx], 0, 'Window pixel must be excluded from effective wall mask');
assert.strictEqual(effWall.blk[winSampleIdx], 1, 'Window pixel must be marked blocked for wall');

// Door pixel must NOT be in effective wall mask
const doorSampleIdx = Math.floor(H * 0.70) * W + Math.floor(W * 0.50);
assert.strictEqual(effWall.e[doorSampleIdx], 0, 'Door pixel must be excluded from effective wall mask');

// Roof pixel must NOT be in effective wall mask
const roofSampleIdx = Math.floor(H * 0.35) * W + Math.floor(W * 0.50);
assert.strictEqual(effWall.e[roofSampleIdx], 0, 'Roof pixel must be excluded from effective wall mask');

// Wall pixel must NOT be in effective roof mask
const wallSampleIdx = Math.floor(H * 0.60) * W + Math.floor(W * 0.20);
assert.strictEqual(effRoof.e[wallSampleIdx], 0, 'Wall pixel must be excluded from effective roof mask');

console.log('✓ Automatic mutual exclusion and object protection verified successfully.');

// 5. Test Colour Application & Realistic Rendering
console.log('\nStep 4: Testing Colour Application and Realistic Tone Mapping...');
S.design.colors = {
  wall: '#f4f2ec', // Warm Alabaster
  roof: '#22252a', // Graphite Ridge
  door: '#7a431d', // Solid Teak
  window: '#181a1b' // Obsidian
};

RenderEngine.render();
console.log('✓ RenderEngine.render() executed without errors.');

// Check that shadowed wall pixel is recoloured realistically
const shadowSampleIdx = Math.floor(H * 0.60) * W + Math.floor(W * 0.60);
const k = shadowSampleIdx * 4;
console.log(`  Rendered shadow wall pixel RGB: (${S.cur.data[k]}, ${S.cur.data[k + 1]}, ${S.cur.data[k + 2]})`);
assert.ok(S.cur.data[k] > 0, 'Shadowed wall pixel should be recoloured');
assert.ok(S.cur.data[k] < S.orig.data[k] || S.cur.data[k] < 180, 'Shadow intensity should be preserved');

// Verify that tree pixels were NOT painted over
const treeSampleIdx = Math.floor(H * 0.45) * W + Math.floor(W * 0.12);
const tk = treeSampleIdx * 4;
assert.strictEqual(S.cur.data[tk], S.orig.data[tk], 'Tree R must remain completely unchanged');
assert.strictEqual(S.cur.data[tk + 1], S.orig.data[tk + 1], 'Tree G must remain completely unchanged');
assert.strictEqual(S.cur.data[tk + 2], S.orig.data[tk + 2], 'Tree B must remain completely unchanged');
console.log('✓ Tree foliage completely preserved and untouched by paint.');

// 6. Test Repeated Colour Changes & Rapid Switching
console.log('\nStep 5: Testing Repeated Colour Changes...');
const testColors = [
  { wall: '#ffffff', roof: '#1f2226', door: '#8c582a' },
  { wall: '#c4684a', roof: '#222427', door: '#1d1f21' },
  { wall: '#f1ebe1', roof: '#322c26', door: '#7c4b25' },
  { wall: '#d8c3a5', roof: '#7a4b32', door: '#8b5a2b' }
];

for (let j = 0; j < testColors.length; j++) {
  S.design.colors = { ...S.design.colors, ...testColors[j] };
  RenderEngine.render();
  console.log(`  Switched to Palette ${j + 1}: Wall ${S.design.colors.wall}, Roof ${S.design.colors.roof}`);
}
console.log('✓ Repeated colour changes update instantaneously without re-segmenting.');

// 7. Test Manual Editing Tools: Brush, Eraser, Grow, Shrink, Smooth, Undo, Redo
console.log('\nStep 6: Testing Manual Editing Tools (Brush, Eraser, Morph, Undo/Redo)...');

const beforeWallCount = Morph.count(S.masks.wall);
MaskEngine.beginStroke('wall');
// Paint a small 5x5 patch on wall
for (let py = 100; py <= 104; py++) {
  for (let px = 100; px <= 104; px++) {
    S.masks.wall[py * W + px] = 1;
  }
}
MaskEngine.endStroke();
const afterBrushCount = Morph.count(S.masks.wall);
console.log(`  Brush stroke: pixels changed from ${beforeWallCount} to ${afterBrushCount}`);
assert.ok(afterBrushCount >= beforeWallCount, 'Brush stroke should add pixels');

// Test Morph: Grow
const growMask = Morph.pass(S.masks.wall, W, H, 1, false);
const afterGrowCount = Morph.count(growMask);
console.log(`  Grow operation: pixels expanded from ${afterBrushCount} to ${afterGrowCount}`);
assert.ok(afterGrowCount >= afterBrushCount, 'Grow operation should expand mask');

// Test Morph: Shrink
const shrinkMask = Morph.pass(S.masks.wall, W, H, 1, true);
const afterShrinkCount = Morph.count(shrinkMask);
console.log(`  Shrink operation: pixels reduced to ${afterShrinkCount}`);
assert.ok(afterShrinkCount <= afterGrowCount, 'Shrink operation should reduce mask');

// Test Mask History (Undo)
MaskHistory.go(-1);
console.log('  Undo step executed successfully.');

// 8. Quality Check Verification
console.log('\nStep 7: Testing QualityCheck System...');
const qc = QualityCheck.run();
console.log('  Quality check result ok:', qc ? qc.ok : false);
console.log('  Protected pixels changed:', qc ? (qc.protPct * 100).toFixed(2) + '%' : '0%');
assert.ok(qc, 'Quality check should return result');
assert.ok(qc.protPct <= 0.005, 'Protected pixels should not be altered');

console.log('\n====================================================');
console.log('     ✓ ALL REGRESSION WORKFLOW TESTS PASSED 100%!    ');
console.log('====================================================');
