const fs = require('fs');
const dir = 'public/data/redlist';

const files = fs.readdirSync(dir).filter(f =>
  f.endsWith('.json') &&
  f !== 'sources.json' &&
  f !== 'synonyms.json'
);

// 出力をためる配列
const out = [];
function log(line = '') {
  out.push(line);
}

// 学名を正規化（複数スペース→単一スペース、前後トリム）
function normalizeSci(s) {
  return (s || '').trim().replace(/\s+/g, ' ');
}

// 学名の「種小名まで」を抽出（属名 + 種小名の2語）
function getGenusSpecies(sci) {
  const parts = normalizeSci(sci).split(' ');
  if (parts.length < 2) return normalizeSci(sci);
  return parts[0] + ' ' + parts[1];
}

// 学名が「下位ランク」（亜種・変種・品種など）の階級語を含むか判定
// subsp. / var. / f. / forma / ssp. などを検出
const infraRankPattern = /\b(subsp|var|f|forma|ssp)\.?\s/i;

function isInfraRank(sci) {
  return infraRankPattern.test(normalizeSci(sci));
}

const sciToNames = {};
const genusSpeciesToNames = {};

files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8').replace(/^\uFEFF/, ''));
  data.forEach(r => {
    const sciRaw = r.scientific_name || '';
    const sci = normalizeSci(sciRaw);
    const name = (r.species_name || '').trim();
    if (!sci || !name) return;

    if (!sciToNames[sci]) sciToNames[sci] = [];
    if (!sciToNames[sci].find(e => e.name === name)) {
      sciToNames[sci].push({ name, file: f, fullSci: sci });
    }

    const gs = getGenusSpecies(sci);
    if (!genusSpeciesToNames[gs]) genusSpeciesToNames[gs] = [];
    if (!genusSpeciesToNames[gs].find(e => e.name === name && e.fullSci === sci)) {
      genusSpeciesToNames[gs].push({ name, file: f, fullSci: sci });
    }
  });
});

// === ① 学名が完全一致で和名が異なる ===
const exactCandidates = Object.entries(sciToNames)
  .filter(([, entries]) => {
    const names = [...new Set(entries.map(e => e.name))];
    return names.length > 1;
  });

log('=== ① 学名が完全一致で和名が異なる種（真のシノニム候補）===');
log('件数: ' + exactCandidates.length);
log('');
exactCandidates.forEach(([sci, entries]) => {
  const names = [...new Set(entries.map(e => e.name))];
  log('学名: ' + sci);
  names.forEach(n => {
    const fs_ = entries.filter(e => e.name === n).map(e => e.file).join(', ');
    log('  和名: ' + n + ' → ' + fs_);
  });
  log('');
});

// === ② 属+種小名が一致し、和名が異なる ===
const prefixCandidates = Object.entries(genusSpeciesToNames)
  .filter(([, entries]) => {
    const names = [...new Set(entries.map(e => e.name))];
    return names.length > 1;
  });

log('=== ② 学名の属＋種小名が一致し、和名が異なる種（亜種・上位種候補）===');
log('件数: ' + prefixCandidates.length);
log('');
prefixCandidates.forEach(([gs, entries]) => {
  log('属+種小名: ' + gs);
  const seen = new Set();
  entries.forEach(e => {
    const key = e.name + '|' + e.fullSci;
    if (seen.has(key)) return;
    seen.add(key);
    log('  和名: ' + e.name + '  学名: ' + e.fullSci + '  → ' + e.file);
  });
  log('');
});

// === ③ ②のうち「種ランクの和名」と「下位ランクの和名」が両方存在し、和名が異なるもの ===
// 種ランク: 階級語（subsp./var./f./forma/ssp.）を含まない学名
// 下位ランク: 階級語を含む学名
const speciesVsInfraCandidates = [];

Object.entries(genusSpeciesToNames).forEach(([gs, entries]) => {
  // 重複除去
  const seen = new Set();
  const uniqueEntries = [];
  entries.forEach(e => {
    const key = e.name + '|' + e.fullSci;
    if (seen.has(key)) return;
    seen.add(key);
    uniqueEntries.push(e);
  });

  const speciesRank = uniqueEntries.filter(e => !isInfraRank(e.fullSci));
  const infraRank = uniqueEntries.filter(e => isInfraRank(e.fullSci));

  if (speciesRank.length === 0 || infraRank.length === 0) return;

  // 和名が異なるペアのみ抽出
  const pairs = [];
  speciesRank.forEach(sp => {
    infraRank.forEach(inf => {
      if (sp.name !== inf.name) {
        pairs.push({ sp, inf });
      }
    });
  });

  if (pairs.length === 0) return;

  speciesVsInfraCandidates.push({ gs, speciesRank, infraRank, pairs });
});

log('=== ③ 種ランクと下位ランク（亜種・変種・地域集団など）で和名が異なるペア ===');
log('※ シノニム統合候補ではなく、人間が個別に判断すべき「種 vs 下位分類」の関係です');
log('件数: ' + speciesVsInfraCandidates.length);
log('');
speciesVsInfraCandidates.forEach(({ gs, speciesRank, infraRank }) => {
  log('属+種小名: ' + gs);
  log('  [種ランク]');
  speciesRank.forEach(e => {
    log('    和名: ' + e.name + '  学名: ' + e.fullSci + '  → ' + e.file);
  });
  log('  [下位ランク]');
  infraRank.forEach(e => {
    log('    和名: ' + e.name + '  学名: ' + e.fullSci + '  → ' + e.file);
  });
  log('');
});

const outputPath = 'synonym_candidates.txt';
fs.writeFileSync(outputPath, '\uFEFF' + out.join('\n'), 'utf8');
console.log('出力完了: ' + outputPath);
console.log('① 完全一致候補: ' + exactCandidates.length + '件');
console.log('② 属+種小名一致候補: ' + prefixCandidates.length + '件');
console.log('③ 種ランク vs 下位ランク候補: ' + speciesVsInfraCandidates.length + '件');