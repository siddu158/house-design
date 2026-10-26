const fs = require('fs');

// Standalone simulation of the upgraded palette engine
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
function lum(h) { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
function contrast(h1, h2) { const l1 = lum(h1), l2 = lum(h2); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
function dE(h1, h2) {
  const [r1, g1, b1] = rgb(h1), [r2, g2, b2] = rgb(h2);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2) / 2.55;
}
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d };
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const clampInt = x => Math.max(0, Math.min(100, Math.round(x)));
const softPen = (v, target, tol, w, cap) => Math.min(cap, Math.max(0, Math.abs(v - target) - tol) * w);

// Robust detection of existing parts from real house analysis
function getExistingHouseParts(R, analysis, masks) {
  const s = new Set();
  s.add('wall'); // Main wall always exists

  const objs = (analysis && analysis.data && Array.isArray(analysis.data.objects)) ? analysis.data.objects :
               (analysis && Array.isArray(analysis.objects)) ? analysis.objects : [];
  for (const o of objs) {
    let c = o.cls || o.type;
    if (c === 'secondary_wall') c = 'wall2';
    if (c && PAINT.includes(c)) s.add(c);
  }

  const lp = (analysis && analysis.data && Array.isArray(analysis.data.localParts)) ? analysis.data.localParts : [];
  for (const p of lp) {
    let c = p;
    if (c === 'secondary_wall') c = 'wall2';
    if (c && PAINT.includes(c)) s.add(c);
  }

  if (masks) {
    for (const t of PAINT) {
      if (masks[t] && masks[t].some && masks[t].some(x => x > 0)) s.add(t);
    }
  }

  if (R) {
    for (const t of PAINT) {
      if (R[t] && R[t].frac > 0.003) s.add(t);
    }
  }

  // Core features if no explicit objects/masks available yet
  if (!objs.length && (!masks || Object.keys(masks).length === 0)) {
    if (R && R.roof && R.roof.frac > 0.005) s.add('roof');
    s.add('door');
    s.add('window');
    s.add('trim');
  }

  return s;
}

