// FenoSearch · comunidade: relatos, comentários, curtidas, denúncias.
// Backend: Supabase (auth + Postgres com RLS, ver supabase/schema.sql).
// Sem CONF preenchido, nada aparece no site. Com ?mock=1 na URL, roda com dados locais de teste.
(() => {
  const CONF = { url: '', key: '', google: false };
  const MOCK = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]mock=1\b/.test(location.search);
  const ON = MOCK || !!(CONF.url && CONF.key);
  const F = window.FB;
  if (!ON || !F) return;
  const { by, esc, I } = F;

  // ---------- vocabulário ----------
  const EFF = ['relaxamento', 'sono', 'apetite', 'energia', 'foco', 'euforia', 'criatividade', 'calma', 'clareza mental', 'alívio de dor', 'sociabilidade', 'riso'];
  const ADV = ['boca seca', 'olhos secos', 'ansiedade', 'paranoia', 'letargia', 'tontura', 'dor de cabeça', 'taquicardia'];
  const ARO = ['terroso', 'herbal', 'cítrico', 'frutado', 'tropical', 'uva', 'doce', 'floral', 'lavanda', 'pinho', 'amadeirado', 'apimentado', 'diesel', 'skunk', 'queijo', 'menta', 'café', 'incenso'];
  const REASONS = ['comércio', 'ofensa', 'spam', 'dados pessoais', 'outro'];
  const DIFF = ['fácil', 'moderada', 'difícil'];

  // ---------- dados ----------
  let sb = null, me = null, prof = null;
  const cache = {}, listeners = new Set();
  const changed = () => listeners.forEach(f => f());

  const real = {
    async init() {
      await new Promise((ok, err) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'; s.onload = ok; s.onerror = err; document.head.appendChild(s); });
      sb = window.supabase.createClient(CONF.url, CONF.key, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } });
      const { data } = await sb.auth.getSession(); await setUser(data.session && data.session.user);
      sb.auth.onAuthStateChange((_e, s) => { setUser(s && s.user).then(changed); });
      if (/[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
    },
    async profile(uid) { const { data } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle(); return data; },
    async magic(email) { const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + '/' + location.hash } }); if (error) throw error; },
    async google() { const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/' + location.hash } }); if (error) throw error; },
    async signOut() { await sb.auth.signOut(); },
    async saveProfile(p) { const { error } = await sb.from('profiles').upsert({ id: me.id, nick: p.nick, bio: p.bio || null }); if (error) throw error; },
    async reports(q) {
      let r = sb.from('reports').select('*, profiles(nick), likes(count), comments(count)').order('created_at', { ascending: false }).limit(q.limit || 60);
      if (q.strain) r = r.eq('strain_id', q.strain); if (q.user) r = r.eq('user_id', q.user); if (q.id) r = r.eq('id', q.id); if (q.hidden) r = r.eq('hidden', true);
      const { data, error } = await r; if (error) throw error;
      let mine = new Set();
      if (me && data.length) { const { data: L } = await sb.from('likes').select('report_id').eq('user_id', me.id).in('report_id', data.map(x => x.id)); mine = new Set((L || []).map(x => x.report_id)); }
      return data.map(x => ({ ...x, nick: x.profiles && x.profiles.nick, nl: (x.likes[0] || {}).count || 0, nc: (x.comments[0] || {}).count || 0, liked: mine.has(x.id) }));
    },
    async userByNick(nick) { const { data } = await sb.from('profiles').select('id, nick, bio, created_at, banned').eq('nick', nick).maybeSingle(); return data; },
    async saveReport(r) { const row = { ...r, user_id: me.id }; delete row.id; const q = r.id ? sb.from('reports').update(row).eq('id', r.id) : sb.from('reports').insert(row); const { error } = await q; if (error) throw error; },
    async delReport(id) { const { error } = await sb.from('reports').delete().eq('id', id); if (error) throw error; },
    async comments(rid) { const { data, error } = await sb.from('comments').select('*, profiles(nick)').eq('report_id', rid).order('created_at'); if (error) throw error; return data.map(c => ({ ...c, nick: c.profiles && c.profiles.nick })); },
    async addComment(rid, body) { const { error } = await sb.from('comments').insert({ report_id: rid, user_id: me.id, body }); if (error) throw error; },
    async delComment(id) { const { error } = await sb.from('comments').delete().eq('id', id); if (error) throw error; },
    async like(rid, on) { const { error } = on ? await sb.from('likes').insert({ report_id: rid, user_id: me.id }) : await sb.from('likes').delete().eq('report_id', rid).eq('user_id', me.id); if (error) throw error; },
    async flag(f) { const { error } = await sb.from('flags').insert({ ...f, user_id: me.id }); if (error) throw error; },
    async flags() { const { data, error } = await sb.from('flags').select('*, profiles(nick), reports(id, strain_id, body, user_id, hidden, profiles(nick)), comments(id, body, report_id, user_id, hidden, profiles(nick))').eq('resolved', false).order('created_at', { ascending: false }); if (error) throw error; return data; },
    async resolve(id) { await sb.from('flags').update({ resolved: true }).eq('id', id); },
    async hide(kind, id, v) { const { error } = await sb.from(kind).update({ hidden: v }).eq('id', id); if (error) throw error; },
    async ban(uid) { const { error } = await sb.from('profiles').update({ banned: true }).eq('id', uid); if (error) throw error; },
  };

  // dados locais pra testar as telas sem backend (?mock=1)
  const mock = (() => {
    const K = 'fb2:mock', now = Date.now();
    let D; try { D = JSON.parse(localStorage.getItem(K)); } catch (e) {}
    if (!D) D = { seq: 10, me: null, profiles: [{ id: 'u1', nick: 'grower_sp', bio: 'Indoor 80x80, LED 240 W.', is_admin: false, banned: false }, { id: 'u2', nick: 'ana.terps', bio: '', is_admin: false, banned: false }], reports: [
      { id: 1, strain_id: 'og-kush', user_id: 'u1', ctx: 'cultivo', rating: 4, effects: ['relaxamento', 'alívio de dor', 'boca seca'], aromas: ['diesel', 'terroso', 'pinho'], flower_weeks: 9, yield_g: 85, yield_unit: 'g/planta', difficulty: 'moderada', body: 'Fenótipo com internódio curto, pediu defoliação na semana 3 de flora. Odor forte, filtro de carvão obrigatório.', hidden: false, created_at: new Date(now - 864e5 * 3).toISOString() },
      { id: 2, strain_id: 'og-kush', user_id: 'u2', ctx: 'consumo', rating: 5, effects: ['relaxamento', 'euforia', 'olhos secos'], aromas: ['diesel', 'cítrico'], body: 'Efeito físico pesado depois de uns 20 minutos, bom pra noite. Sabor de combustível com fundo cítrico.', hidden: false, created_at: new Date(now - 36e5 * 5).toISOString() }],
      comments: [{ id: 3, report_id: 1, user_id: 'u2', body: 'Qual substrato você usou?', hidden: false, created_at: new Date(now - 864e5).toISOString() }], likes: [{ report_id: 1, user_id: 'u2' }], flags: [] };
    const save = () => { try { localStorage.setItem(K, JSON.stringify(D)); } catch (e) {} };
    const P = id => D.profiles.find(p => p.id === id) || {};
    const isA = () => !!(me && P(me.id).is_admin);
    const vis = x => !x.hidden || (me && x.user_id === me.id) || isA();
    const wait = v => new Promise(r => setTimeout(() => r(v), 120));
    return {
      async init() { if (D.me) await setUser({ id: D.me, email: 'teste@local' }); },
      async profile(uid) { const p = D.profiles.find(x => x.id === uid); return p ? { ...p } : null; },
      async magic(email) { const id = 'u' + email.toLowerCase(); D.me = id; save(); await setUser({ id, email }); changed(); },
      async google() { return this.magic('google@local'); },
      async signOut() { D.me = null; save(); await setUser(null); },
      async saveProfile(p) { if (D.profiles.some(x => x.nick === p.nick && x.id !== me.id)) throw { code: '23505' }; const x = D.profiles.find(x => x.id === me.id); if (x) Object.assign(x, { nick: p.nick, bio: p.bio }); else D.profiles.push({ id: me.id, nick: p.nick, bio: p.bio, is_admin: D.profiles.length === 2, banned: false }); save(); },
      async reports(q) { let L = D.reports.filter(vis); if (q.strain) L = L.filter(r => r.strain_id === q.strain); if (q.user) L = L.filter(r => r.user_id === q.user); if (q.id) L = L.filter(r => r.id === q.id); if (q.hidden) L = L.filter(r => r.hidden); L = L.slice().sort((a, b) => b.created_at < a.created_at ? -1 : 1).slice(0, q.limit || 60); return wait(L.map(r => ({ ...r, nick: P(r.user_id).nick, nl: D.likes.filter(l => l.report_id === r.id).length, nc: D.comments.filter(c => c.report_id === r.id && vis(c)).length, liked: !!me && D.likes.some(l => l.report_id === r.id && l.user_id === me.id) }))); },
      async userByNick(nick) { return D.profiles.find(p => p.nick === nick) || null; },
      async saveReport(r) { if (P(me.id).banned) throw { message: 'bloqueado' }; if (r.id) Object.assign(D.reports.find(x => x.id === r.id), r); else { if (D.reports.some(x => x.strain_id === r.strain_id && x.user_id === me.id && x.ctx === r.ctx)) throw { code: '23505' }; D.reports.push({ ...r, id: ++D.seq, user_id: me.id, hidden: false, created_at: new Date().toISOString() }); } save(); },
      async delReport(id) { D.reports = D.reports.filter(r => r.id !== id); save(); },
      async comments(rid) { return wait(D.comments.filter(c => c.report_id === rid && vis(c)).map(c => ({ ...c, nick: P(c.user_id).nick }))); },
      async addComment(rid, body) { D.comments.push({ id: ++D.seq, report_id: rid, user_id: me.id, body, hidden: false, created_at: new Date().toISOString() }); save(); },
      async delComment(id) { D.comments = D.comments.filter(c => c.id !== id); save(); },
      async like(rid, on) { D.likes = D.likes.filter(l => !(l.report_id === rid && l.user_id === me.id)); if (on) D.likes.push({ report_id: rid, user_id: me.id }); save(); },
      async flag(f) { D.flags.push({ ...f, id: ++D.seq, user_id: me.id, resolved: false, created_at: new Date().toISOString() }); save(); },
      async flags() { return D.flags.filter(f => !f.resolved).map(f => { const r = f.report_id && D.reports.find(x => x.id === f.report_id), c = f.comment_id && D.comments.find(x => x.id === f.comment_id); return { ...f, profiles: { nick: P(f.user_id).nick }, reports: r ? { ...r, profiles: { nick: P(r.user_id).nick } } : null, comments: c ? { ...c, profiles: { nick: P(c.user_id).nick } } : null }; }); },
      async resolve(id) { D.flags.find(f => f.id === id).resolved = true; save(); },
      async hide(kind, id, v) { (kind === 'reports' ? D.reports : D.comments).find(x => x.id === id).hidden = v; save(); },
      async ban(uid) { P(uid).banned = true; save(); },
    };
  })();
  const api = MOCK ? mock : real;

  async function setUser(u) { me = u || null; prof = me ? await api.profile(me.id) : null; }
  const ready = api.init().then(() => { changed(); if (me && !prof) go('nick'); }).catch(e => { console.warn('comunidade indisponível', e); });

  // ---------- formatação ----------
  const ago = t => { const s = (Date.now() - new Date(t)) / 1e3; if (s < 3600) return `há ${Math.max(1, Math.round(s / 60))} min`; if (s < 86400) return `há ${Math.round(s / 3600)} h`; if (s < 86400 * 30) return `há ${Math.round(s / 86400)} d`; return new Date(t).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const stars = n => `<span class="sostars" aria-label="Nota ${n} de 5">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
  const avgS = L => L.length ? (L.reduce((t, r) => t + r.rating, 0) / L.length).toFixed(1).replace('.', ',') : '';
  const errMsg = e => e && e.code === '23505' ? 'Já existe um registro igual. Se for o apelido, escolha outro; se for relato, edite o que você já publicou.' : e && /row-level|bloqueado/.test(e.message || '') ? 'Sua conta não pode publicar.' : 'Não deu pra salvar agora. Tente de novo em instantes.';
  const ICON = {
    like: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    com: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    user: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  };

  function topEff(L) {
    const c = {}; L.forEach(r => r.effects.forEach(e => (c[e] = (c[e] || 0) + 1)));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([n, k]) => ({ n, k, p: Math.round(k / L.length * 100), adv: ADV.includes(n) }));
  }
  function rcard(r, opt = {}) {
    const s = by[r.strain_id];
    return `<article class="socard${r.hidden ? ' hid' : ''}">
      <button class="sohead" data-so="report" data-arg="${r.id}">
        <span class="someta"><b>${esc(r.nick || 'anônimo')}</b>${opt.strain && s ? ` · ${esc(s.n)}` : ''}<small>${r.ctx === 'cultivo' ? 'Cultivo' : 'Consumo'} · ${ago(r.created_at)}${r.hidden ? ' · oculto pela moderação' : ''}</small></span>${stars(r.rating)}</button>
      <p class="sobody${opt.full ? '' : ' clamp'}">${esc(r.body)}</p>
      ${r.ctx === 'cultivo' && (r.flower_weeks || r.yield_g || r.difficulty) ? `<p class="sogrow">${[r.flower_weeks ? `Floração ${String(r.flower_weeks).replace('.', ',')} sem.` : '', r.yield_g ? `${String(r.yield_g).replace('.', ',')} ${r.yield_unit === 'g/m2' ? 'g/m²' : 'g/planta'}` : '', r.difficulty ? `Dificuldade ${r.difficulty}` : ''].filter(Boolean).join(' · ')}</p>` : ''}
      ${r.effects.length || r.aromas.length ? `<div class="sotags">${r.effects.map(e => `<span class="${ADV.includes(e) ? 'adv' : ''}">${esc(e)}</span>`).join('')}${r.aromas.map(a => `<span class="aro">${esc(a)}</span>`).join('')}</div>` : ''}
      <div class="sofoot"><button data-so="like" data-arg="${r.id}" aria-pressed="${!!r.liked}" aria-label="Curtir">${ICON.like}${r.nl || ''}</button><button data-so="report" data-arg="${r.id}" aria-label="Comentários">${ICON.com}${r.nc || ''}</button></div>
    </article>`;
  }

  // ---------- slot na ficha ----------
  async function loadStrain(id, force) {
    if (cache[id] && !force) return cache[id];
    cache[id] = { loading: true, L: (cache[id] || {}).L || [] };
    try { cache[id] = { L: await api.reports({ strain: id }) }; } catch (e) { cache[id] = { L: [], err: true }; }
    paintSlot(id); return cache[id];
  }
  function slotInner(id) {
    const c = cache[id]; if (!c) { loadStrain(id); return '<p class="sub">Carregando relatos…</p>'; }
    const L = c.L.filter(r => !r.hidden), s = by[id];
    const mine = me && c.L.filter(r => r.user_id === me.id);
    const ef = topEff(L).slice(0, 8);
    return `<p class="h3">Relatos da comunidade<small>${L.length ? `${L.length} ${L.length === 1 ? 'relato' : 'relatos'} · nota ${avgS(L)}` : 'nenhum ainda'}</small></p>
      ${L.length >= 3 ? `<div class="card sosum"><p class="kv" style="margin:0">O que mais aparece nos relatos</p><div class="bars">${ef.filter(e => !e.adv).slice(0, 4).map(e => `<div class="bar"><span>${e.n[0].toUpperCase() + e.n.slice(1)}</span><span class="tr"><i style="width:${e.p}%"></i></span><span class="v">${e.k}</span></div>`).join('')}</div>${ef.some(e => e.adv) ? `<p class="kv" style="margin:0">Efeitos indesejados: ${ef.filter(e => e.adv).slice(0, 3).map(e => `${e.n} (${e.k})`).join(', ')}.</p>` : ''}</div>` : ''}
      ${L.length ? `<div class="solist">${L.slice(0, 3).map(r => rcard(r)).join('')}</div>${L.length > 3 ? `<button class="btn" data-so="strain" data-arg="${id}">Ver os ${L.length} relatos</button>` : ''}` : `<p class="sub">${c.err ? 'Não deu pra carregar os relatos agora.' : `Ainda ninguém relatou ${esc(s.n)}. Conte como foi o consumo ou o cultivo.`}</p>`}
      <div class="btns"><button class="btn fill" data-so="write" data-arg="${id}">${mine && mine.length ? 'Escrever outro relato' : 'Escrever relato'}</button>${mine && mine.length ? `<button class="btn" data-so="edit" data-arg="${mine[0].id}">Editar o seu</button>` : ''}</div>`;
  }
  function paintSlot(id) { const el = document.getElementById('soc'); if (el && el.dataset.sid === id) el.innerHTML = slotInner(id); }

  // ---------- slot no início ----------
  let recent = null;
  async function loadRecent() { try { recent = await api.reports({ limit: 6 }); } catch (e) { recent = []; } paintHome(); }
  function homeInner() {
    if (!recent) { loadRecent(); return '<p class="sub">Carregando…</p>'; }
    return `<p class="h3">Comunidade<button class="lnk" data-so="${me ? 'me' : 'login'}">${me ? (prof ? '@' + esc(prof.nick) : 'Sua conta') : 'Entrar'}</button></p>
      ${recent.length ? `<div class="solist">${recent.filter(r => !r.hidden).slice(0, 3).map(r => rcard(r, { strain: true })).join('')}</div><button class="btn" data-so="feed">Ver todos os relatos</button>` : '<p class="sub">Nenhum relato ainda. Abra a ficha de uma strain e seja o primeiro a relatar.</p>'}`;
  }
  function paintHome() { const el = document.getElementById('sohome'); if (el) el.innerHTML = homeInner(); }

  listeners.add(() => { Object.keys(cache).forEach(k => delete cache[k]); recent = null; const el = document.getElementById('soc'); if (el) loadStrain(el.dataset.sid); if (document.getElementById('sohome')) loadRecent(); if (stack.length) paint(); });

  // ---------- overlay (telas da comunidade) ----------
  const stack = [];
  let root = null;
  function go(page, arg) { stack.push({ page, arg, data: null }); paint(true); }
  function back() { stack.pop(); if (!stack.length) return closeO(); paint(); }
  function closeO() { stack.length = 0; if (root) { root.classList.remove('in'); const r = root; setTimeout(() => { if (!stack.length) r.hidden = true; }, 260); } document.documentElement.classList.remove('solock'); }
  function ensureRoot() {
    if (root) return root;
    root = document.createElement('div'); root.className = 'som'; root.hidden = true; root.setAttribute('role', 'dialog'); document.body.appendChild(root);
    root.addEventListener('click', onClick); root.addEventListener('submit', onSubmit); root.addEventListener('input', onInput);
    return root;
  }
  const TITLES = { login: 'Entrar', nick: 'Seu perfil', write: 'Novo relato', edit: 'Editar relato', report: 'Relato', strain: 'Relatos', profile: 'Perfil', me: 'Sua conta', feed: 'Comunidade', admin: 'Moderação', terms: 'Termos de uso', flag: 'Denunciar' };
  async function paint(fresh) {
    const r = ensureRoot(), top = stack[stack.length - 1]; if (!top) return;
    r.hidden = false; document.documentElement.classList.add('solock'); requestAnimationFrame(() => r.classList.add('in'));
    const head = `<div class="sotop"><button class="rb" data-so="back" aria-label="Voltar">${I.back}</button><p>${TITLES[top.page] || ''}</p><span style="width:40px"></span></div>`;
    r.innerHTML = head + `<div class="sowrap"><p class="sub">Carregando…</p></div>`;
    let html;
    try { html = await PAGES[top.page](top); } catch (e) { console.warn(e); html = `<p class="sub">Não deu pra carregar agora. Tente de novo em instantes.</p>`; }
    if (stack[stack.length - 1] !== top) return;
    r.innerHTML = head + `<div class="sowrap">${html}</div>`;
    if (fresh) r.scrollTop = 0;
    const f = r.querySelector('[autofocus]'); if (f && matchMedia('(pointer:fine)').matches) f.focus();
  }
  const needLogin = () => { if (!me) { go('login'); return true; } if (!prof) { go('nick'); return true; } return false; };

  const chipSel = (name, list, sel, cls = '') => `<div class="chips sochips">${list.map(v => `<label class="chip ${cls}"><input type="checkbox" name="${name}" value="${esc(v)}"${sel.includes(v) ? ' checked' : ''}><span>${esc(v)}</span></label>`).join('')}</div>`;

  const PAGES = {
    async login() {
      return `<div class="stack" style="gap:18px"><p class="about">Entre pra publicar relatos, comentar e curtir. Seu e-mail não aparece pra ninguém; no site aparece só o apelido.</p>
        ${CONF.google ? `<button class="btn fill" data-so="google">Entrar com Google</button><p class="kv" style="text-align:center;margin:0">ou receba um link por e-mail</p>` : ''}
        <form class="soform" data-form="magic"><label class="sofl">E-mail<input type="email" name="email" required autocomplete="email" placeholder="voce@email.com" autofocus></label><button class="btn${CONF.google ? '' : ' fill'}" type="submit">Enviar link de acesso</button></form>
        <p class="legal">Ao entrar você aceita os <button class="lnk" data-so="terms">termos de uso</button>. É preciso ter 18 anos ou mais.</p></div>`;
    },
    async nick() {
      return `<form class="soform" data-form="nick"><p class="about">${prof ? 'Edite como você aparece na comunidade.' : 'Escolha um apelido. É ele que aparece nos seus relatos e comentários.'}</p>
        <label class="sofl">Apelido<input name="nick" required minlength="3" maxlength="24" pattern="[a-z0-9_.]{3,24}" value="${esc(prof ? prof.nick : '')}" placeholder="ex.: grower_sp" autocapitalize="none" autocomplete="off" autofocus><small>3 a 24 caracteres: letras minúsculas, números, ponto e _</small></label>
        <label class="sofl">Bio (opcional)<textarea name="bio" maxlength="280" rows="3" placeholder="Ex.: indoor 80x80, LED 240 W, solo orgânico.">${esc(prof && prof.bio || '')}</textarea></label>
        <label class="socheck"><input type="checkbox" name="age" required${prof ? ' checked' : ''}> Tenho 18 anos ou mais e li os termos de uso.</label>
        <button class="btn fill" type="submit">Salvar</button></form>`;
    },
    async write(t) { return reportForm({ strain_id: t.arg, ctx: 'consumo', rating: 0, effects: [], aromas: [], body: '' }); },
    async edit(t) { const [r] = await api.reports({ id: +t.arg }); return r ? reportForm(r) : '<p class="sub">Relato não encontrado.</p>'; },
    async report(t) {
      const [r] = await api.reports({ id: +t.arg }); if (!r) return '<p class="sub">Esse relato não está mais disponível.</p>';
      const C = await api.comments(r.id), s = by[r.strain_id], own = me && r.user_id === me.id;
      t.data = r;
      return `${s ? `<button class="item sostrain" data-so="open" data-arg="${s.id}"><span class="im">${F.pic(s)}</span><span><b>${esc(s.n)}</b><small>Abrir ficha</small></span></button>` : ''}
        ${rcard(r, { full: true })}
        <div class="btns">${own ? `<button class="btn" data-so="edit" data-arg="${r.id}">Editar</button><button class="btn" data-so="delrep" data-arg="${r.id}">Apagar</button>` : `<button class="btn" data-so="profile" data-arg="${esc(r.nick || '')}">Ver perfil</button>${me ? `<button class="btn" data-so="flag" data-arg="r${r.id}">Denunciar</button>` : ''}`}</div>
        <div class="sec"><p class="h3">Comentários<small>${C.length}</small></p>
          <div class="socoms">${C.map(c => `<div class="socom${c.hidden ? ' hid' : ''}"><p><b>${esc(c.nick || 'anônimo')}</b><small>${ago(c.created_at)}</small></p><p>${esc(c.body)}</p>${me ? `<div class="soact">${c.user_id === me.id ? `<button class="lnk" data-so="delcom" data-arg="${c.id}">Apagar</button>` : `<button class="lnk" data-so="flag" data-arg="c${c.id}">Denunciar</button>`}</div>` : ''}</div>`).join('') || '<p class="sub">Nenhum comentário ainda.</p>'}</div>
          ${me ? `<form class="soform" data-form="comment" data-arg="${r.id}"><textarea name="body" required maxlength="1000" rows="2" placeholder="Escreva um comentário"></textarea><button class="btn fill" type="submit">Comentar</button></form>` : `<button class="btn" data-so="login">Entrar pra comentar</button>`}</div>`;
    },
    async strain(t) { const L = (await api.reports({ strain: t.arg })).filter(r => !r.hidden); const s = by[t.arg]; return `<p class="nm" style="font-size:26px">${esc(s.n)}</p><p class="sub">${L.length} ${L.length === 1 ? 'relato' : 'relatos'} · nota ${avgS(L)}</p><div class="solist">${L.map(r => rcard(r)).join('')}</div>`; },
    async feed() { const L = (await api.reports({ limit: 60 })).filter(r => !r.hidden); return `<p class="sub">Relatos mais recentes de toda a comunidade.</p><div class="solist">${L.map(r => rcard(r, { strain: true })).join('') || '<p class="sub">Nenhum relato ainda.</p>'}</div>`; },
    async profile(t) {
      const u = await api.userByNick(t.arg); if (!u) return '<p class="sub">Perfil não encontrado.</p>';
      const L = (await api.reports({ user: u.id })).filter(r => !r.hidden || (me && me.id === u.id));
      return `<div class="soprof"><span class="soav">${esc(u.nick[0].toUpperCase())}</span><div><p class="nm" style="font-size:24px">@${esc(u.nick)}</p><p class="sub">${L.length} ${L.length === 1 ? 'relato' : 'relatos'}${L.length ? ` · nota média dada ${avgS(L)}` : ''}</p></div></div>
        ${u.bio ? `<p class="about">${esc(u.bio)}</p>` : ''}
        ${prof && prof.is_admin && me.id !== u.id && !u.banned ? `<button class="btn" data-so="ban" data-arg="${u.id}">Bloquear usuário</button>` : ''}${u.banned ? '<p class="warn">Usuário bloqueado pela moderação.</p>' : ''}
        <div class="solist">${L.map(r => rcard(r, { strain: true })).join('')}</div>`;
    },
    async me() {
      if (!me) return PAGES.login();
      if (!prof) return PAGES.nick();
      return `<div class="soprof"><span class="soav">${esc(prof.nick[0].toUpperCase())}</span><div><p class="nm" style="font-size:24px">@${esc(prof.nick)}</p><p class="sub">${esc(me.email || '')}</p></div></div>
        <div class="stack" style="gap:10px"><button class="btn" data-so="profile" data-arg="${esc(prof.nick)}">Meus relatos</button><button class="btn" data-so="nick">Editar perfil</button>${prof.is_admin ? `<button class="btn" data-so="admin">Moderação</button>` : ''}<button class="btn" data-so="terms">Termos de uso</button><button class="btn" data-so="logout">Sair</button></div>`;
    },
    async flag(t) {
      return `<form class="soform" data-form="flag" data-arg="${esc(t.arg)}"><p class="about">Por que esse ${t.arg[0] === 'r' ? 'relato' : 'comentário'} deveria sair do ar?</p>
        <div class="soradio">${REASONS.map((x, i) => `<label class="chip"><input type="radio" name="reason" value="${x}"${i ? '' : ' required'}><span>${x[0].toUpperCase() + x.slice(1)}</span></label>`).join('')}</div>
        <label class="sofl">Detalhes (opcional)<textarea name="note" maxlength="500" rows="3"></textarea></label><button class="btn fill" type="submit">Enviar denúncia</button></form>`;
    },
    async admin() {
      if (!prof || !prof.is_admin) return '<p class="sub">Só moderadores.</p>';
      const L = await api.flags();
      return `<p class="sub">${L.length} ${L.length === 1 ? 'denúncia aberta' : 'denúncias abertas'}.</p>${L.map(f => { const x = f.reports || f.comments, kind = f.reports ? 'reports' : 'comments'; return `<div class="card" style="gap:10px"><p class="kv" style="margin:0">${esc(f.reason)} · por @${esc(f.profiles ? f.profiles.nick : '?')} · ${ago(f.created_at)}</p>${f.note ? `<p class="sub">${esc(f.note)}</p>` : ''}${x ? `<p class="about"><b>@${esc(x.profiles ? x.profiles.nick : '?')}</b>: ${esc(x.body)}</p>` : '<p class="sub">Conteúdo já apagado.</p>'}
        <div class="btns">${x ? `<button class="btn" data-so="hide" data-arg="${kind}:${x.id}:${x.hidden ? 0 : 1}:${f.id}">${x.hidden ? 'Reexibir' : 'Ocultar'}</button><button class="btn" data-so="ban" data-arg="${x.user_id}">Bloquear autor</button>` : ''}<button class="btn" data-so="resolve" data-arg="${f.id}">Arquivar</button></div></div>`; }).join('')}`;
    },
    async terms() {
      return `<div class="sotext">
        <p>O FenoSearch é um catálogo informativo e educativo sobre genética de cannabis. A comunidade existe pra troca de experiências sobre variedades: efeitos, aromas, cultivo e características.</p>
        <h4>Quem pode participar</h4><p>Só maiores de 18 anos. Ao criar a conta você declara ter 18 anos ou mais.</p>
        <h4>É proibido publicar</h4><ul><li>Oferta, pedido, venda, troca ou doação de cannabis, sementes, clones ou derivados.</li><li>Telefone, endereço, perfis de mensagem ou qualquer forma de contato pra negociação.</li><li>Incentivo ao uso por menores, ou a dirigir e operar máquinas sob efeito.</li><li>Ofensas, discriminação, assédio ou ameaças.</li><li>Dados pessoais de terceiros.</li><li>Promessa de cura ou indicação de tratamento. Relato pessoal não substitui orientação médica.</li><li>Spam e propaganda.</li></ul>
        <h4>Moderação</h4><p>Qualquer usuário pode denunciar um relato ou comentário. A moderação pode ocultar conteúdo e bloquear contas que violem estes termos, sem aviso prévio.</p>
        <h4>Responsabilidade</h4><p>Cada relato é de responsabilidade de quem o publicou e reflete uma experiência individual. Siga a legislação do seu país e da sua cidade.</p>
        <h4>Seus dados</h4><p>Guardamos e-mail, apelido, bio e o que você publica, só pra operar a comunidade. O e-mail não é exibido nem compartilhado. Ao apagar um relato ou comentário, ele sai do banco de dados. Pra excluir a conta inteira, use o contato do site.</p></div>`;
    },
  };

  function reportForm(r) {
    const s = by[r.strain_id], cul = r.ctx === 'cultivo';
    return `<form class="soform" data-form="report" data-arg="${r.id || ''}" data-sid="${r.strain_id}">
      <p class="nm" style="font-size:24px">${esc(s.n)}</p>
      <div class="seg" role="radiogroup"><label><input type="radio" name="ctx" value="consumo"${cul ? '' : ' checked'}><span>Consumo</span></label><label><input type="radio" name="ctx" value="cultivo"${cul ? ' checked' : ''}><span>Cultivo</span></label></div>
      <fieldset class="sofs"><legend>Nota</legend><div class="sorate">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="rating" value="${n}"${r.rating === n ? ' checked' : ''}${n === 1 ? ' required' : ''}><span aria-label="${n}">★</span></label>`).join('')}</div></fieldset>
      <fieldset class="sofs"><legend>Efeitos</legend>${chipSel('effects', EFF, r.effects)}<p class="kv" style="margin:6px 0 0">Indesejados</p>${chipSel('effects', ADV, r.effects, 'advc')}</fieldset>
      <fieldset class="sofs"><legend>Aroma e sabor</legend>${chipSel('aromas', ARO, r.aromas)}</fieldset>
      <fieldset class="sofs sogrowf"${cul ? '' : ' hidden'}><legend>Cultivo</legend><div class="sogrid">
        <label class="sofl">Floração (semanas)<input type="number" name="flower_weeks" min="4" max="20" step="0.5" value="${r.flower_weeks || ''}" inputmode="decimal"></label>
        <label class="sofl">Rendimento<span class="soyield"><input type="number" name="yield_g" min="0" step="1" value="${r.yield_g || ''}" inputmode="decimal"><select name="yield_unit"><option value="g/planta"${r.yield_unit !== 'g/m2' ? ' selected' : ''}>g/planta</option><option value="g/m2"${r.yield_unit === 'g/m2' ? ' selected' : ''}>g/m²</option></select></span></label>
        <label class="sofl">Dificuldade<select name="difficulty"><option value="">-</option>${DIFF.map(d => `<option${r.difficulty === d ? ' selected' : ''}>${d}</option>`).join('')}</select></label></div></fieldset>
      <label class="sofl">Relato<textarea name="body" required minlength="20" maxlength="4000" rows="6" placeholder="${cul ? 'Ambiente, substrato, iluminação, comportamento da planta, pragas, ponto de colheita…' : 'Início e duração do efeito, intensidade, forma de consumo, sabor…'}">${esc(r.body || '')}</textarea><small class="socount">${(r.body || '').length}/4000 · mínimo 20</small></label>
      <p class="warn">Não publique oferta, venda, troca ou contato. Relatos com isso são removidos.</p>
      <button class="btn fill" type="submit">${r.id ? 'Salvar alterações' : 'Publicar relato'}</button></form>`;
  }

  // ---------- eventos ----------
  async function act(a, arg, el) {
    if (a === 'back') return back();
    if (a === 'open') { closeO(); return F.open(arg); }
    if (a === 'login' || a === 'terms' || a === 'feed' || a === 'admin' || a === 'nick') return go(a);
    if (a === 'me') return go('me');
    if (a === 'report' || a === 'strain' || a === 'profile') return go(a, arg);
    if (a === 'write') { if (needLogin()) return; return go('write', arg); }
    if (a === 'edit') { if (needLogin()) return; return go('edit', arg); }
    if (a === 'flag') { if (needLogin()) return; return go('flag', arg); }
    if (a === 'google') { try { await api.google(); } catch (e) { F.toast('Não deu pra entrar com Google agora'); } return; }
    if (a === 'logout') { await api.signOut(); closeO(); F.toast('Você saiu da conta'); changed(); return; }
    if (a === 'like') {
      if (needLogin()) return;
      const on = el.getAttribute('aria-pressed') !== 'true', n = (+el.textContent || 0) + (on ? 1 : -1);
      el.setAttribute('aria-pressed', on); el.innerHTML = ICON.like + (n || '');
      try { await api.like(+arg, on); } catch (e) { F.toast('Não deu pra curtir agora'); }
      Object.keys(cache).forEach(k => delete cache[k]); recent = null; return;
    }
    if (a === 'delrep') { if (el.dataset.sure) { await api.delReport(+arg); F.toast('Relato apagado'); back(); changed(); } else { el.dataset.sure = 1; el.textContent = 'Toque de novo pra apagar'; } return; }
    if (a === 'delcom') { if (el.dataset.sure) { await api.delComment(+arg); paint(); changed(); } else { el.dataset.sure = 1; el.textContent = 'Confirmar'; } return; }
    if (a === 'hide') { const [k, id, v, fid] = arg.split(':'); await api.hide(k, +id, v === '1'); if (fid) await api.resolve(+fid); F.toast(v === '1' ? 'Conteúdo ocultado' : 'Conteúdo reexibido'); paint(); return; }
    if (a === 'ban') { if (el.dataset.sure) { await api.ban(arg); F.toast('Usuário bloqueado'); paint(); } else { el.dataset.sure = 1; el.textContent = 'Toque de novo pra bloquear'; } return; }
    if (a === 'resolve') { await api.resolve(+arg); paint(); return; }
  }
  function onClick(e) { const b = e.target.closest('[data-so]'); if (!b) return; e.preventDefault(); e.stopPropagation(); act(b.dataset.so, b.dataset.arg, b); }
  function onInput(e) {
    const f = e.target.form; if (!f) return;
    if (e.target.name === 'ctx') f.querySelector('.sogrowf').hidden = e.target.value !== 'cultivo';
    if (e.target.name === 'body' && f.dataset.form === 'report') f.querySelector('.socount').textContent = `${e.target.value.length}/4000 · mínimo 20`;
    if (e.target.name === 'nick') e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
  }
  async function onSubmit(e) {
    e.preventDefault();
    const f = e.target, fd = new FormData(f), btn = f.querySelector('[type=submit]'), kind = f.dataset.form;
    const busy = v => { btn.disabled = v; btn.style.opacity = v ? .5 : 1; };
    busy(true);
    try {
      if (kind === 'magic') { await api.magic(fd.get('email').trim()); if (MOCK) { closeO(); if (!prof) go('nick'); } else { f.outerHTML = `<div class="card"><p class="lead">Link enviado.</p><p class="sub">Abra o e-mail em ${esc(fd.get('email'))} neste mesmo aparelho e toque no link pra entrar.</p></div>`; } return; }
      if (kind === 'nick') { await api.saveProfile({ nick: fd.get('nick'), bio: fd.get('bio').trim() }); prof = await api.profile(me.id); F.toast('Perfil salvo'); stack.length = 0; closeO(); changed(); return; }
      if (kind === 'report') {
        const ctx = fd.get('ctx'), num = k => { const v = parseFloat(String(fd.get(k) || '').replace(',', '.')); return isFinite(v) ? v : null; };
        if (!fd.get('rating')) { F.toast('Dê uma nota de 1 a 5'); return; }
        const r = { strain_id: f.dataset.sid, ctx, rating: +fd.get('rating'), effects: fd.getAll('effects'), aromas: fd.getAll('aromas'), body: fd.get('body').trim(),
          flower_weeks: ctx === 'cultivo' ? num('flower_weeks') : null, yield_g: ctx === 'cultivo' ? num('yield_g') : null, yield_unit: ctx === 'cultivo' && num('yield_g') != null ? fd.get('yield_unit') : null, difficulty: ctx === 'cultivo' && fd.get('difficulty') || null };
        if (f.dataset.arg) r.id = +f.dataset.arg;
        await api.saveReport(r); F.toast(r.id ? 'Relato atualizado' : 'Relato publicado'); closeO(); changed(); return;
      }
      if (kind === 'comment') { await api.addComment(+f.dataset.arg, fd.get('body').trim()); changed(); return; }
      if (kind === 'flag') { const a = f.dataset.arg; await api.flag({ reason: fd.get('reason'), note: (fd.get('note') || '').trim() || null, report_id: a[0] === 'r' ? +a.slice(1) : null, comment_id: a[0] === 'c' ? +a.slice(1) : null }); F.toast('Denúncia enviada. Obrigado.'); back(); return; }
    } catch (err) { console.warn(err); F.toast(errMsg(err)); }
    finally { if (document.body.contains(btn)) busy(false); }
  }

  // cliques nos slots (dentro do app) e Esc
  document.addEventListener('click', e => { const b = e.target.closest('#soc [data-so], #sohome [data-so]'); if (!b) return; e.preventDefault(); e.stopPropagation(); act(b.dataset.so, b.dataset.arg, b); }, true);
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && stack.length) { e.stopImmediatePropagation(); back(); } }, true);

  window.FS = {
    slot: id => `<div class="sec" id="soc" data-sid="${id}">${slotInner(id)}</div>`,
    home: () => `<div class="sec" id="sohome">${homeInner()}</div>`,
    ready,
  };
  F.refresh();
})();
