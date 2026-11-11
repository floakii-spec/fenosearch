// Casa produtos de lojas (slugs) com strains do catálogo. Uso: node shops/match.js
const fs = require('fs'); global.window = {}; eval(fs.readFileSync(__dirname + '/../strains.js', 'utf8'));
const S = window.STRAINS;
const BREEDERS = ['little-chief-collabs-serious-seeds-x-gg-strains', 'little-chief-collabs-dna-genetics-x-rare-dankness', 'little-chief-collabs-karma-x-gg-strains', 'little-chief-collabs-x-karma-genetics', 'original-big-buddha-family-farms', 'dragonfly-earth-medicine', 'east-fork-cultivars', 'common-wealth-seed-co', 'crockett-family-farms', 'green-house-seed-co', 'compound-genetics', 'grounded-genetics', 'symbiotic-genetics', 'archive-seed-bank', 'cookies-seed-bank', 'perfect-tree-seeds', 'arcana-collective', 'the-plug-seedbank', 'in-house-genetics', 'inhouse-genetics', 'karma-genetics', 'fidels-seed-co', 'exhalt-genetics', 'rare-dankness', 'dank-genetics', 'ziplock-seeds', 'barneys-farm', 'perfect-tree', 'somas-seeds', 'doja-seeds', 'gg-genetics', 'g13-labs', 'zmoothiez', 'hortilab', 'inhouse', 'r-kiem', 'gtr'];
const BRN = { 'green-house-seed-co': 'Green House Seeds', 'barneys-farm': "Barney's Farm", 'archive-seed-bank': 'Archive', 'compound-genetics': 'Compound Genetics', 'cookies-seed-bank': 'Cookies', 'karma-genetics': 'Karma Genetics', 'g13-labs': 'G13 Labs', 'somas-seeds': 'Soma Seeds', 'original-big-buddha-family-farms': 'Big Buddha', 'gg-genetics': 'GG Strains', 'in-house-genetics': 'In House Genetics', 'inhouse-genetics': 'In House Genetics', 'inhouse': 'In House Genetics', 'grounded-genetics': 'Grounded Genetics', 'perfect-tree': 'Perfect Tree', 'perfect-tree-seeds': 'Perfect Tree', 'rare-dankness': 'Rare Dankness', 'crockett-family-farms': 'Crockett Family Farms' };
const norm = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’.#]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function parse(slug) {
  let s = decodeURIComponent(slug).replace(/^3-sementes-/, '').replace(/-[a-z0-9]{5}$/, m => /\d/.test(m) && /[a-z]/.test(m) ? '' : m).replace(/-3unid$/, '').replace(/(feminizada)\d$/, '$1').replace(/-feminizada$/, '').replace(/-premium-fotoperiodo$/, '-fotoperiodo').replace(/-auto$/, '-automatica').replace(/-copia$/, '').replace(/-(fotoperiodo|automatica)(-\d+)?$/, m => m.includes('auto') ? '-AUTO' : '').replace(/^sementes?-(de-)?maconha-/, '').replace(/-5-seeds$/, '').replace(/-(copia|2|brinde)$/g, '').replace(/-brinde-/g, '-'), br = '';
  for (const b of BREEDERS) if (s.endsWith('-' + b)) { br = b; s = s.slice(0, -b.length - 1); break; }
  s = s.replace(/-(by|5-seeds|female-cannabis-seeds|seeds|seedless|cbgv|cbg|regular|female|feminized|feminizada(-\d)?|by)$/g, '');
  for (let i = 0; i < 3; i++) s = s.replace(/-(by|regular|female|feminized|feminizada|seedless|5-seeds|seeds|cbgv)$/g, '');
  s = s.replace(/-(regular|female|feminized|feminizada)-/g, '-');
  let au = false; if (s.endsWith('-AUTO')) { au = true; s = s.slice(0, -5); }
  return { name: s, br, au };
}
const IDX = {}; S.forEach(s => { [s.n, s.id, ...(s.aka || [])].forEach(n => { const k = norm(n); (IDX[k] = IDX[k] || new Set()).add(s.id); }); });
const ALIAS = { 'girls-scout-cookies': 'gsc', 'sourripper': 'sour-ripper', 'mutante-drunken-bastard': 'drunken-bastard', 'pineapple-gas-s1': 'pineapple-gas', 'northen-lights': 'northern-lights', 'ak47': 'ak-47', 'grandaddy-purple': 'granddaddy-purple', 'l-a-confidencial': 'la-confidential', 'afghani': 'afghani', 'kings-kush': 'king-kush', 'zkittlez-fotoperiodo': 'zkittlez', 'girl-scout-cookies': 'gsc', 'do-si-dos': 'dosidos', 'chemdog': 'chemdawg', 'train-wreck': 'trainwreck', 'orange-sherbert': 'orange-sherbet', 'skunk-1': 'skunk-1', 'new-york-city-diesel': 'nyc-diesel', 'original-glue-gg4': 'gorilla-glue-4', 'gorilla-glue': 'gorilla-glue-4', 'californian-orange': 'california-orange', 'slh-super-lemon-haze': 'super-lemon-haze' };
const shop = process.argv[2] || 'seedclub';
const MAN = { maconhaseeds: { 'punto-rojo': 'punto-rojo-auto', 'borrachinha': 'borrachina', 'marcelo-d2': 'marcelo-de-2' } }[shop] || {};
// Lojas cujos slugs trazem pack/breeder no meio: limpa antes do parse e devolve o breeder já com nome de exibição.
const SSB = [['latitudsurseeds', 'Latitud Sur Seeds'], ['latitud-sur-seeds', 'Latitud Sur Seeds'], ['dutch-passion', 'Dutch Passion'], ['bsf', 'BSF Seeds'], ['barneys-farm', "Barney's Farm"], ['royal-queen', 'Royal Queen Seeds'], ['humboldt', 'Humboldt Seed Co'], ['seedstockers', 'Seed Stockers'], ['seed-stockers', 'Seed Stockers'], ['sensi-seeds', 'Sensi Seeds'], ['sensi-seed', 'Sensi Seeds'], ['sativa-creations', 'Sativa Creations'], ['pyramid-seeds', 'Pyramid Seeds'], ['trikoma-seeds', 'Trikoma Seeds'], ['purple-city-genetics', 'Purple City Genetics'], ['secret-file', 'Secret File'], ['santa-semente', 'Santa Semente']];
const PRE = {
  santasemente: slug => {
    let s = slug.replace(/-limited-edition$/, '').replace(/-pack(-com)?-\d+(-unidades)?/, '-'), br = '';
    for (const [k, v] of SSB) { const re = new RegExp(`(^|-)${k}(-|$)`); if (re.test(s)) { if (!br) br = v; s = s.replace(re, '-'); } }
    s = s.replace(/-+/g, '-').replace(/^-|-$/g, '').replace(/-(fot|foto)-feminizada$|-(fot|foto)$/, '').replace(/-feminizada$/, '').replace(/-regular$/, '').replace(/-(automatica|auto)(-\d)?$/, '-automatica');
    return { slug: s, br };
  },
  pyramid: slug => ({ slug: slug.toLowerCase().replace(/^\d+-/, '').replace(/^semente-/, '').replace(/-(fast|regular|feminizada)$/, '').replace(/-aka-.*$/, '').replace(/^auto-(.+)$/, '$1-automatica'), br: '' }),
};
const DEFBR = { maconhaseeds: 'Maconha Seeds Bank', dentista: '' }[shop] || '';
const out = {}, miss = [];
for (const url of fs.readFileSync(`${__dirname}/${shop}.txt`, 'utf8').split('\n').map(x => x.trim()).filter(x => /^https?:/.test(x))) {
  let slug = url.replace(/\/$/, '').split('/').pop().replace(/\.html?$/, ''), pbr = '';
  if (PRE[shop]) ({ slug, br: pbr } = PRE[shop](slug));
  const p = parse(slug), { name, au } = p, br = pbr || p.br, cand = [...(au ? [name + '-auto', (ALIAS[name] || name) + '-auto'] : []), name, ALIAS[name], name.replace(/^auto-/, ''), name.replace(/-s1$|-f2$|-bx-?\d*$/, '')].filter(Boolean);
  let ids = MAN[name] ? new Set([MAN[name]]) : null; if (!ids) for (const c of cand) if (IDX[c]) { ids = IDX[c]; break; }
  if (!ids) { miss.push(slug); continue; }
  for (const id of ids) (out[id] = out[id] || []).push({ shop, url, br: BRN[br] || DEFBR || br.split('-').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' '), auto: au || /^auto-/.test(name) });
}
fs.writeFileSync(`${__dirname}/${shop}.json`, JSON.stringify(out, null, 0));
console.log('matched strains', Object.keys(out).length, 'unmatched products', miss.length);
if (process.env.MISSURL) { const all = fs.readFileSync(`${__dirname}/${shop}.txt`, 'utf8').split('\n'); console.log(miss.map(m => all.find(u => u.includes('/' + m + '/'))).join('\n')); } else if (process.env.MISS) console.log(miss.map(m => parse(m).name).join(' ')); else console.log(Object.entries(out).map(([id, L]) => id + ' <- ' + L.map(x => x.url.replace(/\/$/, '').split('/').pop()).join(', ')).join('\n'));
