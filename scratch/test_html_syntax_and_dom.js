const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extract all <script> blocks
const scriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
let match;
let scriptIndex = 0;
let totalErrors = 0;

console.log('--- Verifying JavaScript in index.html ---');
while ((match = scriptRegex.exec(html)) !== null) {
  scriptIndex++;
  const code = match[1];
  if (!code.trim()) continue;
  try {
    // Check if the script compiles
    new vm.Script(code, { filename: `index.html[script-${scriptIndex}]` });
    console.log(`Script ${scriptIndex} compiled successfully (${code.length} chars).`);
  } catch (err) {
    console.error(`Script ${scriptIndex} syntax error:`, err.message);
    totalErrors++;
  }
}

if (totalErrors === 0) {
  console.log('✓ All scripts in index.html compiled with ZERO syntax errors!');
} else {
  console.error(`✕ Found ${totalErrors} syntax error(s).`);
  process.exit(1);
}
