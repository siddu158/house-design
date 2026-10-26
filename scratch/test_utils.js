// Comprehensive test for upgraded palette generation
const fs = require('fs');

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
function contrast(a, b) {
  const L = h => { const [r, g, bb] = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4) }); return .2126 * r + .7152 * g + .0722 * bb };
  const x = L(a), y = L(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d };

console.log('Testing color utilities passed.');
