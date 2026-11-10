// Cadastra no catálogo as sementes das lojas que ainda não existem em strains.js.
// Entrada: shops/new/*.txt com linhas "url | nome | breeder | parentais | tipo | floração | THC | CBD | auto/foto | aromas"
// (extraídas das páginas dos produtos). Uso: node shops/addnew.js [--write]
const fs = require('fs'), D = __dirname, ROOT = D + '/..';
global.window = {}; eval(fs.readFileSync(ROOT + '/strains.js', 'utf8'));
const S = window.STRAINS, by = Object.fromEntries(S.map(s => [s.id, s]));
const norm = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’.#]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const IDX = {}; S.forEach(s => [s.n, s.id].forEach(n => { IDX[norm(n)] = IDX[norm(n)] || s.id; }));
const ALIAS = { 'skunk1': 'skunk-1', 'borrachinha': 'borrachina', 'marcelo-d2': 'marcelo-de-2', 'girl-scout-cookies': 'gsc', 'skittlez': 'zkittlez', 'skittles': 'zkittlez', 'chemdog': 'chemdawg', 'gg4': 'gorilla-glue-4', 'gorilla-glue': 'gorilla-glue-4', 'original-glue': 'gorilla-glue-4', 'gg-4': 'gorilla-glue-4', 'do-si-dos': 'do-si-dos', 'dosidos': 'do-si-dos', 'og': 'og-kush', 'sfv-og': 'sfv-og', 'orange-sherbert': 'sunset-sherbet', 'sherbert': 'sunset-sherbet', 'sherbet': 'sunset-sherbet', 'thin-mint-cookies': 'thin-mint-gsc', 'afghan': 'afghani', 'superskunk': 'super-skunk', 'mass-superskunk': 'super-skunk', 'transamazonica': 'transamazonica', 'ruderalis': 'ruderalis', 'skunk': 'skunk-1', 'skunk-1': 'skunk-1', 'northern-light': 'northern-lights', 'ak47': 'ak-47', 'lsd-25': 'lsd', 'lsd25': 'lsd', 'grandaddy-purple': 'granddaddy-purple', 'gdp': 'granddaddy-purple', 'gmo-cookies': 'gmo', 'garlic-cookies': 'gmo', 'bubba': 'bubba-kush', 'jack': 'jack-herer', 'cookies': 'gsc', 'gelato-41': 'gelato', 'gelato-33': 'gelato', 'runtz-og': 'runtz', 'white-runtz': 'runtz', 'zkittles': 'zkittlez', 'z': 'zkittlez' };
const resolve = raw => { let k = norm(raw.replace(/\(.*?\)/g, '').replace(/\b(f\d|s\d|bx\d?|ibl|auto|automatic[ao]|feminizad[ao]|clone only|cut|pheno)\b/gi, '')); if (!k) return null; k = k.replace(/-(brasileira|brasileiro|brazil)$/, ''); if (ALIAS[k] && by[ALIAS[k]]) return ALIAS[k]; if (IDX[k]) return IDX[k]; return null; };
const splitP = t => String(t || '').replace(/\s+[xX×]\s+|\s*×\s*/g, '|').split('|').map(x => x.trim()).filter(x => x && !/^(desconhecid|não informad|n\/a|-)/i.test(x));

