// check_national.js として保存して実行
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/data/national.json', 'utf8').replace(/^\uFEFF/, ''));

const targets = [
  'ビャクシン', 'イブキ',
  'ミノコバイモ', 'コバイモ',
  'キクアザミ', 'ワカサトウヒレン',
  'ネビキグサ', 'アンペライ'
];

targets.forEach(name => {
  const found = data.find(r => r.species_name === name);
  console.log(name, ':', found ? `✅ 掲載あり（${found.category}）` : '❌ 掲載なし');
});