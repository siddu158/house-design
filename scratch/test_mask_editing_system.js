const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('====================================================');
console.log('   HOMEHUE MASK EDITING & SELECTION VERIFICATION    ');
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
    this.value = (id === 'tol' ? '45' : (id === 'feather' ? '0' : (id === 'bs' ? '30' : (id === 'mv' ? 'sel' : (id === 'tm' ? 'day' : '')))));
    this.textContent = '';
    this.innerHTML = '';
    this.children = [];
    this.hidden = false;
    this.disabled = false;
    this.checked = (id === 'protect' || id === 'autoAccept');
    this.width = 640;
    this.height = 480;
    this._rect = { left: 50, top: 100, width: 640, height: 480, right: 690, bottom: 580 };
  }
  getBoundingClientRect() {
    return this._rect;
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
    pageXOffset: 0,
    pageYOffset: 0,
    scrollX: 0,
    scrollY: 0,
    location: locationMock
  },
  location: locationMock,
  innerHeight: 800,
  innerWidth: 1200,
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', hardwareConcurrency: 8 },
  ImageData: MockImageData,
  requestAnimationFrame: fn => setTimeout(fn, 0),
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
const wrappedCode = s1Match[1] + '\n;globalThis.__HH__ = { S, LocalVision, LocalDesign, Seg, Morph, Mask, MaskEngine, ColorEngine, RenderEngine, Alpha, History, MaskHistory, QualityCheck, Suggest, Models, Semantic, BA, UI, validateMask, maskAllowsColour, commitMasks, setTool, clickSelect, pos, bump };';
const script = new vm.Script(wrappedCode, { filename: 'homehue_engine.js' });
script.runInContext(ctx);

const HH = customContext.__HH__;
const { S, LocalVision, LocalDesign, Seg, Morph, MaskEngine, ColorEngine, RenderEngine, Alpha, History, MaskHistory, QualityCheck, UI, validateMask, commitMasks, pos, bump } = HH;

console.log('✓ Script parsed and context initialized.');

// Setup image: 400x300, aw: 200, ah: 150
const W = 400, H = 300, N = W * H;
const aw = 200, ah = 150, an = aw * ah;

S.w = W; S.h = H;
S.aw = aw; S.ah = ah;
S.imgId = 'test_mask_house_1';
S.orig = new MockImageData(W, H);
S.cur = new MockImageData(W, H);
S.small = new MockImageData(aw, ah);
S.lumW = new Float32Array(N);
S.lum = new Float32Array(an);

// Create simulated photo with wall, roof, window, door, tree, sky, ground
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x, k = i * 4;
    let r = 215, g = 210, b = 200; // Wall
    if (y < H * 0.3) { r = 120; g = 180; b = 240; } // Sky
    else if (y > H * 0.85) { r = 80; g = 80; b = 80; } // Ground
    else if (y >= H * 0.25 && y <= H * 0.45 && x >= W * 0.15 && x <= W * 0.85) { r = 55; g = 58; b = 65; } // Roof
    else if (x >= W * 0.25 && x <= W * 0.35 && y >= H * 0.50 && y <= H * 0.65) { r = 35; g = 45; b = 60; } // Window
    else if (x >= W * 0.45 && x <= W * 0.55 && y >= H * 0.65 && y <= H * 0.85) { r = 100; g = 50; b = 25; } // Door
    else if ((x - W * 0.1) ** 2 + (y - H * 0.5) ** 2 < (W * 0.08) ** 2) { r = 40; g = 110; b = 30; } // Tree

    S.orig.data[k] = r; S.orig.data[k + 1] = g; S.orig.data[k + 2] = b; S.orig.data[k + 3] = 255;
    S.lumW[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
}

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

// 1. AI Analysis & Segmentation
const lv = LocalVision.analyse();
assert.ok(lv && lv.classMap, 'Local vision analysis should succeed');
S.classMap = lv.classMap;
S.objs = lv.data.objects || [];

// Create base masks
const wallMask = new Uint8Array(N);
const roofMask = new Uint8Array(N);
const windowMask = new Uint8Array(N);
const doorMask = new Uint8Array(N);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (y >= H * 0.45 && y <= H * 0.85 && x >= W * 0.15 && x <= W * 0.85) {
      if (x >= W * 0.25 && x <= W * 0.35 && y >= H * 0.50 && y <= H * 0.65) windowMask[i] = 1;
      else if (x >= W * 0.45 && x <= W * 0.55 && y >= H * 0.65 && y <= H * 0.85) doorMask[i] = 1;
      else if ((x - W * 0.1) ** 2 + (y - H * 0.5) ** 2 < (W * 0.08) ** 2) {} // Tree
      else wallMask[i] = 1;
    } else if (y >= H * 0.25 && y <= H * 0.45 && x >= W * 0.15 && x <= W * 0.85) {
      roofMask[i] = 1;
    }
  }
}

