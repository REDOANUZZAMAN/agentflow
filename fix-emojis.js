// Fix emojis in remaining files
const fs = require('fs');

const files = [
  'src/components/InspectorPanel.tsx',
  'src/components/NodeConfigPanel.tsx', 
  'src/app/builder/[workflowId]/page.tsx',
];

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace all emoji characters (outside ASCII range) with empty string
    // But preserve common chars like quotes, angle brackets etc.
    // Target: emoji unicode ranges
    content = content.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');  // Misc symbols, emoticons
    content = content.replace(/[\u{2600}-\u{26FF}]/gu, '');     // Misc symbols  
    content = content.replace(/[\u{2700}-\u{27BF}]/gu, '');     // Dingbats
    content = content.replace(/[\u{FE00}-\u{FE0F}]/gu, '');     // Variation selectors
    content = content.replace(/[\u{200D}]/gu, '');               // Zero width joiner
    
    // Fix specific known emoji prop patterns  
    content = content.replace(/emoji=""\s+title/g, 'emoji="" title');
    content = content.replace(/icon=""\s+\/>/g, 'icon="" />');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed:', file);
  } catch (e) {
    console.log('Skipped:', file, e.message);
  }
}
console.log('All done!');
