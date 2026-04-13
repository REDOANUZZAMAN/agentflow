const fs = require('fs');
const path = require('path');

function walk(dir) {
  let r = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory() && !f.includes('node_modules') && !f.includes('.next')) {
      r.push(...walk(p));
    } else if (/\.(tsx?|jsx?)$/.test(f)) {
      r.push(p);
    }
  }
  return r;
}

const files = walk('src');
// Match emoji ranges but EXCLUDE the node-icons.tsx mapping table
const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
let found = 0;

for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (emojiRe.test(l)) {
      // Skip the mapping table in node-icons.tsx
      if (f.includes('node-icons') && (l.includes("':") || l.includes("WORKFLOW_EMOJI_MAP"))) return;
      found++;
      console.log(`${f.replace(/\\/g, '/')}:${i + 1}: ${l.trim().slice(0, 120)}`);
    }
  });
}

console.log(`\nTotal lines with emojis: ${found}`);
