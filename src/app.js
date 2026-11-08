'use strict';
/* Catana IPTV — Xtream Codes masaüstü istemcisi */

// ---------------------------------------------------------------- yardımcılar
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* dolu */ } }
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const arr = (x) => (Array.isArray(x) ? x : x && typeof x === 'object' ? Object.values(x) : []);
const lower = (s) => String(s || '').toLocaleLowerCase('tr-TR');
const uid = () => Math.random().toString(36).slice(2, 10);
const pad2 = (n) => String(n).padStart(2, '0');
const hhmm = (ms) => { const d = new Date(ms); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
const dur = (s) => {
  if (!isFinite(s) || s < 0) return '0:00';
  s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (h ? h + ':' + pad2(m) : m) + ':' + pad2(sec);
};
const b64 = (s) => {
  if (!s) return '';
  try { return new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0))); } catch { return s; }
};
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toLocaleUpperCase('tr-TR');

const ICON = {
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg>',
  play: '<path d="M8 5v14l11-7z"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  chev: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  tick: '<svg class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  audio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>',
  subs: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15h4M14 15h3M7 11h2M12 11h5"/></svg>',
  quality: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M7 10v4M7 12h3M10 10v4M14 10h2a2 2 0 0 1 0 4h-2z"/></svg>',
  timer: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>'
};

const PALETTE = ['#4FA3FF', '#3DD68C', '#FF7A59', '#B48CFF', '#F2B33D', '#FF5C7A', '#5BC8FF', '#C6E35A', '#FF9F43', '#7BDFF2'];
const colorOf = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; };
// "HD: Kanal", "TR | Kanal", "4K: Kanal" gibi önekleri temizler
const cleanName = (n) => String(n || '').replace(/^\s*(?:[A-Z0-9ÇĞİÖŞÜ+]{1,4}\s*[:|]\s*)+/i, '').trim() || String(n || '');
const qualityOf = (n) => {
  const s = String(n || '').toUpperCase();
  if (/\b(4K|UHD|2160P?)\b/.test(s)) return '4K';
  if (/\b(FHD|1080P?)\b/.test(s)) return 'FHD';
  if (/\bHD\b|720P?/.test(s)) return 'HD';
  if (/\bSD\b/.test(s)) return 'SD';
  return '';
};
const markHtml = (name) => { const n = cleanName(name); return `<span class="mark" style="--c:${colorOf(n)}">${esc(n.length > 22 ? n.slice(0, 21) + '…' : n)}</span>`; };
const logoHtml = (icon, name) => (icon ? `<img src="${esc(icon)}" loading="lazy" alt="" data-fb="mark" data-name="${esc(name)}">` : markHtml(name));

// Bozuk logo/afiş görselleri: kanal adından yazı logoya ya da boş afişe düş
document.addEventListener('error', (e) => {
  const t = e.target;
  if (!(t instanceof HTMLImageElement) || !t.dataset.fb) return;
  if (t.dataset.fb === 'mark') {
    const tpl = document.createElement('template'); tpl.innerHTML = markHtml(t.dataset.name);
    t.replaceWith(tpl.content.firstElementChild);
  } else t.remove();
}, true);

// ---------------------------------------------------------------- durum
const NATIVE = window.native || null;
const ENC_OK = !!(NATIVE && NATIVE.canEncrypt());
const IS_MAC = !!(NATIVE && NATIVE.platform === 'darwin');
const ENC_NAME = IS_MAC ? 'macOS Anahtar Zinciri' : 'Windows DPAPI';
const ENC_USER = IS_MAC ? 'bu Mac kullanıcısı' : 'bu Windows kullanıcısı';
if (IS_MAC) document.documentElement.classList.add('mac');
// Şifreler diske Windows şifrelemesiyle (DPAPI) yazılır; bellekte çözülmüş tutulur.
function loadProfiles() {
  let migrate = false;
  const list = LS.get('catana.profiles', []).map((p) => {
    const o = Object.assign({}, p);
    if (o.pwEnc) { const pw = NATIVE ? NATIVE.decrypt(o.pwEnc) : null; o.password = pw == null ? '' : pw; delete o.pwEnc; }
    else if (o.password) migrate = true;
    return o;
  });
  return { list, migrate };
}
const _loaded = loadProfiles();
const S = {
  profiles: _loaded.list,
  activeId: LS.get('catana.activeId', null),
  settings: Object.assign({ format: 'auto', buffer: 'normal', liveView: 'grid', accent: '#F2B33D', vol: 1, muted: false, fit: 'contain' }, LS.get('catana.settings', {})),
  account: null,
  section: 'live',
  cache: {},
  cat: { live: 'all', vod: 'all', series: 'all', guide: null },
  info: {}, hero: null, heroIdx: 0, heroTimer: null,
  vodOpen: null, backTo: null, accPage: null, accTab: 'live', adultUnlocked: false, serverInfo: {},
  query: '',
  sort: 'added',
  views: {},          // render edilen öğe dizileri (data-g / data-i ile erişilir)
  selLive: null,      // liste görünümünde seçili kanal
  seriesOpen: null,
  season: null,
  io: [],
  editingId: null
};
const profile = () => S.profiles.find((p) => p.id === S.activeId);
const saveSettings = () => LS.set('catana.settings', S.settings);
function saveProfiles() {
  const out = S.profiles.map((p) => {
    const o = Object.assign({}, p);
    if (ENC_OK && o.password) { const enc = NATIVE.encrypt(o.password); if (enc) { o.pwEnc = enc; delete o.password; } }
    return o;
  });
  LS.set('catana.profiles', out); LS.set('catana.activeId', S.activeId);
}
if (_loaded.migrate && ENC_OK) saveProfiles();

const favKey = () => 'catana.favs.' + S.activeId;
const recentKey = () => 'catana.recent.' + S.activeId;
const posKey = () => 'catana.pos.' + S.activeId;
const favs = () => Object.assign({ live: [], vod: [], series: [] }, LS.get(favKey(), {}));
const isFav = (type, id) => (favs()[type] || []).some((f) => String(f.id) === String(id));
function toggleFav(item) {
  const type = item.type === 'episode' ? 'series' : item.type;
  const f = favs(); const list = f[type] || (f[type] = []);
  const i = list.findIndex((x) => String(x.id) === String(item.id));
  if (i >= 0) list.splice(i, 1); else list.unshift(snapshot(item));
  LS.set(favKey(), f);
  return i < 0;
}
const snapshot = (it) => ({ type: it.type, id: it.id, name: it.name, icon: it.icon, ext: it.ext, num: it.num, rating: it.rating, seriesId: it.seriesId });
function addRecent(item) {
  const r = LS.get(recentKey(), []).filter((x) => !(x.type === item.type && String(x.id) === String(item.id)));
  r.unshift(Object.assign(snapshot(item), { t: Date.now() }));
  LS.set(recentKey(), r.slice(0, 40));
}
const positions = () => LS.get(posKey(), {});
function savePos(item, pos, total) {
  if (!item || item.type === 'live' || !isFinite(total) || total < 60) return;
  const p = positions(); const k = item.type + '_' + item.id;
  if (pos > total * 0.95) delete p[k]; else if (pos > 15) p[k] = { pos, total };
  LS.set(posKey(), p);
}

// ---------------------------------------------------------------- Xtream API
const normServer = (s) => { s = String(s || '').trim(); if (!/^https?:\/\//i.test(s)) s = 'http://' + s; return s.replace(/\/+$/, '').replace(/\/(player_api|get)\.php.*$/i, ''); };

async function api(p, action, params = {}) {
  const u = new URL(p.server + '/player_api.php');
  u.searchParams.set('username', p.username);
  u.searchParams.set('password', p.password);
  if (action) u.searchParams.set('action', action);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const r = await fetch(u, { signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error('Sunucu hata döndürdü (HTTP ' + r.status + ')');
    const txt = await r.text();
    try { return JSON.parse(txt); } catch { throw new Error('Sunucudan geçersiz yanıt geldi. Adresi kontrol et.'); }
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Sunucu yanıt vermedi (zaman aşımı).');
    if (e instanceof TypeError) throw new Error('Sunucuya ulaşılamadı. Adresi ve internet bağlantını kontrol et.');
    throw e;
  } finally { clearTimeout(timer); }
}

async function authenticate(p) {
  const d = await api(p);
  const ui = d && d.user_info;
  if (!ui || String(ui.auth) !== '1') throw new Error('Kullanıcı adı veya şifre hatalı.');
  if (ui.status && ui.status !== 'Active') throw new Error('Hesap durumu: ' + ui.status);
  S.serverInfo = d.server_info || {};
  return ui;
}

const SECTION_API = {
  live: ['get_live_categories', 'get_live_streams'],
  vod: ['get_vod_categories', 'get_vod_streams'],
  series: ['get_series_categories', 'get_series']
};
async function loadSection(sec, force) {
  if (S.cache[sec] && !force) return S.cache[sec];
  const p = profile();
  showLoading({ live: 'Kanallar yükleniyor…', vod: 'Filmler yükleniyor…', series: 'Diziler yükleniyor…' }[sec]);
  try {
    const [cats, items] = await Promise.all([api(p, SECTION_API[sec][0]), api(p, SECTION_API[sec][1])]);
    const counts = {};
    const list = arr(items);
    for (const it of list) {
      const ids = new Set([String(it.category_id), ...arr(it.category_ids).map(String)]);
      ids.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
    }
    S.cache[sec] = { cats: arr(cats), items: list, counts };
    return S.cache[sec];
  } finally { hideLoading(); }
}

async function shortEpg(streamId, limit = 8) {
  try {
    const d = await api(profile(), 'get_short_epg', { stream_id: streamId, limit });
    return arr(d && d.epg_listings).map((e) => ({
      title: b64(e.title), desc: b64(e.description),
      start: e.start_timestamp ? +e.start_timestamp * 1000 : Date.parse(e.start),
      end: e.stop_timestamp ? +e.stop_timestamp * 1000 : Date.parse(e.end)
    })).filter((e) => e.title && isFinite(e.start)).sort((a, b) => a.start - b.start);
  } catch { return []; }
}

// ---------------------------------------------------------------- öğe modelleri
const mapLive = (s) => ({ type: 'live', id: s.stream_id, name: s.name, icon: s.stream_icon, num: s.num, cat: s.category_id });
const mapVod = (m) => ({ type: 'vod', id: m.stream_id, name: m.name, icon: m.stream_icon, ext: m.container_extension || 'mp4', rating: m.rating, added: +m.added || 0, cat: m.category_id });
const mapSeries = (s) => ({ type: 'series', id: s.series_id, name: s.name, icon: s.cover, rating: s.rating, added: +(s.last_modified || 0), year: s.releaseDate || s.release_date || '', cat: s.category_id });
const MAP = { live: mapLive, vod: mapVod, series: mapSeries };
const inCat = (raw, c) => String(raw.category_id) === c || arr(raw.category_ids).map(String).includes(c);

function filtered(sec) {
  const d = S.cache[sec]; if (!d) return [];
  const c = S.cat[sec];
  let list = d.items;
  if (c === 'fav') { const ids = new Set((favs()[sec] || []).map((f) => String(f.id))); list = list.filter((x) => ids.has(String(x.stream_id ?? x.series_id))); }
  else if (c !== 'all') list = list.filter((x) => inCat(x, c));
  if (c === 'all' || c === 'fav' || S.query) list = visible(sec, list);
  if (S.query) { const q = lower(S.query); list = list.filter((x) => lower(x.name).includes(q)); }
  let items = list.map(MAP[sec]);
  if (sec === 'live') items.sort((a, b) => (+a.num || 1e9) - (+b.num || 1e9));
  else if (S.sort === 'name') items.sort((a, b) => String(a.name).localeCompare(String(b.name), 'tr'));
  else if (S.sort === 'rating') items.sort((a, b) => (+b.rating || 0) - (+a.rating || 0));
  else items.sort((a, b) => b.added - a.added);
  return items;
}
const itemOf = (el) => { const g = S.views[el.dataset.g]; return g ? g[+el.dataset.i] : null; };

// ---------------------------------------------------------------- parçalı render (binlerce kanal için)
function renderChunked(container, items, html, root, opts = {}) {
  const size = opts.size || 120;
  const bucket = opts.bucket || S.io;
  container.innerHTML = '';
  const parent = container.parentElement;
  [...parent.children].filter((c) => c.classList.contains('sentinel')).forEach((c) => c.remove());
  const sentinel = document.createElement('div');
  sentinel.className = 'sentinel';
  sentinel.style.height = '1px';
  container.after(sentinel);
  let i = 0;
  const more = (n) => {
    if (i >= items.length) { io.disconnect(); sentinel.remove(); return; }
    n = n || size;
    container.insertAdjacentHTML('beforeend', items.slice(i, i + n).map((it, k) => html(it, i + k)).join(''));
    i += n;
    if (opts.onAppend) opts.onAppend();
  };
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) more(); }, { root, rootMargin: '900px' });
  more(Math.max(size, opts.initial || 0));
  io.observe(sentinel);
  bucket.push(io);
  return io;
}
const resetIO = () => { S.io.forEach((o) => o.disconnect()); S.io = []; };

// ---------------------------------------------------------------- kart şablonları
function liveTile(it, i, g) {
  const q = qualityOf(it.name);
  return `<button type="button" class="tile" data-act="live" data-g="${g}" data-i="${i}" title="${esc(it.name)}">
    <span class="tile-logo">${q ? `<span class="q ${q === '4K' ? 'q4k' : ''}">${q}</span>` : ''}${logoHtml(it.icon, it.name)}
      <span class="fav ${isFav('live', it.id) ? 'on' : ''}" data-act="fav" data-g="${g}" data-i="${i}" title="Favori">${ICON.star}</span></span>
    <span class="tile-name">${esc(it.name)}</span></button>`;
}
function liveRow(it, i, g, active) {
  const q = qualityOf(it.name);
  return `<button type="button" class="row ${active ? 'active' : ''}" data-act="live-row" data-g="${g}" data-i="${i}">
    <span class="num">${esc(it.num ?? '')}</span>
    <span class="row-logo">${logoHtml(it.icon, it.name)}</span>
    <span class="row-main"><span class="row-title"><span>${esc(it.name)}</span>${isFav('live', it.id) ? ICON.star.replace('<svg', '<svg class="star"') : ''}</span>
    <span class="row-sub">${esc(catName('live', it.cat))}</span></span>
    ${q ? `<span class="qtag">${q}</span>` : ''}</button>`;
}
function poster(it, i, g, extra = {}) {
  const meta = it.type === 'series' ? (it.year ? String(it.year).slice(0, 4) : 'Dizi') : extra.meta || (it.added ? new Date(it.added * 1000).toLocaleDateString(DATE_LOC) : '');
  const r = parseFloat(it.rating);
  const act = extra.act || (it.type === 'series' ? 'series' : it.type === 'vod' ? 'vod' : 'play');
  return `<button type="button" class="poster" data-act="${act}" data-g="${g}" data-i="${i}" title="${esc(it.name)}">
    <span class="poster-img">${r > 0 ? `<span class="rating">★ ${r.toFixed(1)}</span>` : ''}
      <span class="fav ${isFav(it.type === 'episode' ? 'series' : it.type, it.type === 'episode' ? it.seriesId : it.id) ? 'on' : ''}" data-act="fav" data-g="${g}" data-i="${i}" title="Favori">${ICON.star}</span>
      <span class="ph">${esc(cleanName(it.name))}</span>
      ${it.icon ? `<img src="${esc(it.icon)}" loading="lazy" alt="" data-fb="poster">` : ''}
      ${extra.progress != null ? `<span class="bar"><span style="width:${Math.round(extra.progress * 100)}%"></span></span>` : ''}</span>
    <span class="title">${esc(it.name)}</span><span class="meta">${esc(meta)}</span></button>`;
}
function catName(sec, id) { const c = S.cache[sec]?.cats.find((x) => String(x.category_id) === String(id)); return c ? c.category_name : ''; }