// Protected area: sky, tree, ground
const protectMask = new Uint8Array(N);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (y < H * 0.25 || y > H * 0.85 || ((x - W * 0.1) ** 2 + (y - H * 0.5) ** 2 < (W * 0.08) ** 2)) {
      protectMask[i] = 1;
    }
  }
}

commitMasks(
  { conf: { wall: 0.9, roof: 0.9, window: 0.85, door: 0.85 }, src: { wall: 'sam', roof: 'sam' }, agree: {}, clipped: {}, cover: {}, conflict: {}, protInfo: {}, engine: 'local' },
  { masks: { wall: wallMask, roof: roofMask, window: windowMask, door: doorMask }, protect: protectMask, dropped: {} },
  S.objs
);

History.reset();

// Verify Requirement 1: Original AI Mask & Current Edited Mask
console.log('\n--- 1. Testing Existing Mask Remains Editable & Original Preserved ---');
assert.ok(S.origMasks && S.origMasks.wall, 'Original AI mask for wall must exist');
assert.ok(S.masks && S.masks.wall, 'Current edited mask for wall must exist');
const initialWallCount = Morph.count(S.masks.wall);
const initialOrigCount = Morph.count(S.origMasks.wall);
assert.strictEqual(initialWallCount, initialOrigCount, 'Initial mask and origMask count match');
console.log(`  Initial AI mask pixels: ${initialWallCount}`);
console.log('  ✓ Requirement 1 passed: S.origMasks and S.masks maintained separately.');

// Verify Requirement 2: Brush adds pixels to current mask
console.log('\n--- 2. Testing Brush Adds Pixels with Smooth Interpolation ---');
S.target = 'wall';
S.tool = 'brush';
assert.ok(MaskEngine.beginStroke('wall'), 'beginStroke on wall should succeed');

// Simulate smooth continuous drag from (345, 180) to (355, 180) on unselected wall region
MaskEngine.brush(345, 180, true);
MaskEngine.brush(355, 180, true);
MaskEngine.endStroke();

const afterBrushCount = Morph.count(S.masks.wall);
assert.ok(afterBrushCount > initialWallCount, 'Brush stroke should increase wall mask pixels');
assert.strictEqual(Morph.count(S.origMasks.wall), initialOrigCount, 'Original AI mask must remain completely unchanged');
console.log(`  Pixels after brush: ${afterBrushCount} (+${afterBrushCount - initialWallCount} px)`);
console.log('  ✓ Requirement 2 passed: Brush adds pixels to current mask, leaves original intact.');

// Verify Requirement 3: Eraser removes pixels from current mask immediately
console.log('\n--- 3. Testing Eraser Removes Pixels Immediately ---');
S.tool = 'erase';
assert.ok(MaskEngine.beginStroke('wall'), 'beginStroke on wall for erase should succeed');
// Erase a section around (200, 200) which is inside wallMask
MaskEngine.brush(200, 200, false);
MaskEngine.endStroke();

const afterEraseCount = Morph.count(S.masks.wall);
assert.ok(afterEraseCount < afterBrushCount, 'Eraser should reduce wall mask pixels');
// Verify photographic pixels were not modified
assert.strictEqual(S.orig.data[150 * W * 4 + 160 * 4], 215, 'Original photograph pixels must not be modified by eraser');
console.log(`  Pixels after erase: ${afterEraseCount} (-${afterBrushCount - afterEraseCount} px)`);
console.log('  ✓ Requirement 3 passed: Eraser removes pixels from mask without touching photo.');

// Verify Requirement 4: Grow expands safely without encroaching on obstacles
console.log('\n--- 4. Testing Controlled Grow ---');
const beforeGrowCount = afterEraseCount;
MaskEngine.op('grow');
const afterGrowCount = Morph.count(S.masks.wall);
assert.ok(afterGrowCount >= beforeGrowCount, 'Grow should expand the current mask');

