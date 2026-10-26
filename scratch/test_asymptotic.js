const fs = require('fs');

function testAsymptoticMapping() {
  console.log('Testing asymptotic shoulder tone mapping...');

  const colors = [
    { name: 'Pure White (#FFFFFF)', rgb: [255, 255, 255] },
    { name: 'Warm Cream (#F7F2E4)', rgb: [247, 242, 228] },
    { name: 'Charcoal (#262626)', rgb: [38, 38, 38] },
    { name: 'Navy Blue (#1B2A4A)', rgb: [27, 42, 74] },
    { name: 'Terracotta (#C4684A)', rgb: [196, 104, 74] }
  ];

  const medL = 71.3;
  const testLums = [8, 25, 45, 71.3, 100, 135, 180, 220, 255];

  for (const c of colors) {
    console.log('\n=== Color: ' + c.name + ' ===');
    const [tR, tG, tB] = c.rgb;
    const targetLum = .299 * tR + .587 * tG + .114 * tB;

    // Base diffuse level for normal exposure (rel=1.0)
    // White diffuse reflectance in photography is ~82-85% of peak white (approx 210-218)
    // Dark colors reflect at their intrinsic value
    const isLight = targetLum > 170;
    const isDark = targetLum < 60;
    const diffuseScale = isLight ? 0.82 + 0.18 * (1.0 - (targetLum - 170) / 85) : 1.0;

    const baseR = tR * diffuseScale;
    const baseG = tG * diffuseScale;
    const baseB = tB * diffuseScale;

    // Asymptotic highlight shoulder factor:
    // For light colors: shoulder allows highlights to scale smoothly up to 255
    // For dark colors: allows highlights to scale up with the sun while preserving color tone
    const kHighlight = isLight ? 1.5 : (isDark ? 0.8 : 1.2);

    for (const v of testLums) {
      const rel = v / medL;
      let rR, rG, rB;
      if (rel <= 1.0) {
        // Shadow curve: smooth power with ambient floor
        const floor = 0.08;
        const sf = floor + (1.0 - floor) * Math.pow(Math.max(0, rel), 0.95);
        rR = baseR * sf;
        rG = baseG * sf;
        rB = baseB * sf;
      } else {
        const over = rel - 1.0;
        if (isLight) {
          // Asymptotic shoulder to 255: base + (255 - base) * (over / (kHighlight + over))
          const frac = over / (kHighlight + over);
          rR = baseR + (255 - baseR) * frac;
          rG = baseG + (255 - baseG) * frac;
          rB = baseB + (255 - baseB) * frac;
        } else {
          // Dark & medium colors: proportional scaling with soft saturation preservation
          const sf = 1.0 + over * 0.75 / (1.0 + over * 0.25);
          // Specular glint only on extreme highlights
          const spec = v > 200 ? Math.pow((v - 200) / 55, 2) * 50 : 0;
          rR = Math.min(255, baseR * sf + spec);
          rG = Math.min(255, baseG * sf + spec);
          rB = Math.min(255, baseB * sf + spec);
        }
      }

      const outLum = .299 * rR + .587 * rG + .114 * rB;
      console.log('  L_orig=' + v.toString().padStart(3) + ' (rel=' + rel.toFixed(2) + ') -> RGB: [' + Math.round(rR).toString().padStart(3) + ', ' + Math.round(rG).toString().padStart(3) + ', ' + Math.round(rB).toString().padStart(3) + '], L_out=' + outLum.toFixed(1));
    }
  }
}

testAsymptoticMapping();
