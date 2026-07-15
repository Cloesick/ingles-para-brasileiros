/* ============================================================
   Inglês! · Curso de inglês para brasileiros
   Vanilla JS SPA · sem dependências · dados em data/lessons/*.json
   ============================================================ */
'use strict';

/* ---------- word roles: the color bridge between EN and PT ---------- */
const ROLES = {
  qw:   { label: 'palavra de pergunta', emoji: '❓', sample: ['What', 'Qual'] },
  verb: { label: 'verbo',               emoji: '⚙️', sample: ['is', 'é'] },
  noun: { label: 'substantivo',         emoji: '📦', sample: ['name', 'nome'] },
  art:  { label: 'artigo',              emoji: '🏷️', sample: ['the', 'o'] },
  pron: { label: 'pronome',             emoji: '👤', sample: ['him', 'dele'] },
  prep: { label: 'preposição',          emoji: '🔗', sample: ['of', 'de'] },
  adj:  { label: 'adjetivo',            emoji: '🎨', sample: ['big', 'grande'] },
  adv:  { label: 'advérbio',            emoji: '💨', sample: ['tomorrow', 'amanhã'] },
  neg:  { label: 'negação',             emoji: '🚫', sample: ['not', 'não'] },
  num:  { label: 'número',              emoji: '🔢', sample: ['two', 'dois'] },
  conj: { label: 'conjunção',           emoji: '🌉', sample: ['because', 'porque'] },
  part: { label: 'partícula separável', emoji: '✂️', sample: ['up', '(up)'] },
  punc: { label: 'pontuação',           emoji: '·',  sample: ['?', '?'] },
  x:    { label: 'outro',               emoji: '·',  sample: ['-', '-'] },
};

const UNIT_COLORS = { A1:'#2E7D32', A2:'#558B2F', B1:'#F9A825', B2:'#EF6C00', C1:'#C62828', C2:'#6A1B9A' };
const UNIT_INFO = {
  A1:{ name:'Sobrevivência', emoji:'🌱' }, A2:{ name:'Autonomia', emoji:'⭐' },
  B1:{ name:'Independência', emoji:'🌳' }, B2:{ name:'Fluência', emoji:'🚀' },
  C1:{ name:'Proficiência', emoji:'🎓' }, C2:{ name:'Maestria', emoji:'👑' },
};
const SRS_DAYS = [0, 0, 1, 3, 7, 21]; // index = box (1..5)
const STORE_KEY = 'nlcurso.v1';

/* ---------- clock emojis: visualize the hour (our edge over Babbel/Duolingo) ---------- */
const HOUR_EMOJI = { // 1..12 o'clock + half hours
  '1':'🕐','2':'🕑','3':'🕒','4':'🕓','5':'🕔','6':'🕕','7':'🕖','8':'🕗','9':'🕘','10':'🕙','11':'🕚','12':'🕛','0':'🕛',
  '1.5':'🕜','2.5':'🕝','3.5':'🕞','4.5':'🕟','5.5':'🕠','6.5':'🕡','7.5':'🕢','8.5':'🕣','9.5':'🕤','10.5':'🕥','11.5':'🕦','12.5':'🕧',
};
function hourEmoji(h, half) { return HOUR_EMOJI[half ? (((h % 12) || 12) + '.5') : String(((h % 12) || 12))] || '🕐'; }
// decorate any "HH:MM" or "half X" mention in text with the matching clock emoji
function clockify(text) {
  return String(text || '')
    .replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g, (m, h, mi) => {
      const hh = +h, half = mi === '30';
      return `${m} ${hourEmoji(half ? hh : hh, half)}`;
    })
    .replace(/\bhalf\s+(een|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|elf|twaalf)\b/gi, (m, w) => {
      const map = { een:1,twee:2,drie:3,vier:4,vijf:5,zes:6,zeven:7,acht:8,negen:9,tien:10,elf:11,twaalf:12 };
      const target = map[w.toLowerCase()]; // "half drie" = 2:30 -> clock at 2.5
      return `${m} ${hourEmoji(target - 1, true)}`;
    });
}

/* ---------- state ---------- */
let S = load();
function load() {
  try { return Object.assign({ xp:0, streak:{last:'',count:0}, lessons:{}, srs:{}, mistakes:{}, premium:false, deviceId:'' },
    JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); }
  catch { return { xp:0, streak:{last:'',count:0}, lessons:{}, srs:{}, mistakes:{}, premium:false, deviceId:'' }; }
}

/* ---------- premium: device id + entitlement check (see api/premium-status.js) ---------- */
function deviceId() {
  if (!S.deviceId) {
    S.deviceId = (window.crypto && crypto.randomUUID)
      ? 'd_' + crypto.randomUUID()
      : 'd_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    save();
  }
  return S.deviceId;
}
async function checkPremiumStatus() {
  if (!window.NL_CONFIG || !window.NL_CONFIG.PREMIUM_ENABLED) return;
  try {
    const r = await fetch('/api/premium-status?device=' + encodeURIComponent(deviceId()));
    const d = await r.json();
    if (S.premium !== !!d.premium) { S.premium = !!d.premium; save(); }
  } catch { /* offline or api not ready: keep last known state */ }
}
function isPremium() { return !!S.premium; }

/* ---------- cookie consent (Google Consent Mode v2) ---------- */
// "Basic" Consent Mode: we simply don't load gtag.js/adsbygoogle.js at all until the visitor
// makes a choice. Non-personalized ads don't legally require consent (Google's EU User Consent
// Policy), so they load for any choice that isn't a full opt-out; GA4 and ad personalization only
// ever load if explicitly granted. consent-init.js already pushed the safe 'denied' default before
// this file runs, so nothing reaches Google before a choice is made either way.
const CONSENT_KEY = 'nlcurso.consent.v1';
function getConsent() {
  try { return JSON.parse(localStorage.getItem(CONSENT_KEY)); } catch { return null; }
}
function saveConsent(c) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ ...c, ts: Date.now() }));
}
function applyConsent(c) {
  gtag('consent', 'update', {
    ad_storage: c.ads ? 'granted' : 'denied',
    ad_user_data: c.ads ? 'granted' : 'denied',
    ad_personalization: c.ads ? 'granted' : 'denied',
    analytics_storage: c.analytics ? 'granted' : 'denied',
  });
  if (c.analytics) initGA4();
  initAdsense(c.ads); // non-personalized ads load regardless; c.ads only controls personalization
}
function consentBannerHTML(prefill) {
  const p = prefill || { analytics: true, ads: true };
  return `<div class="consent-banner" id="consentBanner">
    <div class="consent-card">
      <p>🍪 Usamos cookies opcionais para <b>estatísticas de uso (Google Analytics)</b> e
      <b>anúncios personalizados</b>, além de anúncios não-personalizados (que não exigem consentimento).
      Seu progresso no curso nunca sai do seu aparelho. Veja a <a href="privacy.html" target="_blank" rel="noopener">política de privacidade</a>.</p>
      <div class="consent-toggles" id="consentToggles" hidden>
        <label><input type="checkbox" id="ctAnalytics" ${p.analytics ? 'checked' : ''}> 📊 Estatísticas de uso (Google Analytics)</label>
        <label><input type="checkbox" id="ctAds" ${p.ads ? 'checked' : ''}> 🎯 Anúncios personalizados</label>
      </div>
      <div class="consent-actions">
        <button class="btn" id="ctCustomize">⚙️ Personalizar</button>
        <button class="btn" id="ctRejectAll">🚫 Só o essencial</button>
        <button class="btn primary" id="ctAcceptAll">✅ Aceitar tudo</button>
      </div>
    </div>
  </div>`;
}
function showConsentBanner() {
  const old = document.getElementById('consentBanner');
  if (old) old.remove();
  const prefill = getConsent() || undefined;
  document.body.insertAdjacentHTML('beforeend', consentBannerHTML(prefill));
  const banner = document.getElementById('consentBanner');
  document.getElementById('ctCustomize').addEventListener('click', () => {
    document.getElementById('consentToggles').hidden = false;
  });
  document.getElementById('ctRejectAll').addEventListener('click', () => {
    saveConsent({ analytics: false, ads: false }); location.reload();
  });
  document.getElementById('ctAcceptAll').addEventListener('click', () => {
    saveConsent({ analytics: true, ads: true }); location.reload();
  });
  banner.querySelector('.consent-toggles').insertAdjacentHTML('beforeend',
    '<button class="btn small" id="ctSave">💾 Salvar preferências</button>');
  document.getElementById('ctSave').addEventListener('click', () => {
    saveConsent({
      analytics: document.getElementById('ctAnalytics').checked,
      ads: document.getElementById('ctAds').checked,
    });
    location.reload();
  });
}
function initConsent() {
  const c = getConsent();
  if (c) applyConsent(c);
  else showConsentBanner();
  const link = document.getElementById('cookiePrefsBtn');
  if (link) link.addEventListener('click', showConsentBanner);
}