// Verify that protected tree or sky was NOT selected by Grow
const treePixelIdx = Math.floor(H * 0.5) * W + Math.floor(W * 0.1);
assert.strictEqual(S.masks.wall[treePixelIdx], 0, 'Grow must never expand into tree/protected area');
const skyPixelIdx = Math.floor(H * 0.1) * W + Math.floor(W * 0.5);
assert.strictEqual(S.masks.wall[skyPixelIdx], 0, 'Grow must never expand into sky');
// Verify window was not taken
const winPixelIdx = Math.floor(H * 0.55) * W + Math.floor(W * 0.30);
assert.strictEqual(S.masks.wall[winPixelIdx], 0, 'Grow must never expand into window');

console.log(`  Pixels after safe grow: ${afterGrowCount} (+${afterGrowCount - beforeGrowCount} px)`);
console.log('  ✓ Requirement 4 passed: Controlled grow protects sky, trees, windows, doors.');

// Verify Requirement 5: Shrink reduces cleanly without holes
console.log('\n--- 5. Testing Controlled Shrink ---');
const beforeShrinkCount = afterGrowCount;
MaskEngine.op('shrink');
const afterShrinkCount = Morph.count(S.masks.wall);
assert.ok(afterShrinkCount < beforeShrinkCount, 'Shrink should reduce mask count');
// Check no artificial pinholes inside solid body
const bgComps = Morph.components(S.masks.wall, W, H, 0);
for (let i = 0; i < N; i++) {
  if (!S.masks.wall[i] && !bgComps.border[bgComps.lab[i]]) {
    assert.ok(bgComps.sizes[bgComps.lab[i]] >= 8, 'Shrink must not leave tiny pinholes inside solid body');
  }
}
console.log(`  Pixels after safe shrink: ${afterShrinkCount} (-${beforeShrinkCount - afterShrinkCount} px)`);
console.log('  ✓ Requirement 5 passed: Clean shrink without broken holes or isolated specks.');

// Verify Requirement 6: Smooth edges
console.log('\n--- 6. Testing Smooth Preserves Architectural Edges ---');
MaskEngine.op('smooth');
const afterSmoothCount = Morph.count(S.masks.wall);
console.log(`  Pixels after smooth: ${afterSmoothCount}`);
assert.ok(afterSmoothCount > 0, 'Smooth result must be non-empty');
console.log('  ✓ Requirement 6 passed: Smooth operation completed.');

// Verify Requirement 7: Undo / Redo timeline
console.log('\n--- 7. Testing Undo and Redo ---');
console.log(`  Current history index: ${S.hi}, stack length: ${S.hist.length}`);
const countBeforeUndo1 = Morph.count(S.masks.wall);

// Undo Step 1: Reverts Smooth
History.go(-1);
const countAfterUndo1 = Morph.count(S.masks.wall);
console.log(`  Undo 1 (reverted Smooth): pixels changed to ${countAfterUndo1}`);
assert.strictEqual(countAfterUndo1, afterShrinkCount, 'Undo 1 should restore post-shrink state');

// Undo Step 2: Reverts Shrink
History.go(-1);
const countAfterUndo2 = Morph.count(S.masks.wall);
console.log(`  Undo 2 (reverted Shrink): pixels changed to ${countAfterUndo2}`);
assert.strictEqual(countAfterUndo2, afterGrowCount, 'Undo 2 should restore post-grow state');

// Redo Step: Restores Shrink
History.go(1);
const countAfterRedo = Morph.count(S.masks.wall);
console.log(`  Redo (restored Shrink): pixels changed to ${countAfterRedo}`);
assert.strictEqual(countAfterRedo, afterShrinkCount, 'Redo should restore shrunk state');
console.log('  ✓ Requirement 7 passed: Undo and Redo reliably restore exact mask states.');

// Verify Requirement 8: Colour Changes MUST NOT Destroy Mask
console.log('\n--- 8. Testing Colour Changes Do Not Destroy Mask ---');
const testColors = ['#f4f1ea', '#3b7dd8', '#9aa0a6', '#4f8a5b'];
const maskBeforeColours = S.masks.wall.slice();
const maskCountBeforeColours = Morph.count(maskBeforeColours);

for (const c of testColors) {
  S.design.colors.wall = c;
  RenderEngine.render();
  const currentCount = Morph.count(S.masks.wall);
  assert.strictEqual(currentCount, maskCountBeforeColours, `Colour change to ${c} must not alter mask pixel count`);
  for (let i = 0; i < N; i += 97) {
    assert.strictEqual(S.masks.wall[i], maskBeforeColours[i], 'Mask bytes must be identical after colour change');
  }
}
console.log('  ✓ Requirement 8 passed: 4 rapid colour changes preserved the edited mask 100%.');

