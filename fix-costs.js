const fs = require('fs');
let c = fs.readFileSync('src/lib/execution-engine.ts', 'utf8');

// Replace all hardcoded costs with calcRealCost calls
c = c.replace(/cost: 0\.01,/g, 'cost: calcRealCost(falModel, { numImages: 1 }),');
c = c.replace(/cost: 0\.10,/g, 'cost: calcRealCost(falModel, { durationSeconds: videoDuration }),');
c = c.replace(/cost: 0\.02 \}/g, 'cost: calcRealCost(falModel) }');

fs.writeFileSync('src/lib/execution-engine.ts', c);
console.log('Done — replaced all hardcoded costs with calcRealCost()');

// Verify
const after = fs.readFileSync('src/lib/execution-engine.ts', 'utf8');
const remaining = (after.match(/cost: 0\.\d+/g) || []);
console.log('Remaining hardcoded costs:', remaining.length > 0 ? remaining : 'NONE ✅');