/* ---------- Google Analytics 4 ---------- */
function initGA4() {
  const cfg = window.NL_CONFIG;
  if (!cfg || !cfg.GA4_MEASUREMENT_ID || document.getElementById('ga4Script')) return;
  const s = document.createElement('script');
  s.id = 'ga4Script'; s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.GA4_MEASUREMENT_ID);
  document.head.appendChild(s);
  gtag('js', new Date());
  gtag('config', cfg.GA4_MEASUREMENT_ID);
}

/* ---------- AdSense: non-personalized always eligible, personalized only if consented ---------- */
function initAdsense(personalized) {
  const cfg = window.NL_CONFIG;
  if (!cfg || !cfg.ADSENSE_CLIENT || !cfg.ADSENSE_SLOT) return; // both required or we render nothing
  window.adsbygoogle = window.adsbygoogle || [];
  // Belt-and-suspenders alongside Consent Mode: explicit flag AdSense also respects directly.
  window.adsbygoogle.requestNonPersonalizedAds = personalized ? 0 : 1;
  if (document.getElementById('adsenseScript')) return;
  const s = document.createElement('script');
  s.id = 'adsenseScript'; s.async = true;
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(cfg.ADSENSE_CLIENT);
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}
function adSlotHTML(id) {
  const cfg = window.NL_CONFIG;
  if (isPremium() || !cfg || !cfg.ADSENSE_CLIENT) return '';
  if (!cfg.ADSENSE_SLOT) {
    return `<div class="ad-slot" id="${id}"><small class="muted">📢 espaço reservado ·
      <a href="#/premium">remova anúncios com o Premium ⭐</a></small></div>`;
  }
  return `<div class="ad-slot" id="${id}">
    <ins class="adsbygoogle" style="display:block" data-ad-client="${esc(cfg.ADSENSE_CLIENT)}"
      data-ad-slot="${esc(cfg.ADSENSE_SLOT)}" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <small class="muted"><a href="#/premium">remova anúncios com o Premium ⭐</a></small></div>`;
}
/* Each <ins class="adsbygoogle"> needs its own push() call once inserted into the DOM. */
function pushAds(root) {
  const cfg = window.NL_CONFIG;
  if (!cfg || !cfg.ADSENSE_SLOT) return;
  root.querySelectorAll('ins.adsbygoogle:not([data-ad-status])').forEach(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* blocked by adblock etc. */ }
  });
}
/* ---------- mistakes quicklist: every wrong answer gets extra attention ---------- */
// Mistakes cost a little XP (more on repeats, capped so a bad run can't spiral), floored at 0 so
// XP itself never goes negative. Clearing a mistake pays some of it back - more for a verified
// correct recall in the drill below than for the self-reported shortcut, since actual retrieval
// practice is the thing that's supposed to fix the gap.
function recordMistake(m) {
  const key = m.lesson + '|' + norm(m.q || m.answer || Math.random());
  const prev = S.mistakes[key];
  const count = (prev ? prev.count : 0) + 1;
  S.mistakes[key] = { ...m, key, count, ts: Date.now() };
  const penalty = Math.min(2 + (count - 1), 6);
  const before = S.xp;
  S.xp = Math.max(0, S.xp - penalty);
  save(); updateMistakeBadge();
  const lost = before - S.xp;
  if (lost > 0) toast(`-${lost} ⚡ · revise em 🎯 Dificuldades`);
}
function clearMistake(key, reward) {
  delete S.mistakes[key];
  if (reward) S.xp += reward;
  save(); updateMistakeBadge();
  if (reward) toast(`+${reward} ⚡ · dificuldade superada!`);
}
function mistakeList() { return Object.values(S.mistakes).sort((a, b) => b.count - a.count || b.ts - a.ts); }
function updateMistakeBadge() {
  const n = mistakeList().length, b = document.getElementById('mistakeBadge');
  if (b) { b.hidden = n === 0; b.textContent = n; }
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(S)); paintStats(); }
function today() { return new Date().toISOString().slice(0,10); }
function touchStreak() {
  const t = today();
  if (S.streak.last === t) return;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0,10);
  S.streak.count = (S.streak.last === y) ? S.streak.count + 1 : 1;
  S.streak.last = t;
}
function addXP(n) { S.xp += n; save(); toast(`+${n} ⚡`); }

/* ---------- data ---------- */
let MANIFEST = null;
const CACHE = {};
async function manifest() {
  if (!MANIFEST) MANIFEST = await (await fetch('data/lessons/index.json')).json();
  return MANIFEST;
}
async function lesson(id) {
  if (!CACHE[id]) CACHE[id] = await (await fetch(`data/lessons/${id}.json`)).json();
  return CACHE[id];
}

/* ---------- tts ---------- */
const hasTTS = 'speechSynthesis' in window;
let SPEAKING_BTN = null;
// btn is optional: when passed, it gets a `.speaking` pulse for the duration of playback - real
// visual confirmation the pronunciation audio is actually running (useful on silent/muted devices,
// and just makes a text-to-speech button feel like a real instrument instead of a static icon).
function speak(text, btn) {
  if (!hasTTS) return;
  speechSynthesis.cancel();
  if (SPEAKING_BTN) { SPEAKING_BTN.classList.remove('speaking'); SPEAKING_BTN = null; }
  const u = new SpeechSynthesisUtterance(text.replace(/[🔊▶️]/g,''));
  const voices = speechSynthesis.getVoices();
  const v = voices.find(v => /^en-GB/i.test(v.lang))
        || voices.find(v => /^en/i.test(v.lang));
  if (v) u.voice = v;
  u.lang = (v && v.lang) || 'en-GB';
  u.rate = 0.88;
  if (btn) {
    btn.classList.add('speaking');
    SPEAKING_BTN = btn;
    u.onend = u.onerror = () => { btn.classList.remove('speaking'); if (SPEAKING_BTN === btn) SPEAKING_BTN = null; };
  }
  speechSynthesis.speak(u);
}
if (hasTTS) speechSynthesis.getVoices(); // warm up voice list

