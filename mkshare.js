// Gera s/<id>.html (página estática por strain: prévia no WhatsApp + indexação no Google),
// sitemap.xml e robots.txt. Rode 'node mkshare.js' sempre que mudar strains.js ou buy.js.
const fs = require('fs');
global.window = {};
require('./strains.js');
try { require('./buy.js'); } catch (e) {}
const S = window.STRAINS, BUY = window.BUY || {};
const by = Object.fromEntries(S.map(s => [s.id, s]));
const SITE = 'https://fenosearch.site';
const E = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kind = s => s.ind >= 70 ? 'Indica' : s.ind <= 30 ? 'Sativa' : 'Híbrida';
const chemo = c => ({ I: 'Mais THC', II: 'Equilibrada', III: 'Mais CBD' })[c];
const NOBR = ['Desconhecido', 'Nativa (landrace)', 'Vários bancos'];
const TERP = { mirceno: ['terroso', 'herbal'], limoneno: ['cítrico'], cariofileno: ['apimentado'], pineno: ['pinho'], terpinoleno: ['floral', 'fresco'], linalol: ['lavanda'], humuleno: ['amadeirado'], ocimeno: ['doce'] };
const SHOPS = { seedclub: 'Seed Club', dentista: 'Dentista Seeds', donaflorinda: 'Dona Florinda', maconhaseeds: 'Maconha Seeds Bank' };
const pt = n => String(n).replace('.', ',');
const listJoin = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1];
const img = s => s.ph ? (s.phf || s.id) : null;

const kids = {};
for (const s of S) for (const p of s.p) if (typeof p === 'string' && by[p]) (kids[p] = kids[p] || []).push(s.id);

function about(s, par) {
  let t = s.n + ' é ' + (s.ind === 100 ? 'uma indica pura' : s.ind === 0 ? 'uma sativa pura' : kind(s) === 'Híbrida' ? 'uma híbrida equilibrada' : 'uma híbrida de predominância ' + (s.ind > 50 ? 'indica' : 'sativa'));
  if (!s.p.length) t += s.unk ? `, de origem incerta (${s.or}).` : `, variedade nativa com procedência em ${s.or}, adaptada ao clima local ao longo de gerações, sem cruzamento feito por breeder.`;
  else if (s.pheno) t += `, selecionada a partir de ${par[0]}.`;
  else t += `, ${!NOBR.includes(s.br) ? 'criada por ' + s.br : 'de criador desconhecido'}${s.y ? ' em ' + s.y : ''}, a partir de ${listJoin(par)}.`;
  return t;
}

const CSS = `:root{--bg:#050605;--sf:#0E110F;--gl:rgba(255,255,255,.055);--ln:rgba(255,255,255,.09);--fg:#F1F3EE;--fg2:#9AA39B;--acc:#E2A54A;--ink:#140D02;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 Figtree,system-ui,sans-serif}
main{max-width:680px;margin:0 auto;padding:20px max(20px,env(safe-area-inset-right)) 48px max(20px,env(safe-area-inset-left));display:flex;flex-direction:column;gap:22px}
a{color:var(--acc)}h1,h2,p{margin:0}.top{display:flex;justify-content:space-between;align-items:center}
.brand{font:600 18px "Bricolage Grotesque",Figtree,system-ui,sans-serif;color:var(--fg);text-decoration:none}
.hero{aspect-ratio:1;max-width:100%;border-radius:24px;background:radial-gradient(circle at 50% 55%,rgba(226,165,74,.28),transparent 65%);display:grid;place-items:center;overflow:hidden}
.hero img{width:100%;height:100%;object-fit:contain}
h1{font:700 clamp(30px,8vw,44px)/1.05 "Bricolage Grotesque",Figtree,system-ui,sans-serif;letter-spacing:-.02em;text-wrap:balance}
.meta{color:var(--fg2);margin-top:6px}.tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.tag{padding:5px 11px;border-radius:99px;background:var(--gl);font-size:13px}
.cta{display:block;text-align:center;padding:14px;border-radius:14px;background:var(--acc);color:var(--ink);font-weight:700;text-decoration:none}
.tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.tile{background:var(--sf);border:1px solid var(--ln);border-radius:14px;padding:12px 14px}
.tile span{display:block;font-size:12px;color:var(--fg2);text-transform:uppercase;letter-spacing:.06em}.tile b{font-size:16px}
h2{font:600 18px "Bricolage Grotesque",Figtree,system-ui,sans-serif;margin-bottom:10px}
.links{display:flex;flex-wrap:wrap;gap:8px}.links a{padding:7px 12px;border-radius:10px;background:var(--gl);color:var(--fg);text-decoration:none;font-size:14px}
.links a small{color:var(--fg2);margin-left:6px}.note{font-size:12.5px;color:var(--fg2)}`;

