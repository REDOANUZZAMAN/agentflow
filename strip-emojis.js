// Script to replace all emoji characters with text equivalents across the codebase
const fs = require('fs');
const path = require('path');

const replacements = [
  // Common emojis → text equivalents
  ['⚡', '[zap]'],
  ['🤖', '[bot]'],
  ['📱', '[mobile]'],
  ['💬', '[chat]'],
  ['🌐', '[globe]'],
  ['📁', '[folder]'],
  ['🎥', '[camera]'],
  ['⚙️', '[gear]'],
  ['👆', '[click]'],
  ['⏰', '[clock]'],
  ['🔗', '[link]'],
  ['🧠', '[brain]'],
  ['🎨', '[art]'],
  ['🎬', '[video]'],
  ['🎤', '[mic]'],
  ['🐦', '[bird]'],
  ['📸', '[photo]'],
  ['💼', '[briefcase]'],
  ['🎵', '[music]'],
  ['📧', '[email]'],
  ['✈️', '[send]'],
  ['🔌', '[plug]'],
  ['🔍', '[search]'],
  ['🕷️', '[spider]'],
  ['📖', '[book]'],
  ['✏️', '[pencil]'],
  ['📄', '[doc]'],
  ['📜', '[scroll]'],
  ['🎭', '[masks]'],
  ['📦', '[box]'],
  ['🎯', '[target]'],
  ['🎞️', '[film]'],
  ['🔀', '[branch]'],
  ['🔁', '[loop]'],
  ['⏳', '[timer]'],
  ['❓', '[?]'],
  ['⏱', '[stopwatch]'],
  ['✅', '[ok]'],
  ['❌', '[x]'],
  ['⚠️', '[warn]'],
  ['✨', '[sparkle]'],
  ['😂', '[joke]'],
  ['😅', '[sweat]'],
  ['😄', '[smile]'],
  ['💰', '[cost]'],
  ['📊', '[chart]'],
  ['🔄', '[refresh]'],
  ['📂', '[files]'],
  ['🆕', '[new]'],
  ['▶️', '[>]'],
  ['⏭️', '[>>]'],
  ['🗣️', '[voice]'],
  ['🖼️', '[image]'],
  ['📤', '[upload]'],
  ['🔊', '[sound]'],
  ['📰', '[news]'],
  ['🗑️', '[trash]'],
  ['➕', '[+]'],
  ['🔑', '[key]'],
  ['🚀', '[rocket]'],
  ['🚨', '[alert]'],
  ['ℹ️', '[info]'],
  ['🔁', '[repeat]'],
];

const filesToProcess = [
  'src/lib/types.ts',
  'src/lib/execution-engine.ts',
  'src/lib/store.ts',
  'src/lib/fal-models.ts',
  'src/lib/library-types.ts',
  'src/app/api/chat/route.ts',
  'src/app/api/chat/stream/route.ts',
  'src/app/api/health/route.ts',
  'src/app/api/compile/route.ts',
  'src/app/library/page.tsx',
  'src/app/reset-password/page.tsx',
  'src/components/TaskListCard.tsx',
];

let totalReplacements = 0;

for (const file of filesToProcess) {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP: ${file} (not found)`);
    continue;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  let fileReplacements = 0;
  
  for (const [emoji, text] of replacements) {
    const count = content.split(emoji).length - 1;
    if (count > 0) {
      content = content.split(emoji).join(text);
      fileReplacements += count;
    }
  }
  
  if (fileReplacements > 0) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`DONE: ${file} (${fileReplacements} replacements)`);
    totalReplacements += fileReplacements;
  } else {
    console.log(`SKIP: ${file} (no emojis found)`);
  }
}

console.log(`\nTotal: ${totalReplacements} emoji replacements across ${filesToProcess.length} files`);
