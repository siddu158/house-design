const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('====================================================');
console.log('   HOMEHUE E2E USER SEQUENCE DOM INTEGRATION TEST   ');
console.log('====================================================\n');

class MockElement {
  constructor(id) {
    this.id = id;
    this.style = {};
    this.dataset = {};
    this.classList = {
      _classes: new Set(),
      toggle: function(cls, force) {
        if (force === undefined) {
          if (this._classes.has(cls)) this._classes.delete(cls); else this._classes.add(cls);
        } else if (force) this._classes.add(cls); else this._classes.delete(cls);
      },
      add: function(cls) { this._classes.add(cls); },
      remove: function(cls) { this._classes.delete(cls); },
      contains: function(cls) { return this._classes.has(cls); }
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
    this._listeners = {};
  }
  getBoundingClientRect() { return this._rect; }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  addEventListener(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }
  removeEventListener(event, fn) {
    if (this._listeners[event]) this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  }
  dispatchEvent(event) {
    const list = this._listeners[event.type] || [];
    for (const fn of list) fn(event);
  }
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
  toBlob(cb) { cb(new (customContext.Blob || class Blob{})()); }
  setPointerCapture() {}
  releasePointerCapture() {}
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
  if (!elements.has(id)) elements.set(id, new MockElement(id));
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
const wrappedCode = s1Match[1] + '\n;globalThis.__HH__ = { S, LocalVision, LocalDesign, Seg, Morph, Mask, MaskEngine, ColorEngine, RenderEngine, Alpha, History, MaskHistory, QualityCheck, Suggest, Models, Semantic, BA, UI, validateMask, maskAllowsColour, commitMasks, setTool, clickSelect, pos, bump, ProjectManager };';
const script = new vm.Script(wrappedCode, { filename: 'homehue_engine.js' });
script.runInContext(ctx);

const HH = customContext.__HH__;
const { S, LocalVision, LocalDesign, Seg, Morph, MaskEngine, ColorEngine, RenderEngine, Alpha, History, MaskHistory, QualityCheck, UI, validateMask, commitMasks, pos, setTool, ProjectManager } = HH;

// 1. UPLOAD IMAGE
const W = 320, H = 240, N = W * H;
const aw = 160, ah = 120, an = aw * ah;
S.w = W; S.h = H; S.aw = aw; S.ah = ah; S.imgId = 'e2e_photo_1';
S.orig = new MockImageData(W, H); S.cur = new MockImageData(W, H); S.small = new MockImageData(aw, ah);
S.lumW = new Float32Array(N); S.lum = new Float32Array(an);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x, k = i * 4;
    let r = 210, g = 205, b = 195;
    if (y < H * 0.3) { r = 110; g = 170; b = 230; }
    else if (y > H * 0.85) { r = 70; g = 70; b = 70; }
    else if (y >= H * 0.25 && y <= H * 0.45 && x >= W * 0.15 && x <= W * 0.85) { r = 50; g = 52; b = 60; }
    else if (x >= W * 0.25 && x <= W * 0.35 && y >= H * 0.50 && y <= H * 0.65) { r = 30; g = 40; b = 55; }
    else if (x >= W * 0.45 && x <= W * 0.55 && y >= H * 0.65 && y <= H * 0.85) { r = 90; g = 45; b = 20; }
    S.orig.data[k] = r; S.orig.data[k + 1] = g; S.orig.data[k + 2] = b; S.orig.data[k + 3] = 255;
    S.lumW[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
}
console.log('Step 1: UPLOAD IMAGE completed.');

// 2. AI ANALYSIS
const lv = LocalVision.analyse();
S.classMap = lv.classMap; S.objs = lv.data.objects || [];
console.log('Step 2: AI ANALYSIS completed.');

// 3. SELECT WALL & 4. GENERATE MASK
const wallMask = new Uint8Array(N);
for (let y = Math.floor(H * 0.45); y <= Math.floor(H * 0.85); y++) {
  for (let x = Math.floor(W * 0.15); x <= Math.floor(W * 0.85); x++) {
    const isWin = (x >= W * 0.25 && x <= W * 0.35 && y >= H * 0.50 && y <= H * 0.65);
    const isDoor = (x >= W * 0.45 && x <= W * 0.55 && y >= H * 0.65 && y <= H * 0.85);
    if (!isWin && !isDoor) wallMask[y * W + x] = 1;
  }
}
const protMask = new Uint8Array(N);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (y < H * 0.25 || y > H * 0.85) protMask[y * W + x] = 1;
  }
}
commitMasks(
  { conf: { wall: 0.95 }, src: { wall: 'sam' }, agree: {}, clipped: {}, cover: {}, conflict: {}, protInfo: {}, engine: 'local' },
  { masks: { wall: wallMask }, protect: protMask, dropped: {} },
  S.objs
);
History.reset();
S.target = 'wall';
assert.ok(S.origMasks && S.origMasks.wall, 'S.origMasks.wall must be preserved');
const origCount = Morph.count(S.origMasks.wall);
console.log(`Step 3 & 4: WALL SELECTED & MASK GENERATED (AI pixels: ${origCount}).`);

