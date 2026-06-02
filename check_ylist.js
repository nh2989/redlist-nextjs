const fs = require('fs');

// YList CSV を読み込む（パスは実際の場所に合わせて変更）
const csvPath = 'synonyms_v1.csv';
const csvText = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
const csvLines = csvText.split('\n').slice(1); // ヘッダー除く

// 別名 → 標準和名 のマップを構築（標準のみ）
const ylistMap = {};
csvLines.forEach(line => {
  const cols = line.split(',');
  if (cols.length < 4) return;
  const canonical = (cols[1] || '').trim();
  const altNames  = (cols[2] || '').trim();
  const status    = (cols[3] || '').trim();
  if (status !== '標準') return;
  if (!canonical || !altNames) return;

  // 別名は「、」「，」「,」「　」などで区切られている
  const alts = altNames
    .split(/[、，,\s　]+/)
    .map(a => a.replace(/\(.*?\)/g, '').trim())
    .filter(a => a.length > 0);

  alts.forEach(alt => {
    if (alt && !ylistMap[alt]) {
      ylistMap[alt] = canonical;
    }
  });
});

// 全JSONの species_name を収集
const dir = 'public/data/redlist';
const files = fs.readdirSync(dir).filter(f =>
  f.endsWith('.json') &&
  f !== 'sources.json' &&
  f !== 'synonyms.json'
);

const nameToFiles = {};
files.forEach(f => {
  const data = JSON.parse(
    fs.readFileSync(dir + '/' + f, 'utf8').replace(/^\uFEFF/, '')
  );
  data.forEach(r => {
    const name = (r.species_name || '').trim();
    if (!name) return;
    if (!nameToFiles[name]) nameToFiles[name] = [];
    if (!nameToFiles[name].includes(f)) nameToFiles[name].push(f);
  });
});

// 照合：JSONの種名がYListの別名に該当するもの
console.log('=== YList照合結果：非標準和名の可能性がある種 ===\n');
let count = 0;
Object.keys(nameToFiles).sort().forEach(name => {
  const canonical = ylistMap[name];
  if (canonical && canonical !== name) {
    console.log(`${name} → ${canonical}`);
    console.log(`  (${nameToFiles[name].join(', ')})`);
    count++;
  }
});
console.log(`\n該当件数: ${count}`);