// ---------------------------------------------------------------- arayüz iskeleti
const view = $('#view');
function showLoading(t) { $('#loadingText').textContent = t || 'Yükleniyor…'; $('#loading').classList.remove('hidden'); }
function hideLoading() { $('#loading').classList.add('hidden'); }
let toastTimer;
function toast(msg, err) {
  const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 4000);
}
function applyAccent() {
  document.documentElement.style.setProperty('--accent', S.settings.accent);
}

function renderAccount() {
  const a = S.account; const p = profile();
  $('#profileName').textContent = p ? p.name : '';
  $('#profileAvatar').textContent = p ? initials(p.name) : '';
  const box = $('#account');
  const dl = a ? daysLeft(a.exp_date) : null;
  if (dl === null || dl > 7) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden'); box.classList.add('warn');
  box.innerHTML = `<strong>${dl <= 0 ? 'Hesap süren doldu' : dl === 1 ? 'Hesabın yarın bitiyor' : `Hesabın ${dl} gün sonra bitiyor`}</strong><span class="k" style="color:inherit">${esc(fmtDate(a.exp_date))}</span>`;
}
$('#account').addEventListener('click', async () => { await setSection('account'); S.accPage = 'info'; render(); });
const TITLES = { home: 'Anasayfa', live: 'Canlı TV', guide: 'TV Rehberi', vod: 'Filmler', series: 'Diziler', favs: 'Favoriler', recent: 'Son İzlenenler', settings: 'Ayarlar', account: 'Hesabım', search: 'Arama' };
const NEEDS = { home: ['vod', 'series'], live: ['live'], guide: ['live'], vod: ['vod'], series: ['series'], search: ['live', 'vod', 'series'] };
async function setSection(sec, opts = {}) {
  if (sec !== S.section) {
    if (!opts.keepQuery) { S.query = ''; $('#search').value = ''; }
    S.seriesOpen = null; S.vodOpen = null;
    if (sec !== 'account') S.accPage = null;
  }
  S.section = sec;
  $$('.nav button').forEach((b) => b.classList.toggle('active', b.dataset.section === sec));
  $('#title').textContent = TITLES[sec];
  $('#viewToggle').classList.toggle('hidden', sec !== 'live');
  $('#sort').classList.toggle('hidden', !(sec === 'vod' || sec === 'series'));
  $$('#viewToggle button').forEach((b) => b.classList.toggle('active', b.dataset.view === S.settings.liveView));
  try {
    for (const n of NEEDS[sec] || []) await loadSection(n, opts.force);
    render();
  } catch (e) {
    parkVideo(); resetIO();
    view.innerHTML = `<div class="scroll"><div class="empty">${esc(e.message)}<br><br><button type="button" class="btn ghost small" data-act="retry">Tekrar dene</button></div></div>`;
  }
}

function render() {
  parkVideo(); resetIO(); S.views = {};
  clearInterval(S.heroTimer); clearInterval(G.timer);
  const sec = S.section;
  if (sec === 'home') renderHome();
  else if (sec === 'live') renderLive();
  else if (sec === 'guide') renderGuide();
  else if (sec === 'search') renderSearch();
  else if (sec === 'account') renderAccountPage();
  else if (sec === 'vod') S.vodOpen ? renderVodDetail() : renderVod();
  else if (sec === 'series') S.seriesOpen ? renderSeriesDetail() : renderSeries();
  else if (sec === 'favs') renderFavs();
  else if (sec === 'recent') renderRecent();
  else if (sec === 'settings') renderSettings();
}

function catsHtml(sec, cur = S.cat[sec], act = 'cat') {
  const d = S.cache[sec];
  const nf = (favs()[sec] || []).length;
  const hid = new Set(hiddenCats()[sec].map(String));
  const mode = pset().adult;
  const lockSvg = '<svg class="lock" viewBox="0 0 24 24" aria-label="Kilitli"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const btn = (id, name, n, lock) => `<button type="button" class="cat ${cur === id ? 'active' : ''}" data-act="${act}" data-id="${esc(id)}" ${lock ? 'data-lock="1"' : ''}><span>${esc(name)}${lock ? lockSvg : ''}</span><span class="n">${n}</span></button>`;
  const cats = d.cats.filter((c) => !hid.has(String(c.category_id)) && !(mode === 'hide' && isAdultName(c.category_name)));
  return `<span class="cats-head">Kategoriler</span>` + btn('all', 'Tümü', visible(sec, d.items).length) + btn('fav', 'Favoriler', nf) +
    cats.map((c) => btn(String(c.category_id), c.category_name, d.counts[String(c.category_id)] || 0, mode === 'pin' && !S.adultUnlocked && isAdultName(c.category_name))).join('');
}
function curCatLabel(sec) { const c = S.cat[sec]; return c === 'all' ? 'Tümü' : c === 'fav' ? 'Favoriler' : catName(sec, c); }

// ---------------- canlı TV
function renderLive() {
  const grid = S.settings.liveView === 'grid';
  view.innerHTML = `<nav class="cats" aria-label="Kategoriler">${catsHtml('live')}</nav>` + (grid
    ? `<div class="scroll" id="scroll"><div class="pad"><div class="section-head"><h2 id="listTitle"></h2></div><div class="grid" id="items"></div></div></div>`
    : `<div class="scroll" id="scroll"><div class="list" id="items"></div></div><aside class="preview" id="preview"></aside>`);
  renderLiveItems();
  if (!grid) renderPreview();
}
function renderLiveItems() {
  const items = filtered('live'); S.views.live = items;
  const grid = S.settings.liveView === 'grid';
  const lt = $('#listTitle'); if (lt) lt.innerHTML = `${esc(curCatLabel('live'))} <span class="count">· ${items.length} kanal</span>`;
  const box = $('#items');
  if (!items.length) { box.innerHTML = `<div class="empty">${S.cat.live === 'fav' ? 'Henüz favori kanal yok. Kanal kartındaki yıldızla ekleyebilirsin.' : 'Kanal bulunamadı.'}</div>`; return; }
  const selId = S.selLive && S.selLive.id;
  renderChunked(box, items, (it, i) => (grid ? liveTile(it, i, 'live') : liveRow(it, i, 'live', String(it.id) === String(selId))), $('#scroll'));
}

let previewEpgTimer;
async function renderPreview() {
  const box = $('#preview'); if (!box) return;
  const it = S.selLive;
  parkVideo();
  if (!it) { box.innerHTML = `<div class="empty">Önizlemek için soldan bir kanal seç.<br>Çift tık veya Enter: tam ekran.</div>`; return; }
  const fav = isFav('live', it.id);
  box.innerHTML = `<div class="preview-stage" id="previewStage"><span class="live-badge">CANLI</span></div>
    <div class="preview-head"><span class="row-logo">${logoHtml(it.icon, it.name)}</span>
      <div class="grow"><h2>${esc(it.name)}</h2><div class="muted small">Kanal ${esc(it.num ?? '')} ${qualityOf(it.name) ? '· ' + qualityOf(it.name) : ''}</div></div></div>
    <div class="preview-actions">
      <button type="button" class="btn primary small grow" data-act="fullscreen">Tam ekran izle</button>
      <button type="button" class="btn ghost small" data-act="fav-sel">${fav ? '★ Favoride' : '☆ Favorilere ekle'}</button>
    </div>
    <div class="epg" id="previewEpg"><span class="epg-head">Yayın akışı</span><div class="m-note">Yükleniyor…</div></div>`;
  const stage = $('#previewStage');
  if (Engine.item && Engine.item.type === 'live' && String(Engine.item.id) === String(it.id)) stage.appendChild(videoWrap);
  else { stage.appendChild(videoWrap); Engine.play(it); }
  const epg = await shortEpg(it.id);
  if (S.selLive !== it) return;
  const el = $('#previewEpg'); if (!el) return;
  const now = Date.now();
  el.innerHTML = `<span class="epg-head">Yayın akışı</span>` + (epg.length ? epg.filter((e) => e.end > now).slice(0, 6).map((e) =>
    `<div class="epg-item ${e.start <= now && e.end > now ? 'now' : ''}"><span class="t">${hhmm(e.start)}</span><div><div class="ti">${esc(e.title)}</div>${e.desc ? `<div class="d">${esc(e.desc)}</div>` : ''}</div></div>`).join('')
    : '<div class="m-note">Bu kanal için yayın akışı yok.</div>');
  clearTimeout(previewEpgTimer);
}
function selectLive(it) {
  S.selLive = it;
  $$('#items .row.active').forEach((r) => r.classList.remove('active'));
  const idx = S.views.live.indexOf(it);
  const row = $(`#items .row[data-i="${idx}"]`); if (row) row.classList.add('active');
  renderPreview();
}

// ---------------- filmler
function renderVod() {
  view.innerHTML = `<nav class="cats" aria-label="Kategoriler">${catsHtml('vod')}</nav>
    <div class="scroll" id="scroll"><div class="pad" id="vodPad"></div></div>`;
  const items = filtered('vod'); S.views.vod = items;
  const pad = $('#vodPad');
  let html = '';
  if (S.cat.vod === 'all' && !S.query) {
    const pos = positions();
    const resume = LS.get(recentKey(), []).filter((r) => (r.type === 'vod' || r.type === 'episode') && pos[r.type + '_' + r.id]).slice(0, 12);
    if (resume.length) {
      S.views.resume = resume;
      html += `<div class="section-head"><h2>İzlemeye devam et</h2></div><div class="resume">` + resume.map((r, i) => {
        const p = pos[r.type + '_' + r.id];
        return poster(r, i, 'resume', { progress: p.pos / p.total, meta: dur(p.total - p.pos) + ' kaldı', act: 'play' });
      }).join('') + `</div>`;
    }
  }
  html += `<div class="section-head"><h2>${esc(curCatLabel('vod'))} <span class="count">· ${items.length} film</span></h2></div><div class="posters" id="items"></div>`;
  pad.innerHTML = html;
  if (!items.length) { $('#items').innerHTML = '<div class="empty">Film bulunamadı.</div>'; return; }
  renderChunked($('#items'), items, (it, i) => poster(it, i, 'vod'), $('#scroll'));
}

// ---------------- diziler
function renderSeries() {
  view.innerHTML = `<nav class="cats" aria-label="Kategoriler">${catsHtml('series')}</nav>
    <div class="scroll" id="scroll"><div class="pad"><div class="section-head"><h2 id="listTitle"></h2></div><div class="posters" id="items"></div></div></div>`;
  const items = filtered('series'); S.views.series = items;
  $('#listTitle').innerHTML = `${esc(curCatLabel('series'))} <span class="count">· ${items.length} dizi</span>`;
  if (!items.length) { $('#items').innerHTML = '<div class="empty">Dizi bulunamadı.</div>'; return; }
  renderChunked($('#items'), items, (it, i) => poster(it, i, 'series'), $('#scroll'));
}

const fmtLen = (v) => {
  if (!v) return '';
  const m = String(v).match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (!m) return String(v);
  const h = +m[1], mi = +m[2];
  return h ? `${h} sa ${mi} dk` : `${mi} dk`;
};
function epTitle(e, seriesName) {
  const t = String(e.title || '').trim();
  if (!t || /S\d+\s*E\d+/i.test(t) || t === seriesName) return `${e.episode_num}. Bölüm`;
  return t;
}
async function renderSeriesDetail() {
  const s = S.seriesOpen;
  view.innerHTML = `<div class="scroll" id="scroll"><div class="pad" id="sd">${backBtn(backLabel('Diziler'))}<div class="empty">Yükleniyor…</div></div></div>`;
  let info, inf;
  try { inf = await fetchInfo(s); info = s.info; }
  catch (e) { $('#sd').innerHTML += `<div class="empty">${esc(e.message)}</div>`; return; }
  if (S.seriesOpen !== s || !$('#sd')) return;
  const meta = info.info || {};
  const eps = info.episodes || {};
  const seasons = Object.keys(eps).sort((a, b) => +a - +b);
  const cover = s.icon || inf.cover;
  const mk = (season, e) => ({
    type: 'episode', id: e.id, ext: e.container_extension || 'mp4', seriesId: s.id, icon: cover, season,
    name: `${s.name} · ${season}. Sezon ${e.episode_num}. Bölüm`,
    title: epTitle(e, s.name), num: e.episode_num, len: fmtLen(e.info && (e.info.duration || '')),
    thumb: e.info && e.info.movie_image, plot: e.info && e.info.plot
  });
  // kaldığın bölüm: son izlenenlerde bu diziye ait en yeni bölüm
  const last = LS.get(recentKey(), []).find((r) => r.type === 'episode' && String(r.seriesId) === String(s.id));
  let resume = null;
  if (last) for (const sn of seasons) { const e = arr(eps[sn]).find((x) => String(x.id) === String(last.id)); if (e) { resume = mk(sn, e); break; } }
  if (!S.season || !eps[S.season]) S.season = resume ? resume.season : seasons[0];
  const list = arr(eps[S.season]).map((e) => mk(S.season, e));
  S.views.eps = list;
  const first = seasons.length ? mk(seasons[0], arr(eps[seasons[0]])[0] || {}) : null;
  S.seriesResume = resume || first;
  const pos = positions();
  const bg = inf.backdrop || cover;
  $('#sd').innerHTML = `<div class="detail-hero">
      ${bg ? `<div class="hero-bg ${inf.backdrop ? '' : 'blur'}" style="${bgStyle(bg)}"></div><div class="hero-shade"></div>` : ''}
      ${backBtn(backLabel('Diziler'))}
      <div class="dh-row">
        <div class="dh-poster">${cover ? `<img src="${esc(cover)}" alt="" data-fb="poster">` : ''}</div>
        <div class="series-info">
          <h2>${esc(s.name)}</h2>
          <div class="muted">${esc([inf.year, inf.genre, seasons.length ? seasons.length + ' sezon' : '', parseFloat(inf.rating || s.rating) > 0 ? '★ ' + parseFloat(inf.rating || s.rating).toFixed(1) : ''].filter(Boolean).join(' · '))}</div>
          ${inf.plot ? `<p class="clamp4">${esc(inf.plot)}</p>` : ''}
          <div class="hero-actions">
            ${S.seriesResume && S.seriesResume.id ? `<button type="button" class="btn primary" data-act="series-resume">▶ ${resume ? 'Devam et' : 'İzle'} · ${esc(S.seriesResume.season)}. Sezon ${esc(S.seriesResume.num)}. Bölüm</button>` : ''}
            <button type="button" class="btn ghost" data-act="fav-series">${isFav('series', s.id) ? '★ Favoride' : '☆ Favorilere ekle'}</button>
          </div>
        </div>
      </div>
    </div>
    <div class="seasons">${seasons.map((n) => `<button type="button" class="chip ${n === S.season ? 'active' : ''}" data-act="season" data-id="${esc(n)}">${esc(n)}. Sezon</button>`).join('')}</div>
    <div class="episodes">${list.map((e, i) => {
      const p = pos['episode_' + e.id];
      const cur = resume && String(resume.id) === String(e.id);
      return `<button type="button" class="episode ${cur ? 'current' : ''}" data-act="play" data-g="eps" data-i="${i}">
        <span class="ep-thumb">${e.thumb ? `<img src="${esc(e.thumb)}" alt="" loading="lazy" data-fb="poster">` : ''}<span class="ep-no">${esc(e.num)}</span>
          ${p ? `<span class="bar"><span style="width:${Math.round(p.pos / p.total * 100)}%"></span></span>` : ''}</span>
        <span class="ep-main"><span class="et">${esc(e.title)}</span>${e.plot ? `<span class="ep-plot">${esc(e.plot)}</span>` : ''}</span>
        <span class="ed">${p ? dur(p.total - p.pos) + ' kaldı' : esc(e.len)}</span></button>`;
    }).join('') || '<div class="m-note">Bu sezonda bölüm yok.</div>'}</div>`;
}