const BRC = { 'Green House Seeds': 'Holanda', "Barney's Farm": 'Holanda', 'Maconha Seeds Bank': 'Brasil', 'Original Big Buddha Family Farms': 'Inglaterra', 'Big Buddha': 'Inglaterra', 'Hortilab': 'Brasil', 'R-Kiem': 'Espanha', 'R Kiem': 'Espanha', 'Ripper Seeds': 'Espanha', 'Soma Seeds': 'Holanda', 'Somas Seeds': 'Holanda', 'G13 Labs': 'Inglaterra', 'Dentista Seeds': 'Brasil' };
const TE = [[/c[ií]tric|lim[aã]o|laranja|tangerin|lima|toranja|grapefruit/i, 'limoneno'], [/terros|herbal|ervas|manga|terra|almiscar/i, 'mirceno'], [/apimentad|pimenta|especiar|diesel|gas|combust|petr[oó]leo|alho|garlic|queijo/i, 'cariofileno'], [/pinho|pinheiro/i, 'pineno'], [/lavanda/i, 'linalol'], [/floral|fresc|menta/i, 'terpinoleno'], [/amadeirad|madeira/i, 'humuleno'], [/doce|frut|baga|uva|morango|cereja|banana|p[eê]ssego|melancia|mel[aã]o|tropical|abacaxi|goiaba|mam[aã]o|ma[cç][aã]|creme|baunilha|bala|chiclete/i, 'ocimeno']];
const FAMKW = [[/\bcbd\b|cbg/i, 'cbd'], [/haze|amnesia|jack|tangie|tiger|lemon haze/i, 'haze'], [/diesel|chem|gas|og\b|fuel|garlic|gmo/i, 'chem'], [/cookie|gelato|runtz|cake|sherb|mint|pie|biscotti|zkittle|dosido|do-si|wedding|glue|gushers/i, 'cookies'], [/kush|afghan|hindu|bubba|purple/i, 'kush'], [/skunk|cheese|critical|widow|big bud/i, 'skunk'], [/berry|mango|lemon|lim[ae]|orange|grape|cherry|peach|melon|guava|papaya|banana|apple|strawberry|tropic|juice|fruit|pineapple|lychee|nectar|plum|apricot|citrus|maracuj|a[cç]a[ií]|morango|caju|uva/i, 'fruit']];
const num = t => (String(t || '').replace(/,/g, '.').match(/\d+(\.\d+)?/g) || []).map(Number);
const rng = (t, lo, hi, pad = 0) => { const v = num(t).filter(x => x >= lo && x <= hi); if (!v.length) return null; const a = Math.min(...v), b = Math.max(...v); return a === b && pad ? [Math.max(0, +(a - pad).toFixed(1)), b] : [a, b]; };
const avg = (L, f) => L.length ? L.reduce((t, s) => t + f(s), 0) / L.length : null;

const rows = [];
for (const f of fs.readdirSync(D + '/new').filter(f => f.endsWith('.txt'))) for (const line of fs.readFileSync(`${D}/new/${f}`, 'utf8').split('\n')) {
  const c = line.split('|').map(x => x.trim()); if (!/^https?:/.test(c[0] || '') || /^FAILED/.test(c[1] || '') || !c[1]) continue;
  rows.push({ url: c[0], n: c[1], br: c[2], par: c[3], ty: c[4], fl: c[5], thc: c[6], cbd: c[7], af: c[8], aro: c[9] || '' });
}
const shopBr = url => /maconhaseedsbank/.test(url) ? 'Maconha Seeds Bank' : null;
const slugBr = url => { const m = url.match(/seedclub\.com\.br\/produto\/(.+?)\/?$/); if (!m) return null; const B = { 'green-house-seed-co': 'Green House Seeds', 'barneys-farm': "Barney's Farm", 'archive-seed-bank': 'Archive Seed Bank', 'compound-genetics': 'Compound Genetics', 'cookies-seed-bank': 'Cookies', 'karma-genetics': 'Karma Genetics', 'g13-labs': 'G13 Labs', 'somas-seeds': 'Soma Seeds', 'original-big-buddha-family-farms': 'Big Buddha', 'gg-genetics': 'GG Strains', 'in-house-genetics': 'In House Genetics', 'inhouse-genetics': 'In House Genetics', 'grounded-genetics': 'Grounded Genetics', 'perfect-tree': 'Perfect Tree', 'perfect-tree-seeds': 'Perfect Tree', 'zmoothiez': 'Zmoothiez', 'east-fork-cultivars': 'East Fork Cultivars', 'dragonfly-earth-medicine': 'Dragonfly Earth Medicine', 'common-wealth-seed-co': 'Common Wealth Seed Co', 'arcana-collective': 'Arcana Collective', 'symbiotic-genetics': 'Symbiotic Genetics', 'ziplock-seeds': 'Ziplock Seeds', 'doja-seeds': 'Doja Seeds', 'hortilab': 'Hortilab', 'r-kiem': 'R-Kiem', 'gtr': 'GTR', 'the-plug-seedbank': 'The Plug Seedbank', 'crockett-family-farms': 'Crockett Family Farms', 'exhalt-genetics': 'Exhalt Genetics', 'rare-dankness': 'Rare Dankness', 'fidels-seed-co': "Fidel's Seed Co", 'dank-genetics': 'Dank Genetics' }; for (const k of Object.keys(B).sort((a, b) => b.length - a.length)) if (m[1].endsWith(k) || m[1].endsWith(k + '-2')) return B[k]; return null; };
const US = /Compound|Grounded|Perfect Tree|Zmoothiez|East Fork|Dragonfly|Common Wealth|Arcana|Symbiotic|Ziplock|Doja|Karma|Archive|Cookies|In House|GG Strains|Crockett|Exhalt|Rare Dankness|Fidel|Dank Genetics|The Plug|GTR/;

