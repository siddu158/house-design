const fs = require('fs');
const vm = require('vm');

class MockElement {
    constructor(id) {
        this.id = id;
        this.style = {};
        this.dataset = {};
        this.classList = { toggle: () => {}, add: () => {}, remove: () => {} };
        this.value = (id === 'tol' ? '50' : (id === 'brush-size' ? '30' : ''));
        this.textContent = '';
        this.innerHTML = '';
        this.children = [];
        this.hidden = false;
        this.disabled = false;
        this.checked = false;
        this.width = 100;
        this.height = 100;
        this.naturalWidth = 800;
        this.naturalHeight = 600;
    }
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 }; }
    querySelectorAll() { return []; }
    querySelector() { return null; }
    addEventListener() {}
    removeEventListener() {}
    setAttribute() {}
    getAttribute() { return null; }
    appendChild(c) { this.children.push(c); }
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
    window: { addEventListener: () => {}, removeEventListener: () => {}, innerWidth: 1200, innerHeight: 800, location: locationMock },
    location: locationMock,
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    navigator: { userAgent: 'Mozilla/5.0', hardwareConcurrency: 8 },
    ImageData: MockImageData,
    requestAnimationFrame: fn => setTimeout(fn, 16),
    cancelAnimationFrame: id => clearTimeout(id),
    setTimeout, clearTimeout, setInterval, clearInterval, console, Math, Array, Object, String, Number, Boolean, Set, Map, WeakMap, Promise, Date,
    Uint8Array, Int32Array, Float32Array, Float64Array, Uint8ClampedArray, BigInt64Array, JSON, Error, TypeError,
    parseInt, parseFloat, encodeURIComponent, decodeURIComponent
};
customContext.innerWidth = 1200; customContext.innerHeight = 800;
customContext.window.innerWidth = 1200; customContext.window.innerHeight = 800;
customContext.window.document = customContext.document;
customContext.window.sessionStorage = customContext.sessionStorage;
customContext.window.localStorage = customContext.localStorage;
customContext.window.navigator = customContext.navigator;

console.log('Loading index.html...');
const html = fs.readFileSync('index.html', 'utf-8');
const s1Match = html.match(/<script>([\s\S]*?)<\/script>/);

let H;
try {
    const ctx = vm.createContext(customContext);
    const wrappedCode = s1Match[1] + '\n;globalThis.__HOMEHUE__ = { S, Col, LocalVision, LocalDesign, Score, FAMILY, finishPalette, designContext, PAINT, PART_NAME };';
    const script = new vm.Script(wrappedCode, { filename: 'homehue_engine.js' });
    script.runInContext(ctx);
    H = customContext.__HOMEHUE__;
    console.log('✓ Successfully loaded index.html script in VM!');
} catch (e) {
    console.error('Error loading index.html:', e);
    process.exit(1);
}

// Inspect current finishPalette on high contrast
console.log('\n--- Checking current finishPalette trim behavior ---');
const testColors = { wall: '#F4F2EC', trim: '#FFFFFF', roof: '#22252a', door: '#5A3218', window: '#24211e' };
const testK = { ut: 'warm', temp: 0, dark: false, bright: false, tags: new Set(), acc: 'High contrast', bud: 'Medium', climate: 'auto', roofDark: true };
const finished = H.finishPalette(testColors, testK);
console.log('Original trim was #FFFFFF.');
console.log('Finished trim with acc="High contrast" is:', finished.trim);
const contrast = H.Col.contrast(finished.wall, finished.trim);
console.log('Contrast ratio:', contrast.toFixed(2), 'HSL:', H.Col.hsl(finished.trim));