const dir = __dirname + '/s/';
for (const f of fs.readdirSync(dir)) fs.unlinkSync(dir + f);
for (const s of S) {
  const par = [...s.p.filter(p => typeof p === 'string' && by[p]).map(p => by[p]), ...s.p.filter(p => typeof p !== 'string').map(p => ({ n: p.name }))];
  const ks = (kids[s.id] || []).map(k => by[k]).sort((a, b) => (kids[b.id] || []).length - (kids[a.id] || []).length).slice(0, 12);
  const bits = [kind(s), s.thcx ? null : `THC ${pt(s.thc[0])} a ${pt(s.thc[1])}%`, NOBR.includes(s.br) ? null : s.br, s.or].filter(Boolean);
  const desc = `${bits.join(' · ')}. Ficha, efeitos estimados, árvore genealógica e de onde vem.`;
  const url = `${SITE}/s/${s.id}`, to = `/#${encodeURIComponent(s.id)}`, im = img(s);
  const aro = s.tex ? [] : [...new Set(s.te.flatMap(t => TERP[t] || []))].slice(0, 4);
  const plink = p => p.id ? `<a href="/s/${p.id}">${E(p.n)}<small>${kind(p)}</small></a>` : `<a>${E(p.n)}<small>sem ficha</small></a>`;
  const buy = BUY[s.id] || [];
  const ld = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebPage', '@id': url, url, name: `${s.n} · FenoSearch`, description: desc, inLanguage: 'pt-BR', ...(im ? { primaryImageOfPage: `${SITE}/hi/${im}.webp` } : {}), isPartOf: { '@type': 'WebSite', name: 'FenoSearch', url: SITE + '/' } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'FenoSearch', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: s.n, item: url }] },
    ],
  };
  fs.writeFileSync(dir + s.id + '.html', `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${E(s.n)}: genética, THC e origem · FenoSearch</title>
<meta name="description" content="${E(desc)}">
<meta name="theme-color" content="#050605">
<meta property="og:type" content="website">
<meta property="og:site_name" content="FenoSearch">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${E(s.n)} · FenoSearch">
<meta property="og:description" content="${E(desc)}">
<meta property="og:url" content="${url}">
${im ? `<meta property="og:image" content="${SITE}/hi/${im}.webp">\n<meta name="twitter:card" content="summary_large_image">\n` : ''}<link rel="canonical" href="${url}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Figtree:wght@400;600;700&display=swap">
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head><body><main>
<div class="top"><a class="brand" href="/">FenoSearch</a><a href="${to}">Abrir no app</a></div>
${im ? `<div class="hero"><img src="/hi/${im}.webp" alt="Flor de ${E(s.n)}" width="680" height="680"></div>` : ''}
<div><h1>${E(s.n)}</h1>
<p class="meta">${[NOBR.includes(s.br) ? null : E(s.br), s.y, E(s.or)].filter(Boolean).join(' · ')}</p>
<div class="tags"><span class="tag">${s.ind === 100 ? 'Indica pura' : s.ind === 0 ? 'Sativa pura' : `${kind(s)} · ${s.ind}% indica`}</span><span class="tag">${chemo(s.ch)}</span>${s.f === 'auto' ? '<span class="tag">Automática</span>' : ''}</div></div>
<a class="cta" href="${to}">Ver ficha completa e árvore genealógica</a>
<p>${E(about(s, par.map(p => p.n)))}</p>
<div class="tiles"><div class="tile"><span>THC</span><b>${s.thcx ? 'Não informado' : `${pt(s.thc[0])} a ${pt(s.thc[1])}%`}</b></div><div class="tile"><span>CBD</span><b>${pt(s.cbd[0])} a ${pt(s.cbd[1])}%</b></div><div class="tile"><span>${s.f === 'auto' ? 'Ciclo total' : 'Floração'}</span><b>${s.fl[0]} a ${s.fl[1]} semanas</b></div><div class="tile"><span>Cultivo</span><b>${s.d[0].toUpperCase() + s.d.slice(1)}</b></div></div>
${s.tex ? '' : `<section><h2>Aromas e terpenos</h2><div class="links">${aro.map(a => `<a>${a}</a>`).join('')}${s.te.map(t => `<a><small style="margin:0">${t}</small></a>`).join('')}</div></section>`}
${par.length ? `<section><h2>${s.pheno ? 'Selecionada a partir de' : 'Parentais'}</h2><div class="links">${par.map(plink).join('')}</div></section>` : ''}
${ks.length ? `<section><h2>Descendentes</h2><div class="links">${ks.map(plink).join('')}</div>${(kids[s.id] || []).length > ks.length ? `<p class="note" style="margin-top:8px">E mais ${(kids[s.id] || []).length - ks.length} no app.</p>` : ''}</section>` : ''}
${buy.length ? `<section><h2>Onde comprar no Brasil</h2><div class="links">${buy.map(([sh, u, l]) => `<a href="${E(u)}" rel="nofollow noopener" target="_blank">${SHOPS[sh] || sh}<small>${E(l)}</small></a>`).join('')}</div><p class="note" style="margin-top:8px">Sementes vendidas como item de colecionador. Verifique a legislação vigente.</p></section>` : ''}
<p class="note">THC, CBD e floração são faixas típicas e variam por fenótipo, cultivo e laboratório. Conteúdo informativo, não recomendação médica.</p>
</main></body></html>
`);
}

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(__dirname + '/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${SITE}/</loc><lastmod>${today}</lastmod></url>
${S.map(s => `<url><loc>${SITE}/s/${s.id}</loc></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(__dirname + '/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(fs.readdirSync(dir).length, 'páginas + sitemap.xml + robots.txt');