const add = [], seen = new Set(S.map(s => s.id));
for (const r of rows) {
  const auto = /auto/i.test(r.af) || /automatica|-auto\b|auto-/.test(r.url);
  let n = r.n.replace(/\s*[-–]\s*(feminizad[ao]|regular|autom[aá]tic[ao]|fotoper[ií]odo).*$/i, '').replace(/\b(sementes?( de maconha)?|feminizad[ao]s?|fotoper[ií]odo|autom[aá]tic[ao])\b/gi, '').replace(/\s+/g, ' ').trim();
  if (!n) continue;
  if (auto && !/auto/i.test(n)) n += ' Auto';
  const id = norm(n); if (seen.has(id) || IDX[id]) continue; seen.add(id);
  const P = splitP(r.par), pid = P.map(resolve), known = pid.filter(Boolean).map(x => by[x]);
  const p = P.map((x, i) => pid[i] || { name: x.replace(/\s+/g, ' ') });
  if (auto && !pid.includes('ruderalis') && by.ruderalis && !P.length) p.push('ruderalis');
  const br = r.br && !/dentista|seed club|dona florinda/i.test(r.br) ? r.br : slugBr(r.url) || shopBr(r.url) || 'Desconhecido';
  let ind = null; const ty = r.ty || '';
  const mi = ty.match(/(\d+)\s*%\s*indica/i), ms = ty.match(/(\d+)\s*%\s*sativa/i);
  if (mi) ind = +mi[1]; else if (ms) ind = 100 - +ms[1]; else if (/indica/i.test(ty) && !/sativa/i.test(ty)) ind = 75; else if (/sativa/i.test(ty) && !/indica/i.test(ty)) ind = 25; else if (known.length) ind = Math.round(avg(known, s => s.ind) / 5) * 5; else if (/h[ií]brid/i.test(ty)) ind = 50; else ind = 50;
  ind = Math.max(0, Math.min(100, Math.round(ind / 5) * 5));
  let thc = rng(r.thc, 0.1, 35, 2), thcx = false; if (!thc) { thcx = true; const k = known.filter(s => !s.thcx); thc = k.length ? [Math.round(avg(k, s => s.thc[0])), Math.round(avg(k, s => s.thc[1]))] : [18, 24]; }
  let cbd = rng(r.cbd, 0, 25, 1) || (/cbd/i.test(n) ? [5, 10] : [0.1, 0.5]);
  const ch = cbd[1] >= 4 && thc[1] <= 5 ? 'III' : cbd[1] >= 4 && cbd[1] * 2 >= thc[0] ? 'II' : 'I';
  let fl = rng(r.fl, 5, 16); if (!fl) { const k = known.filter(s => s.f !== 'auto'); fl = auto ? [9, 11] : k.length ? [Math.round(avg(k, s => s.fl[0])), Math.round(avg(k, s => s.fl[1]))] : [8, 10]; }
  if (fl[0] === fl[1]) fl = [fl[0], fl[0] + 1];
  let te = [...new Set(TE.filter(([re]) => re.test(r.aro)).map(([, t]) => t))].slice(0, 3), tex = false;
  if (te.length < 2) { const kt = known.flatMap(s => s.te); te = [...new Set([...te, ...kt])].slice(0, 3); if (!r.aro) tex = true; }
  if (te.length < 2) { te = [...new Set([...te, 'mirceno', 'cariofileno', 'limoneno'])].slice(0, 3); tex = true; }
  let f = auto ? 'auto' : ch !== 'I' ? 'cbd' : null;
  if (!f) { const fk = FAMKW.find(([re]) => re.test(n)); const pf = known.map(s => s.f).filter(x => x !== 'landraces' && x !== 'auto'); const cnt = {}; pf.forEach(x => cnt[x] = (cnt[x] || 0) + 1); const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]; f = top ? top[0] : fk ? fk[1] : 'cookies'; }
  const or = BRC[br] || (US.test(br) ? 'EUA' : /maconhaseeds/.test(r.url) ? 'Brasil' : 'Desconhecida');
  const s = { id, n, f, ind, thc, cbd, ch, fl, br, or, te, conf: 'b', p, d: auto ? 'fácil' : 'moderada' };
  if (thcx) s.thcx = true; if (tex) s.tex = true; if (!P.length) s.unk = true;
  if (br === 'Maconha Seeds Bank') s.sb = 'maconha seeds';
  add.push(s);
}

