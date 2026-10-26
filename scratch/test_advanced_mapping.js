const fs = require('fs');

// Test the advanced realistic recoloring engine
function testAdvancedMapping() {
  console.log('Testing advanced realistic recoloring engine...');

  const colors = [
    { name: 'Pure White (#FFFFFF)', rgb: [255, 255, 255] },
    { name: 'Warm Cream (#F7F2E4)', rgb: [247, 242, 228] },
    { name: 'Charcoal (#262626)', rgb: [38, 38, 38] },
    { name: 'Navy Blue (#1B2A4A)', rgb: [27, 42, 74] },
    { name: 'Terracotta (#C4684A)', rgb: [196, 104, 74] }
  ];

  const medL = 71.3; // from real wall patch
  const testLums = [8, 25, 45, 71.3, 100, 135, 180, 240, 255];

  for (const c of colors) {
    console.log('\n=== Color: ' + c.name + ' ===');
    const [tR, tG, tB] = c.rgb;
    const targetLum = .299 * tR + .587 * tG + .114 * tB;

    // Headroom compression for light colors:
    // If targetLum is high (> 200), headroom factor scales normal diffuse level so sunlit areas don't clip
    const isLight = targetLum > 180;
    const isDark = targetLum < 60;
    const baseScale = isLight ? 0.88 + 0.12 * (1.0 - (targetLum - 180) / 75) : 1.0;

    for (const v of testLums) {
      const rel = v / medL;
      let sf;
      if (rel <= 1.0) {
        // Shadow curve: smooth compression with ambient floor (preserves shadow detail without crushing)
        const floor = 0.08;
        sf = floor + (1.0 - floor) * Math.pow(Math.max(0, rel), 0.95);
      } else {
        // Sunlit / highlight curve: smooth soft-knee compression
        const over = rel - 1.0;
        // Light colors: allow expansion up to 255 without hard clipping
        // Dark colors: expand luminance while preserving color hue/chroma
        sf = 1.0 + over * (isDark ? 0.75 : 0.65) / (1.0 + over * 0.35);
      }

      // Specular sheen for extreme highlights (glint of direct sun)
      const specFrac = Math.max(0, (v - 210) / 45); // 0 at v<=210, up to 1 at 255
      const sheen = specFrac * specFrac * 40; // up to +40 sheen

      const rR = Math.min(255, Math.max(0, Math.round(tR * baseScale * sf + sheen)));
      const rG = Math.min(255, Math.max(0, Math.round(tG * baseScale * sf + sheen)));
      const rB = Math.min(255, Math.max(0, Math.round(tB * baseScale * sf + sheen)));

      const outLum = .299 * rR + .587 * rG + .114 * rB;
      console.log('  L_orig=' + v.toString().padStart(3) + ' (rel=' + rel.toFixed(2) + ') -> RGB: [' + rR.toString().padStart(3) + ', ' + rG.toString().padStart(3) + ', ' + rB.toString().padStart(3) + '], L_out=' + outLum.toFixed(1));
    }
  }
}

testAdvancedMapping();