/* ---------- utils ---------- */
const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function norm(s) {
  return String(s || '').toLowerCase().trim().replace(/\s+/g,' ')
    .replace(/[.!?,;:]+$/,'').normalize('NFD').replace(/[̀-ͯ]/g,'');
}
function shuffle(a) { a = a.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, 1800);
}
function paintStats() {
  $('#xpStat').textContent = S.xp;
  $('#streakStat').textContent = S.streak.count;
  const pn = document.getElementById('premiumNav');
  if (pn) { pn.textContent = isPremium() ? '🏆' : '⭐'; pn.title = isPremium() ? 'Você é Premium!' : 'Inglês! Premium'; }
}
function lessonProgress(id, exCount) {
  const st = S.lessons[id];
  if (!st) return 0;
  if (st.done) return 100;
  return Math.min(99, Math.round(100 * (st.seen || 0) / Math.max(1, exCount)));
}

/* ---------- aligned phrase renderer (the bridge) ---------- */
function tokHTML(tokens, phraseId, side) {
  return tokens.map((tk, i) =>
    `<span class="tok r-${esc(tk.r || 'x')}" data-p="${phraseId}" data-r="${esc(tk.r || 'x')}"
      title="${esc((ROLES[tk.r] || ROLES.x).emoji + ' ' + (ROLES[tk.r] || ROLES.x).label)}">${esc(tk.t)}</span>`
  ).join(' ');
}
function phraseHTML(ph, idx) {
  const nl = ph.nl.map(t => t.t).join(' ').replace(/ ([?.!,])/g, '$1');
  return `<div class="phrase" data-idx="${idx}">
    <div class="row"><span class="flag">🇬🇧</span><span>${tokHTML(ph.nl, idx, 'nl')}</span>
      ${hasTTS ? `<button class="speak-btn speak" data-say="${esc(nl)}" title="Ouvir">🔊</button>` : ''}</div>
    <div class="row"><span class="flag">🇧🇷</span><span>${tokHTML(ph.pt, idx, 'pt')}</span></div>
    ${ph.lit ? `<div class="lit">🔍 literal: ${esc(clockify(ph.lit))}</div>` : ''}
    ${ph.note ? `<div class="note">💡 ${esc(clockify(ph.note))}</div>` : ''}
  </div>`;
}
function bindPhraseEvents(root) {
  root.querySelectorAll('.tok').forEach(el => {
    el.addEventListener('click', () => {
      const on = el.classList.contains('hl');
      root.querySelectorAll('.tok.hl').forEach(t => t.classList.remove('hl'));
      if (!on) root.querySelectorAll(`.tok[data-p="${el.dataset.p}"][data-r="${el.dataset.r}"]`)
        .forEach(t => t.classList.add('hl'));
    });
  });
  root.querySelectorAll('.speak').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); speak(b.dataset.say, b); }));
}
function legendStrip(phrases) {
  const used = new Set();
  phrases.forEach(p => [...p.nl, ...p.pt].forEach(t => { if (t.r && t.r !== 'punc' && t.r !== 'x') used.add(t.r); }));
  return `<div class="legend-strip">${[...used].map(r =>
    `<span><span class="r-${r}">${ROLES[r].emoji} ${ROLES[r].label}</span></span>`).join('')}
    <span><a href="#/legenda">🎨 legenda completa</a></span></div>`;
}

/* ---------- cross-app switcher: jump between all sibling courses ---------- */
function initSwitcher() {
  const btn = document.getElementById('switcherBtn');
  const menu = document.getElementById('switcherMenu');
  if (!btn || !menu) return;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    btn.setAttribute('aria-expanded', String(willOpen));
  });
  menu.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
}

/* ---------- router ---------- */
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', () => { paintStats(); route(); updateDueBadge(); updateMistakeBadge(); checkPremiumStatus(); initConsent(); initSwitcher(); });

async function route() {
  const app = $('#app');
  const hFull = location.hash.replace(/^#\/?/, '');
  const h = hFull.split('?')[0];
  const qs = new URLSearchParams(hFull.split('?')[1] || '');
  try {
    if (h === '' || h === '/') return renderHome(app);
    if (h === 'legenda') return renderLegend(app);
    if (h === 'revisao') return renderReview(app);
    if (h === 'woordenboek') return renderWoordenboek(app);
    if (h === 'dificuldades') return renderMistakes(app);
    if (h === 'premium') return renderPremium(app, qs);
    const mn = h.match(/^nivel\/([A-C][12])$/i);
    if (mn) return renderLevel(app, mn[1].toUpperCase());
    const m = h.match(/^les\/([\w-]+)(\/praticar)?$/);
    if (m) return renderLesson(app, m[1], !!m[2]);
    renderHome(app);
  } catch (e) {
    app.innerHTML = `<div class="card">😵 Erro ao carregar: ${esc(e.message)}<br>
      <a href="#/">← voltar ao início</a></div>`;
  }
}

/* ---------- home ---------- */
async function renderHome(app) {
  const man = await manifest();
  const units = {};
  man.lessons.forEach(l => (units[l.unit] = units[l.unit] || []).push(l));
  const next = man.lessons.find(l => !(S.lessons[l.id] && S.lessons[l.id].done));
  const dailyHTML = await dailyWidgetHTML();
  app.innerHTML = `
  <div class="hero">
    <h1>🧇 Inglês! O curso de inglês para brasileiros 🇧🇷→🇬🇧</h1>
    <p class="muted">Lições com <b>frases alinhadas por cores</b> 🎨 (mesmo tipo de palavra = mesmo estilo nas duas línguas),
    exercícios estilo Babbel 🏋️, flashcards inteligentes 🃏 e áudio 🔊.</p>
    ${next ? `<a class="btn primary" href="#/les/${next.id}">▶️ Continuar: ${next.emoji} ${esc(next.title)}</a>` : '<p>🏆 Curso completo!</p>'}
    ${dailyHTML}
    <p class="muted" style="margin:.6em 0 .2em"><b>👉 Escolha um nível</b> para ver TUDO dele (lições, frases e vocabulário):</p>
    <div class="level-picker">${['A1','A2','B1','B2','C1','C2'].map(u =>
      `<a class="level-btn" href="#/nivel/${u}" style="background:${UNIT_COLORS[u]}">${u}<small>${UNIT_INFO[u].emoji} ${UNIT_INFO[u].name}</small></a>`).join('')}</div>
  </div>
  ${adSlotHTML('adHome')}
  <div class="home-tiles">
    <a class="home-tile" href="#/woordenboek">🔎<b>Woordenboek</b><small>dicionário</small></a>
    <a class="home-tile" href="#/dificuldades">🎯<b>Dificuldades</b><small>seus erros, juntos</small></a>
    <a class="home-tile" href="#/revisao">🧠<b>Revisão</b><small>repetição espaçada</small></a>
  </div>
  ${Object.entries(units).map(([u, ls]) => `
    <div class="unit-head"><span class="unit-badge" style="background:${UNIT_COLORS[u] || '#555'}">${u}</span>
      <h2 style="margin:0;font-size:1.2rem">${unitTitle(u)}</h2></div>
    <div class="lesson-grid">${ls.map(l => {
      const pct = lessonProgress(l.id, l.exercises || 10);
      return `<a class="lesson-card" href="#/les/${l.id}">
        <span class="em">${l.emoji}</span><h3>${esc(l.title)}</h3>
        <span class="pct">${l.phrases || 0} frases · ${l.exercises || 0} exercícios ${pct === 100 ? '· ✅' : ''}</span>
        <div class="progressbar"><div style="width:${pct}%"></div></div></a>`;
    }).join('')}</div>`).join('')}`;
  const daily = app.querySelector('.daily-card');
  if (daily) {
    bindPhraseEvents(daily);
    daily.querySelectorAll('.speak,.dspeak').forEach(b => b.addEventListener('click', () => speak(b.dataset.say, b)));
  }
  pushAds(app);
}
function unitTitle(u) {
  return { A1:'Sobrevivência 🌱', A2:'Autonomia básica ⭐', B1:'Independência 🌳',
           B2:'Fluência funcional 🚀', C1:'Proficiência 🎓', C2:'Maestria 👑' }[u] || u;
}

/* ---------- lesson ---------- */
async function renderLesson(app, id, practice) {
  const L = await lesson(id);
  const tab = practice ? 'pr' : (renderLesson._tab === id + 'fc' ? 'fc' : 'ap');
  app.innerHTML = `
    <div class="crumb"><a href="#/">🏠 Início</a> › ${L.unit}</div>
    <div class="lesson-top"><span class="em">${L.emoji}</span>
      <div><h1 style="margin:0;font-size:1.5rem">${esc(L.title)}</h1>
      <span class="pill" style="background:${UNIT_COLORS[L.unit]};color:#fff">${L.unit}</span></div></div>
    <div class="tabs">
      <button class="tab ${tab==='ap'?'active':''}" data-t="ap">📖 Aprender</button>
      <button class="tab ${tab==='pr'?'active':''}" data-t="pr">🏋️ Praticar (${L.exercises.length})</button>
      <button class="tab ${tab==='fc'?'active':''}" data-t="fc">🃏 Flashcards (${L.vocab.length})</button>
    </div>
    <div id="tabBody"></div>`;
  app.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
    app.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    renderLesson._tab = b.dataset.t === 'fc' ? id + 'fc' : '';
    showTab(b.dataset.t, L);
  }));
  showTab(tab, L);
}

