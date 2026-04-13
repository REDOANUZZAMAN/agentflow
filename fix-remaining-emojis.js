const fs = require('fs');

const replacements = [
  // execution-engine.ts
  ['📝 Enriched prompt', '[note] Enriched prompt'],
  ['📝 Using dialogue format', '[note] Using dialogue format'],
  ['📝 Using TTS format', '[note] Using TTS format'],
  ['📹 Found', '[video] Found'],
  ['📎 Audio overlay URL', '[link] Audio overlay URL'],
  ['🛑 Execution recovery', '[stop] Execution recovery'],
  ['🔧 Recovery Agent activated', '[wrench] Recovery Agent activated'],
  ['🔧 Recovery:', '[wrench] Recovery:'],
  ['📝 Config changed:', '[note] Config changed:'],
  ['🔧 Applied transformation:', '[wrench] Applied transformation:'],
  // fal-models.ts
  ['🌟 Seedream', '[star] Seedream'],
  ['📝 Kling O3 Pro Text', '[note] Kling O3 Pro Text'],
  ['🧬 Kling O3 Pro Reference', '[dna] Kling O3 Pro Reference'],
];

const files = [
  'src/lib/execution-engine.ts',
  'src/lib/fal-models.ts',
];

let totalFixed = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.replaceAll(from, to);
      changed = true;
      totalFixed++;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed: ${file}`);
  }
}
console.log(`Total replacements: ${totalFixed}`);