// ---------------- favoriler / son izlenenler
function groupHtml(title, items, g, kind) {
  S.views[g] = items;
  if (!items.length) return '';
  const body = kind === 'tiles' ? `<div class="grid">${items.map((it, i) => liveTile(it, i, g)).join('')}</div>`
    : `<div class="posters">${items.map((it, i) => poster(it, i, g)).join('')}</div>`;
  return `<div class="section-head" style="margin-top:8px"><h2>${esc(title)} <span class="count">· ${items.length}</span></h2></div>${body}<div style="height:28px"></div>`;
}
function renderFavs() {
  const f = favs();
  const html = groupHtml('Kanallar', f.live, 'fl', 'tiles') + groupHtml('Filmler', f.vod, 'fv', 'posters') + groupHtml('Diziler', f.series, 'fs', 'posters');
  view.innerHTML = `<div class="scroll"><div class="pad">${html || '<div class="empty">Henüz favori yok. Kanal, film ve dizilerdeki yıldızla ekleyebilirsin.</div>'}</div></div>`;
}
function renderRecent() {
  const r = LS.get(recentKey(), []);
  const html = groupHtml('Kanallar', r.filter((x) => x.type === 'live'), 'rl', 'tiles') + groupHtml('Film ve diziler', r.filter((x) => x.type !== 'live'), 'rv', 'posters');
  view.innerHTML = `<div class="scroll"><div class="pad">${html || '<div class="empty">Henüz bir şey izlemedin.</div>'}
    ${r.length ? '<button type="button" class="btn ghost small" data-act="clear-recent">Geçmişi temizle</button>' : ''}</div></div>`;
}