function showTab(t, L) {
  const body = $('#tabBody');
  if (t === 'ap') {
    body.innerHTML = `
      ${(L.teaching || []).map(c => `<div class="card"><h3>${c.emoji || '📌'} ${esc(c.title)}</h3>${c.html}</div>`).join('')}
      ${L.infographic ? `<img class="infographic" src="${esc(L.infographic)}" alt="Infográfico da lição" loading="lazy">` : ''}
      <h2 style="margin-top:22px">🎨 Frases-ponte <small class="muted" style="font-size:.85rem">(toque numa palavra para ver o par dela!)</small></h2>
      ${legendStrip(L.phrases)}
      ${L.phrases.map((p, i) => phraseHTML(p, i)).join('')}
      <h2 style="margin-top:22px">🧩 Vocabulário com quebra de palavras</h2>
      <table class="vocab"><tr><th></th><th>palavra</th><th>quebra 🧩</th><th>português</th></tr>
      ${L.vocab.map(v => `<tr>
        <td>${v.art ? `<span class="pill art-${v.art}">${v.art}</span>` : ''}</td>
        <td class="v-nl">${esc(v.nl)} ${hasTTS ? `<button class="speak-btn speak" data-say="${esc(v.nl)}">🔊</button>` : ''}</td>
        <td class="v-split">${esc(v.split || '')}</td>
        <td>${v.emoji || ''} ${esc(v.pt)}</td></tr>`).join('')}</table>
      <div id="socialCard"></div>
      ${adSlotHTML('adLesson')}
      <p class="center"><button class="btn primary" id="goPractice">🏋️ Praticar agora →</button></p>`;
    bindPhraseEvents(body);
    body.querySelectorAll('.speak').forEach(b => b.addEventListener('click', () => speak(b.dataset.say, b)));
    pushAds(body);
    $('#goPractice').addEventListener('click', () => {
      body.closest('#app').querySelector('[data-t="pr"]').click();
    });
    fillSocialCard(L.id);
  }
  if (t === 'pr') runExercises(body, L);
  if (t === 'fc') runFlashcards(body, L, L.vocab.map(v => ({ ...v, key: L.id + '|' + v.nl })));
}

/* ---------- turn any exercise into a reviewable mistake card ---------- */
function mistakeFromEx(ex, L) {
  const base = { lesson: L.id, lessonTitle: L.title, lessonEmoji: L.emoji, unit: L.unit, type: ex.type };
  if (ex.type === 'mc')     return { ...base, q: ex.q, nl: ex.options[ex.answer], pt: ex.q, answer: ex.options[ex.answer] };
  if (ex.type === 'listen') return { ...base, q: 'Ouça: ' + ex.nl, nl: ex.nl, pt: ex.options[ex.answer], answer: ex.nl };
  if (ex.type === 'fill')   return { ...base, q: `${ex.before} ___ ${ex.after || ''}`, nl: ex.answer, pt: ex.hint || '', answer: ex.answer };
  if (ex.type === 'order')  return { ...base, q: ex.pt, nl: ex.answer, pt: ex.pt, answer: ex.answer };
  if (ex.type === 'match')  return { ...base, q: 'Pares: ' + ex.pairs.map(p => p[0]).join(', '), nl: ex.pairs.map(p => p[0]).join(' · '), pt: ex.pairs.map(p => p[1]).join(' · '), answer: ex.pairs.map(p => p[0] + '=' + p[1]).join(', ') };
  return { ...base, q: '(exercício)', nl: '', pt: '', answer: '' };
}

