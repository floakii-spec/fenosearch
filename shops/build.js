// Junta shops/*.json em buy.js (window.BUY). Uso: node shops/build.js
const fs = require('fs'), D = __dirname, out = {};
for (const f of fs.readdirSync(D).filter(f => f.endsWith('.json'))) {
  const J = JSON.parse(fs.readFileSync(`${D}/${f}`, 'utf8'));
  for (const [id, L] of Object.entries(J)) {
    const named = L.filter(x => x.br), use = named.length ? named : L, seen = new Set();
    for (const x of use) { const k = x.shop + '|' + x.br + '|' + x.auto; if (seen.has(k)) continue; seen.add(k); (out[id] = out[id] || []).push([x.shop, x.url, [x.br, x.auto ? 'automática' : x.br ? '' : 'fotoperíodo'].filter(Boolean).join(' · ')]); }
  }
}
fs.writeFileSync(`${D}/../buy.js`, `// Gerado por shops/build.js em ${new Date().toISOString().slice(0, 10)}. Não editar à mão.\nwindow.BUY=${JSON.stringify(out)};\n`);
console.log('strains com link:', Object.keys(out).length, 'links:', Object.values(out).reduce((t, L) => t + L.length, 0));