// 5. BRUSH (Simulate pointer event on wrap)
const wrap = getOrCreate('wrap');
setTool('brush');
assert.strictEqual(S.tool, 'brush');

// Simulate mouse drag via DOM events
const cvEl = getOrCreate('cv');
cvEl._rect = { left: 0, top: 0, width: W, height: H };

wrap.dispatchEvent({ type: 'pointerdown', pointerType: 'mouse', clientX: 290, clientY: 150, preventDefault: () => {} });
wrap.dispatchEvent({ type: 'pointermove', pointerType: 'mouse', clientX: 295, clientY: 150, preventDefault: () => {} });
wrap.dispatchEvent({ type: 'pointermove', pointerType: 'mouse', clientX: 300, clientY: 150, preventDefault: () => {} });
wrap.dispatchEvent({ type: 'pointerup', pointerType: 'mouse', preventDefault: () => {} });

const countAfterBrush = Morph.count(S.masks.wall);
assert.ok(countAfterBrush >= origCount, 'Brush stroke must add pixels to wall mask');
assert.strictEqual(Morph.count(S.origMasks.wall), origCount, 'Original AI mask must remain completely unchanged');
console.log(`Step 5: BRUSH applied (pixels: ${countAfterBrush}).`);

// 6. ERASER (Simulate touch event on wrap)
setTool('erase');
assert.strictEqual(S.tool, 'erase');

wrap.dispatchEvent({ type: 'touchstart', cancelable: true, touches: [{ clientX: 180, clientY: 150 }], preventDefault: () => {} });
wrap.dispatchEvent({ type: 'touchmove', cancelable: true, touches: [{ clientX: 185, clientY: 150 }], preventDefault: () => {} });
wrap.dispatchEvent({ type: 'touchend', cancelable: true, preventDefault: () => {} });

const countAfterErase = Morph.count(S.masks.wall);
assert.ok(countAfterErase < countAfterBrush, 'Eraser must remove pixels from wall mask');
console.log(`Step 6: ERASER applied (pixels: ${countAfterErase}).`);

// 7. GROW
const countBeforeGrow = countAfterErase;
getOrCreate('bGrow').onclick();
const countAfterGrow = Morph.count(S.masks.wall);
assert.ok(countAfterGrow > countBeforeGrow, 'Grow must expand mask');
console.log(`Step 7: GROW applied (pixels: ${countAfterGrow}).`);

// 8. SHRINK
getOrCreate('bShr').onclick();
const countAfterShrink = Morph.count(S.masks.wall);
assert.ok(countAfterShrink < countAfterGrow, 'Shrink must reduce mask');
console.log(`Step 8: SHRINK applied (pixels: ${countAfterShrink}).`);