/* ---------- exercise runner ---------- */
function runExercises(body, L) {
  const exs = L.exercises;
  let i = 0, score = 0, firstTry = true;
  const st = S.lessons[L.id] = S.lessons[L.id] || {};

  function header() {
    return `<div class="ex-progress"><a href="#/les/${L.id}" class="btn small">✖</a>
      <div class="progressbar"><div style="width:${Math.round(100 * i / exs.length)}%"></div></div>
      <b>${i + 1}/${exs.length}</b></div>`;
  }
  function next() {
    if (!firstTry) recordMistake(mistakeFromEx(exs[i], L)); // stumbled -> quicklist
    i++; st.seen = Math.max(st.seen || 0, i); save();
    firstTry = true;
    i < exs.length ? show() : end();
  }
  function feedback(ok, explain, answerText) {
    const el = document.createElement('div');
    el.className = 'feedback ' + (ok ? 'ok' : 'bad');
    el.innerHTML = (ok ? '✅ Juist! (Certo!)' : `❌ Quase! Resposta: <b>${esc(answerText || '')}</b>`) +
      (explain ? `<small>💡 ${esc(explain)}</small>` : '');
    body.querySelector('.exwrap').appendChild(el);
    const nav = document.createElement('div');
    nav.className = 'ex-nav';
    nav.innerHTML = `<button class="btn primary">Continuar →</button>`;
    nav.querySelector('button').addEventListener('click', next);
    body.querySelector('.exwrap').appendChild(nav);
    if (ok) { score += firstTry ? 1 : 0.5; addXP(firstTry ? 10 : 4); }
  }
  function lock() { body.querySelectorAll('.opt,.chip,.fill-input,#chk').forEach(x => x.disabled = true); }

  function show() {
    const ex = exs[i];
    let inner = '';
    if (ex.type === 'mc') inner = `
      <p class="ex-q">🤔 ${esc(ex.q)}</p>
      <div class="options">${ex.options.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join('')}</div>`;
    if (ex.type === 'listen') inner = `
      <p class="ex-q">🎧 Ouça e escolha o significado:</p>
      <p class="center"><button class="big-audio" id="play">▶️</button></p>
      <div class="options">${ex.options.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join('')}</div>`;
    if (ex.type === 'fill') inner = `
      <p class="ex-q">✍️ Complete: ${esc(ex.before)} <b>___</b> ${esc(ex.after || '')}</p>
      ${ex.hint ? `<p class="muted">💭 dica: ${esc(ex.hint)}</p>` : ''}
      <p><input class="fill-input" id="fin" autocomplete="off" autocapitalize="off" placeholder="digite em inglês...">
      <button class="btn" id="chk">Verificar ✓</button></p>`;
    if (ex.type === 'order') inner = `
      <p class="ex-q">🧱 Monte a frase: <span class="muted">"${esc(ex.pt)}"</span></p>
      <div class="built" id="built"></div>
      <div class="chips" id="chips">${shuffle(ex.tokens.map((t, k) => ({ t, k }))).map(o =>
        `<button class="chip" data-k="${o.k}">${esc(o.t)}</button>`).join('')}</div>
      <button class="btn small" id="undo">↩️ desfazer</button>`;
    if (ex.type === 'match') inner = `
      <p class="ex-q">🔗 Ligue os pares:</p>
      <div class="match-grid">
        <div class="match-col" id="mleft">${shuffle(ex.pairs.map((p, k) => ({ t: p[0], k }))).map(o =>
          `<button class="mitem" data-k="${o.k}">🇬🇧 ${esc(o.t)}</button>`).join('')}</div>
        <div class="match-col" id="mright">${shuffle(ex.pairs.map((p, k) => ({ t: p[1], k }))).map(o =>
          `<button class="mitem" data-k="${o.k}">🇧🇷 ${esc(o.t)}</button>`).join('')}</div>
      </div>`;
    body.innerHTML = header() + `<div class="card exwrap">${inner}</div>`;

    if (ex.type === 'mc' || ex.type === 'listen') {
      if (ex.type === 'listen') { const p = $('#play'); p.addEventListener('click', () => speak(ex.nl, p)); setTimeout(() => speak(ex.nl, p), 300); }
      body.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
        const ok = +b.dataset.k === ex.answer;
        if (ok) { b.classList.add('correct'); lock(); feedback(true, ex.explain); }
        else { b.classList.add('wrong'); b.disabled = true; if (firstTry) { firstTry = false; }
          else { lock(); body.querySelector(`.opt[data-k="${ex.answer}"]`).classList.add('correct');
            feedback(false, ex.explain, ex.options[ex.answer]); } }
      }));
    }
    if (ex.type === 'fill') {
      const check = () => {
        const val = norm($('#fin').value);
        const ok = [ex.answer, ...(ex.alt || [])].some(a => norm(a) === val);
        $('#fin').classList.add(ok ? 'correct' : 'wrong');
        if (ok) { lock(); feedback(true, ex.explain); }
        else if (firstTry) { firstTry = false; toast('🤏 Tente mais uma vez!'); $('#fin').addEventListener('input', () => $('#fin').classList.remove('wrong'), { once: true }); }
        else { lock(); feedback(false, ex.explain, ex.answer); }
      };
      $('#chk').addEventListener('click', check);
      $('#fin').addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
      $('#fin').focus();
    }
    if (ex.type === 'order') {
      const picked = [];
      $('#chips').addEventListener('click', e => {
        const c = e.target.closest('.chip'); if (!c || c.disabled) return;
        c.disabled = true; picked.push(c);
        $('#built').innerHTML = picked.map(p => `<span class="chip">${p.textContent}</span>`).join('');
        if (picked.length === ex.tokens.length) {
          const made = picked.map(p => p.textContent).join(' ');
          const ok = [ex.answer, ...(ex.altAnswers || [])].some(a => norm(made) === norm(a));
          lock();
          ok ? feedback(true, ex.explain) : feedback(false, ex.explain, ex.answer);
        }
      });
      $('#undo').addEventListener('click', () => {
        const c = picked.pop(); if (c) c.disabled = false;
        $('#built').innerHTML = picked.map(p => `<span class="chip">${p.textContent}</span>`).join('');
      });
    }
    if (ex.type === 'match') {
      let selL = null, doneCount = 0;
      const cols = { l: $('#mleft'), r: $('#mright') };
      cols.l.addEventListener('click', e => {
        const it = e.target.closest('.mitem'); if (!it || it.classList.contains('done')) return;
        cols.l.querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
        it.classList.add('sel'); selL = it;
      });
      cols.r.addEventListener('click', e => {
        const it = e.target.closest('.mitem'); if (!it || !selL || it.classList.contains('done')) return;
        if (it.dataset.k === selL.dataset.k) {
          it.classList.add('done'); selL.classList.add('done'); selL.classList.remove('sel'); selL = null;
          if (++doneCount === ex.pairs.length) feedback(true, ex.explain);
        } else { firstTry = false; it.classList.add('flash'); setTimeout(() => it.classList.remove('flash'), 500); }
      });
    }
  }

  function end() {
    const pct = Math.round(100 * score / exs.length);
    st.done = true; st.best = Math.max(st.best || 0, pct);
    touchStreak(); save(); updateDueBadge();
    const em = pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '💪' : '🌱';
    body.innerHTML = `<div class="card endscreen">
      <div class="big">${em}</div>
      <h2>${pct}% · ${pct >= 70 ? 'Goed gedaan! (Mandou bem!)' : 'Blijven oefenen! (Continue treinando!)'}</h2>
      <p class="muted">🔥 sequência: ${S.streak.count} dia(s) · ⚡ ${S.xp} XP total</p>
      <p><button class="btn" id="again">🔁 Refazer</button>
      <a class="btn" href="#/les/${L.id}">📖 Rever a lição</a>
      <a class="btn primary" href="#/">➡️ Próxima lição</a></p></div>`;
    $('#again').addEventListener('click', () => runExercises(body, L));
  }
  show();
}

/* ---------- flashcards / SRS ---------- */
function dueCards() {
  const now = Date.now();
  return Object.entries(S.srs).filter(([, v]) => v.due <= now).map(([k]) => k);
}
async function updateDueBadge() {
  const n = dueCards().length;
  const b = $('#dueBadge'); b.hidden = n === 0; b.textContent = n;
}
function gradeCard(key, grade) { // 0=again 1=hard 2=easy
  const c = S.srs[key] || { box: 0, due: 0 };
  c.box = grade === 0 ? 1 : grade === 1 ? Math.max(1, c.box) : Math.min(5, (c.box || 0) + 1);
  c.due = Date.now() + SRS_DAYS[c.box] * 864e5;
  S.srs[key] = c; save(); updateDueBadge();
}
function runFlashcards(body, L, cards) {
  let q = shuffle(cards), i = 0;
  function show() {
    if (i >= q.length) {
      body.innerHTML = `<div class="card endscreen"><div class="big">🃏✨</div>
        <h2>Revisão concluída!</h2>
        <p class="muted">As cartas voltam quando estiver na hora de revisar (repetição espaçada 🧠).</p>
        <p><a class="btn primary" href="#/">🏠 Início</a></p></div>`;
      touchStreak(); save(); return;
    }
    const c = q[i];
    body.innerHTML = `
      <p class="center muted">carta ${i + 1} de ${q.length} 🃏</p>
      <div class="fc" id="fc"><div class="fc-inner">
        <div class="fc-face">
          ${c.art ? `<span class="pill art-${c.art}">${c.art}</span>` : ''}
          <span class="fc-word">${esc(c.nl)}</span>
          ${hasTTS ? `<button class="speak-btn" id="say" style="font-size:1.5rem">🔊</button>` : ''}
          <span class="muted">toque para virar 👆</span>
        </div>
        <div class="fc-face fc-back">
          <span style="font-size:1.4rem">${c.emoji || ''} <b>${esc(c.pt)}</b></span>
          ${c.split ? `<span class="v-split">🧩 ${esc(c.split)}</span>` : ''}
        </div>
      </div></div>
      <div class="fc-grade" id="grade" hidden>
        <button class="btn" data-g="0">😵 De novo</button>
        <button class="btn" data-g="1">😐 Difícil</button>
        <button class="btn good" data-g="2">😎 Fácil</button>
      </div>`;
    const fc = $('#fc');
    fc.addEventListener('click', e => {
      if (e.target.id === 'say') { e.stopPropagation(); speak(c.nl, e.target); return; }
      fc.classList.toggle('flip'); $('#grade').hidden = false;
    });
    $('#grade').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const g = +b.dataset.g;
      gradeCard(c.key, g);
      // Cards from the "Dificuldades" drill are tagged 'mist|<key>': a real (not self-reported)
      // correct recall here is what actually earns the lost XP back.
      if (c.key.startsWith('mist|') && g >= 1) clearMistake(c.key.slice(5), 5);
      if (g === 0) q.push(c); // see it again this session
      i++; show();
    }));
  }
  show();
}