// ---------------- ayarlar
function radios(name, options, cur) {
  return `<div class="radios">${options.map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}" ${v === cur ? 'checked' : ''}>${l}</label>`).join('')}</div>`;
}
function renderSettings() {
  const st = S.settings;
  view.innerHTML = `<div class="scroll"><div class="pad"><div class="settings">
    <div class="set-card"><h3>Dil</h3><p>Seçtiğin dil, Kaydet'e basınca uygulanır.</p>
      <div class="lang-grid">${LANGS.map((l) => `<label class="lang-opt"><input type="radio" name="langPick" value="${l.code}" ${l.code === LANG ? 'checked' : ''}><span class="flag" aria-hidden="true">${FLAGS[l.code]}</span><span class="ln">${l.name}</span></label>`).join('')}</div>
      <div class="actions"><button type="button" class="btn primary small" data-act="lang-save">Kaydet</button></div></div>
    <div class="set-card"><h3>Canlı yayın formatı</h3>
      <p>Otomatik önce TS dener, açılmazsa HLS'e geçer. Takılan kanallarda diğerini dene.</p>
      ${radios('format', [['auto', 'Otomatik'], ['ts', 'MPEG-TS'], ['hls', 'HLS (m3u8)']], st.format)}</div>
    <div class="set-card"><h3>Yayın önbelleği</h3>
      <p>Az: daha düşük gecikme. Fazla: zayıf bağlantıda daha az takılma.</p>
      ${radios('buffer', [['low', 'Az'], ['normal', 'Normal'], ['high', 'Fazla']], st.buffer)}</div>
    <div class="set-card"><h3>Canlı TV görünümü</h3>
      ${radios('liveView', [['grid', 'Logo ızgarası'], ['list', 'Liste + önizleme']], st.liveView)}</div>
    <div class="set-card"><h3>Vurgu rengi</h3>
      <div class="swatches">${['#F2B33D', '#5B8CFF', '#3DD68C', '#FF7A59'].map((c) => `<button type="button" class="swatch ${c === st.accent ? 'active' : ''}" style="background:${c}" data-act="accent" data-id="${c}" aria-label="Renk ${c}"></button>`).join('')}</div></div>
    <div class="set-card"><h3>Profil ve veriler</h3>
      <p>Aktif profil: <strong>${esc(profile()?.name || '')}</strong> — ${esc(profile()?.server || '')}</p>
      <div class="actions"><button type="button" class="btn ghost small" data-act="profiles">Profilleri yönet</button>
      <button type="button" class="btn ghost small" data-act="reload-all">Listeleri sunucudan yenile</button></div></div>
    <p class="muted small">Kısayollar — Oynatıcı: Boşluk oynat/duraklat · ↑↓ kanal · ←→ 10 sn · L canlıya dön · F tam ekran · M ses · S ayarlar · C kanal listesi · Esc geri. Genel: ${IS_MAC ? '⌘K' : 'Ctrl+K'} arama · ${IS_MAC ? '⌘⌥I' : 'F12'} geliştirici araçları.</p>
  </div></div></div>`;
}

// ---------------- kategori gizleme / yetişkin içerik
const psetKey = () => 'catana.pset.' + S.activeId;
const pset = () => Object.assign({ adult: 'show', pinHash: '', panelUrl: '' }, LS.get(psetKey(), {}));
const savePset = (o) => LS.set(psetKey(), Object.assign(pset(), o));
const hiddenKey = () => 'catana.hidden.' + S.activeId;
const hiddenCats = () => Object.assign({ live: [], vod: [], series: [] }, LS.get(hiddenKey(), {}));
const ADULT_RE = /(adult|xxx|porn|erotik|erotic|yeti[şs]kin|\+\s?18|18\s?\+)/i;
const isAdultName = (n) => ADULT_RE.test(String(n || ''));
function blockedCats(sec) {
  const d = S.cache[sec];
  const set = new Set(hiddenCats()[sec].map(String));
  const m = pset().adult;
  if (d && m !== 'show' && !(m === 'pin' && S.adultUnlocked)) d.cats.forEach((c) => { if (isAdultName(c.category_name)) set.add(String(c.category_id)); });
  return set;
}
function visible(sec, list) { const b = blockedCats(sec); return b.size ? list.filter((x) => !b.has(String(x.category_id))) : list; }
const catLocked = (sec, id) => pset().adult === 'pin' && !S.adultUnlocked && isAdultName(catName(sec, id));

async function sha256(t) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const hashPin = (pin) => sha256('catana:' + S.activeId + ':' + pin);

// ---------------- modal
const modalOpen = () => !$('#modal').classList.contains('hidden');
function openModal(html) { $('#modalCard').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#modalCard').innerHTML = ''; if (S.modalResolve) { const r = S.modalResolve; S.modalResolve = null; r(false); } }
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
function askPin(title = 'Yetişkin içerik', text = 'Devam etmek için 4 haneli PIN kodunu gir.') {
  return new Promise((resolve) => {
    openModal(`<h3>${esc(title)}</h3><p class="muted">${esc(text)}</p>
      <input class="pin-input" id="pinIn" type="password" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="PIN">
      <p class="form-msg err" id="pinMsg"></p>
      <div class="actions"><button type="button" class="btn primary" id="pinOk">Onayla</button><button type="button" class="btn ghost" id="pinNo">Vazgeç</button></div>`);
    S.modalResolve = resolve;
    const inp = $('#pinIn'); inp.focus();
    const ok = async () => {
      if ((await hashPin(inp.value)) === pset().pinHash) { S.modalResolve = null; closeModal(); resolve(true); }
      else { $('#pinMsg').textContent = 'PIN hatalı.'; inp.value = ''; inp.focus(); }
    };
    $('#pinOk').onclick = ok;
    $('#pinNo').onclick = () => closeModal();
    inp.onkeydown = (e) => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') closeModal(); };
  });
}
async function unlockAdult() {
  if (S.adultUnlocked) return true;
  if (await askPin()) { S.adultUnlocked = true; return true; }
  return false;
}

// ---------------- içerik bilgisi (film / dizi detayları)
async function fetchInfo(item) {
  const key = item.type + '_' + item.id;
  if (S.info[key]) { if (item.type === 'series' && S.info[key].raw) item.info = S.info[key].raw; return S.info[key]; }
  const p = profile();
  let i = {}, raw = null;
  if (item.type === 'vod') { raw = await api(p, 'get_vod_info', { vod_id: item.id }); i = (raw && raw.info) || {}; }
  else if (item.type === 'series') { raw = await api(p, 'get_series_info', { series_id: item.id }); i = (raw && raw.info) || {}; item.info = raw; }
  const bd = arr(i.backdrop_path).filter(Boolean);
  const out = {
    backdrop: bd[0] || '',
    cover: i.movie_image || i.cover_big || i.cover || '',
    plot: i.plot || i.description || '',
    genre: i.genre || '',
    year: String(i.releasedate || i.releaseDate || i.release_date || '').slice(0, 4),
    duration: i.duration || (i.episode_run_time ? i.episode_run_time + ' dk' : ''),
    rating: i.rating || '',
    cast: i.cast || i.actors || '',
    director: i.director || '',
    trailer: i.youtube_trailer || '',
    raw: item.type === 'series' ? raw : null
  };
  S.info[key] = out;
  return out;
}
const metaLine = (inf, it) => [inf.year || (it.year ? String(it.year).slice(0, 4) : ''), fmtLen(inf.duration), inf.genre, (parseFloat(inf.rating || it.rating) > 0 ? '★ ' + parseFloat(inf.rating || it.rating).toFixed(1) : '')].filter(Boolean).join(' · ');
const bgStyle = (url) => `background-image:url(&quot;${esc(url)}&quot;)`;

async function openDetail(item) {
  const sec = item.type === 'series' ? 'series' : 'vod';
  const from = S.section;
  if (S.section !== sec) await setSection(sec, { keepQuery: from === 'search' });
  S.backTo = from !== sec ? from : null;
  if (sec === 'series') { S.seriesOpen = item; S.season = null; } else S.vodOpen = item;
  render();
  const sc = $('#scroll'); if (sc) sc.scrollTop = 0;
}
function closeDetail() {
  S.seriesOpen = null; S.vodOpen = null;
  const b = S.backTo; S.backTo = null;
  if (b) setSection(b, { keepQuery: b === 'search' }); else render();
}
const backBtn = (label) => `<button type="button" class="back-link" data-act="detail-back">${ICON.back}${esc(label)}</button>`;
const backLabel = (def) => ({ home: 'Anasayfa', search: 'Arama sonuçları', favs: 'Favoriler', recent: 'Son İzlenenler' }[S.backTo] || def);

// ---------------- anasayfa
function latest(sec, n) {
  const d = S.cache[sec]; if (!d) return [];
  return visible(sec, d.items).map(MAP[sec]).sort((a, b) => b.added - a.added).slice(0, n);
}
function resumeItems() {
  const pos = positions();
  return LS.get(recentKey(), []).filter((r) => (r.type === 'vod' || r.type === 'episode') && pos[r.type + '_' + r.id]).slice(0, 12);
}
function resumePoster(r, i, g) {
  const p = positions()[r.type + '_' + r.id];
  return poster(r, i, g, { progress: p.pos / p.total, meta: dur(p.total - p.pos) + ' kaldı', act: 'play' });
}
function rowHtml(title, cards, more) {
  if (!cards.length) return '';
  return `<div class="section-head"><h2>${esc(title)}</h2>${more ? `<button type="button" class="link-btn" data-act="goto" data-id="${more}">Tümünü gör ›</button>` : ''}</div><div class="hrow">${cards.join('')}</div>`;
}
function renderHome() {
  if (!S.hero) {
    const pool = [...latest('vod', 30), ...latest('series', 30)].filter((x) => x.icon);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    S.hero = pool.slice(0, 6); S.heroIdx = 0;
  }
  const rv = resumeItems(), lv = latest('vod', 24), ls = latest('series', 24), fl = favs().live;
  Object.assign(S.views, { hero: S.hero, resume: rv, hv: lv, hs: ls, hfl: fl });
  const rows = rowHtml('İzlemeye devam et', rv.map((r, i) => resumePoster(r, i, 'resume')), null) +
    rowHtml('Favori kanallar', fl.map((x, i) => liveTile(x, i, 'hfl')), 'favs') +
    rowHtml('Son eklenen filmler', lv.map((x, i) => poster(x, i, 'hv')), 'vod') +
    rowHtml('Son güncellenen diziler', ls.map((x, i) => poster(x, i, 'hs')), 'series');
  view.innerHTML = `<div class="scroll" id="scroll">${S.hero.length ? '<section class="hero" id="hero"></section>' : ''}
    <div class="pad" style="padding-top:26px">${rows || '<div class="empty">Henüz içerik yok.</div>'}</div></div>`;
  if (S.hero.length) { renderHero(); startHeroTimer(); }
}
function renderHero() {
  const box = $('#hero'); if (!box) return;
  const it = S.hero[S.heroIdx]; const key = it.type + '_' + it.id;
  const inf = S.info[key];
  const bg = inf && inf.backdrop ? inf.backdrop : it.icon;
  const blur = !(inf && inf.backdrop);
  box.innerHTML = `<div class="hero-bg ${blur ? 'blur' : ''}" style="${bgStyle(bg)}"></div><div class="hero-shade"></div>
    <div class="hero-content">
      <div class="hero-text">
        <span class="hero-tag">${it.type === 'vod' ? 'Yeni film' : 'Yeni dizi'}</span>
        <h2 class="hero-title">${esc(cleanName(it.name))}</h2>
        <div class="hero-meta">${esc(metaLine(inf || {}, it))}</div>
        <p class="hero-plot">${esc(inf ? inf.plot : '')}</p>
        <div class="hero-actions">
          <button type="button" class="btn primary" data-act="hero-play"><svg viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor;stroke:none"><path d="M8 5v14l11-7z"/></svg>${it.type === 'vod' ? 'İzle' : 'Bölümler'}</button>
          <button type="button" class="btn ghost" data-act="hero-detail">Detaylar</button>
        </div>
      </div>
      <div class="hero-poster"><img src="${esc(it.icon)}" alt="" data-fb="poster"></div>
    </div>
    <button type="button" class="hero-nav prev" data-act="hero-step" data-id="-1" aria-label="Önceki">${ICON.back}</button>
    <button type="button" class="hero-nav next" data-act="hero-step" data-id="1" aria-label="Sonraki"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>
    <div class="hero-dots">${S.hero.map((_, i) => `<button type="button" class="${i === S.heroIdx ? 'active' : ''}" data-act="hero-go" data-id="${i}" aria-label="Slayt ${i + 1}"></button>`).join('')}</div>`;
  if (!inf) fetchInfo(it).then(() => { if (S.section === 'home' && S.hero && S.hero[S.heroIdx] === it) renderHero(); }).catch(() => { S.info[key] = { plot: '' }; });
  const nx = S.hero[(S.heroIdx + 1) % S.hero.length]; if (nx) fetchInfo(nx).catch(() => {});
}
function heroStep(d) { if (!S.hero || !S.hero.length) return; S.heroIdx = (S.heroIdx + d + S.hero.length) % S.hero.length; renderHero(); startHeroTimer(); }
function startHeroTimer() {
  clearInterval(S.heroTimer);
  S.heroTimer = setInterval(() => {
    const h = $('#hero');
    if (S.section !== 'home' || !h || playerOpen() || h.matches(':hover') || document.hidden) return;
    heroStep(1);
  }, 8000);
}

// ---------------- film detayı
async function renderVodDetail() {
  const m = S.vodOpen;
  view.innerHTML = `<div class="scroll" id="scroll"><div class="pad" id="vd">${backBtn(backLabel('Filmler'))}<div class="empty">Yükleniyor…</div></div></div>`;
  let inf;
  try { inf = await fetchInfo(m); } catch (e) { inf = {}; toast(e.message, true); }
  if (S.vodOpen !== m || !$('#vd')) return;
  const pos = positions()['vod_' + m.id];
  const cover = m.icon || inf.cover;
  const fav = isFav('vod', m.id);
  const vbg = inf.backdrop || cover;
  $('#vd').innerHTML = `<div class="detail-hero">${vbg ? `<div class="hero-bg ${inf.backdrop ? '' : 'blur'}" style="${bgStyle(vbg)}"></div><div class="hero-shade"></div>` : ''}
    ${backBtn(backLabel('Filmler'))}
    <div class="dh-row">
      <div class="dh-poster">${cover ? `<img src="${esc(cover)}" alt="" data-fb="poster">` : ''}</div>
      <div class="series-info">
        <h2>${esc(m.name)}</h2>
        <div class="muted">${esc(metaLine(inf, m))}</div>
        ${inf.plot ? `<p>${esc(inf.plot)}</p>` : ''}
        ${inf.director || inf.cast ? `<dl class="meta-grid">${inf.director ? `<dt>Yönetmen</dt><dd>${esc(inf.director)}</dd>` : ''}${inf.cast ? `<dt>Oyuncular</dt><dd>${esc(inf.cast)}</dd>` : ''}</dl>` : ''}
        <div class="hero-actions">
          ${pos ? `<button type="button" class="btn primary" data-act="vd-play">▶ Devam et (${dur(pos.pos)})</button><button type="button" class="btn ghost" data-act="vd-start">Baştan başla</button>`
            : '<button type="button" class="btn primary" data-act="vd-play">▶ İzle</button>'}
          <button type="button" class="btn ghost" data-act="vd-fav">${fav ? '★ Favoride' : '☆ Favorilere ekle'}</button>
          ${inf.trailer ? '<button type="button" class="btn ghost" data-act="vd-trailer">Fragman</button>' : ''}
        </div>
      </div>
    </div></div>`;
}

// ---------------- genel arama
function renderSearch() {
  const q = lower(S.query);
  const res = {};
  for (const sec of ['live', 'vod', 'series']) {
    const d = S.cache[sec];
    res[sec] = d ? visible(sec, d.items).filter((x) => lower(x.name).includes(q)).map(MAP[sec]) : [];
  }
  const LIM = 48;
  const grp = (title, sec, html) => {
    const all = res[sec]; if (!all.length) return '';
    const items = all.slice(0, LIM); S.views['s_' + sec] = items;
    return `<div class="search-group"><div class="section-head"><h2>${title} <span class="count">· ${all.length}</span></h2>
      ${all.length > LIM ? `<button type="button" class="link-btn" data-act="search-more" data-id="${sec}">Tümünü göster ›</button>` : ''}</div>
      <div class="${sec === 'live' ? 'grid' : 'posters'}">${items.map((it, i) => html(it, i, 's_' + sec)).join('')}</div></div>`;
  };
  const html = grp('Kanallar', 'live', liveTile) + grp('Filmler', 'vod', poster) + grp('Diziler', 'series', poster);
  view.innerHTML = `<div class="scroll" id="scroll"><div class="pad">${html || `<div class="empty">“${esc(S.query)}” için sonuç bulunamadı.</div>`}</div></div>`;
}

// ---------------- TV rehberi
const G = { PX: 5, CH: 230, HOURS: 12, start: 0, q: [], active: 0, io: null, cache: {}, timer: null };
function guideDefaultCat() {
  if ((favs().live || []).length) return 'fav';
  const d = S.cache.live; const b = blockedCats('live');
  const c = d.cats.find((x) => !b.has(String(x.category_id)) && (d.counts[String(x.category_id)] || 0) > 0);
  return c ? String(c.category_id) : 'all';
}
function guideItems() {
  const d = S.cache.live; const c = S.cat.guide;
  let list = d.items;
  if (c === 'fav') { const ids = new Set((favs().live || []).map((f) => String(f.id))); list = list.filter((x) => ids.has(String(x.stream_id))); }
  else if (c !== 'all') list = list.filter((x) => inCat(x, c));
  if (c === 'all' || c === 'fav') list = visible('live', list);
  return list.map(mapLive).sort((a, b) => (+a.num || 1e9) - (+b.num || 1e9));
}
function renderGuide() {
  if (!S.cat.guide) S.cat.guide = guideDefaultCat();
  const now = Date.now(), half = 30 * 60000;
  G.start = Math.floor(now / half) * half - half;
  const end = G.start + G.HOURS * 3600000;
  const W = (end - G.start) / 60000 * G.PX;
  const items = guideItems(); S.views.guide = items;
  let ticks = '';
  for (let t = G.start; t < end; t += half) ticks += `<span style="left:${(t - G.start) / 60000 * G.PX}px">${hhmm(t)}</span>`;
  const day = new Date(now).toLocaleDateString(DATE_LOC, { weekday: 'long', day: 'numeric', month: 'long' });
  view.innerHTML = `<nav class="cats" aria-label="Kategoriler">${catsHtml('live', S.cat.guide, 'gcat')}</nav>
    <div class="guide-wrap" id="gscroll"><div class="guide" style="width:${G.CH + W}px">
      <div class="g-head"><div class="g-corner">${esc(day)}</div><div class="g-times" style="width:${W}px">${ticks}</div></div>
      <div id="gbody"></div><div class="g-now" id="gnow"></div>
    </div></div>`;
  G.q = [];
  G.io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { G.io.unobserve(e.target); G.q.push(e.target); pumpEpg(); } }), { root: $('#gscroll'), rootMargin: '400px' });
  S.io.push(G.io);
  if (!items.length) { $('#gbody').innerHTML = `<div class="empty">${S.cat.guide === 'fav' ? 'Favori kanal yok.' : 'Bu kategoride kanal yok.'}</div>`; }
  else renderChunked($('#gbody'), items, (it, i) => `<div class="g-row">
      <button type="button" class="g-ch" data-act="gch" data-g="guide" data-i="${i}" title="${esc(it.name)}"><span class="row-logo">${logoHtml(it.icon, it.name)}</span>
        <span style="min-width:0"><div class="nm">${esc(it.name)}</div><div class="nu">${esc(it.num ?? '')}</div></span></button>
      <div class="g-progs" style="width:${W}px" data-sid="${esc(it.id)}" data-i="${i}"></div></div>`, $('#gscroll'),
  { size: 60, onAppend: () => $$('#gbody .g-progs:not([data-obs])').forEach((el) => { el.dataset.obs = '1'; G.io.observe(el); }) });
  const posNow = () => { const n = $('#gnow'); if (n) n.style.left = (G.CH + (Date.now() - G.start) / 60000 * G.PX) + 'px'; };
  posNow();
  clearInterval(G.timer); G.timer = setInterval(posNow, 30000);
  $('#gscroll').scrollLeft = Math.max(0, (now - G.start) / 60000 * G.PX - 120);
}
function pumpEpg() {
  while (G.active < 4 && G.q.length) {
    const el = G.q.shift();
    if (!el.isConnected) continue;
    const sid = el.dataset.sid;
    const c = G.cache[sid];
    if (c && Date.now() - c.t < 10 * 60000) { fillEpgRow(el, c.list); continue; }
    G.active++;
    shortEpg(sid, 40).then((list) => { G.cache[sid] = { t: Date.now(), list }; if (el.isConnected) fillEpgRow(el, list); })
      .finally(() => { G.active--; pumpEpg(); });
  }
}
function fillEpgRow(el, list) {
  const end = G.start + G.HOURS * 3600000, now = Date.now();
  const vis = list.filter((e) => e.end > G.start && e.start < end);
  el._epg = vis;
  if (!vis.length) { el.innerHTML = '<div class="g-empty">Yayın akışı bilgisi yok</div>'; return; }
  el.innerHTML = vis.map((e, k) => {
    const s = Math.max(e.start, G.start), en = Math.min(e.end, end);
    const left = (s - G.start) / 60000 * G.PX + 2, w = Math.max(6, (en - s) / 60000 * G.PX - 4);
    const cls = e.end <= now ? 'past' : e.start <= now ? 'now' : '';
    const p = cls === 'now' ? Math.round((now - e.start) / (e.end - e.start) * 100) : 0;
    return `<button type="button" class="g-prog ${cls}" style="left:${left}px;width:${w}px;--p:${p}%" data-act="gprog" data-i="${el.dataset.i}" data-k="${k}" title="${esc(e.title)} · ${hhmm(e.start)}–${hhmm(e.end)}">
      <span class="pt">${esc(e.title)}</span><span class="ph">${hhmm(e.start)} – ${hhmm(e.end)}</span></button>`;
  }).join('');
}
function showProgram(item, e) {
  const now = Date.now();
  const live = e.start <= now && e.end > now;
  openModal(`<div class="muted small">${esc(item.name)} · ${new Date(e.start).toLocaleDateString(DATE_LOC, { weekday: 'long' })} ${hhmm(e.start)} – ${hhmm(e.end)}</div>
    <h3>${esc(e.title)}</h3>${e.desc ? `<p class="muted">${esc(e.desc)}</p>` : ''}
    <div class="actions"><button type="button" class="btn primary" id="mWatch">${live ? '▶ Şimdi izle' : 'Kanalı aç'}</button><button type="button" class="btn ghost" id="mClose">Kapat</button></div>`);
  $('#mWatch').onclick = () => { closeModal(); openPlayer(item, S.views.guide); };
  $('#mClose').onclick = closeModal;
}

// ---------------- Hesabım
const ACC_ICONS = {
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  cats: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l10 5-10 5L2 7z"/><path d="M2 12l10 5 10-5"/><path d="M2 17l10 5 10-5"/></svg>',
  adult: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12h6M9 15h6"/></svg>',
  diag: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/></svg>',
  panel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>'
};
const ACC_CARDS = [
  ['info', 'Hesap Bilgileri', 'Durum, bitiş tarihi, bağlantı limiti ve sunucu bilgileri.', '#D9531E'],
  ['profile', 'Profil ve Şifre', 'Profilleri düzenle. Şifreler bu bilgisayarda şifreli saklanır.', '#B7791F'],
  ['cats', 'Kategorileri Yönet', 'Canlı, film ve dizi kategorilerini kullanımına göre aç kapat.', '#0F8A74'],
  ['adult', 'Yetişkin İçerik', 'Yetişkin kategorilerini gizle ya da 4 haneli PIN ile koru.', '#A3243B'],
  ['diag', 'Cihaz Analizi', 'Sunucu erişimi, bağlantı hızı ve desteklenen yayın formatları.', '#2F6FDB'],
  ['panel', 'Sağlayıcı Paneli', 'Kredi yükleme, işlem geçmişi gibi işlemler için sağlayıcının sitesi.', '#6D3FD1']
];
const fmtDate = (unix) => (unix && +unix ? new Date(+unix * 1000).toLocaleDateString(DATE_LOC, { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const daysLeft = (unix) => (unix && +unix ? Math.ceil((+unix * 1000 - Date.now()) / 86400000) : null);
const cell = (k, v, h, cls) => `<div class="info-cell"><span class="k">${esc(k)}</span><span class="v ${cls || ''}">${esc(v)}</span>${h ? `<span class="h">${esc(h)}</span>` : ''}</div>`;

async function renderAccountPage() {
  const pg = S.accPage;
  if (!pg) {
    view.innerHTML = `<div class="scroll"><div class="pad"><div class="acc-grid">${ACC_CARDS.map(([id, t, d, c]) =>
      `<button type="button" class="acc-card" data-act="acc" data-id="${id}"><span class="acc-ico" style="background:${c}">${ACC_ICONS[id]}</span><h3>${t}</h3><p>${d}</p></button>`).join('')}</div></div></div>`;
    return;
  }
  const title = ACC_CARDS.find((c) => c[0] === pg)[1];
  const head = `<div class="acc-head"><button type="button" class="back-link" style="margin:0" data-act="acc-back">${ICON.back}Hesabım</button><h2>${esc(title)}</h2></div>`;
  let body = '';
  if (pg === 'info') {
    const a = S.account || {}, si = S.serverInfo || {};
    const dl = daysLeft(a.exp_date);
    let host = ''; try { host = new URL(profile().server).host; } catch { /* */ }
    body = `<div class="info-grid">
      ${cell('Kullanıcı adı', a.username || profile().username)}
      ${cell('Durum', a.status === 'Active' ? 'Aktif' : (a.status || '—'), '', a.status === 'Active' ? 'ok-t' : 'bad-t')}
      ${cell('Bitiş tarihi', a.exp_date && +a.exp_date ? fmtDate(a.exp_date) : 'Sınırsız', dl !== null ? (dl > 0 ? dl + ' gün kaldı' : 'Süre doldu') : '', dl !== null && dl <= 7 ? 'warn-t' : '')}
      ${cell('Oluşturulma', fmtDate(a.created_at))}
      ${cell('Paket türü', String(a.is_trial) === '1' ? 'Deneme' : 'Standart')}
      ${cell('Eş zamanlı bağlantı', `${a.active_cons ?? 0} / ${a.max_connections ?? '?'}`, 'Aynı anda açılabilecek yayın sayısı. Soldaki sayı, bilgilerin alındığı anda açık olan yayın sayısıdır.')}
      ${cell('Yayın formatları', arr(a.allowed_output_formats).join(', ') || '—')}
      ${cell('Sunucu', si.url ? `${si.url}:${si.port || ''}` : host, si.server_protocol ? 'Protokol: ' + si.server_protocol : '')}
      ${cell('Sunucu saati', si.time_now || '—', si.timezone || '')}
    </div><div class="actions" style="margin-top:18px"><button type="button" class="btn ghost small" data-act="acc-refresh">Bilgileri yenile</button></div>`;
  } else if (pg === 'profile') {
    const p = profile();
    body = `<div class="info-grid">
      ${cell('Profil adı', p.name)}${cell('Sunucu', p.server)}${cell('Kullanıcı adı', p.username)}${cell('Şifre', '••••••••')}
      ${cell('Şifre saklama', ENC_OK ? 'Şifreli (' + ENC_NAME + ')' : 'Şifrelenmemiş', ENC_OK ? 'Şifre yalnızca ' + ENC_USER + ' tarafından çözülebilir.' : 'Bu sistemde şifreleme kullanılamıyor.', ENC_OK ? 'ok-t' : 'bad-t')}
      ${cell('Otomatik bağlan', p.auto ? 'Açık' : 'Kapalı')}
    </div><div class="actions" style="margin-top:18px"><button type="button" class="btn primary small" data-act="acc-edit">Profili düzenle</button><button type="button" class="btn ghost small" data-act="profiles">Profilleri yönet</button></div>`;
  } else if (pg === 'cats') {
    const tab = S.accTab || 'live';
    if (!S.cache[tab]) { view.innerHTML = `<div class="scroll"><div class="pad">${head}<div class="empty">Yükleniyor…</div></div></div>`; try { await loadSection(tab); } catch (e) { toast(e.message, true); return; } if (S.accPage !== 'cats') return; }
    const d = S.cache[tab]; const hid = new Set(hiddenCats()[tab].map(String));
    const shown = d.cats.length - d.cats.filter((c) => hid.has(String(c.category_id))).length;
    body = `<div class="tabs">${[['live', 'Canlı TV'], ['vod', 'Filmler'], ['series', 'Diziler']].map(([k, l]) => `<button type="button" class="chip ${k === tab ? 'active' : ''}" data-act="acc-tab" data-id="${k}">${l}</button>`).join('')}</div>
      <p class="muted" style="margin:0 0 12px">${shown} / ${d.cats.length} kategori gösteriliyor. Kapattığın kategoriler listelerde, aramada, anasayfada ve TV rehberinde görünmez.</p>
      <div class="actions" style="margin-bottom:12px"><button type="button" class="btn ghost small" data-act="cats-all" data-id="on">Hepsini aç</button><button type="button" class="btn ghost small" data-act="cats-all" data-id="off">Hepsini kapat</button></div>
      <div class="cat-admin">${d.cats.map((c) => `<label><input type="checkbox" data-cid="${esc(c.category_id)}" data-sec="${tab}" ${hid.has(String(c.category_id)) ? '' : 'checked'}><span>${esc(c.category_name)}</span><span class="n">${d.counts[String(c.category_id)] || 0}</span></label>`).join('')}</div>`;
  } else if (pg === 'adult') {
    const ps = pset();
    const found = [];
    ['live', 'vod', 'series'].forEach((sec) => (S.cache[sec] ? S.cache[sec].cats : []).forEach((c) => { if (isAdultName(c.category_name)) found.push(c.category_name); }));
    const opt = (v, t, d) => `<label style="height:auto;padding:12px 14px;align-items:flex-start"><input type="radio" name="adultMode" value="${v}" ${ps.adult === v ? 'checked' : ''} style="margin-top:3px"><span><strong>${t}</strong><br><span class="muted small">${d}</span></span></label>`;
    body = `<div class="settings">
      <div class="set-card"><h3>Görünürlük</h3>
        <div class="radios" style="flex-direction:column">${opt('show', 'Göster', 'Yetişkin kategorileri diğerleri gibi görünür.')}${opt('hide', 'Gizle', 'Yetişkin kategorileri hiçbir yerde görünmez.')}${opt('pin', 'PIN ile koru', 'Kategoriler kilitli görünür; açmak için PIN gerekir. Uygulama kapanınca tekrar kilitlenir.')}</div></div>
      ${S.pinSetup || (ps.adult === 'pin' && !ps.pinHash) ? `<div class="set-card"><h3>PIN belirle</h3><p>4 haneli bir PIN gir.</p>
        <div class="row2"><label class="field"><span>Yeni PIN</span><input id="pin1" type="password" inputmode="numeric" maxlength="4"></label><label class="field"><span>Tekrar</span><input id="pin2" type="password" inputmode="numeric" maxlength="4"></label></div>
        <p class="form-msg err" id="pinSetMsg"></p><div class="actions"><button type="button" class="btn primary small" data-act="pin-save">PIN'i kaydet</button>${ps.pinHash ? '<button type="button" class="btn ghost small" data-act="pin-cancel">Vazgeç</button>' : ''}</div></div>`
        : ps.pinHash ? '<div class="set-card"><h3>PIN</h3><p>PIN tanımlı.</p><div class="actions"><button type="button" class="btn ghost small" data-act="pin-change">PIN\'i değiştir</button></div></div>' : ''}
      <div class="set-card"><h3>Algılanan kategoriler</h3><p>Algılama kategori adına göre yapılır (Adult, XXX, +18, Yetişkin…). Eksik kalan olursa Kategorileri Yönet'ten kapatabilirsin.</p>
        <p>${found.length ? found.map(esc).join(' · ') : 'Yüklenen listelerde yetişkin kategorisi bulunamadı.'}</p></div>
    </div>`;
  } else if (pg === 'diag') {
    body = `<p class="muted" style="margin:0 0 14px">Hız testi bir canlı kanaldan birkaç saniye veri indirir. Bağlantı limitin 1 ise test sırasında açık yayın durdurulur.</p>
      <div class="actions" style="margin-bottom:16px"><button type="button" class="btn primary small" data-act="diag-run">Analizi başlat</button></div>
      <div class="diag" id="diagOut">${S.diag || ''}</div>`;
  } else if (pg === 'panel') {
    const ps = pset();
    body = `<div class="settings"><div class="set-card"><h3>Sağlayıcı paneli adresi</h3>
      <p>Kredi yükleme, işlem geçmişi, güvenlik kayıtları ve referanslar sağlayıcının kendi web panelinde yönetilir; Xtream bağlantısı bu bilgileri uygulamalara vermez. Panelin adresini kaydedersen buradan tek tıkla açabilirsin.</p>
      <label class="field"><span>Adres</span><input id="panelUrl" placeholder="https://..." value="${esc(ps.panelUrl)}"></label>
      <div class="actions"><button type="button" class="btn ghost small" data-act="panel-save">Kaydet</button><button type="button" class="btn primary small" data-act="panel-open" ${ps.panelUrl ? '' : 'disabled'}>Paneli aç</button></div></div></div>`;
  }
  view.innerHTML = `<div class="scroll"><div class="pad">${head}${body}</div></div>`;
}

async function runDiag() {
  const out = $('#diagOut'); if (!out) return;
  const rows = [];
  const row = (k, v, st) => `<div class="diag-row"><span class="dot ${st || ''}"></span><span class="dk">${esc(k)}</span><span class="dv">${esc(v)}</span></div>`;
  const paint = (extra = '') => { S.diag = rows.join('') + extra; const o = $('#diagOut'); if (o) o.innerHTML = S.diag; };
  const p = profile();
  rows.push('<div class="m-sub" style="padding-left:2px">Sunucu</div>');
  paint(row('Sunucu yanıt süresi', 'ölçülüyor…'));
  try {
    const t = [];
    for (let i = 0; i < 3; i++) { const t0 = performance.now(); await api(p); t.push(performance.now() - t0); }
    const ms = Math.round(t.reduce((a, b) => a + b, 0) / t.length);
    rows.push(row('Sunucu yanıt süresi', ms + ' ms', ms < 400 ? 'ok' : ms < 1200 ? 'warn' : 'bad'));
  } catch (e) { rows.push(row('Sunucu yanıt süresi', e.message, 'bad')); }
  paint(row('İndirme hızı', 'ölçülüyor…'));
  try {
    if (!S.cache.live) await loadSection('live');
    const ch = visible('live', S.cache.live.items)[0];
    if (!ch) throw new Error('Test için kanal yok');
    if (Engine.item) { Engine.stop(); parkVideo(); }
    const url = `${p.server}/live/${encodeURIComponent(p.username)}/${encodeURIComponent(p.password)}/${ch.stream_id}.ts`;
    const ctrl = new AbortController();
    const r = await fetch(url, { signal: ctrl.signal });
    const reader = r.body.getReader();
    let bytes = 0, t0 = 0;
    const stopAt = performance.now() + 9000;
    while (performance.now() < stopAt) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!t0) { t0 = performance.now(); continue; }
      bytes += value.length;
      if (performance.now() - t0 > 6000) break;
    }
    ctrl.abort();
    const sec = Math.max(0.5, (performance.now() - t0) / 1000);
    const mbps = bytes * 8 / sec / 1e6;
    // canlı yayın gerçek zamanlı aktığı için ölçülen değer kanalın bit hızıyla sınırlı olabilir
    rows.push(row('İndirme hızı (canlı kanal)', mbps.toFixed(1) + ' Mbps', mbps > 12 ? 'ok' : mbps > 4 ? 'warn' : 'bad'));
    rows.push(`<div class="m-note" style="padding:0 2px 6px">Canlı yayın gerçek zamanlı aktığı için bu değer, kanalın kendi yayın hızıyla sınırlı olabilir. Yayın takılmadan akıyorsa bağlantın yeterlidir.</div>`);
  } catch (e) { rows.push(row('İndirme hızı', e.name === 'AbortError' ? 'iptal' : e.message, 'bad')); }
  const ms = (t) => { try { return window.MediaSource && MediaSource.isTypeSupported(t); } catch { return false; } };
  rows.push('<div class="m-sub" style="padding-left:2px">Bu bilgisayarın desteklediği formatlar</div>');
  [
    ['H.264 / AVC (çoğu kanal)', 'video/mp4; codecs="avc1.640028"'],
    ['H.265 / HEVC (bazı 4K kanallar)', 'video/mp4; codecs="hvc1.1.6.L120.90"'],
    ['AV1', 'video/mp4; codecs="av01.0.08M.08"'],
    ['AAC ses', 'audio/mp4; codecs="mp4a.40.2"'],
    ['MP3 ses', 'audio/mpeg'],
    ['Dolby AC-3 ses', 'audio/mp4; codecs="ac-3"'],
    ['Dolby E-AC-3 ses', 'audio/mp4; codecs="ec-3"']
  ].forEach(([k, t]) => { const okk = ms(t); rows.push(row(k, okk ? 'Destekleniyor' : 'Desteklenmiyor', okk ? 'ok' : 'bad')); });
  rows.push('<div class="m-sub" style="padding-left:2px">Uygulama</div>');
  const v = NATIVE ? NATIVE.versions : {};
  rows.push(row('Catana IPTV', v.app || '—'));
  rows.push(row('Electron / Chromium', `${v.electron || '—'} / ${v.chrome || '—'}`));
  rows.push(row('Şifre saklama', ENC_OK ? 'Şifreli (' + ENC_NAME + ')' : 'Şifrelenmemiş', ENC_OK ? 'ok' : 'warn'));
  paint();
}

// ---------------------------------------------------------------- oynatma motoru
const video = $('#video');
const videoWrap = $('#videoWrap');
function parkVideo() { if (videoWrap.parentElement !== document.body) document.body.appendChild(videoWrap); }

// lat: canlı yayının ne kadar gerisinden izleneceği (sn). max aşılırsa canlıya geri yaklaşılır.
const BUFFER = {
  low: { label: 'Az', ts: { enableStashBuffer: false }, lat: { max: 2.5, min: 1 }, hls: { maxBufferLength: 10, liveSyncDurationCount: 2 } },
  normal: { label: 'Normal', ts: { enableStashBuffer: true, stashInitialSize: 384 * 1024 }, lat: { max: 6, min: 2.5 }, hls: { maxBufferLength: 30, liveSyncDurationCount: 3 } },
  high: { label: 'Fazla', ts: { enableStashBuffer: true, stashInitialSize: 1024 * 1024 }, lat: { max: 20, min: 8 }, hls: { maxBufferLength: 60, liveSyncDurationCount: 5 } }
};
const DVR_SECONDS = 30 * 60; // canlı yayında geri sarılabilecek süre

function candidates(item) {
  const p = profile();
  const u = encodeURIComponent(p.username), pw = encodeURIComponent(p.password), b = p.server;
  if (item.type === 'live') {
    const ts = { type: 'ts', url: `${b}/live/${u}/${pw}/${item.id}.ts` };
    const hls = { type: 'hls', url: `${b}/live/${u}/${pw}/${item.id}.m3u8` };
    const allowed = arr(S.account && S.account.allowed_output_formats);
    const hlsOk = !allowed.length || allowed.includes('m3u8');
    if (S.settings.format === 'ts') return [ts];
    if (S.settings.format === 'hls') return [hls];
    return hlsOk ? [ts, hls] : [ts];
  }
  const kind = item.type === 'vod' ? 'movie' : 'series';
  const ext = String(item.ext || 'mp4').toLowerCase();
  const url = `${b}/${kind}/${u}/${pw}/${item.id}.${ext}`;
  if (ext === 'm3u8') return [{ type: 'hls', url }];
  if (ext === 'ts') return [{ type: 'tsvod', url }];
  return [{ type: 'native', url }, { type: 'hls', url: `${b}/${kind}/${u}/${pw}/${item.id}.m3u8` }];
}

const Engine = {
  hls: null, ts: null, mode: '', item: null, run: 0, startTimer: null, stallTimer: null,
  status(kind, msg) {
    const st = $('#vStatus');
    if (kind === 'ok') { st.classList.add('hidden'); return; }
    st.classList.remove('hidden');
    $('#vSpin').classList.toggle('hidden', kind !== 'loading');
    $('#vRetry').classList.toggle('hidden', kind !== 'error');
    $('#vMsg').textContent = msg || '';
  },
  teardown() {
    clearTimeout(this.startTimer); clearTimeout(this.stallTimer);
    if (this.hls) { try { this.hls.destroy(); } catch { /* */ } this.hls = null; }
    if (this.ts) { try { this.ts.pause(); this.ts.unload(); this.ts.detachMediaElement(); this.ts.destroy(); } catch { /* */ } this.ts = null; }
    video.onerror = null;
    video.removeAttribute('src');
    try { video.load(); } catch { /* */ }
    this.mode = '';
  },
  stop() { this.run++; this.teardown(); this.item = null; this.status('ok'); },
  play(item, startAt) {
    this.run++;
    this.teardown();
    this.item = item;
    this.cands = candidates(item);
    this.idx = 0;
    this.startAt = startAt || 0;
    this.follow = true;   // canlı yayında en güncel noktayı takip et
    addRecent(item);
    this.tryNext();
  },
  // canlı yayında izlenebilir aralık: [start, edge]
  liveRange() {
    const b = this.hls ? video.seekable : video.buffered;
    if (!b || !b.length) return null;
    let start = b.start(0), edge = b.end(b.length - 1);
    if (this.hls && this.hls.liveSyncPosition) edge = Math.min(edge, this.hls.liveSyncPosition);
    else edge = Math.max(start, edge - 0.5);
    return { start, edge };
  },
  behind() { const r = this.liveRange(); return r ? Math.max(0, r.edge - video.currentTime) : 0; },
  atLive() { return this.follow && this.behind() < this.latMax() + 4; },
  latMax() { return (BUFFER[S.settings.buffer] || BUFFER.normal).lat.max + (this.hls ? 10 : 0); },
  seekLive(t) {
    const r = this.liveRange(); if (!r) return;
    t = Math.max(r.start + 0.2, Math.min(r.edge, t));
    this.follow = r.edge - t < 3;
    video.currentTime = t;
  },
  goLive() {
    const r = this.liveRange(); if (!r) return;
    this.follow = true;
    video.currentTime = Math.max(r.start, r.edge - (BUFFER[S.settings.buffer] || BUFFER.normal).lat.min);
    if (video.paused) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
  },
  // canlıyı takip ederken gecikme büyürse öne atla (mpegts.js'in kendi takibi kapalı; geri sarmaya izin vermek için)
  chase() {
    if (!this.item || this.item.type !== 'live' || !this.follow || video.paused || video.seeking) return;
    const r = this.liveRange(); if (!r) return;
    if (r.edge - video.currentTime > this.latMax()) video.currentTime = Math.max(r.start, r.edge - (BUFFER[S.settings.buffer] || BUFFER.normal).lat.min);
  },
  restart() { if (!this.item) return; const t = this.item.type === 'live' ? 0 : video.currentTime; this.play(this.item, t); },
  fail(run, why) {
    if (run !== this.run) return;
    console.warn('[oynatıcı]', this.mode, why);
    this.teardown();
    this.idx++;
    if (this.idx < this.cands.length) this.tryNext();
    else this.status('error', 'Yayın açılamadı. Kanal şu an kapalı olabilir ya da yayın biçimi desteklenmiyor. Ayarlar › Gelişmiş Ayarlar\'dan formatı değiştirmeyi dene.');
  },
  tryNext() {
    const run = ++this.run;
    const c = this.cands[this.idx];
    const live = this.item.type === 'live';
    const buf = BUFFER[S.settings.buffer] || BUFFER.normal;
    this.status('loading', 'Yayın açılıyor…');
    this.startTimer = setTimeout(() => this.fail(run, 'zaman aşımı'), 20000);
    video.volume = S.settings.vol; video.muted = S.settings.muted;
    const playSafe = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };
    if (c.type === 'hls') {
      if (!window.Hls || !Hls.isSupported()) return this.fail(run, 'hls desteklenmiyor');
      this.mode = 'HLS (hls.js)';
      const h = new Hls(Object.assign({ enableWorker: true, backBufferLength: live ? DVR_SECONDS : 30 }, buf.hls));
      this.hls = h;
      let recovered = false;
      h.on(Hls.Events.ERROR, (e, d) => {
        if (!d.fatal) return;
        if (d.type === Hls.ErrorTypes.MEDIA_ERROR && !recovered) { recovered = true; h.recoverMediaError(); return; }
        this.fail(run, d.details);
      });
      h.on(Hls.Events.MANIFEST_PARSED, playSafe);
      h.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => Menu.refresh());
      h.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => Menu.refresh());
      h.loadSource(c.url);
      h.attachMedia(video);
    } else if (c.type === 'ts' || c.type === 'tsvod') {
      if (!window.mpegts || !mpegts.getFeatureList().mseLivePlayback) return this.fail(run, 'mse yok');
      this.mode = 'MPEG-TS (mpegts.js)';
      const p = mpegts.createPlayer({ type: 'mpegts', isLive: live, url: c.url },
        Object.assign({ enableWorker: true, lazyLoad: false, liveBufferLatencyChasing: false, autoCleanupSourceBuffer: true,
          autoCleanupMaxBackwardDuration: DVR_SECONDS, autoCleanupMinBackwardDuration: DVR_SECONDS - 120 }, live ? buf.ts : { enableStashBuffer: true }));
      this.ts = p;
      p.on(mpegts.Events.ERROR, (type, detail) => this.fail(run, type + ' ' + detail));
      p.attachMediaElement(video);
      p.load();
      playSafe();
    } else {
      this.mode = 'Yerel oynatıcı';
      video.onerror = () => this.fail(run, 'native ' + (video.error && video.error.code));
      video.src = c.url;
      playSafe();
    }
  },
  onPlaying() {
    clearTimeout(this.startTimer); clearTimeout(this.stallTimer);
    this.status('ok');
    if (this.startAt && isFinite(video.duration)) { video.currentTime = this.startAt; this.startAt = 0; }
  },
  onWaiting() {
    if (!this.item) return;
    this.status('loading', 'Arabelleğe alınıyor…');
    clearTimeout(this.stallTimer);
    const run = this.run;
    // canlı yayın 15 sn takılırsa aynı kaynağı yeniden aç
    this.stallTimer = setTimeout(() => { if (run === this.run && this.item && this.item.type === 'live') { toast('Yayın takıldı, yeniden bağlanılıyor…'); this.restart(); } }, 15000);
  }
};
video.addEventListener('playing', () => Engine.onPlaying());
video.addEventListener('waiting', () => Engine.onWaiting());
video.addEventListener('progress', () => Engine.chase());
video.addEventListener('timeupdate', () => {
  Engine.chase();
  // takılma sonrası 'playing' gelmeden akış sürerse bekleme göstergesini kapat
  if (!video.paused && video.readyState >= 3 && !$('#vStatus').classList.contains('hidden') && $('#vRetry').classList.contains('hidden')) Engine.onPlaying();
});
const keepAwake = (on) => { if (NATIVE) NATIVE.keepAwake(on); };
video.addEventListener('playing', () => keepAwake(true));
['pause', 'ended', 'emptied'].forEach((ev) => video.addEventListener(ev, () => keepAwake(false)));
video.addEventListener('loadedmetadata', () => {
  if (Engine.startAt && isFinite(video.duration) && Engine.startAt < video.duration - 5) { video.currentTime = Engine.startAt; Engine.startAt = 0; }
  Menu.refresh();
});
$('#vRetry').addEventListener('click', () => Engine.restart());

// ---------------------------------------------------------------- oynatıcı ekranı
const player = $('#player');
const P = { prevItem: null, ctx: null, epg: [], tick: null, idleTimer: null, lastFs: 0, side: false, sideCat: 'all', sideList: [], io: [], clickTimer: null };
const playerOpen = () => !player.classList.contains('hidden');

// Backspace: bir önceki kanala dön
function prevChannel() {
  const c = P.ctx; if (!c || c.item.type !== 'live' || !P.prevItem) return;
  const target = P.prevItem;
  P.prevItem = c.item;
  c.item = target;
  const i = c.list.findIndex((x) => String(x.id) === String(target.id));
  if (i >= 0) c.index = i;
  Engine.play(target);
  setupPlayerUi(); wakeUi();
  toast('Önceki kanal: ' + target.name);
}
function openPlayer(item, list) {
  if (Engine.item && Engine.item.type === 'live' && item.type === 'live' && String(Engine.item.id) !== String(item.id)) P.prevItem = Engine.item;
  const idx = list ? list.findIndex((x) => x.type === item.type && String(x.id) === String(item.id)) : -1;
  P.ctx = { item, list: list || [item], index: Math.max(0, idx) };
  player.classList.remove('hidden');
  $('#playerStage').appendChild(videoWrap);
  const same = Engine.item && Engine.item.type === item.type && String(Engine.item.id) === String(item.id);
  if (!same) {
    const pos = positions()[item.type + '_' + item.id];
    Engine.play(item, pos ? pos.pos : 0);
  } else { const pr = video.play(); if (pr && pr.catch) pr.catch(() => {}); }
  setupPlayerUi();
  wakeUi();
}
function setupPlayerUi() {
  const it = P.ctx.item; const live = it.type === 'live';
  $('#pTitle').textContent = it.type === 'live' && it.num ? `${it.num} · ${it.name}` : it.name;
  $('#pLogo').innerHTML = live ? logoHtml(it.icon, it.name) : '';
  $('#pLive').classList.toggle('hidden', !live);
  $('#pSub').textContent = '';
  $('#pChannels').classList.toggle('hidden', !live);
  $('#pPrev').classList.toggle('hidden', P.ctx.list.length < 2);
  $('#pNext').classList.toggle('hidden', P.ctx.list.length < 2);
  $('#pBar').classList.add('seekable');
  P.epg = [];
  if (live) {
    const id = it.id;
    shortEpg(id).then((e) => { if (P.ctx && P.ctx.item.id === id) { P.epg = e; updateProgress(); } });
  }
  markSideActive();
  Menu.refresh();
  updateProgress();
  clearInterval(P.tick);
  P.tick = setInterval(updateProgress, 1000);
}
function closePlayer() {
  Menu.close();
  if (P.side) toggleSide(false);
  clearInterval(P.tick);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  const it = P.ctx && P.ctx.item;
  if (it && it.type !== 'live') savePos(it, video.currentTime, video.duration);
  player.classList.add('hidden');
  P.ctx = null;
  const stage = $('#previewStage');
  if (stage && S.section === 'live' && S.settings.liveView === 'list' && it && it.type === 'live') {
    S.selLive = it;
    renderLiveItems(); renderPreview();
  } else { Engine.stop(); parkVideo(); }
  if (S.section === 'vod' || S.section === 'recent' || S.section === 'home' || (S.section === 'series' && S.seriesOpen)) render();
}
function step(d) {
  const c = P.ctx; if (!c || c.list.length < 2) return;
  c.index = (c.index + d + c.list.length) % c.list.length;
  if (c.item.type !== 'live') savePos(c.item, video.currentTime, video.duration);
  else P.prevItem = c.item;
  c.item = c.list[c.index];
  const pos = positions()[c.item.type + '_' + c.item.id];
  Engine.play(c.item, pos ? pos.pos : 0);
  setupPlayerUi();
  wakeUi();
}
function updateProgress() {
  const c = P.ctx; if (!c) return;
  $('#pPlayIcon').innerHTML = video.paused ? ICON.play : ICON.pause;
  const live = c.item.type === 'live';
  let frac = 0, a = '', b = '';
  $('#pGoLive').classList.toggle('hidden', !live);
  $('#pBar').classList.toggle('live', live);
  if (live) {
    const now = Date.now();
    const cur = P.epg.find((e) => e.start <= now && e.end > now);
    const next = P.epg.find((e) => e.start >= (cur ? cur.end : now));
    $('#pSub').textContent = cur ? `${cur.title} · ${hhmm(cur.start)} – ${hhmm(cur.end)}${next ? ' · Sıradaki: ' + next.title : ''}` : (catName('live', c.item.cat) || '');
    const r = Engine.liveRange();
    const at = Engine.atLive();
    $('#pGoLive').classList.toggle('at', at);
    $('#pProgress').classList.toggle('hidden', !r);
    if (r) {
      const span = Math.max(1, r.edge - r.start);
      const behind = Math.max(0, r.edge - video.currentTime);
      frac = (video.currentTime - r.start) / span;
      if (at) frac = 1;
      a = hhmm(now - behind * 1000);
      b = at ? '' : '-' + dur(behind);
      $('#pBar').title = `Geri sarılabilir: ${dur(span)}`;
    }
  } else {
    $('#pProgress').classList.remove('hidden');
    const d = video.duration;
    frac = isFinite(d) && d > 0 ? video.currentTime / d : 0;
    a = dur(video.currentTime); b = isFinite(d) ? dur(d) : '--:--';
    if (Math.floor(video.currentTime) % 5 === 0) savePos(c.item, video.currentTime, d);
  }
  frac = Math.max(0, Math.min(1, frac));
  $('#pFill').style.width = (frac * 100) + '%';
  $('#pKnob').style.left = (frac * 100) + '%';
  $('#pStart').textContent = a; $('#pEnd').textContent = b;
  const w = video.videoWidth;
  $('#pTech').textContent = w ? `${video.videoHeight}p` : '';
  if (Menu.page === 'stats' && Menu.isOpen()) Menu.render();
}
function sideItems() {
  const d = S.cache.live; if (!d) return [];
  let list = d.items;
  if (P.sideCat === 'fav') { const ids = new Set((favs().live || []).map((f) => String(f.id))); list = list.filter((x) => ids.has(String(x.stream_id))); }
  else if (P.sideCat !== 'all') list = list.filter((x) => inCat(x, P.sideCat));
  return list.map(mapLive).sort((a, b) => (+a.num || 1e9) - (+b.num || 1e9));
}
async function renderSide() {
  if (!S.cache.live) { try { await loadSection('live'); } catch (e) { toast(e.message, true); return; } }
  if (!P.ctx) return;
  const d = S.cache.live; const cur = P.sideCat;
  const nf = (favs().live || []).length;
  const btn = (id, name, n) => `<button type="button" class="cat ${cur === id ? 'active' : ''}" data-sc="${esc(id)}"><span>${esc(name)}</span><span class="n">${n}</span></button>`;
  $('#pSideCats').innerHTML = btn('all', 'Hepsi', d.items.length) + btn('fav', 'Favoriler', nf) +
    d.cats.map((c) => btn(String(c.category_id), c.category_name, d.counts[String(c.category_id)] || 0)).join('');
  renderSideList();
}
function renderSideList() {
  const items = sideItems();
  P.sideList = items;
  S.views.side = items;
  const curId = P.ctx && String(P.ctx.item.id);
  const idx = items.findIndex((x) => String(x.id) === curId);
  $('#pSideHead').textContent = (P.sideCat === 'all' ? 'Hepsi' : P.sideCat === 'fav' ? 'Favoriler' : catName('live', P.sideCat)) + ` · ${items.length} kanal`;
  P.io.forEach((o) => o.disconnect()); P.io = [];
  const box = $('#pSideItems');
  if (!items.length) { box.innerHTML = `<div class="empty">${P.sideCat === 'fav' ? 'Favori kanal yok.' : 'Kanal yok.'}</div>`; return; }
  renderChunked(box, items, (it, i) => liveRow(it, i, 'side', String(it.id) === curId).replace('data-act="live-row"', 'data-act="side"'),
    $('#pSideList'), { initial: idx + 40, bucket: P.io });
  const act = $('.row.active', box); if (act) act.scrollIntoView({ block: 'center' });
}
function markSideActive() {
  if (!P.side || !P.ctx) return;
  $$('#pSideItems .row.active').forEach((r) => r.classList.remove('active'));
  const i = (P.sideList || []).findIndex((x) => String(x.id) === String(P.ctx.item.id));
  const row = $(`#pSideItems .row[data-i="${i}"]`);
  if (row) { row.classList.add('active'); row.scrollIntoView({ block: 'nearest' }); }
}
function toggleSide(force) {
  P.side = force ?? !P.side;
  $('#pSide').classList.toggle('hidden', !P.side);
  $('#pChannels').classList.toggle('active', P.side);
  if (P.side) { P.sideCat = 'all'; renderSide(); }
}
function togglePlay() { if (!video.paused && Engine.item && Engine.item.type === 'live') Engine.follow = false; if (video.paused) { const p = video.play(); if (p && p.catch) p.catch(() => {}); } else video.pause(); updateProgress(); }
function toggleFs() { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else document.documentElement.requestFullscreen().catch(() => {}); }
function setVolume(v) { S.settings.vol = Math.max(0, Math.min(1, v)); video.volume = S.settings.vol; S.settings.muted = false; video.muted = false; $('#pVolume').value = S.settings.vol; saveSettings(); }
function wakeUi() {
  player.classList.remove('idle');
  clearTimeout(P.idleTimer);
  P.idleTimer = setTimeout(() => { if (!video.paused && !Menu.isOpen() && !P.side) player.classList.add('idle'); }, 3500);
}
player.addEventListener('mousemove', wakeUi);
// Tek tık oynat/duraklat, çift tık tam ekran. Tek tık kısa bir süre bekletilir; çift tık gelirse iptal edilir.
$('#playerStage').addEventListener('click', (e) => {
  if (Menu.isOpen()) { Menu.close(); return; }
  if (P.side) { toggleSide(false); return; }
  clearTimeout(P.clickTimer);
  if (e.detail > 1) return;
  P.clickTimer = setTimeout(togglePlay, 250);
});
$('#playerStage').addEventListener('dblclick', () => { clearTimeout(P.clickTimer); toggleFs(); });
$('#pBack').addEventListener('click', closePlayer);
$('#pPlay').addEventListener('click', togglePlay);
$('#pPrev').addEventListener('click', () => step(-1));
$('#pNext').addEventListener('click', () => step(1));
$('#pFull').addEventListener('click', toggleFs);
$('#pChannels').addEventListener('click', () => toggleSide());
$('#pSettings').addEventListener('click', () => (Menu.isOpen() ? Menu.close() : Menu.open()));
$('#pMute').addEventListener('click', () => { S.settings.muted = !video.muted; video.muted = S.settings.muted; saveSettings(); });
$('#pVolume').addEventListener('input', (e) => setVolume(+e.target.value));
$('#pBar').addEventListener('click', (e) => {
  if (!P.ctx) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const f = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  if (P.ctx.item.type === 'live') { const r = Engine.liveRange(); if (r) Engine.seekLive(r.start + f * (r.edge - r.start)); }
  else if (isFinite(video.duration)) video.currentTime = f * video.duration;
  updateProgress();
});
$('#pGoLive').addEventListener('click', () => { Engine.goLive(); updateProgress(); });
$('#pSideList').addEventListener('click', (e) => {
  const el = e.target.closest('[data-act="side"]'); if (!el) return;
  P.ctx.list = P.sideList;           // ↑↓ artık seçili kategoride gezinsin
  P.ctx.index = +el.dataset.i - 1; step(1);
});
$('#pSideCats').addEventListener('click', (e) => {
  const el = e.target.closest('[data-sc]'); if (!el) return;
  P.sideCat = el.dataset.sc;
  $$('#pSideCats .cat').forEach((b) => b.classList.toggle('active', b === el));
  renderSideList();
});
video.addEventListener('play', updateProgress);
video.addEventListener('pause', () => { updateProgress(); wakeUi(); });
function updateMuteIcon() {
  const off = video.muted || video.volume === 0;
  $('#pMute svg').innerHTML = off
    ? '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M23 9l-6 6M17 9l6 6"/>'
    : '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>';
  $('#pMute').setAttribute('aria-label', off ? 'Sesi aç' : 'Sesi kapat');
  $('#pMute').title = off ? 'Sesi aç (M)' : 'Sesi kapat (M)';
  $('.p-vol').classList.toggle('muted', off);
}
video.addEventListener('volumechange', updateMuteIcon);
video.addEventListener('ended', () => { if (P.ctx && P.ctx.item.type !== 'live') { savePos(P.ctx.item, video.duration, video.duration); if (P.ctx.index < P.ctx.list.length - 1) step(1); } });
document.addEventListener('fullscreenchange', () => { P.lastFs = Date.now(); });