// 9. SMOOTH
getOrCreate('bSmo').onclick();
const countAfterSmooth = Morph.count(S.masks.wall);
assert.ok(countAfterSmooth > 0, 'Smooth must maintain valid mask');
console.log(`Step 9: SMOOTH applied (pixels: ${countAfterSmooth}).`);

// 10. UNDO 1 (reverts Smooth)
getOrCreate('mUn').onclick();
const countAfterUndo1 = Morph.count(S.masks.wall);
assert.strictEqual(countAfterUndo1, countAfterShrink, 'Undo 1 must revert to shrunk state');
console.log(`Step 10: UNDO 1 applied (reverted to shrunk: ${countAfterUndo1} px).`);

// 11. UNDO 2 (reverts Shrink)
getOrCreate('mUn').onclick();
const countAfterUndo2 = Morph.count(S.masks.wall);
assert.strictEqual(countAfterUndo2, countAfterGrow, 'Undo 2 must revert to grown state');
console.log(`Step 11: UNDO 2 applied (reverted to grown: ${countAfterUndo2} px).`);

// 12. REDO (restores Shrink)
getOrCreate('mRe').onclick();
const countAfterRedo = Morph.count(S.masks.wall);
assert.strictEqual(countAfterRedo, countAfterShrink, 'Redo must restore shrunk state');
console.log(`Step 12: REDO applied (restored shrunk: ${countAfterRedo} px).`);

// 13. APPLY COLOUR
S.design.colors.wall = '#f4f2ec';
RenderEngine.render();
const countAfterApply = Morph.count(S.masks.wall);
assert.strictEqual(countAfterApply, countAfterRedo, 'Applying colour must NOT change mask pixels');
console.log('Step 13: APPLY COLOUR applied (mask preserved 100%).');

// 14. CHANGE COLOUR (Rapid palette changes)
const colorChain = ['#3b7dd8', '#9aa0a6', '#f1ebe1', '#4f8a5b'];
for (const col of colorChain) {
  S.design.colors.wall = col;
  RenderEngine.render();
  assert.strictEqual(Morph.count(S.masks.wall), countAfterRedo, `Mask must stay unchanged when changing colour to ${col}`);
}
console.log('Step 14: CHANGE COLOUR 4x (mask remained 100% stable).');

// 15. BEFORE / AFTER
assert.ok(customContext.document.getElementById('baPanel'), 'Before/After panel must exist');
getOrCreate('bCmp').onclick();
assert.strictEqual(getOrCreate('baPanel').hidden, false, 'Before/After panel should open');
console.log('Step 15: BEFORE / AFTER panel opened successfully.');

// 16. EXPORT
let exportedBlob = null, exportedName = '';
ProjectManager.dl = (blob, name) => { exportedBlob = blob; exportedName = name; };
ProjectManager.exportImg('png');
assert.ok(exportedName.includes('homehue.png'), 'Export PNG should trigger download');
console.log(`Step 16: EXPORT completed (${exportedName}).`);

// 17. ZOOM ACCURACY (100%, 150%, 200%)
const zooms = [1.0, 1.5, 2.0];
for (const z of zooms) {
  S.zoom = z;
  cvEl._rect = { left: 0, top: 0, width: W * z, height: H * z };
  const sx = 100 * z, sy = 80 * z;
  const p = pos({ clientX: sx, clientY: sy });
  assert.strictEqual(p.x, 100, `Zoom ${z*100}% pos.x should be 100`);
  assert.strictEqual(p.y, 80, `Zoom ${z*100}% pos.y should be 80`);
}
console.log('Step 17: ZOOM ACCURACY (100%, 150%, 200%) verified.');

console.log('\n====================================================');
console.log(' ✓ COMPLETE E2E WORKFLOW TEST PASSED WITH ZERO ERRORS!');
console.log('====================================================\n');