// Deep architectural house analysis for colour recommendations
function designContext(R, light, prefs, tags, climate, analysis, masks) {
  const W = (R && R.wall) || null, roof = (R && R.roof) || null, veg = (R && R.vegetation) || null, sky = (R && R.sky) || null, gnd = (R && R.ground) || null;
  const has = t => tags.has(t);
  const existing = getExistingHouseParts(R, analysis, masks);

  const isTerracottaRoof = !!(roof && roof.h >= 12 && roof.h <= 45 && roof.s > 0.15 && roof.l >= 0.20 && roof.l <= 0.60);
  const roofDark = !!(roof && roof.l < 0.38);

  // Detect wood elements in house
  let hasWood = false, woodTone = '#6E3E1C';
  if (R && R.door && R.door.h >= 15 && R.door.h <= 45 && R.door.s >= 0.25 && R.door.l >= 0.15 && R.door.l <= 0.52) {
    hasWood = true; woodTone = R.door.hex;
  }
  if (R && R.wall2 && R.wall2.h >= 18 && R.wall2.h <= 45 && R.wall2.s >= 0.20 && R.wall2.l >= 0.18 && R.wall2.l <= 0.48) {
    hasWood = true;
  }
  if (analysis && analysis.data && analysis.data.materials) {
    const matStr = JSON.stringify(analysis.data.materials).toLowerCase();
    if (matStr.includes('wood') || matStr.includes('timber') || matStr.includes('teak') || matStr.includes('cedar') || matStr.includes('oak')) {
      hasWood = true;
    }
  }

  let ut = 'warm';
  if (isTerracottaRoof || hasWood) ut = 'warm';
  else if (['warm', 'tropical', 'desert', 'indian', 'traditional', 'natural'].some(has)) ut = 'warm';
  else if (has('cool') || has('cold')) ut = 'cool';
  else if (light && light.temp > .12) ut = 'cool'; // warm sunlight: cooler neutrals balance it
  else if (light && light.temp < -.12) ut = 'warm'; // cool overcast: warmer neutrals add life
  else if (veg && veg.frac > .04) ut = 'warm'; // warm neutrals sit best beside greenery
  else if (sky && sky.frac > .15 && sky.s > .12) ut = 'warm';
  else if (W && W.s > .08) ut = (W.h >= 180 && W.h <= 260) ? 'cool' : 'warm';

  return {
    existing, ut, temp: (light && light.temp) || 0, dark: !!(light && light.dark), bright: !!(light && light.bright),
    tags, acc: prefs.acc, bud: prefs.bud, climate: climate || 'auto',
    wallRef: W, roofRef: roof, roofDark, isTerracottaRoof,
    hasWood, woodTone,
    vegStrong: !!(veg && veg.frac > 0.04), vegH: veg ? veg.h : null,
    skyBlue: !!(sky && sky.frac > .08 && sky.s > .1 && hueDist(sky.h, 215) < 35),
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
      const door = k.hasWood ? '#502814' : (c ? '#1C364D' : '#4E2F1D');
      return {
        wall, wall2: '#323B44', roof, door, window: '#181A1B', trim: '#FFFFFF',
        pillar: '#FFFFFF', balcony: wall, railing: '#1E2226', garage: door, boundary: '#E5DFD5'
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
        wall: '#F7F2E4', wall2: '#9E5936', roof, door: '#502814', window: '#2A221E', trim: '#FFFDF7',
        pillar: '#FFFDF7', balcony: '#F7F2E4', railing: '#241E1A', garage: '#502814', boundary: '#E5DDCB'
      };
    }
  },
  natural: {
    title: 'Natural Contemporary',
    why: 'Warm oat textured masonry with calming earthy sage accents and natural timber elements harmonize effortlessly with surrounding landscape and greenery',
    light: 'Warm 3000K soft wash brings out the sage undertones and warm oat texture during twilight.',
    mat: 'Mineral silicate breathable paint, natural cedar/teak timber stain, architectural bronze hardware.',
    colorNames: { wall: 'Warm Oat', wall2: 'Earthy Sage', roof: 'Weathered Bark', door: 'Golden Cedar', window: 'Forest Bronze', trim: 'Natural Linen', pillar: 'Natural Linen', balcony: 'Warm Oat', railing: 'Forest Bronze', garage: 'Golden Cedar', boundary: 'Meadow Stone' },
    build(k) {
      const roof = k.isTerracottaRoof ? (k.roofRef ? k.roofRef.hex : '#843E2B') : (k.roofDark ? '#322C26' : '#3A332C');
      return {
        wall: '#F1EBE1', wall2: '#6E8067', roof, door: '#7C4B25', window: '#282A25', trim: '#FAF7F2',
        pillar: '#FAF7F2', balcony: '#F1EBE1', railing: '#282A25', garage: '#7C4B25', boundary: '#D4D9D0'
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
      const wall = k.isTerracottaRoof ? '#F6F4EE' : (k.roofDark ? '#F8F9FA' : '#F5F6F7');
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
  },
  whiteWood: {
    title: 'White & Wood',
    why: 'Pristine gallery white facade warmed by rich golden teak architectural battens and entrance door, balanced by dark architectural bronze frames',
    light: 'Warm 3000K directional lighting grazes wood textures to create rich ambient warmth in the evening.',
    mat: 'Smooth chalk-white exterior paint, kiln-dried teak wood slats, anodized dark bronze glazing mullions.',
    colorNames: { wall: 'Pristine White', wall2: 'Warm Teak Slat', roof: 'Flint Charcoal', door: 'Solid Teak', window: 'Espresso Bronze', trim: 'Pristine White', pillar: 'Pristine White', balcony: 'Pristine White', railing: 'Dark Timber Bronze', garage: 'Solid Teak', boundary: 'Alabaster Base' },
    build(k) {
      const roof = k.isTerracottaRoof ? (k.roofRef ? k.roofRef.hex : '#843E2B') : '#25282C';
      return {
        wall: '#FAF9F6', wall2: '#7E4822', roof, door: '#7A431D', window: '#2A221E', trim: '#FFFFFF',
        pillar: '#FFFFFF', balcony: '#FAF9F6', railing: '#221C18', garage: '#7A431D', boundary: '#F0EEE9'
      };
    }
  },
  indian: {
    title: 'Indian Contemporary',
    why: 'Royal ivory masonry grounded by rich Jaipur terracotta feature sections, brilliant white columns, and a carved teak door inspired by traditional courtyard havelis',
    light: 'Warm 2700K lighting flatters the royal ivory tones and enriches the natural terracotta warmth.',
    mat: 'Breathable lime-wash finish, natural terracotta tiles or clay cladding, solid carved teakwood entrance.',
    colorNames: { wall: 'Royal Ivory', wall2: 'Jaipur Terracotta', roof: 'Mangalore Tile', door: 'Carved Teak', window: 'Dark Patina Bronze', trim: 'Chunam White', pillar: 'Brilliant White', balcony: 'Royal Ivory', railing: 'Dark Patina Bronze', garage: 'Carved Teak', boundary: 'Dholpur Sandstone' },
    build(k) {
      const roof = k.roofDark ? '#3A3633' : (k.roofRef ? k.roofRef.hex : '#863B29');
      return {
        wall: '#F5EFEB', wall2: '#A84A2F', roof, door: '#65391C', window: '#2A221E', trim: '#FAF8F5',
        pillar: '#FFFFFF', balcony: '#F5EFEB', railing: '#2A221E', garage: '#65391C', boundary: '#EADECB'
      };
    }
  },
  coastal: {
    title: 'Coastal Calm',
    why: 'Misty sea-salt walls with weathered slate secondary panels, maritime white trim, and a driftwood oak entrance door evoke breezy coastal serenity',
    light: 'Soft 3500K daylight wash maintains crisp, refreshing coastal clarity without harsh glare.',
    mat: 'Weather-resistant acrylic satin masonry paint, driftwood stain, marine-grade stainless/pewter hardware.',
    colorNames: { wall: 'Sea-Salt White', wall2: 'Weathered Slate', roof: 'Nautical Charcoal', door: 'Driftwood Oak', window: 'Pewter Grey', trim: 'Maritime White', pillar: 'Maritime White', balcony: 'Sea-Salt White', railing: 'Pewter Grey', garage: 'Driftwood Oak', boundary: 'Dune Sand' },
    build(k) {
      const wall = k.ut === 'warm' ? '#F0EEE8' : '#F0F3F4';
      return {
        wall, wall2: '#5B6874', roof: '#2B3138', door: '#785D48', window: '#2D3238', trim: '#FFFFFF',
        pillar: '#FFFFFF', balcony: wall, railing: '#2D3238', garage: '#785D48', boundary: '#E2DFD8'
      };
    }
  }
};

function selectDefaultFamilies(k, prefs, tags) {
  let picks = [];
  if (k.isTerracottaRoof) {
    picks = ['warmElegant', 'natural', 'modernLux', 'indian', 'whiteWood'];
  } else if (k.hasWood) {
    picks = ['whiteWood', 'modernLux', 'natural', 'warmElegant', 'minimalModern'];
  } else if (k.vegStrong) {
    picks = ['natural', 'modernLux', 'minimalModern', 'warmElegant', 'whiteWood'];
  } else if (k.ut === 'cool') {
    picks = ['modernLux', 'minimalModern', 'coastal', 'bold', 'natural'];
  } else {
    picks = ['modernLux', 'natural', 'warmElegant', 'minimalModern', 'bold'];
  }
  return picks;
}

// Clean finishPalette that avoids muddy trim
function finishPalette(c, k) {
  const o = { ...c };
  const adj = (t, fn) => { if (o[t]) o[t] = fromHsl(fn(hsl(o[t]))); };

  // Lighting adjustments
  if (k.dark) {
    for (const t of ['wall', 'wall2', 'trim', 'pillar', 'balcony', 'boundary']) adj(t, x => ({ ...x, l: Math.min(.96, x.l + .02) }));
  }
  if (k.bright) {
    for (const t of ['wall', 'wall2', 'pillar', 'balcony', 'boundary']) adj(t, x => ({ ...x, l: Math.max(.70, x.l - .02) }));
  }

  // Terracotta roof: ensure walls keep warm undertone
  if (k.isTerracottaRoof && o.wall) {
    adj('wall', x => (x.h >= 170 && x.h <= 270 ? { ...x, h: 40, s: Math.min(x.s, 0.12) } : x));
  }

  // Dark roof: ensure roof stays grounded and dark
  if (k.roofDark && o.roof) {
    adj('roof', x => ({ ...x, l: Math.min(x.l, 0.30) }));
  }

  // High contrast: Ensure crisp architectural separation WITHOUT darkening white trim into cement grey
  if (k.acc === 'High contrast' && o.wall) {
    const wl = hsl(o.wall).l;
    if (o.trim) {
      const tl = hsl(o.trim).l;
      // If trim is light, keep it pure white
      if (tl > 0.75) o.trim = '#FFFFFF';
      else if (tl < 0.40) o.trim = '#1E2226';
    }
    if (o.roof) adj('roof', x => ({ ...x, l: Math.min(x.l, 0.22) }));
    if (o.window) adj('window', x => ({ ...x, l: Math.min(x.l, 0.14) }));
  }

  // Low saturation
  if (k.acc === 'Low saturation') {
    for (const t of PAINT) adj(t, x => ({ ...x, s: Math.min(x.s, t === 'door' ? .35 : .18) }));
  }

  return o;
}

// Upgraded scoring that accounts for architectural realities
const Score = {
  harmony(c) {
    const hs = {}, notes = []; let p = 0;
    for (const t of PAINT) if (c[t]) hs[t] = hsl(c[t]);
    const W = hs.wall, T = hs.trim, R = hs.roof, Win = hs.window;

    // Trim contrast check: Tone-on-tone (white trim on alabaster wall) is valid if window sashes provide contrast
    if (W && T) {
      const diff = Math.abs(W.l - T.l);
      const hasWindowContrast = Win && Win.l < 0.25;
      if (diff < 0.15 && !hasWindowContrast) {
        p += 6; notes.push('trim and wall contrast is soft; darker frames will enhance definition');
      }
    }

    // Roof grounding check
    if (W && R) {
      const d = W.l - R.l;
      if (d < 0) { p += 18; notes.push('a roof lighter than the walls loses architectural grounding'); }
    }

    // Saturation limits for exterior architecture
    const maxS = { wall: .25, wall2: .45, trim: .15, boundary: .30, pillar: .20, balcony: .25, window: .25, roof: .48, door: .65, railing: .25, garage: .65 };
    for (const t of Object.keys(hs)) {
      const effS = hs[t].s;
      const over = effS - (maxS[t] ?? .3);
      if (over > 0) { p += Math.min(15, over * 40); notes.push(PART_NAME[t] + ' is slightly saturated for exterior architecture'); }
    }

    return { score: clampInt(100 - p), notes };
  },

  architecture(c) {
    const notes = []; let p = 0;
    if (c.wall && c.door) {
      const d = dE(c.wall, c.door);
      if (d < 14) { p += 10; notes.push('the door blends into the wall; a clearer accent suits the entrance'); }
    }
    if (c.wall && c.trim && dE(c.wall, c.trim) < 3 && (!c.window || dE(c.wall, c.window) < 15)) {
      p += 6; notes.push('frames and walls are very close in value');
    }
    if (c.wall && c.roof) {
      const wl = lum(c.wall), rl = lum(c.roof);
      if (rl > wl) p += 12;
    }
    return { score: clampInt(100 - p), notes };
  },

  environment(c, R) {
    const notes = [];
    if (!R || !c.wall) return { score: 90, notes };
    const W = hsl(c.wall); let p = 0;
    const v = R.vegetation, s = R.sky, g = R.ground;
    if (v && v.frac > .04 && W.s > .08) {
      const dh = hueDist(W.h, v.h);
      if (dh < 35) { p += Math.min(18, (35 - dh) * .6); notes.push('the wall sits close in hue to the greenery'); }
    }
    if (s && s.frac > .08 && W.s > .16 && hueDist(W.h, s.h) < 25) {
      p += 10; notes.push('the wall repeats the sky colour');
    }
    return { score: clampInt(100 - p), notes };
  }
};

// Simulation Test
console.log('=== TEST 1: sample_house.jpg (Dark roof, timber door, black frames, strong greenery, modern villa) ===');
const R1 = {
  wall: { hex: '#e8dfce', dom: '#e8dfce', frac: 0.35, h: 42, s: 0.18, l: 0.85 },
  roof: { hex: '#26292e', dom: '#26292e', frac: 0.20, h: 215, s: 0.08, l: 0.18 },
  vegetation: { hex: '#4a6b3f', dom: '#4a6b3f', frac: 0.20, h: 105, s: 0.26, l: 0.35 },
  sky: { hex: '#87ceeb', dom: '#87ceeb', frac: 0.15, h: 200, s: 0.35, l: 0.72 },
  ground: { hex: '#808080', dom: '#808080', frac: 0.10, h: 0, s: 0, l: 0.50 }
};
const analysis1 = {
  data: {
    style: 'Modern Contemporary Villa',
    materials: { wall: 'stucco', roof: 'asphalt tile', door: 'natural teak wood', window: 'anodized aluminium' },
    objects: [
      { type: 'wall' }, { type: 'secondary_wall' }, { type: 'roof' }, { type: 'door' }, { type: 'window' }, { type: 'trim' }, { type: 'balcony' }
    ]
  }
};
const light1 = { mean: 0.55, std: 0.2, sat: 0.15, temp: 0.05, dark: false, bright: false };
const prefs1 = { style: 'Modern', bud: 'Medium', acc: 'High contrast', climate: 'auto' };

const k1 = designContext(R1, light1, prefs1, new Set(), 'auto', analysis1, null);
console.log('Detected existing house parts:', [...k1.existing]);
console.log('House context:', { roofDark: k1.roofDark, isTerracottaRoof: k1.isTerracottaRoof, hasWood: k1.hasWood, vegStrong: k1.vegStrong, ut: k1.ut });

const picks1 = selectDefaultFamilies(k1, prefs1, new Set());
console.log('Selected design families:', picks1);

for (const famKey of picks1) {
  const f = FAMILY[famKey];
  const rawColors = finishPalette(f.build(k1), k1);
  // Filter to only existing parts
  const finalColors = {};
  const colorNames = {};
  for (const t of PAINT) {
    if (rawColors[t] && k1.existing.has(t)) {
      finalColors[t] = rawColors[t];
      colorNames[t] = f.colorNames[t];
    }
  }
  const hScore = Score.harmony(finalColors);
  const aScore = Score.architecture(finalColors);
  const eScore = Score.environment(finalColors, R1);
  const overall = Math.round((hScore.score * 0.35 + aScore.score * 0.35 + eScore.score * 0.30));

  console.log(`\n  Design: "${f.title}" (Overall Score: ${overall}/100)`);
  console.log(`    Harmony: ${hScore.score}/100 | Architecture: ${aScore.score}/100 | Environment: ${eScore.score}/100`);
  console.log('    Roles & Coordinated Palette:');
  for (const [role, hexVal] of Object.entries(finalColors)) {
    console.log(`      ${PART_NAME[role].padEnd(20)}: ${colorNames[role].padEnd(22)} ${hexVal} (contrast vs wall: ${contrast(finalColors.wall, hexVal).toFixed(1)}:1)`);
  }
  // Verify non-existent parts are not present
  console.log('    Boundary included?', 'boundary' in finalColors ? 'YES (ERROR)' : 'NO (CORRECT)');
  console.log('    Pillar included?', 'pillar' in finalColors ? 'YES (ERROR)' : 'NO (CORRECT)');
  console.log('    Trim is cement grey (#898989)?', finalColors.trim === '#898989' ? 'YES (ERROR)' : 'NO (CORRECT - ' + finalColors.trim + ')');
}

// TEST 2: Terracotta clay tile roof, traditional courtyard house with pillars & boundary
console.log('\n=== TEST 2: Terracotta roof with pillars and boundary wall ===');
const R2 = {
  wall: { hex: '#f0ece1', dom: '#f0ece1', frac: 0.40, h: 40, s: 0.15, l: 0.90 },
  roof: { hex: '#8b4513', dom: '#8b4513', frac: 0.25, h: 25, s: 0.45, l: 0.31 },
  vegetation: { hex: '#4a6b3f', dom: '#4a6b3f', frac: 0.08, h: 105, s: 0.26, l: 0.35 }
};
const analysis2 = {
  data: {
    style: 'Traditional Indian Contemporary Haveli',
    materials: { wall: 'lime plaster', roof: 'Mangalore clay tile', door: 'carved teak', pillar: 'white sandstone' },
    objects: [
      { type: 'wall' }, { type: 'secondary_wall' }, { type: 'roof' }, { type: 'door' }, { type: 'window' }, { type: 'trim' }, { type: 'pillar' }, { type: 'boundary' }
    ]
  }
};
const k2 = designContext(R2, light1, prefs1, new Set(), 'auto', analysis2, null);
console.log('Detected existing parts for Test 2:', [...k2.existing]);
console.log('Context Test 2:', { isTerracottaRoof: k2.isTerracottaRoof, roofDark: k2.roofDark, hasWood: k2.hasWood });
const picks2 = selectDefaultFamilies(k2, prefs1, new Set());
console.log('Selected families for Test 2:', picks2);
for (const famKey of picks2) {
  const f = FAMILY[famKey];
  const rawColors = finishPalette(f.build(k2), k2);
  const finalColors = {};
  const colorNames = {};
  for (const t of PAINT) {
    if (rawColors[t] && k2.existing.has(t)) {
      finalColors[t] = rawColors[t];
      colorNames[t] = f.colorNames[t];
    }
  }
  const hScore = Score.harmony(finalColors);
  const aScore = Score.architecture(finalColors);
  const eScore = Score.environment(finalColors, R2);
  const overall = Math.round((hScore.score * 0.35 + aScore.score * 0.35 + eScore.score * 0.30));
  console.log(`\n  Design: "${f.title}" (Overall Score: ${overall}/100)`);
  console.log(`    Pillars included? ${'pillar' in finalColors ? 'YES (CORRECT)' : 'NO (ERROR)'} | Boundary included? ${'boundary' in finalColors ? 'YES (CORRECT)' : 'NO (ERROR)'}`);
  console.log(`    Roof tone harmonizes with terracotta? ${finalColors.roof} (${colorNames.roof})`);
  console.log(`    Wall tone: ${finalColors.wall} (${colorNames.wall})`);
}

// TEST 3: Modern box house with flat roof (NO ROOF visible)
console.log('\n=== TEST 3: Modern box house with flat roof (NO ROOF visible) ===');
const R3 = {
  wall: { hex: '#dcdad7', dom: '#dcdad7', frac: 0.55, h: 40, s: 0.08, l: 0.85 },
  vegetation: { hex: '#3e5c32', dom: '#3e5c32', frac: 0.12, h: 105, s: 0.30, l: 0.28 }
};
const analysis3 = {
  data: {
    style: 'Modern Minimalist Cubic Villa',
    materials: { wall: 'concrete', door: 'black oak', window: 'black metal' },
    objects: [
      { type: 'wall' }, { type: 'secondary_wall' }, { type: 'door' }, { type: 'window' }, { type: 'trim' }
    ]
  }
};
const k3 = designContext(R3, light1, prefs1, new Set(), 'auto', analysis3, null);
console.log('Detected existing parts for Test 3:', [...k3.existing]);
console.log('Roof included in existing parts?', k3.existing.has('roof') ? 'YES (ERROR)' : 'NO (CORRECT)');
const picks3 = selectDefaultFamilies(k3, prefs1, new Set());
const f3 = FAMILY[picks3[0]];
const rawColors3 = finishPalette(f3.build(k3), k3);
const finalColors3 = {};
for (const t of PAINT) {
  if (rawColors3[t] && k3.existing.has(t)) finalColors3[t] = rawColors3[t];
}
console.log('Does final palette include roof?', 'roof' in finalColors3 ? 'YES (ERROR)' : 'NO (CORRECT - flat roof has no visible roof)');
console.log('Final parts in palette:', Object.keys(finalColors3));

// TEST 4: User Manual Color Override (Door set manually to custom #800020 Burgundy)
console.log('\n=== TEST 4: User Manual Color Override ===');
const manualColors = { door: '#800020' };
const locked = {};
const testColors4 = {};
for (const t of PAINT) {
  if (manualColors[t] || locked[t]) {
    testColors4[t] = manualColors[t];
  } else if (rawColors3[t] && k3.existing.has(t)) {
    testColors4[t] = rawColors3[t];
  }
}
console.log('Custom user door colour preserved?', testColors4.door === '#800020' ? 'YES (CORRECT - #800020)' : 'NO (ERROR)');
console.log('Wall still recommended?', testColors4.wall ? 'YES (' + testColors4.wall + ')' : 'NO (ERROR)');

