// Test ve ekran görüntüleri için sahte Xtream Codes / M3U sunucusu.
// Veriler: ücretsiz yayınlanan kanallar, telifsiz klasikler ve açık lisanslı Blender filmleri.
// Kullanım: node test/mock-server.js [port]   (varsayılan 8199)
const http = require('http');
const fs = require('fs');
const path = require('path');
const D = require('./fixtures/data');

const PORT = +(process.argv[2] || process.env.MOCK_PORT || 8199);
const BASE = `http://127.0.0.1:${PORT}`;
const USER = 'demo', PASS = 'demo';
const STREAM = fs.readFileSync(path.join(__dirname, 'fixtures', 'stream.ts'));

const b64 = (s) => Buffer.from(s).toString('base64');
const now = () => Math.floor(Date.now() / 1000);
const BOOT = now();
const catIds = Object.keys(D.cats);
const live = D.live.map(([name, cat], i) => ({ num: i + 1, name, stream_id: 1000 + i, stream_icon: '', category_id: String(1 + catIds.indexOf(cat)), tv_archive: 0 }));
const movies = D.movies.map((m, i) => ({ name: m[0], stream_id: 2000 + i, stream_icon: `${BASE}/poster/m${i}.svg`, rating: String(m[3]), added: String(BOOT - i * 86400 * 3), category_id: m[1] > 2000 ? '20' : '21', container_extension: 'mp4', year: String(m[1]) }));
const series = D.series.map((s, i) => ({ name: s[0], series_id: 3000 + i, cover: `${BASE}/poster/s${i}.svg`, rating: String(s[3]), category_id: s[2].startsWith('Western') ? '31' : '30', releaseDate: s[1] + '-09-01', last_modified: String(BOOT - i * 86400 * 2) }));

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function art(title, year, c1, c2, w, h, seed) {
  const r = (n) => { seed = (seed * 9301 + 49297) % 233280; return (seed / 233280) * n; };
  let shapes = '';
  for (let k = 0; k < 5; k++) shapes += `<circle cx="${r(w)}" cy="${r(h * 0.7)}" r="${40 + r(w / 3)}" fill="${c1}" opacity="${0.08 + r(0.18)}"/>`;
  const lines = []; let cur = '';
  for (const wd of title.split(' ')) { if ((cur + ' ' + wd).trim().length > 12) { lines.push(cur.trim()); cur = wd; } else cur += ' ' + wd; }
  lines.push(cur.trim());
  const tall = w < h, fs2 = lines.length > 2 ? 40 : 50, y0 = h * 0.72 - (lines.length - 1) * fs2 * 0.55;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${c2}"/>${shapes}
<rect x="${tall ? 30 : 0}" y="${tall ? h * 0.5 : h * 0.4}" width="${tall ? w - 60 : w}" height="2" fill="${c1}" opacity=".5"/>
${tall ? lines.map((l, k) => `<text x="${w / 2}" y="${y0 + k * fs2 * 1.1}" font-family="Georgia, serif" font-weight="700" font-size="${fs2}" fill="${c1}" text-anchor="middle">${esc(l)}</text>`).join('') + `<text x="${w / 2}" y="${h - 40}" font-family="Arial" font-size="20" letter-spacing="6" fill="${c1}" opacity=".8" text-anchor="middle">${year}</text>` : ''}</svg>`;
}
function playlist() {
  const L = ['#EXTM3U'];
  live.forEach((c) => L.push(`#EXTINF:-1 tvg-id="${c.stream_id}" tvg-name="${c.name}" tvg-logo="" group-title="${D.cats[D.live[c.stream_id - 1000][1]]}",${c.name}`, `${BASE}/live/${USER}/${PASS}/${c.stream_id}.ts`));
  movies.forEach((m) => L.push(`#EXTINF:-1 tvg-logo="${m.stream_icon}" group-title="Movies",${m.name} (${m.year})`, `${BASE}/movie/${USER}/${PASS}/${m.stream_id}.mp4`));
  return L.join('\n');
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, BASE);
  const json = (o) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/player_api.php') {
    if (u.searchParams.get('username') !== USER || u.searchParams.get('password') !== PASS) return json({ user_info: { auth: 0 } });
    const a = u.searchParams.get('action');
    if (!a) return json({ user_info: { username: USER, auth: 1, status: 'Active', exp_date: String(now() + 86400 * 214), is_trial: '0', active_cons: '0', max_connections: '4', created_at: String(now() - 86400 * 400), allowed_output_formats: ['m3u8', 'ts'] }, server_info: { url: '127.0.0.1', port: String(PORT), server_protocol: 'http', timezone: 'UTC', time_now: new Date().toISOString().slice(0, 19).replace('T', ' ') } });
    if (a === 'get_live_categories') return json(catIds.map((k, i) => ({ category_id: String(i + 1), category_name: D.cats[k] })));
    if (a === 'get_live_streams') return json(live);
    if (a === 'get_vod_categories') return json([{ category_id: '20', category_name: 'Open Movies' }, { category_id: '21', category_name: 'Classics' }]);
    if (a === 'get_vod_streams') return json(movies);
    if (a === 'get_vod_info') {
      const i = +u.searchParams.get('vod_id') - 2000, m = D.movies[i];
      return json({ info: { plot: m[7], genre: m[2], releasedate: m[1] + '-01-01', duration: m[4], rating: String(m[3]), director: m[5], cast: m[6], backdrop_path: [`${BASE}/backdrop/m${i}.svg`] }, movie_data: {} });
    }
    if (a === 'get_series_categories') return json([{ category_id: '30', category_name: 'Classic TV' }, { category_id: '31', category_name: 'Westerns' }]);
    if (a === 'get_series') return json(series);
    if (a === 'get_series_info') {
      const i = +u.searchParams.get('series_id') - 3000, s = D.series[i], eps = {};
      for (let sn = 1; sn <= s[7]; sn++) eps[sn] = Array.from({ length: s[8] }, (_, k) => ({ id: String(4000 + i * 100 + sn * 20 + k), episode_num: k + 1, title: '', container_extension: 'mp4', info: { duration: '00:2' + (5 + (k % 4)) + ':00', movie_image: `${BASE}/backdrop/s${i}.svg` } }));
      return json({ info: { plot: s[4], genre: s[2], releaseDate: s[1] + '-09-01', rating: String(s[3]), backdrop_path: [`${BASE}/backdrop/s${i}.svg`] }, episodes: eps });
    }
    if (a === 'get_short_epg') {
      const sid = +u.searchParams.get('stream_id'), key = D.live[sid - 1000][1], titles = D.epg[key], L = [];
      let t = Math.floor(Date.now() / 1000 / 900) * 900 - 3600 - (sid % 4) * 900;
      for (let k = 0; k < 24; k++) { const len = [30, 45, 60, 90, 60, 30][(sid + k) % 6] * 60; L.push({ title: b64(titles[(sid + k) % titles.length]), description: b64(titles[(sid + k) % titles.length] + ' on ' + live[sid - 1000].name + '.'), start_timestamp: String(t), stop_timestamp: String(t + len) }); t += len; }
      return json({ epg_listings: L });
    }
    return json([]);
  }
  if (u.pathname === '/playlist.m3u') { res.writeHead(200, { 'content-type': 'audio/x-mpegurl' }); return res.end(playlist()); }
  const m = u.pathname.match(/^\/(poster|backdrop)\/([ms])(\d+)\.svg$/);
  if (m) {
    const it = (m[2] === 'm' ? D.movies : D.series)[+m[3]];
    const [c1, c2] = m[2] === 'm' ? [it[8], it[9]] : [it[5], it[6]];
    res.writeHead(200, { 'content-type': 'image/svg+xml' });
    return res.end(m[1] === 'poster' ? art(it[0], it[1], c1, c2, 400, 600, +m[3] * 7 + 3) : art(it[0], it[1], c1, c2, 1280, 720, +m[3] * 7 + 3));
  }
  if (/^\/(live|movie|series)\//.test(u.pathname)) {
    // canlı yayını taklit et: dosyayı gerçek zamandan biraz hızlı, döngüyle gönder
    res.writeHead(200, { 'content-type': 'video/mp2t' });
    const perTick = Math.ceil(STREAM.length / 12 / 4 * 1.5);
    let off = 0;
    const tick = () => { if (res.destroyed) return; if (off >= STREAM.length) off = 0; res.write(STREAM.subarray(off, off + perTick)); off += perTick; setTimeout(tick, 250); };
    return tick();
  }
  res.writeHead(404); res.end();
});
server.listen(PORT, '127.0.0.1', () => console.log('mock server on ' + BASE));
module.exports = server;
