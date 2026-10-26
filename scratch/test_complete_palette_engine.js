// Simulation of complete upgraded palette recommendation system
const PAINT = ['wall', 'wall2', 'roof', 'door', 'window', 'trim', 'pillar', 'balcony', 'railing', 'garage', 'boundary'];
const PART_NAME = { wall: 'Main wall', wall2: 'Secondary wall', roof: 'Roof', door: 'Front door', window: 'Windows', trim: 'Trim and frames', pillar: 'Pillars and columns', balcony: 'Balcony', railing: 'Railings', garage: 'Garage door', boundary: 'Boundary wall' };

function rgb(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
function hex(r) { return '#' + r.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function hsl(h) {
  const [r, g, b] = rgb(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  let H = 0, s = 0;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); H = (mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; if (H < 0) H += 360 }
  return { h: H, s, l };
}
function fromHsl(o) {
  const h = ((o.h % 360) + 360) % 360, s = Math.max(0, Math.min(1, o.s)), l = Math.max(0, Math.min(1, o.l)), c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return hex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d };
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function designContext(R, light, prefs, tags, climate) {
  const W = R.wall || null, roof = R.roof || null, veg = R.vegetation || null, sky = R.sky || null, gnd = R.ground || null, has = t => tags.has(t);
  let ut = 'warm';
  if (['warm', 'tropical', 'desert', 'indian', 'traditional', 'natural'].some(has)) ut = 'warm';
  else if (has('cool') || has('cold')) ut = 'cool';
  else if (light.temp > .12) ut = 'cool';
  else if (light.temp < -.12) ut = 'warm';
  else if (veg && veg.frac > .06) ut = 'warm';
  else if (sky && sky.frac > .2 && sky.s > .12) ut = 'warm';
  else if (W && W.s > .08) ut = (W.h >= 180 && W.h <= 260) ? 'cool' : 'warm';

  const isTerracottaRoof = !!(roof && roof.h >= 12 && roof.h <= 45 && roof.s > 0.15 && roof.l >= 0.20 && roof.l <= 0.60);
  const roofDark = !!(roof && roof.l < 0.38);

  return {
    ut, temp: light.temp || 0, dark: !!light.dark, bright: !!light.bright, tags, acc: prefs.acc, bud: prefs.bud, climate: climate || 'auto',
    wallRef: W, roofRef: roof, roofDark, isTerracottaRoof,
    vegStrong: !!(veg && veg.frac > 0.05), vegH: veg ? veg.h : null,
    skyBlue: !!(sky && sky.frac > .1 && sky.s > .1 && hueDist(sky.h, 215) < 35),
    groundGrey: !!(gnd && gnd.s < .15 && gnd.l > .3 && gnd.l < .75), groundL: gnd ? gnd.l : null
  };
}

const FAMILY = {
  modernLux: {
    title: 'Modern Luxury',
    why: 'Alabaster masonry walls paired with architectural charcoal features, brilliant white pillars, and a rich walnut door create a commanding, high-end villa facade',
    light: 'Warm 3000K accent uplights on the entrance and architectural pillars; crisp natural daylight across the facade.',
    mat: 'Ultra-flat matte acrylic masonry coating, walnut timber door stain, dark bronze window extrusions, matte graphite parapet.',
    colorNames: { wall: 'Warm Alabaster', wall2: 'Architectural Slate', roof: 'Graphite Ridge', door: 'Smoked Walnut', window: 'Obsidian Frame', trim: 'Brilliant White', pillar: 'Brilliant White', balcony: 'Warm Alabaster', railing: 'Iron Matte', garage: 'Smoked Walnut', boundary: 'Warm Stone' },
    build(k) {
      const c = k.ut === 'cool';
      const wall = k.isTerracottaRoof ? '#F4F1EA' : (c ? '#EBECE8' : '#F4F2EC');
      const roof = k.isTerracottaRoof ? '#3A312B' : (k.roofDark ? '#22252A' : '#26292E');
      const door = c ? '#1C364D' : '#5A3218';
      return {
        wall, wall2: '#323B44', roof, door, window: c ? '#1E2226' : '#24211E', trim: '#FFFFFF',
        pillar: '#FFFFFF', balcony: wall, railing: '#212326', garage: door, boundary: '#E5DFD5'
      };
    }
  },
  natural: {
    title: 'Natural Contemporary',
    why: 'Warm oat textured masonry with calming earthy sage accents and natural timber elements harmonize effortlessly with surrounding landscape and greenery',
    light: 'Warm 3000K soft wash brings out the sage undertones and warm oat texture during twilight.',
    mat: 'Mineral silicate breathable paint, natural cedar/teak timber stain, architectural bronze hardware.',
    colorNames: { wall: 'Warm Oat', wall2: 'Earthy Sage', roof: 'Weathered Bark', door: 'Golden Timber', window: 'Forest Bronze', trim: 'Natural Linen', pillar: 'Natural Linen', balcony: 'Warm Oat', railing: 'Forest Bronze', garage: 'Golden Timber', boundary: 'Meadow Stone' },
    build(k) {
      const roof = k.isTerracottaRoof ? (k.roofRef ? k.roofRef.hex : '#843E2B') : (k.roofDark ? '#322C26' : '#3A332C');
      return {
        wall: '#F1EBE1', wall2: '#6E8067', roof, door: '#7C4B25', window: '#282A25', trim: '#FAF7F2',
        pillar: '#FAF7F2', balcony: '#F1EBE1', railing: '#282A25', garage: '#7C4B25', boundary: '#D4D9D0'
      };
    }
  },
  warmElegant: {
    title: 'Warm Elegant',
    why: 'Rich antique cream masonry accented by burnt sienna architectural elements, warm chantilly trim, and a deep teak entrance door impart timeless warmth and prestige',
    light: 'Warm 2700K illumination enhances the warm cream facade; natural daylight enriches the earthy accents.',
    mat: 'Satin-finish exterior masonry paint, hand-rubbed teak stain, warm bronze door hardware, terracotta tile or slate roof.',
    colorNames: { wall: 'Antique Cream', wall2: 'Burnt Sienna', roof: 'Tuscan Terracotta', door: 'Heritage Teak', window: 'Espresso Bronze', trim: 'Warm Chantilly', pillar: 'Warm Chantilly', balcony: 'Antique Cream', railing: 'Antique Bronze', garage: 'Heritage Teak', boundary: 'Travertine Sand' },
    build(k) {
      const roof = k.isTerracottaRoof ? (k.roofRef ? k.roofRef.hex : '#7A3828') : (k.roofDark ? '#3A3430' : '#7A3828');
      return {
        wall: '#F7F2E4', wall2: '#9E5936', roof, door: '#502814', window: '#382C24', trim: '#FFFDF7',
        pillar: '#FFFDF7', balcony: '#F7F2E4', railing: '#241E1A', garage: '#502814', boundary: '#E5DDCB'
      };
    }
  },
  minimalModern: {
    title: 'Minimal Modern',
    why: 'Clean Nordic chalk walls framed by architectural graphite accents, pure white pillars, and natural blonde oak deliver a sophisticated minimalist aesthetic',
    light: 'Neutral 4000K crisp exterior downlighting accentuates clean planar surfaces and shadow lines.',
    mat: 'Fine-texture smooth masonry paint, architectural powder-coated aluminium frames, white oak entrance door.',
    colorNames: { wall: 'Nordic Chalk', wall2: 'Architectural Graphite', roof: 'Midnight Slate', door: 'Blonde Oak', window: 'Matte Obsidian', trim: 'Crisp Gallery White', pillar: 'Crisp Gallery White', balcony: 'Nordic Chalk', railing: 'Matte Obsidian', garage: 'Blonde Oak', boundary: 'Clean Concrete' },
    build(k) {
      const wall = k.isTerracottaRoof ? '#F6F4EE' : '#F8F9FA';
      const roof = k.isTerracottaRoof ? '#342D28' : '#1F2226';
      return {
        wall, wall2: '#3C424A', roof, door: '#8C582A', window: '#181A1B', trim: '#FFFFFF',
        pillar: '#FFFFFF', balcony: wall, railing: '#181A1B', garage: '#8C582A', boundary: '#D6D8DA'
      };
    }
  },
  bold: {
    title: 'Bold Contemporary',
    why: 'Pure architectural white walls paired with deep royal sapphire accents and a burnt terracotta focal door establish an energetic, designer-curated presence',
    light: 'Neutral 4000K wash lighting maintains true saturation of the architectural sapphire and terracotta tones.',
    mat: 'Premium exterior elastomeric coating, powder-coated satin metal features, glazed ceramic statement door.',
    colorNames: { wall: 'Arctic Pure White', wall2: 'Deep Royal Sapphire', roof: 'Basalt Black', door: 'Burnt Terracotta', window: 'Midnight Anodized', trim: 'Pure White', pillar: 'Pure White', balcony: 'Arctic Pure White', railing: 'Midnight Anodized', garage: 'Burnt Terracotta', boundary: 'Cool Limestone' },
    build(k) {
      return {
        wall: '#F7F8F9', wall2: '#1E3A5F', roof: '#1C1F24', door: '#B84F2E', window: '#16181A', trim: '#FFFFFF',
        pillar: '#FFFFFF', balcony: '#F7F8F9', railing: '#16181A', garage: '#B84F2E', boundary: '#DBDEE3'
      };
    }
  }
};

function selectDefaultFamilies(k, prefs, tags) {
  let picks = [];
  if (k.isTerracottaRoof) {
    picks = ['warmElegant', 'natural', 'modernLux', 'minimalModern', 'bold'];
  } else if (k.vegStrong) {
    picks = ['natural', 'modernLux', 'minimalModern', 'warmElegant', 'bold'];
  } else if (k.ut === 'cool') {
    picks = ['modernLux', 'minimalModern', 'bold', 'natural', 'warmElegant'];
  } else {
    picks = ['modernLux', 'natural', 'warmElegant', 'minimalModern', 'bold'];
  }
  return picks;
}

// Test case 1: House with dark roof and greenery
console.log('--- TEST 1: House with dark roof and greenery ---');
const R1 = {
  wall: { hex: '#e8dfce', dom: '#e8dfce', frac: 0.35, h: 42, s: 0.18, l: 0.85 },
  roof: { hex: '#26292e', dom: '#26292e', frac: 0.20, h: 215, s: 0.08, l: 0.18 },
  vegetation: { hex: '#4a6b3f', dom: '#4a6b3f', frac: 0.15, h: 105, s: 0.26, l: 0.35 }
};
const light1 = { mean: 0.55, std: 0.2, sat: 0.15, temp: 0.05, dark: false, bright: false };
const prefs1 = { style: 'Modern', bud: 'Medium', acc: 'High contrast', climate: 'auto' };
const k1 = designContext(R1, light1, prefs1, new Set(), 'auto');
console.log('k1:', { ut: k1.ut, isTerracottaRoof: k1.isTerracottaRoof, roofDark: k1.roofDark, vegStrong: k1.vegStrong });

const picks1 = selectDefaultFamilies(k1, prefs1, new Set());
console.log('Picks for test 1:', picks1);
for (const p of picks1) {
  const f = FAMILY[p];
  const colors = f.build(k1);
  console.log('  Family ' + f.title + ':');
  console.log('    Wall:', colors.wall, '(' + f.colorNames.wall + ')');
  console.log('    Door:', colors.door, '(' + f.colorNames.door + ')');
  console.log('    Trim:', colors.trim, '(' + f.colorNames.trim + ')');
  console.log('    Roof:', colors.roof, '(' + f.colorNames.roof + ')');
}

// Test case 2: House with terracotta tile roof
console.log('\n--- TEST 2: House with terracotta clay tile roof ---');
const R2 = {
  wall: { hex: '#f0ece1', dom: '#f0ece1', frac: 0.40, h: 40, s: 0.15, l: 0.90 },
  roof: { hex: '#8b4513', dom: '#8b4513', frac: 0.25, h: 25, s: 0.45, l: 0.31 },
  vegetation: { hex: '#4a6b3f', dom: '#4a6b3f', frac: 0.08, h: 105, s: 0.26, l: 0.35 }
};
const k2 = designContext(R2, light1, prefs1, new Set(), 'auto');
console.log('k2:', { ut: k2.ut, isTerracottaRoof: k2.isTerracottaRoof, roofDark: k2.roofDark, vegStrong: k2.vegStrong });
const picks2 = selectDefaultFamilies(k2, prefs1, new Set());
console.log('Picks for test 2:', picks2);
for (const p of picks2) {
  const f = FAMILY[p];
  const colors = f.build(k2);
  console.log('  Family ' + f.title + ':');
  console.log('    Wall:', colors.wall, '(' + f.colorNames.wall + ')');
  console.log('    Door:', colors.door, '(' + f.colorNames.door + ')');
  console.log('    Trim:', colors.trim, '(' + f.colorNames.trim + ')');
  console.log('    Roof:', colors.roof, '(' + f.colorNames.roof + ')');
}

console.log('\nAll simulation checks passed!');
