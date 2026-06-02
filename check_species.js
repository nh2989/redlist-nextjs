const fs = require('fs');
const dir = 'public/data/redlist';

const files = fs.readdirSync(dir).filter(f =>
  f.endsWith('.json') &&
  f !== 'sources.json' &&
  f !== 'synonyms.json'
);

// 学名 → [{和名, ファイル}] のマップ
const sciToNames = {};

files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8').replace(/^\uFEFF/, ''));
  data.forEach(r => {
    const sci = (r.scientific_name || '').trim();
    const name = (r.species_name || '').trim();
    if (!sci || !name) return;
    if (!sciToNames[sci]) sciToNames[sci] = [];
    const exists = sciToNames[sci].find(e => e.name === name);
    if (!exists) sciToNames[sci].push({ name, file: f });
  });
});

// 同じ学名に複数の和名がある → シノニム候補
const candidates = Object.entries(sciToNames)
  .filter(([, entries]) => {
    const names = [...new Set(entries.map(e => e.name))];
    return names.length > 1;
  });

console.log('=== 学名が同じで和名が異なる種（真のシノニム候補）===');
console.log('件数:', candidates.length);
console.log('');
candidates.forEach(([sci, entries]) => {
  const names = [...new Set(entries.map(e => e.name))];
  console.log('学名:', sci);
  names.forEach(n => {
    const files = entries.filter(e => e.name === n).map(e => e.file).join(', ');
    console.log('  和名:', n, '→', files);
  });
  console.log('');
});