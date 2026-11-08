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
  if (S.info[key]) return S.info[key];
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
    trailer: i.youtube_trailer || ''
  };
  S.info[key] = out;
  return out;
}
const metaLine = (inf, it) => [inf.year || (it.year ? String(it.year).slice(0, 4) : ''), inf.duration, inf.genre, (parseFloat(inf.rating || it.rating) > 0 ? '★ ' + parseFloat(inf.rating || it.rating).toFixed(1) : '')].filter(Boolean).join(' · ');
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
  $('#vd').innerHTML = `<div class="detail-hero">${inf.backdrop ? `<div class="hero-bg" style="${bgStyle(inf.backdrop)}"></div><div class="hero-shade"></div>` : ''}
    ${backBtn(backLabel('Filmler'))}
    <div class="series-detail">
      <div class="series-cover">${cover ? `<img src="${esc(cover)}" alt="" data-fb="poster">` : ''}</div>
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
  const day = new Date(now).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
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
  openModal(`<div class="muted small">${esc(item.name)} · ${new Date(e.start).toLocaleDateString('tr-TR', { weekday: 'long' })} ${hhmm(e.start)} – ${hhmm(e.end)}</div>
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
const fmtDate = (unix) => (unix && +unix ? new Date(+unix * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
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
      ${cell('Şifre saklama', ENC_OK ? 'Şifreli (Windows DPAPI)' : 'Şifrelenmemiş', ENC_OK ? 'Şifre yalnızca bu Windows kullanıcısıyla çözülebilir.' : 'Bu sistemde şifreleme kullanılamıyor.', ENC_OK ? 'ok-t' : 'bad-t')}
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
  rows.push(row('ÇATANA IPTV', v.app || '—'));
  rows.push(row('Electron / Chromium', `${v.electron || '—'} / ${v.chrome || '—'}`));
  rows.push(row('Şifre saklama', ENC_OK ? 'Şifreli (DPAPI)' : 'Şifrelenmemiş', ENC_OK ? 'ok' : 'warn'));
  paint();
}