// ---------------------------------------------------------------- oynatıcı ayarlar menüsü
const Menu = {
  page: 'main',
  isOpen() { return !$('#pMenu').classList.contains('hidden'); },
  open(page = 'main') { this.page = page; $('#pMenu').classList.remove('hidden'); this.render(); wakeUi(); },
  close() { $('#pMenu').classList.add('hidden'); this.page = 'main'; },
  refresh() { if (this.isOpen()) this.render(); },
  go(page) { this.page = page; this.render(); },

  audioTracks() {
    const h = Engine.hls;
    const nice = (l, i) => (!l || /handler|^und$/i.test(l) ? 'Track ' + (i + 1) : l);
    if (h && h.audioTracks && h.audioTracks.length) return h.audioTracks.map((t, i) => ({ i, label: nice(t.name || t.lang, i), on: i === h.audioTrack }));
    const at = video.audioTracks;
    if (at && at.length) return [...at].map((t, i) => ({ i, label: nice(t.label || t.language, i), on: t.enabled }));
    return [{ i: 0, label: 'Track 1', on: true }];
  },
  setAudio(i) {
    if (Engine.hls && Engine.hls.audioTracks.length) Engine.hls.audioTrack = i;
    else if (video.audioTracks) [...video.audioTracks].forEach((t, k) => { t.enabled = k === i; });
  },
  subTracks() {
    const h = Engine.hls;
    if (h && h.subtitleTracks && h.subtitleTracks.length) return h.subtitleTracks.map((t, i) => ({ i, label: t.name || t.lang || 'Altyazı ' + (i + 1), on: i === h.subtitleTrack }));
    return [...video.textTracks].filter((t) => t.kind === 'subtitles' || t.kind === 'captions').map((t, i) => ({ i, label: t.label || t.language || 'Altyazı ' + (i + 1), on: t.mode === 'showing' }));
  },
  setSub(i) {
    const h = Engine.hls;
    if (h && h.subtitleTracks && h.subtitleTracks.length) { h.subtitleDisplay = i >= 0; h.subtitleTrack = i; return; }
    [...video.textTracks].filter((t) => t.kind === 'subtitles' || t.kind === 'captions').forEach((t, k) => { t.mode = k === i ? 'showing' : 'disabled'; });
  },
  levels() {
    const h = Engine.hls; if (!h || !h.levels || h.levels.length < 2) return null;
    return h.levels.map((l, i) => ({ i, label: (l.height ? l.height + 'p' : 'Seviye ' + (i + 1)) + (l.bitrate ? ` · ${(l.bitrate / 1e6).toFixed(1)} Mbps` : '') }));
  },
  stats() {
    const q = video.getVideoPlaybackQuality ? video.getVideoPlaybackQuality() : null;
    let buf = 0;
    for (let i = 0; i < video.buffered.length; i++) if (video.buffered.start(i) <= video.currentTime + 0.3 && video.buffered.end(i) >= video.currentTime) buf = video.buffered.end(i) - video.currentTime;
    let vc = '', ac = '', speed = '';
    if (Engine.ts) {
      const mi = Engine.ts.mediaInfo || {}; vc = mi.videoCodec || ''; ac = mi.audioCodec || '';
      const si = Engine.ts.statisticsInfo || {}; if (si.speed) speed = (si.speed * 8 / 1000).toFixed(2) + ' Mbps';
    } else if (Engine.hls) {
      const l = Engine.hls.levels[Engine.hls.currentLevel] || Engine.hls.levels[0] || {};
      vc = l.videoCodec || ''; ac = l.audioCodec || '';
      if (Engine.hls.bandwidthEstimate) speed = (Engine.hls.bandwidthEstimate / 1e6).toFixed(2) + ' Mbps (tahmini)';
    }
    let host = ''; try { host = new URL(profile().server).host; } catch { /* */ }
    return [
      ['Motor', Engine.mode || '—'],
      ['Çözünürlük', video.videoWidth ? `${video.videoWidth}×${video.videoHeight}` : '—'],
      ['Video codec', vc || '—'], ['Ses codec', ac || '—'],
      ['İndirme hızı', speed || '—'],
      ['Tampon', buf.toFixed(1) + ' sn'],
      ['Düşen kare', q ? `${q.droppedVideoFrames} / ${q.totalVideoFrames}` : '—'],
      ['Önbellek', BUFFER[S.settings.buffer].label],
      ['Sunucu', host || '—']
    ];
  },
  item(icon, label, value, act) {
    return `<button type="button" class="m-item" data-m="${act}">${icon}<span class="ml">${esc(label)}</span><span class="mv">${esc(value || '')}</span>${ICON.chev}</button>`;
  },
  opt(label, on, act, val) {
    return `<button type="button" class="m-item opt" data-m="${act}" data-v="${esc(val)}">${on ? ICON.tick : '<span class="nt"></span>'}<span class="ml">${esc(label)}</span></button>`;
  },
  render() {
    const body = $('#pMenuBody');
    const back = this.page !== 'main';
    $('#pMenuBack').classList.toggle('hidden', !back);
    const titles = { main: 'Ayarlar', audio: 'Ses Dili', subs: 'Altyazı', quality: 'Kalite', buffer: 'Yayın Önbelleği', advanced: 'Gelişmiş Ayarlar', stats: 'İstatistikler' };
    $('#pMenuTitle').textContent = titles[this.page];
    const st = S.settings;
    if (this.page === 'main') {
      const a = this.audioTracks().find((t) => t.on);
      const s = this.subTracks().find((t) => t.on);
      const lv = this.levels();
      const h = Engine.hls;
      body.innerHTML =
        this.item(ICON.audio, 'Ses Dili', a ? a.label : 'Track 1', 'audio') +
        this.item(ICON.subs, 'Altyazı', s ? s.label : 'Kapalı', 'subs') +
        (lv ? this.item(ICON.quality, 'Kalite', h.autoLevelEnabled ? 'Otomatik' : (lv[h.currentLevel] || {}).label, 'quality') : '') +
        this.item(ICON.timer, 'Yayın Önbelleği', BUFFER[st.buffer].label, 'buffer') +
        this.item(ICON.sliders, 'Gelişmiş Ayarlar', '', 'advanced') +
        this.item(ICON.info, 'İstatistikler', '', 'stats');
    } else if (this.page === 'audio') {
      const t = this.audioTracks();
      body.innerHTML = t.map((x) => this.opt(x.label, x.on, 'set-audio', x.i)).join('') +
        (t.length < 2 ? '<div class="m-note">Bu yayında tek ses kanalı var. TS formatındaki canlı yayınlarda ek ses dilleri gösterilemez; HLS formatını deneyebilirsin.</div>' : '');
    } else if (this.page === 'subs') {
      const t = this.subTracks();
      body.innerHTML = this.opt('Kapalı', !t.some((x) => x.on), 'set-sub', -1) + t.map((x) => this.opt(x.label, x.on, 'set-sub', x.i)).join('') +
        (!t.length ? '<div class="m-note">Bu yayında altyazı bulunamadı.</div>' : '');
    } else if (this.page === 'quality') {
      const lv = this.levels() || []; const h = Engine.hls;
      body.innerHTML = this.opt('Otomatik', h && h.autoLevelEnabled, 'set-level', -1) + lv.map((x) => this.opt(x.label, h && !h.autoLevelEnabled && h.currentLevel === x.i, 'set-level', x.i)).join('');
    } else if (this.page === 'buffer') {
      body.innerHTML = Object.entries(BUFFER).map(([k, v]) => this.opt(v.label, st.buffer === k, 'set-buffer', k)).join('') +
        '<div class="m-note">Az: daha düşük gecikme, zayıf bağlantıda takılabilir. Fazla: daha geç ama daha akıcı. Değişiklik yayını yeniden açar.</div>';
    } else if (this.page === 'advanced') {
      body.innerHTML = '<div class="m-sub">Canlı yayın formatı</div>' +
        [['auto', 'Otomatik (TS, olmazsa HLS)'], ['ts', 'MPEG-TS'], ['hls', 'HLS (m3u8)']].map(([k, l]) => this.opt(l, st.format === k, 'set-format', k)).join('') +
        '<div class="m-sub">Görüntü</div>' +
        [['contain', 'Orijinal oran'], ['cover', 'Ekranı doldur (kırp)'], ['fill', 'Uzat']].map(([k, l]) => this.opt(l, st.fit === k, 'set-fit', k)).join('') +
        `<div class="m-note">Şu an: ${esc(Engine.mode || '—')}</div>`;
    } else if (this.page === 'stats') {
      body.innerHTML = `<dl class="stats">${this.stats().map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
    }
  }
};
$('#pMenuClose').addEventListener('click', () => Menu.close());
$('#pMenuBack').addEventListener('click', () => Menu.go('main'));
$('#pMenuBody').addEventListener('click', (e) => {
  const el = e.target.closest('[data-m]'); if (!el) return;
  const m = el.dataset.m, v = el.dataset.v;
  if (['audio', 'subs', 'quality', 'buffer', 'advanced', 'stats'].includes(m)) return Menu.go(m);
  if (m === 'set-audio') { Menu.setAudio(+v); Menu.go('main'); }
  else if (m === 'set-sub') { Menu.setSub(+v); Menu.go('main'); }
  else if (m === 'set-level') { if (Engine.hls) Engine.hls.currentLevel = +v; Menu.go('main'); }
  else if (m === 'set-buffer') { S.settings.buffer = v; saveSettings(); Engine.restart(); Menu.go('main'); }
  else if (m === 'set-format') { S.settings.format = v; saveSettings(); if (P.ctx && P.ctx.item.type === 'live') Engine.restart(); Menu.render(); }
  else if (m === 'set-fit') { S.settings.fit = v; saveSettings(); applyFit(); Menu.render(); }
});
function applyFit() { video.style.objectFit = S.settings.fit; }

// ---------------------------------------------------------------- olaylar (ana ekran)
view.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act;
  if (act === 'fav') {
    e.stopPropagation();
    const it = itemOf(el); if (!it) return;
    const target = it.type === 'episode' ? { type: 'series', id: it.seriesId, name: it.name, icon: it.icon } : it;
    const on = toggleFav(target);
    el.classList.toggle('on', on);
    toast(on ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı');
    if (S.section === 'favs') render();
    return;
  }
  if (act === 'cat' || act === 'gcat') {
    if (el.dataset.lock && !(await unlockAdult())) return;
    if (act === 'gcat') S.cat.guide = el.dataset.id; else S.cat[S.section] = el.dataset.id;
    render(); $('#scroll') && ($('#scroll').scrollTop = 0); return;
  }
  if (act === 'vod') { openDetail(itemOf(el)); return; }
  if (act === 'detail-back') { closeDetail(); return; }
  if (act === 'vd-play') { openPlayer(S.vodOpen, [S.vodOpen]); return; }
  if (act === 'vd-start') { const ps = positions(); delete ps['vod_' + S.vodOpen.id]; LS.set(posKey(), ps); openPlayer(S.vodOpen, [S.vodOpen]); return; }
  if (act === 'vd-fav') { toggleFav(S.vodOpen); render(); return; }
  if (act === 'vd-trailer') {
    const t = S.info['vod_' + S.vodOpen.id].trailer;
    const url = /^https?:/i.test(t) ? t : 'https://www.youtube.com/watch?v=' + encodeURIComponent(t);
    if (NATIVE) NATIVE.openExternal(url); else window.open(url);
    return;
  }
  if (act === 'hero-step') { heroStep(+el.dataset.id); return; }
  if (act === 'hero-go') { S.heroIdx = +el.dataset.id; renderHero(); startHeroTimer(); return; }
  if (act === 'hero-play') { const it = S.hero[S.heroIdx]; if (it.type === 'vod') openPlayer(it, [it]); else openDetail(it); return; }
  if (act === 'hero-detail') { openDetail(S.hero[S.heroIdx]); return; }
  if (act === 'goto') { setSection(el.dataset.id); return; }
  if (act === 'search-more') { const sec = el.dataset.id; S.cat[sec] = 'all'; setSection(sec, { keepQuery: true }); return; }
  if (act === 'gch') { openPlayer(itemOf(el), S.views.guide); return; }
  if (act === 'gprog') { const box = el.closest('.g-progs'); const e2 = box && box._epg && box._epg[+el.dataset.k]; if (e2) showProgram(S.views.guide[+el.dataset.i], e2); return; }
  if (act === 'acc') { S.accPage = el.dataset.id; S.pinSetup = false; render(); return; }
  if (act === 'acc-back') { S.accPage = null; render(); return; }
  if (act === 'acc-tab') { S.accTab = el.dataset.id; render(); return; }
  if (act === 'acc-edit') { showLogin(true); setForm(profile()); return; }
  if (act === 'acc-refresh') { try { S.account = await authenticate(profile()); renderAccount(); render(); toast('Hesap bilgileri güncellendi'); } catch (err) { toast(err.message, true); } return; }
  if (act === 'cats-all') {
    const tab = S.accTab || 'live'; const h = hiddenCats();
    h[tab] = el.dataset.id === 'on' ? [] : S.cache[tab].cats.map((c) => String(c.category_id));
    LS.set(hiddenKey(), h); S.hero = null; render(); return;
  }
  if (act === 'pin-change') { if (await askPin('PIN değiştir', 'Önce mevcut PIN\'i gir.')) { S.pinSetup = true; render(); } return; }
  if (act === 'pin-cancel') { S.pinSetup = false; render(); return; }
  if (act === 'pin-save') {
    const a = $('#pin1').value, b = $('#pin2').value;
    if (!/^\d{4}$/.test(a)) { $('#pinSetMsg').textContent = 'PIN 4 rakamdan oluşmalı.'; return; }
    if (a !== b) { $('#pinSetMsg').textContent = 'PIN\'ler eşleşmiyor.'; return; }
    savePset({ pinHash: await hashPin(a), adult: 'pin' }); S.pinSetup = false; S.adultUnlocked = false; S.hero = null;
    toast('PIN kaydedildi'); render(); return;
  }
  if (act === 'diag-run') { el.disabled = true; try { await runDiag(); } finally { el.disabled = false; } return; }
  if (act === 'panel-save') { savePset({ panelUrl: $('#panelUrl').value.trim() }); toast('Kaydedildi'); render(); return; }
  if (act === 'panel-open') { let u = pset().panelUrl; if (!/^https?:\/\//i.test(u)) u = 'https://' + u; if (NATIVE) NATIVE.openExternal(u); else window.open(u); return; }
  if (act === 'live') { const it = itemOf(el); const g = S.views[el.dataset.g]; openPlayer(it, g.filter((x) => x.type === 'live')); return; }
  if (act === 'live-row') { selectLive(itemOf(el)); return; }
  if (act === 'fullscreen') { if (S.selLive) openPlayer(S.selLive, S.views.live); return; }
  if (act === 'fav-sel') { toggleFav(S.selLive); renderLiveItems(); renderPreview(); return; }
  if (act === 'play') {
    const it = itemOf(el); if (!it) return;
    const g = S.views[el.dataset.g];
    openPlayer(it, el.dataset.g === 'eps' ? g : [it]);
    return;
  }
  if (act === 'series') { openDetail(itemOf(el)); return; }
  if (act === 'series-resume') { const r = S.seriesResume; if (r) openPlayer(r, S.views.eps.some((x) => x.id === r.id) ? S.views.eps : [r]); return; }
  if (act === 'season') { S.season = el.dataset.id; render(); return; }
  if (act === 'fav-series') { toggleFav(S.seriesOpen); render(); return; }
  if (act === 'clear-recent') { LS.set(recentKey(), []); render(); return; }
  if (act === 'accent') { S.settings.accent = el.dataset.id; saveSettings(); applyAccent(); render(); return; }
  if (act === 'profiles') { showLogin(true); return; }
  if (act === 'reload-all') { refreshAll(); return; }
  if (act === 'lang-save') {
    const pick = $('input[name=langPick]:checked'); if (!pick) return;
    S.settings.lang = pick.value; saveSettings();
    if (pick.value !== LANG) { if (playerOpen()) closePlayer(); location.reload(); }
    return;
  }
  if (act === 'retry') { setSection(S.section, { force: true }); }
});
view.addEventListener('dblclick', (e) => {
  const el = e.target.closest('[data-act="live-row"]'); if (!el) return;
  openPlayer(itemOf(el), S.views.live);
});
view.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.dataset.cid) {
    const h = hiddenCats(); const sec = t.dataset.sec; const id = String(t.dataset.cid);
    h[sec] = h[sec].filter((x) => x !== id); if (!t.checked) h[sec].push(id);
    LS.set(hiddenKey(), h); S.hero = null;
    if (S.cat[sec] === id) S.cat[sec] = 'all';
    return;
  }
  if (t.name === 'adultMode') {
    const ps = pset();
    if (ps.adult === 'pin' && ps.pinHash && t.value !== 'pin' && !(await askPin('PIN gerekli', 'Bu ayarı değiştirmek için PIN\'i gir.'))) { render(); return; }
    if (t.value === 'pin' && !ps.pinHash) { S.pinSetup = true; render(); $$('input[name=adultMode]').forEach((r) => { r.checked = r.value === 'pin'; }); return; }
    savePset({ adult: t.value }); S.adultUnlocked = false; S.pinSetup = false; S.hero = null; render();
    return;
  }
  if (t.type !== 'radio' || t.name === 'langPick') return;
  S.settings[t.name] = t.value; saveSettings();
  if (t.name === 'liveView') $$('#viewToggle button').forEach((b) => b.classList.toggle('active', b.dataset.view === t.value));
});

$('#brandHome').addEventListener('click', () => setSection('home'));
$$('.nav button[data-section]').forEach((b) => b.addEventListener('click', () => {
  // aynı bölümün menüsüne tekrar basınca alt sayfadan (detay, hesap kartı) listeye dön
  if (b.dataset.section === S.section) { S.seriesOpen = null; S.vodOpen = null; S.accPage = null; S.backTo = null; }
  setSection(b.dataset.section);
}));
$$('#viewToggle button').forEach((b) => b.addEventListener('click', () => {
  S.settings.liveView = b.dataset.view; saveSettings();
  $$('#viewToggle button').forEach((x) => x.classList.toggle('active', x === b));
  if (b.dataset.view === 'grid' && !playerOpen()) Engine.stop();
  render();
}));
let searchTimer;
$('#search').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = e.target.value.trim();
    S.query = q;
    if (!q) { if (S.section === 'search') setSection(S.searchFrom || 'home'); else render(); return; }
    if (q.length < 2) return;
    if (S.section !== 'search') S.searchFrom = S.section;
    if (S.section === 'search') render(); else setSection('search', { keepQuery: true });
  }, 250);
});
$('#sort').addEventListener('change', (e) => { S.sort = e.target.value; render(); });
async function refreshAll() {
  const p = profile(); if (!p) return;
  const btn = $('#refreshAll'); btn.disabled = true;
  showLoading('Güncel içerik alınıyor…');
  try {
    S.account = await authenticate(p);
    renderAccount();
    S.cache = {}; S.info = {}; S.hero = null; G.cache = {};
    if (S.seriesOpen) S.seriesOpen.info = null;
    hideLoading();
    await setSection(S.section, { force: true });
    toast('Listeler güncellendi');
  } catch (e) { hideLoading(); toast(e.message, true); }
  finally { btn.disabled = false; }
}
$('#refreshAll').addEventListener('click', refreshAll);
$('#profileBtn').addEventListener('click', () => showLogin(true));

document.addEventListener('keydown', (e) => {
  if (modalOpen()) { if (e.key === 'Escape') closeModal(); return; }
  const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName) && document.activeElement.type !== 'range';
  if (playerOpen()) {
    if (typing && e.key !== 'Escape') return;
    const k = e.key;
    if (k === 'Escape') {
      if (Date.now() - P.lastFs < 400) return;
      if (Menu.isOpen()) return Menu.close();
      if (document.fullscreenElement) return;
      return closePlayer();
    }
    if (k === ' ' || k === 'k') { e.preventDefault(); togglePlay(); }
    else if (k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); if (P.ctx.item.type === 'live') step(-1); else setVolume(video.volume + 0.05); }
    else if (k === 'ArrowDown' || k === 'PageDown') { e.preventDefault(); if (P.ctx.item.type === 'live') step(1); else setVolume(video.volume - 0.05); }
    else if (k === 'ArrowRight') { if (P.ctx.item.type === 'live') Engine.seekLive(video.currentTime + 10); else video.currentTime += 10; updateProgress(); }
    else if (k === 'ArrowLeft') { if (P.ctx.item.type === 'live') Engine.seekLive(video.currentTime - 10); else video.currentTime -= 10; updateProgress(); }
    else if ((k === 'l' || k === 'L') && P.ctx.item.type === 'live') { Engine.goLive(); updateProgress(); }
    else if (k === 'Backspace') { e.preventDefault(); prevChannel(); }
    else if (k === 'f' || k === 'F') toggleFs();
    else if (k === 'm' || k === 'M') $('#pMute').click();
    else if (k === 's' || k === 'S') Menu.isOpen() ? Menu.close() : Menu.open();
    else if ((k === 'c' || k === 'C') && P.ctx.item.type === 'live') toggleSide();
    else if (k === '+') setVolume(video.volume + 0.05);
    else if (k === '-') setVolume(video.volume - 0.05);
    wakeUi();
    return;
  }
  if (!$('#login').classList.contains('hidden')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#search').focus(); $('#search').select(); return; }
  if (typing) { if (e.key === 'Escape') document.activeElement.blur(); return; }
  if (S.section === 'live' && S.settings.liveView === 'list' && S.views.live && S.views.live.length) {
    const L = S.views.live; let i = S.selLive ? L.indexOf(S.selLive) : -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); i = Math.max(0, Math.min(L.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
      selectLive(L[i]); const row = $(`#items .row[data-i="${i}"]`); if (row) row.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && S.selLive) openPlayer(S.selLive, L);
  }
});

