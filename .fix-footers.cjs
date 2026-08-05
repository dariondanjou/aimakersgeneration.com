const fs = require('fs');
const edits = [
  ['index.html', [
    ["AI MAKERS GENERATION is a registered trade name of D'Anjou, Inc. Atlanta, Georgia.", 'AI MAKERS GENERATION · Atlanta, Georgia.'],
    ['<p>© <span id="yr">2026</span> D\'Anjou, Inc. All rights reserved.</p>', '<p>© <span id="yr">2026</span> AI MAKERS GENERATION. All rights reserved.</p>'],
    ['      "parentOrganization": { "@type": "Organization", "name": "D\'Anjou, Inc." },\n', ''],
  ]],
  ['apply.html', [
    ['    <p class="entity">AI MAKERS GENERATION is a registered trade name of D\'Anjou, Inc.</p>\n', ''],
    ['© <span id="yr">2026</span> D\'Anjou, Inc. · Atlanta, GA ·', '© <span id="yr">2026</span> AI MAKERS GENERATION · Atlanta, GA ·'],
  ]],
  ['discount.html', [
    ['    <p class="entity">AI MAKERS GENERATION is a registered trade name of D\'Anjou, Inc.</p>\n', ''],
    ['© <span id="yr">2026</span> D\'Anjou, Inc. · Atlanta, GA ·', '© <span id="yr">2026</span> AI MAKERS GENERATION · Atlanta, GA ·'],
  ]],
];
for (const [file, pairs] of edits) {
  let t = fs.readFileSync(file, 'utf8');
  for (const [from, to] of pairs) {
    if (!t.includes(from)) { console.error('NOT FOUND in ' + file + ': ' + from.slice(0, 60)); process.exitCode = 1; continue; }
    t = t.split(from).join(to);
  }
  fs.writeFileSync(file, t);
  console.log('updated', file);
}
