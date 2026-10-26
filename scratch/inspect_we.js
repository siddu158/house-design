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

const H = customContext.__HOMEHUE__;
const Col = H.LocalVision ? customContext.Col : null;
console.log('Inspecting Col.hsl of warmElegant colors:');
const we = {
  wall: '#F7F2E4', wall2: '#9E5936', roof: '#843E2B', door: '#502814', window: '#382C24', trim: '#FFFDF7',
  pillar: '#FFFFFF', balcony: '#F7F2E4', railing: '#241E1A', garage: '#502814', boundary: '#E5DDCB'
};
for (const [k, v] of Object.entries(we)) {
  const h = customContext.Col.hsl(v);
  console.log(k, v, 'h:', Math.round(h.h), 's:', +h.s.toFixed(3), 'l:', +h.l.toFixed(3));
}