// ---------------------------------------------------------------- giriş / profiller
const form = $('#loginForm');
function showLogin(canClose) {
  if (playerOpen()) closePlayer();
  $('#login').classList.remove('hidden');
  $('#loginClose').classList.toggle('hidden', !(canClose && S.account));
  renderProfiles();
  setForm(null);
}
function hideLogin() { $('#login').classList.add('hidden'); }
function renderProfiles() {
  const box = $('#profileList');
  if (!S.profiles.length) { box.innerHTML = '<p class="muted small">Henüz kayıtlı profil yok.</p>'; return; }
  box.innerHTML = S.profiles.map((p) => {
    let host = p.server; try { host = new URL(p.server).host; } catch { /* */ }
    return `<div class="prof ${p.id === S.activeId && S.account ? 'active' : ''}">
      <span class="avatar">${esc(initials(p.name))}</span>
      <button type="button" class="prof-main" data-pid="${p.id}" data-pa="use"><span class="pn">${esc(p.name)}</span><span class="ps">${esc(host)} · ${esc(p.username)}</span></button>
      <button type="button" class="mini" data-pid="${p.id}" data-pa="edit" aria-label="Düzenle">${ICON.edit}</button>
      <button type="button" class="mini" data-pid="${p.id}" data-pa="del" aria-label="Sil">${ICON.trash}</button></div>`;
  }).join('');
}
function setForm(p) {
  S.editingId = p ? p.id : null;
  form.name.value = p ? p.name : '';
  form.server.value = p ? p.server : '';
  form.username.value = p ? p.username : '';
  form.password.value = p ? p.password : '';
  form.auto.checked = p ? !!p.auto : true;
  $('#formTitle').textContent = p ? 'Profili düzenle' : 'Xtream Codes ile bağlan';
  msg('');
}
function msg(t, kind) { const m = $('#formMsg'); m.textContent = t; m.className = 'form-msg ' + (kind || ''); }
function readForm() {
  const p = {
    id: S.editingId || uid(),
    name: form.name.value.trim(),
    server: normServer(form.server.value),
    username: form.username.value.trim(),
    password: form.password.value,
    auto: form.auto.checked
  };
  if (!form.server.value.trim() || !p.username || !p.password) throw new Error('Sunucu adresi, kullanıcı adı ve şifre gerekli.');
  if (!p.name) { try { p.name = new URL(p.server).hostname; } catch { p.name = 'Profil'; } }
  return p;
}
$('#profileList').addEventListener('click', async (e) => {
  const el = e.target.closest('[data-pa]'); if (!el) return;
  const p = S.profiles.find((x) => x.id === el.dataset.pid); if (!p) return;
  if (el.dataset.pa === 'edit') setForm(p);
  else if (el.dataset.pa === 'del') {
    if (!confirm(t(`"${p.name}" profili silinsin mi?`))) return;
    S.profiles = S.profiles.filter((x) => x !== p);
    if (S.activeId === p.id) { S.activeId = null; S.account = null; Engine.stop(); }
    saveProfiles(); renderProfiles(); $('#loginClose').classList.toggle('hidden', !S.account);
  } else if (el.dataset.pa === 'use') {
    msg('Bağlanılıyor…');
    try { await connect(p); } catch (err) { msg(err.message, 'err'); }
  }
});
$('#testBtn').addEventListener('click', async () => {
  try {
    const p = readForm(); msg('Test ediliyor…');
    const ui = await authenticate(p);
    const exp = ui.exp_date && +ui.exp_date ? new Date(+ui.exp_date * 1000).toLocaleDateString(DATE_LOC) : 'sınırsız';
    msg(`Bağlantı başarılı · bitiş: ${exp} · bağlantı: ${ui.active_cons ?? 0}/${ui.max_connections ?? '?'}`, 'ok');
  } catch (err) { msg(err.message, 'err'); }
});
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#connectBtn');
  try {
    const p = readForm();
    btn.disabled = true; msg('Bağlanılıyor…');
    await connect(p, true);
  } catch (err) { msg(err.message, 'err'); }
  finally { btn.disabled = false; }
});
$('#pwToggle').addEventListener('click', () => { form.password.type = form.password.type === 'password' ? 'text' : 'password'; });
$('#loginClose').addEventListener('click', hideLogin);

