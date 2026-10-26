// Lightweight mock browser DOM environment for HomeHue
const fs = require('fs');
const vm = require('vm');

class MockElement {
    constructor(id) {
        this.id = id;
        this.style = {};
        this.dataset = {};
        this.classList = {
            toggle: () => {},
            add: () => {},
            remove: () => {},
        };
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
    getBoundingClientRect() {
        return { left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 };
    }
    querySelectorAll() { return []; }
    querySelector() { return null; }
    addEventListener() {}
    removeEventListener() {}
    setAttribute() {}
    getAttribute() { return null; }
    appendChild(c) { this.children.push(c); }
    getContext(type) {
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
    sessionStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    },
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    },
    navigator: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        hardwareConcurrency: 8
    },
    ImageData: MockImageData,
    requestAnimationFrame: fn => setTimeout(fn, 16),
    cancelAnimationFrame: id => clearTimeout(id),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    console,
    Math,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Set,
    Map,
    WeakMap,
    Promise,
    Date,
    Uint8Array,
    Int32Array,
    Float32Array,
    Float64Array,
    Uint8ClampedArray,
    BigInt64Array,
    JSON,
    Error,
    TypeError,
    Infinity,
    NaN,
    parseInt,
    parseFloat,
    encodeURIComponent,
    decodeURIComponent
};
customContext.innerWidth = 1200;
customContext.innerHeight = 800;
customContext.window.innerWidth = 1200;
customContext.window.innerHeight = 800;
customContext.window.document = customContext.document;
customContext.window.sessionStorage = customContext.sessionStorage;
customContext.window.localStorage = customContext.localStorage;
customContext.window.navigator = customContext.navigator;

console.log("Mock environment created. Loading HomeHue script...");
const html = fs.readFileSync('index.html', 'utf-8');
const s1Match = html.match(/<script>([\s\S]*?)<\/script>/);

try {
    const ctx = vm.createContext(customContext);
    const wrappedCode = s1Match[1] + '\n;globalThis.__HOMEHUE__ = { S, LocalVision, LocalDesign, Seg, Morph, Mask, MaskEngine, ColorEngine, RenderEngine, Alpha, History, DesignEngine, QualityCheck, Suggest, Models, Semantic, BA };';
    const script = new vm.Script(wrappedCode, { filename: 'homehue_engine.js' });
    script.runInContext(ctx);
    console.log("✓ Script evaluated successfully in isolated VM context!");
    const H = customContext.__HOMEHUE__;
    console.log("S.target:", H.S.target);
    console.log("S.tool:", H.S.tool);
    console.log("PAINT parts:", H.S.masks ? Object.keys(H.Mask.label) : null);
} catch (e) {
    console.error("Evaluation error:", e);
    process.exit(1);
}

(async () => {
    console.log("=================================================");
    console.log("       TESTING PALETTE & COLOR INTELLIGENCE      ");
    console.log("=================================================");
    const H = customContext.__HOMEHUE__;
    const S = H.S;
    const LocalDesign = H.LocalDesign;

    // Test baseline LocalDesign
    const mockR = {
      wall: { hex: '#e8dfce', dom: '#e8dfce', frac: 0.35, h: 42, s: 0.18, l: 0.85 },
      roof: { hex: '#26292e', dom: '#26292e', frac: 0.20, h: 215, s: 0.08, l: 0.18 },
      vegetation: { hex: '#4a6b3f', dom: '#4a6b3f', frac: 0.15, h: 105, s: 0.26, l: 0.35 },
      sky: { hex: '#87ceeb', dom: '#87ceeb', frac: 0.20, h: 200, s: 0.35, l: 0.72 },
      ground: { hex: '#808080', dom: '#808080', frac: 0.10, h: 0, s: 0, l: 0.50 }
    };
    const mockLight = { mean: 0.55, std: 0.2, sat: 0.15, temp: 0.05, dark: false, bright: false, contrast: 0.2 };
    const mockPrefs = { style: 'Modern', bud: 'Medium', acc: 'High contrast', light: 'day', climate: 'auto' };

    const baselineResult = LocalDesign.generate({ R: mockR, light: mockLight, prefs: mockPrefs });
    console.log("Baseline LocalDesign returned", baselineResult.length, "concepts.");
    for (let i = 0; i < baselineResult.length; i++) {
        console.log("  Concept " + i + ":", baselineResult[i].name);
        console.log("    colors:", baselineResult[i].colors);
        console.log("    scores:", baselineResult[i].scores);
    }
})();