// foto: ancestral mais próximo com foto; sem árvore, uma strain da mesma família com nome parecido
const byAll = { ...by }; add.forEach(s => byAll[s.id] = s);
const hasPh = s => s && s.ph && !s.phf;
function donor(s) {
  const q = (s.p || []).filter(x => typeof x === 'string').map(x => [x, 1]), seen = new Set();
  while (q.length) { const [x, d] = q.shift(); if (seen.has(x) || d > 4) continue; seen.add(x); const o = byAll[x]; if (!o) continue; if (hasPh(o) && x !== 'ruderalis') return x; (o.p || []).filter(y => typeof y === 'string').forEach(y => q.push([y, d + 1])); }
  const words = norm(s.n).split('-').filter(w => w.length > 3 && w !== 'auto');
  let best = null, bs = 0;
  for (const o of S) { if (!hasPh(o) || (o.f === 'auto') !== (s.f === 'auto') && s.f !== 'auto') continue; const ow = norm(o.n).split('-'); let sc = words.filter(w => ow.includes(w)).length * 10 + (o.f === s.f ? 3 : 0) - Math.abs(o.ind - s.ind) / 20 + Math.min(o.kids.length || 0, 30) / 30; if (sc > bs) { bs = sc; best = o.id; } }
  return best;
}
S.forEach(s => s.kids = s.kids || []);
let withPh = 0; for (const s of add) { const d = donor(s); if (d) { s.ph = 1; s.phf = d; withPh++; } }

console.log('linhas', rows.length, 'novas', add.length, 'com foto emprestada', withPh, 'parentais reconhecidos', add.filter(s => s.p.some(x => typeof x === 'string')).length);
if (process.argv.includes('--sample')) add.slice(0, +process.env.N || 12).forEach(s => console.log(JSON.stringify(s)));
if (process.argv.includes('--write')) {
  const out = [...S.map(s => { const c = { ...s }; delete c.kids; return c; }), ...add];
  fs.writeFileSync(ROOT + '/strains.js', 'window.STRAINS=' + JSON.stringify(out) + ';\n');
  console.log('strains.js agora tem', out.length);
}
