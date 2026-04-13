const fs = require('fs');
let c = fs.readFileSync('src/app/api/chat/route.ts', 'utf8');
c = c.replace(/position: \{ x: 300, y: baseY \}/g, 'position: { x: 80, y: 150 }');
c = c.replace(/position: \{ x: 300, y: baseY \+ 150 \}/g, 'position: { x: 240, y: 150 }');
c = c.replace(/position: \{ x: 300, y: baseY \+ 300 \}/g, 'position: { x: 400, y: 150 }');
c = c.replace(/position: \{ x: 300, y: baseY \+ 450 \}/g, 'position: { x: 560, y: 150 }');
c = c.replace(/position: \{ x: 300, y: baseY \+ 600 \}/g, 'position: { x: 720, y: 150 }');
c = c.replace(/position: \{ x: 300, y: baseY \+ 750 \}/g, 'position: { x: 880, y: 150 }');
c = c.replace(/position: \{ x: 300, y: baseY \+ 900 \}/g, 'position: { x: 1040, y: 150 }');
c = c.replace(/position: \{ x: 300, y: 80 \}/g, 'position: { x: 80, y: 150 }');
c = c.replace(/position: \{ x: 300, y: 230 \}/g, 'position: { x: 240, y: 150 }');
// Fix callClaudeAPI fallback
c = c.replace(/x: 300,\n\s*y: 80 \+ \(nodes\.length/g, 'x: 80 + (nodes.length');
c = c.replace(/\+ toolCalls\.filter\(\(t: any\) => t\.name === 'add_node'\)\.length\) \* 150,/g, "+ toolCalls.filter((t: any) => t.name === 'add_node').length) * 160,\n              y: 150,");
fs.writeFileSync('src/app/api/chat/route.ts', c);
console.log('Done!');