/* ---------- global review (due cards from all lessons) ---------- */
async function renderReview(app) {
  app.innerHTML = `<h1>🃏 Revisão inteligente</h1><div class="loading">⏳ Buscando cartas...</div>`;
  const man = await manifest();
  const due = new Set(dueCards());
  const cards = [];
  for (const l of man.lessons) {
    const hasAny = [...due].some(k => k.startsWith(l.id + '|'));
    if (!hasAny) continue;
    const L = await lesson(l.id);
    L.vocab.forEach(v => { const key = l.id + '|' + v.nl; if (due.has(key)) cards.push({ ...v, key }); });
  }
  if (!cards.length) {
    app.innerHTML = `<h1>🃏 Revisão inteligente</h1>
      <div class="card center"><p style="font-size:2.5rem">🎉</p>
      <p><b>Nenhuma carta para revisar agora!</b></p>
      <p class="muted">Estude as lições e as palavras entram aqui automaticamente, na hora certa de revisar (repetição espaçada 🧠).</p>
      <a class="btn primary" href="#/">📚 Ir para as lições</a></div>`;
    return;
  }
  app.innerHTML = `<h1>🃏 Revisão inteligente <span class="muted" style="font-size:1rem">${cards.length} carta(s) vencida(s)</span></h1><div id="fcbody"></div>`;
  runFlashcards($('#fcbody'), null, cards);
}

/* ---------- social media per lesson (📱 Ver na prática) ---------- */
let SOCIAL = null;
async function socialData() {
  if (SOCIAL === null) {
    try { SOCIAL = await (await fetch('data/social.json')).json(); } catch { SOCIAL = {}; }
  }
  return SOCIAL;
}
async function fillSocialCard(id) {
  const soc = (await socialData())[id];
  const el = document.getElementById('socialCard');
  if (!soc || !soc.length || !el) return;
  el.innerHTML = `<div class="card social-card"><h3>📱 Ver na prática (redes e vídeos)</h3>
    <p class="muted" style="margin-top:0"><small>Conteúdo real em inglês sobre este tema. Ouvir nativos é metade do aprendizado! 🎧</small></p>
    <div class="social-links">${soc.map(s =>
      `<a class="social-link" href="${esc(s.url)}" target="_blank" rel="noopener">
        <span class="social-icon">${esc(s.icon)}</span>
        <span><b>${esc(s.label)}</b><br><small class="muted">${esc(s.src || '')}</small></span> ↗</a>`).join('')}
    </div></div>`;
}

/* ---------- woordenboek: dicionário + busca rápida + emojis ---------- */
let ALLVOCAB = null, EMOJI = null;
async function allVocab() {
  if (ALLVOCAB) return ALLVOCAB;
  const man = await manifest();
  const out = [];
  const seen = new Set();
  const packs = await Promise.all(man.lessons.map(async l => ({ l, L: await lesson(l.id) })));
  for (const { l, L } of packs) {
    for (const v of L.vocab) {
      const k = norm(v.nl);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ ...v, from: l.id, fromEmoji: l.emoji });
    }
  }
  try {  // extra dictionary entries beyond the lessons
    const extra = await (await fetch('data/woordenboek-extra.json')).json();
    for (const v of extra) {
      const k = norm(v.nl);
      if (!seen.has(k)) { seen.add(k); out.push(v); }
    }
  } catch { /* optional file */ }
  ALLVOCAB = out.sort((a, b) => norm(a.nl).localeCompare(norm(b.nl)));
  return ALLVOCAB;
}
async function emojiIndex() {
  if (!EMOJI) { try { EMOJI = await (await fetch('data/emoji/index.json')).json(); } catch { EMOJI = []; } }
  return EMOJI; // rows: [emoji, label_pt, tags_pt, label_nl, tags_nl]
}
async function renderWoordenboek(app) {
  app.innerHTML = `
    <h1>🔎 Woordenboek <small class="muted" style="font-size:1rem">dicionário + busca rápida</small></h1>
    <div class="card">
      <input class="fill-input" id="dictQ" style="max-width:100%" autocomplete="off"
        placeholder="🔍 inglês ou português...">
      <p class="muted" style="margin:.5em 0 0"><small>💡 Busca nas palavras do curso (com a quebra 🧩), no banco de
      <b>1900+ emojis bilíngues</b> 😀 e oferece atalhos para dicionários externos.</small></p>
    </div>
    <div id="dictOut"><p class="muted center">⌨️ Comece a digitar...</p></div>`;
  const [vocab, emo] = await Promise.all([allVocab(), emojiIndex()]);
  const out = $('#dictOut'), q = $('#dictQ');
  q.focus();
  q.addEventListener('input', () => {
    const s = norm(q.value);
    if (s.length < 2) { out.innerHTML = `<p class="muted center">⌨️ Digite pelo menos 2 letras... (${vocab.length} palavras + ${emo.length} emojis na base)</p>`; return; }
    const words = vocab.filter(v => norm(v.nl).includes(s) || norm(v.pt).includes(s) || norm(v.split || '').includes(s)).slice(0, 40);
    const emojis = emo.filter(r => norm(r[1]).includes(s) || norm(r[2]).includes(s) || norm(r[3]).includes(s) || norm(r[4]).includes(s)).slice(0, 24);
    const enc = encodeURIComponent(q.value.trim());
    out.innerHTML = `
      ${words.length ? `<table class="vocab"><tr><th></th><th>palavra</th><th>quebra 🧩</th><th>português</th><th>lição</th></tr>
        ${words.map(v => `<tr>
          <td>${v.art ? `<span class="pill art-${v.art}">${v.art}</span>` : ''}</td>
          <td class="v-nl">${esc(v.nl)} ${hasTTS ? `<button class="speak-btn dspeak" data-say="${esc(v.nl)}">🔊</button>` : ''}</td>
          <td class="v-split">${esc(v.split || '')}</td>
          <td>${v.emoji || ''} ${esc(v.pt)}</td>
          <td>${v.from ? `<a href="#/les/${v.from}" title="ver lição">${v.fromEmoji || '📖'}</a>` : '📕'}</td></tr>`).join('')}</table>`
      : `<div class="card center">🤷 Nada no vocabulário do curso para "<b>${esc(q.value)}</b>".</div>`}
      ${emojis.length ? `<div class="card"><h3>😀 Emojis que combinam <small class="muted" style="font-size:.8rem">(toque para copiar)</small></h3>
        <div class="emoji-grid">${emojis.map(r => `<button class="emoji-hit" data-e="${esc(r[0])}" title="🇧🇷 ${esc(r[1])} · 🇧🇪 ${esc(r[3])}">${r[0]}<small>${esc(r[3])}</small></button>`).join('')}</div></div>` : ''}
      <div class="card"><h3>🌍 Não achou? Busque fora:</h3>
        <p class="ext-links">
          <a class="btn small" target="_blank" rel="noopener" href="https://glosbe.com/nl/pt/${enc}">📗 Glosbe NL→PT</a>
          <a class="btn small" target="_blank" rel="noopener" href="https://glosbe.com/pt/nl/${enc}">📘 Glosbe PT→NL</a>
          <a class="btn small" target="_blank" rel="noopener" href="https://translate.google.com/?sl=auto&tl=pt&text=${enc}&op=translate">🌐 Google Translate</a>
          <a class="btn small" target="_blank" rel="noopener" href="https://www.deepl.com/translator#nl/pt/${enc}">🤖 DeepL</a>
          <a class="btn small" target="_blank" rel="noopener" href="https://www.vandale.nl/gratis-woordenboek/nederlands/betekenis/${enc}">📙 Van Dale (NL)</a>
        </p></div>`;
    out.querySelectorAll('.dspeak').forEach(b => b.addEventListener('click', () => speak(b.dataset.say, b)));
    out.querySelectorAll('.emoji-hit').forEach(b => b.addEventListener('click', () => {
      navigator.clipboard && navigator.clipboard.writeText(b.dataset.e);
      toast(`${b.dataset.e} copiado!`);
    }));
  });
}

