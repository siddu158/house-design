function rgb(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
function hsl(h) {
  const [r, g, b] = rgb(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  let H = 0, s = 0;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); H = (mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; if (H < 0) H += 360 }
  return { h: H, s, l };
}

const we = {
  wall: '#F7F2E4', wall2: '#9E5936', roof: '#843E2B', door: '#502814', window: '#382C24', trim: '#FFFDF7',
  pillar: '#FFFFFF', balcony: '#F7F2E4', railing: '#241E1A', garage: '#502814', boundary: '#E5DDCB'
};

const maxS = { wall: .30, wall2: .60, trim: .25, boundary: .35, pillar: .30, balcony: .30, window: .25, roof: .45, door: .65, railing: .25, garage: .65 };

for (const [k, v] of Object.entries(we)) {
  const h = hsl(v);
  const cap = maxS[k] ?? 0.3;
  console.log(k.padEnd(9), v, 'H:' + Math.round(h.h).toString().padStart(3), 'S:' + h.s.toFixed(3), 'L:' + h.l.toFixed(3), 'cap:' + cap, h.s > cap ? 'OVERCAP' : 'ok');
}