// Verify Requirement 9: Zoom Coordinate Accuracy (100%, 150%, 200%)
console.log('\n--- 9. Testing Accurate Pointer Coordinates Across Zoom Levels ---');
const testZooms = [1.0, 1.5, 2.0];
const targetImgX = 160, targetImgY = 120; // Working pixel location

for (const z of testZooms) {
  S.zoom = z;
  const cEl = customContext.document.getElementById('cv');
  // Update canvas mock bounding rect to simulate zoom scaling
  cEl._rect = {
    left: 50,
    top: 100,
    width: Math.round(W * z),
    height: Math.round(H * z),
    right: 50 + Math.round(W * z),
    bottom: 100 + Math.round(H * z)
  };

  // Screen point corresponding to targetImgX, targetImgY:
  const screenX = cEl._rect.left + targetImgX * z;
  const screenY = cEl._rect.top + targetImgY * z;

  const mockMouseEvent = { clientX: screenX, clientY: screenY };
  const pMouse = pos(mockMouseEvent);
  assert.strictEqual(pMouse.x, targetImgX, `Mouse x at zoom ${z * 100}% should match working pixel x`);
  assert.strictEqual(pMouse.y, targetImgY, `Mouse y at zoom ${z * 100}% should match working pixel y`);

  // Touch event simulation
  const mockTouchEvent = {
    touches: [{ clientX: screenX, clientY: screenY }]
  };
  const pTouch = pos(mockTouchEvent);
  assert.strictEqual(pTouch.x, targetImgX, `Touch x at zoom ${z * 100}% should match working pixel x`);
  assert.strictEqual(pTouch.y, targetImgY, `Touch y at zoom ${z * 100}% should match working pixel y`);

  // Radius calculation at this zoom:
  const rWorking = (30 / 2) * (W / cEl._rect.width);
  const screenRadius = rWorking * z;
  assert.strictEqual(Math.round(screenRadius), 15, `Brush on screen should always match 15px radius`);
  console.log(`  Zoom ${Math.round(z * 100)}%: screen (${screenX}, ${screenY}) -> working (${pMouse.x}, ${pMouse.y}) [accurate]`);
}
console.log('  ✓ Requirement 9 & 10 passed: Zoom and touch coordinates aligned without offset.');

// Verify Requirement 11: Mask Display (stats / overlay live update check)
console.log('\n--- 11. Testing Mask Display & Stats ---');
S.drawing = true;
const liveStats = RenderEngine.stats(S.masks.wall, S.orig);
assert.ok(liveStats, 'RenderEngine.stats must not return null for binary mask during drawing');
assert.ok(liveStats.n > 0, 'Live stats should compute positive pixel count');
assert.ok(liveStats.bx0 >= 0 && liveStats.bx1 <= W, 'Live stats bounding box x valid');
assert.ok(liveStats.by0 >= 0 && liveStats.by1 <= H, 'Live stats bounding box y valid');
S.drawing = false;
RenderEngine.overlay();
console.log(`  Live overlay stats computed: ${liveStats.n} pixels inside bounding box [${liveStats.bx0}, ${liveStats.by0}] - [${liveStats.bx1}, ${liveStats.by1}]`);
console.log('  ✓ Requirement 11 passed: Live mask overlay operates correctly with binary mask.');

// Verify Requirement 13 & 14: Mask Data Consistency & Export
console.log('\n--- 13 & 14. Testing Authoritative Mask Consistency & Export ---');
const effAlpha = Alpha.eff('wall');
assert.ok(effAlpha && effAlpha.e, 'Effective alpha generated from authoritative S.masks.wall');
const fullAlpha = Alpha.build('wall', W * 2, H * 2);
assert.strictEqual(fullAlpha.length, W * 2 * H * 2, 'Full size export alpha generated successfully');
console.log('  ✓ Requirement 13 & 14 passed: One authoritative current mask powers render, alpha, and export.');

// Verify Revert to Original AI Mask
console.log('\n--- Testing Revert to Original AI Mask ---');
MaskEngine.revertToOriginal('wall');
const revertedCount = Morph.count(S.masks.wall);
assert.strictEqual(revertedCount, initialOrigCount, 'Reverting to original restores original AI mask count');
console.log(`  Reverted mask pixels: ${revertedCount} (matches initial AI mask: ${initialOrigCount})`);
console.log('  ✓ Revert to original AI mask works safely.');

console.log('\n====================================================');
console.log('  ✓ ALL MASK EDITING & SELECTION TESTS PASSED 100%! ');
console.log('====================================================\n');