/* ---------- reusable vocab table ---------- */
function vocabRow(v) {
  return `<tr>
    <td>${v.art ? `<span class="pill art-${v.art}">${v.art}</span>` : ''}</td>
    <td class="v-nl">${esc(v.nl)} ${hasTTS ? `<button class="speak-btn vspeak" data-say="${esc(v.nl)}">🔊</button>` : ''}</td>
    <td class="v-split">${esc(v.split || '')}</td>
    <td>${v.emoji ? v.emoji + ' ' : ''}${esc(clockify(v.pt))}</td></tr>`;
}
function vocabTableHTML(list) {
  return `<table class="vocab"><tr><th></th><th>palavra</th><th>quebra 🧩</th><th>português</th></tr>
    ${list.map(vocabRow).join('')}</table>`;
}
function bindVspeak(root) { root.querySelectorAll('.vspeak').forEach(b => b.addEventListener('click', () => speak(b.dataset.say, b))); }

/* ---------- LEVEL selector: click A1 -> all A1 content ---------- */
async function renderLevel(app, unit) {
  app.innerHTML = `<div class="crumb"><a href="#/">🏠 Início</a></div><h1>${UNIT_INFO[unit].emoji} Nível ${unit} <span class="muted" style="font-size:1rem">${UNIT_INFO[unit].name}</span></h1><div class="loading">⏳ Reunindo tudo do ${unit}...</div>`;
  const man = await manifest();
  const ls = man.lessons.filter(l => l.unit === unit);
  const packs = await Promise.all(ls.map(l => lesson(l.id)));
  const allPhrases = packs.flatMap(L => L.phrases.map(p => ({ ...p, _from: L.emoji })));
  const allVocab = []; const seen = new Set();
  packs.forEach(L => L.vocab.forEach(v => { const k = norm(v.nl); if (!seen.has(k)) { seen.add(k); allVocab.push(v); } }));
  const c = UNIT_COLORS[unit];
  const levelGames = GAME_DOMAINS.filter(d => d.level === unit);
  app.innerHTML = `
    <div class="crumb"><a href="#/">🏠 Início</a></div>
    <div class="level-hero" style="border-color:${c}">
      <span class="level-chip" style="background:${c}">${unit}</span>
      <div><h1 style="margin:0">${UNIT_INFO[unit].emoji} ${UNIT_INFO[unit].name}</h1>
      <span class="muted">${ls.length} lições · ${allPhrases.length} frases · ${allVocab.length} palavras ·
      ${packs.reduce((s, L) => s + L.exercises.length, 0)} exercícios${levelGames.length ? ` · ${levelGames.length} jogo(s) 🧩` : ''}</span></div>
    </div>
    <div class="tabs" id="lvltabs">
      <button class="tab active" data-t="les">📚 Lições</button>
      <button class="tab" data-t="phr">🎨 Frases</button>
      <button class="tab" data-t="voc">🧩 Vocabulário</button>
      ${levelGames.length ? `<button class="tab" data-t="jog">🧩 Jogos</button>` : ''}
    </div>
    <div id="lvlbody"></div>`;
  const body = $('#lvlbody');
  const tabs = {
    les: () => {
      body.innerHTML = `<div class="lesson-grid">${ls.map(l => {
        const pct = lessonProgress(l.id, l.exercises || 10);
        return `<a class="lesson-card" href="#/les/${l.id}"><span class="em">${l.emoji}</span>
          <h3>${esc(l.title)}</h3><span class="pct">${l.phrases} frases · ${l.exercises} exercícios ${pct === 100 ? '· ✅' : ''}</span>
          <div class="progressbar"><div style="width:${pct}%"></div></div></a>`; }).join('')}</div>
        <p class="center" style="margin-top:16px"><button class="btn primary" id="fcAll">🃏 Flashcards de TODO o ${unit} (${allVocab.length})</button></p>`;
      $('#fcAll').addEventListener('click', () => {
        app.innerHTML = `<div class="crumb"><a href="#/nivel/${unit}">← ${unit}</a></div><h1>🃏 ${unit} completo</h1><div id="fcx"></div>`;
        runFlashcards($('#fcx'), null, allVocab.map(v => ({ ...v, key: 'lvl-' + unit + '|' + v.nl })));
      });
    },
    phr: () => {
      body.innerHTML = legendStrip(allPhrases) + allPhrases.map((p, i) => phraseHTML(p, i)).join('');
      bindPhraseEvents(body);
      body.querySelectorAll('.speak').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); speak(b.dataset.say, b); }));
    },
    voc: () => { body.innerHTML = vocabTableHTML(allVocab); bindVspeak(body); },
    jog: () => {
      body.innerHTML = `<div class="game-grid">${levelGames.map(d => `<a class="game-tile" href="#/spelletjes/${d.id}" style="border-color:${d.color}">
        <span class="game-em" style="background:${d.color}22">${d.emoji}</span><b>${d.label}</b></a>`).join('')}</div>`;
    },
  };
  app.querySelectorAll('#lvltabs .tab').forEach(b => b.addEventListener('click', () => {
    app.querySelectorAll('#lvltabs .tab').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); tabs[b.dataset.t]();
  }));
  tabs.les();
}

