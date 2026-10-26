const fs = require('fs');
const vm = require('vm');

const vmTest = fs.readFileSync('C:/Users/sidde/.gemini/antigravity-ide/brain/918b21dd-c8db-45e1-9563-eb47604706e6/scratch/vm_test.js', 'utf-8');
const testCode = vmTest + `
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
`;

fs.writeFileSync('scratch/run_test.js', testCode);