async function connect(p, save) {
  const ui = await authenticate(p);
  if (save) {
    const i = S.profiles.findIndex((x) => x.id === p.id);
    if (i >= 0) S.profiles[i] = p; else S.profiles.push(p);
  }
  if (S.activeId !== p.id) { S.cache = {}; S.info = {}; G.cache = {}; S.cat = { live: 'all', vod: 'all', series: 'all', guide: null }; S.selLive = null; }
  Engine.stop(); parkVideo();
  S.activeId = p.id; S.account = ui;
  saveProfiles();
  hideLogin();
  $('#app').classList.remove('hidden');
  renderAccount();
  S.hero = null; S.adultUnlocked = false;
  await setSection('home', { force: !S.cache.vod });
}

// ---------------------------------------------------------------- başlat
(async function init() {
  startI18n();
  if (IS_MAC) $('.search kbd').textContent = '⌘K';
  applyAccent(); applyFit();
  $('#pVolume').value = S.settings.vol;
  video.volume = S.settings.vol; video.muted = S.settings.muted; updateMuteIcon();
  const p = profile();
  if (p && p.auto) {
    showLoading('Bağlanılıyor…');
    try { await connect(p); return; }
    catch (e) { showLogin(false); setForm(p); msg(e.message, 'err'); }
    finally { hideLoading(); }
  } else showLogin(false);
})();