/* ---------- MISTAKES quicklist: extra attention where it is needed ---------- */
function renderMistakes(app) {
  const list = mistakeList();
  if (!list.length) {
    app.innerHTML = `<div class="crumb"><a href="#/">🏠 Início</a></div><h1>🎯 Minhas dificuldades</h1>
      <div class="card center"><p style="font-size:2.5rem">🌟</p><p><b>Nenhum erro registrado. Mandou bem!</b></p>
      <p class="muted">Quando você errar um exercício, a palavra ou frase aparece aqui automaticamente, para você dar atenção extra.</p>
      <a class="btn primary" href="#/">📚 Ir às lições</a></div>`;
    return;
  }
  app.innerHTML = `
    <div class="crumb"><a href="#/">🏠 Início</a></div>
    <h1>🎯 Minhas dificuldades <span class="muted" style="font-size:1rem">${list.length} item(s)</span></h1>
    <p class="muted">Tudo que você errou, junto, para revisar com foco. Erros repetidos aparecem no topo 🔺.
    Cada erro tira um pouco de ⚡; treinar aqui devolve os pontos.</p>
    <p><button class="btn primary" id="drill">🃏 Treinar todas como flashcards (+5⚡ cada acerto)</button>
    <button class="btn" id="clearAll">🧹 Limpar tudo</button></p>
    <div class="mistake-list">${list.map(m => `<div class="card mistake" data-key="${esc(m.key)}">
      <div class="mistake-top"><span class="pill" style="background:${UNIT_COLORS[m.unit] || '#888'};color:#fff">${esc(m.unit || '')}</span>
        <span class="muted">${m.lessonEmoji || ''} ${esc(m.lessonTitle || '')}</span>
        ${m.count > 1 ? `<span class="rep">🔺 ${m.count}x</span>` : ''}
        <button class="del-mistake" title="Já aprendi (+2⚡)" data-key="${esc(m.key)}">✓ aprendi</button></div>
      <div class="mistake-body"><b class="v-nl">${esc(m.nl || m.answer || '')}</b>
        ${hasTTS && (m.nl || m.answer) ? `<button class="speak-btn mspeak" data-say="${esc(m.nl || m.answer)}">🔊</button>` : ''}
        <span class="muted"> — ${esc(clockify(m.pt || m.q || ''))}</span></div></div>`).join('')}</div>`;
  app.querySelectorAll('.mspeak').forEach(b => b.addEventListener('click', () => speak(b.dataset.say, b)));
  app.querySelectorAll('.del-mistake').forEach(b => b.addEventListener('click', () => { clearMistake(b.dataset.key, 2); renderMistakes(app); }));
  $('#clearAll').addEventListener('click', () => { if (confirm('Limpar toda a lista de dificuldades?')) { S.mistakes = {}; save(); updateMistakeBadge(); renderMistakes(app); } });
  $('#drill').addEventListener('click', () => {
    app.innerHTML = `<div class="crumb"><a href="#/dificuldades">← dificuldades</a></div><h1>🃏 Treino de dificuldades</h1><div id="mfc"></div>`;
    runFlashcards($('#mfc'), null, list.map(m => ({ nl: m.nl || m.answer, pt: m.pt || m.q, split: '', art: null, emoji: '🎯', key: 'mist|' + m.key })));
  });
}

/* ============================================================
   🧩 SPELLETJES: drag-and-drop games (native pointer events,
   works identically with mouse and touch, mobile + desktop)
   ============================================================ */
// Games feature removed for this app (no matching game-content data was ported over).
// Left as an empty array, not deleted outright, since renderLevel's Jogos-tab conditional
// (levelGames.length ? ... : '') already degrades cleanly to "no tab" when this is empty.
const GAME_DOMAINS = [];

// Daily-word widget: data/daily/latest.json isn't ported to this project (matches the
// Spanish/English sibling apps), so this always resolves to '' via the catch below.
// Left in place rather than stripped so the call site in renderHome doesn't need touching.
async function dailyWidgetHTML() {
  let d; try { d = await (await fetch('data/daily/latest.json')).json(); } catch { return ''; }
  if (!d || !d.word) return '';
  return `<div class="card daily-card">
    <div class="daily-head">📅 <b>Hoje · Hoje (${esc(d.date || '')})</b></div>
    <div class="daily-word">
      <span class="daily-em">${d.word.emoji || '🔤'}</span>
      <div><b class="v-nl">${d.word.art ? `<span class="pill art-${d.word.art}">${d.word.art}</span> ` : ''}${esc(d.word.nl)}</b>
        ${hasTTS ? `<button class="speak-btn dspeak" data-say="${esc(d.word.nl)}">🔊</button>` : ''}
        <br><small class="muted">${esc(d.word.pt)}${d.word.split ? ' · 🧩 ' + esc(d.word.split) : ''}</small></div>
    </div>
    ${d.phrase ? `<div class="daily-phrase">${phraseHTML(d.phrase, 'daily')}</div>` : ''}
  </div>`;
}

/* ---------- premium: paywall + upsell screen ---------- */
async function renderPremium(app, qs) {
  if (qs && qs.get('success') === '1') { toast('🎉 Pagamento recebido! Ativando...'); setTimeout(checkPremiumStatus, 1200); setTimeout(checkPremiumStatus, 4000); }
  const enabled = window.NL_CONFIG && window.NL_CONFIG.PREMIUM_ENABLED;
  app.innerHTML = `<div class="crumb"><a href="#/">🏠 Início</a></div>
    <h1>⭐ Inglês! Premium</h1>
    ${isPremium() ? `<div class="card center"><p style="font-size:2.5rem">🏆</p>
      <p><b>Você já é Premium! Dank je wel! 💛</b></p><a class="btn primary" href="#/">📚 Voltar às lições</a></div>` : `
    <div class="card">
      <p class="muted">O curso inteiro continua <b>100% gratuito</b>, para sempre. O Premium é para quem quer apoiar o
      projeto e ganhar mimos extras. ✨</p>
      <ul class="checklist">
        <li>🚫 Sem anúncios em lugar nenhum</li>
        <li>📄 Exportar qualquer lição em PDF para imprimir</li>
        <li>🏅 Certificado de conclusão por nível (A1...C1)</li>
        <li>🃏 Baralhos e jogos exclusivos, liberados na hora</li>
        <li>💛 Você ajuda a manter o projeto vivo e gratuito para outros brasileiros</li>
      </ul>
      ${enabled ? `<p><button class="btn primary" id="buyBtn">⭐ Tornar-se Premium</button></p><p id="buyMsg" class="muted"></p>`
        : `<p class="muted">💤 A compra ainda não foi ativada pelo administrador do site. Volte em breve!</p>`}
    </div>`}`;
  const buy = document.getElementById('buyBtn');
  if (buy) buy.addEventListener('click', async () => {
    buy.disabled = true; document.getElementById('buyMsg').textContent = '⏳ Abrindo pagamento seguro...';
    try {
      const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: deviceId() }) });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
      else { document.getElementById('buyMsg').textContent = '⚠️ ' + (d.message || 'Indisponível agora.'); buy.disabled = false; }
    } catch { document.getElementById('buyMsg').textContent = '⚠️ Erro de conexão.'; buy.disabled = false; }
  });
}

/* ---------- legend ---------- */
function renderLegend(app) {
  app.innerHTML = `
    <h1>🎨 A legenda das cores: a ponte entre as línguas</h1>
    <div class="card"><p>Nas frases deste curso, <b>cada tipo de palavra tem um estilo fixo, igual nas duas línguas</b>.
    O <span class="r-verb">verbo</span> em inglês e o <span class="r-verb">verbo</span> em português têm a mesma cor;
    o <span class="r-noun">substantivo</span> também, e assim por diante. Seu cérebro aprende a "ver" a estrutura
    da frase antes mesmo de entender cada palavra. 🧠✨</p>
    <p class="muted">Exemplo: <span class="r-qw">What</span> <span class="r-verb">is</span> <span class="r-pron">his</span>
    <span class="r-noun">name</span>? →
    <span class="r-qw">Qual</span> <span class="r-verb">é</span> <span class="r-art">o</span>
    <span class="r-noun">nome</span> <span class="r-pron">dele</span>?</p></div>
    <div class="legend-table">
      ${Object.entries(ROLES).filter(([k]) => k !== 'punc' && k !== 'x').map(([k, r]) => `
        <div class="legend-row"><span style="font-size:1.3rem">${r.emoji}</span>
          <span class="sample"><span class="r-${k}">${esc(r.sample[0])}</span> = <span class="r-${k}">${esc(r.sample[1])}</span></span>
          <b>${esc(r.label)}</b></div>`).join('')}
    </div>
    <p class="center" style="margin-top:18px"><a class="btn primary" href="#/">📚 Voltar às lições</a></p>`;
}
