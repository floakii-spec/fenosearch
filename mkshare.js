// Gera s/<id>.html (link de compartilhar com prévia no WhatsApp). Rode 'node mkshare.js' sempre que mudar strains.js.
const fs=require('fs');global.window={};require('./strains.js');const S=window.STRAINS;
const E=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const kind=s=>s.ind>=70?'Indica':s.ind<=30?'Sativa':'Híbrida';
const NOBR=['Desconhecido','Nativa (landrace)','Vários bancos'];
const pt=n=>String(n).replace('.',',');
const dir=__dirname+'/s/';
for(const f of fs.readdirSync(dir))fs.unlinkSync(dir+f);
for(const s of S){
  const bits=[kind(s),s.thcx?null:`THC ${pt(s.thc[0])} a ${pt(s.thc[1])}%`,NOBR.includes(s.br)?null:s.br,s.or].filter(Boolean);
  const desc=`${bits.join(' · ')}. Veja ficha, efeitos, árvore genealógica e de onde vem.`;
  const url=`https://fenosearch.site/s/${s.id}`, to=`/#${encodeURIComponent(s.id)}`;
  const img=s.ph?`<meta property="og:image" content="https://fenosearch.site/hi/${s.phf||s.id}.webp">\n<meta name="twitter:card" content="summary_large_image">\n`:'';
  fs.writeFileSync(dir+s.id+'.html',`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${E(s.n)} · FenoSearch</title>
<meta name="description" content="${E(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="FenoSearch">
<meta property="og:title" content="${E(s.n)} · FenoSearch">
<meta property="og:description" content="${E(desc)}">
<meta property="og:url" content="${url}">
${img}<link rel="canonical" href="${url}">
<meta http-equiv="refresh" content="0;url=${to}">
<style>body{margin:0;background:#050605;color:#F1F3EE;font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}a{color:#E2A54A}</style>
</head><body><p><a href="${to}">Abrir ${E(s.n)} no FenoSearch</a></p>
<script>location.replace(${JSON.stringify(to)})</script></body></html>
`);
}
console.log(fs.readdirSync(dir).length);
