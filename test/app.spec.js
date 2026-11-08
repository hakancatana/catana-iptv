// Catana IPTV uçtan uca testleri — `npm test`
// Linux'ta ekran yoksa: xvfb-run -a npm test
const { test, expect, _electron } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { fork } = require('child_process');

const APP = path.join(__dirname, '..');
const PORT = 8199;
const BASE = `http://127.0.0.1:${PORT}`;
let server;

test.beforeAll(async () => {
  server = fork(path.join(__dirname, 'mock-server.js'), [String(PORT)], { stdio: 'pipe' });
  await new Promise((resolve) => server.stdout.once('data', resolve));
});
test.afterAll(() => { if (server) server.kill(); });

async function launch(lang = 'tr') {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'catana-test-'));
  const app = await _electron.launch({ args: [APP, '--no-sandbox', `--user-data-dir=${userData}`] });
  const page = await app.firstWindow();
  page.on('pageerror', (e) => { throw e; });
  await page.evaluate((l) => {
    localStorage.setItem('catana.settings', JSON.stringify({ lang: l }));
    localStorage.setItem('catana.updateChecked', String(Date.now() + 864e5)); // testte GitHub'a gitme
  }, lang);
  await page.reload();
  await page.waitForSelector('#loginForm');
  return { app, page };
}
async function loginXtream(page, password = 'demo') {
  await page.fill('[name=name]', 'Test');
  await page.fill('[name=server]', BASE);
  await page.fill('[name=username]', 'demo');
  await page.fill('[name=password]', password);
  await page.click('#connectBtn');
}
const playing = (page) => page.evaluate(() => document.querySelector('#video').currentTime);

test.describe('Xtream Codes', () => {
  let app, page;
  test.beforeAll(async () => { ({ app, page } = await launch('tr')); });
  test.afterAll(async () => { await app.close(); });

  test('yanlış şifre hata gösterir', async () => {
    await page.fill('[name=server]', BASE);
    await page.fill('[name=username]', 'demo');
    await page.fill('[name=password]', 'wrong');
    await page.click('#testBtn');
    await expect(page.locator('#formMsg')).toHaveClass(/err/);
  });

  test('giriş anasayfayı ve slider\'ı açar', async () => {
    await loginXtream(page);
    await expect(page.locator('#hero .hero-title')).toBeVisible();
    expect(await page.locator('.hrow .poster').count()).toBeGreaterThan(5);
  });

  test('canlı kanal oynar, geri sarılır ve canlıya döner', async () => {
    await page.click('[data-section=live]');
    await page.click('#viewToggle [data-view=grid]');
    await page.locator('.tile').first().click();
    await expect.poll(() => playing(page), { timeout: 20000 }).toBeGreaterThan(1);
    await page.waitForTimeout(3000);
    await page.keyboard.press('ArrowLeft');
    expect(await page.evaluate(() => Engine.follow)).toBe(false);
    await page.keyboard.press('l');
    expect(await page.evaluate(() => Engine.follow)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#player')).toBeHidden();
  });

  test('favori ekleme', async () => {
    await page.locator('.tile').nth(2).hover();
    await page.locator('.tile').nth(2).locator('.fav').click();
    await page.click('[data-section=favs]');
    await expect(page.locator('.tile')).toHaveCount(1);
  });

  test('TV rehberi programları gösterir', async () => {
    await page.click('[data-section=guide]');
    await expect.poll(() => page.locator('.g-prog').count()).toBeGreaterThan(5);
  });

  test('genel arama kanal ve film bulur', async () => {
    await page.fill('#search', 'trt');
    await expect.poll(() => page.locator('#view .tile').count()).toBeGreaterThan(3);
    await page.fill('#search', 'metropolis');
    await expect(page.locator('#view .poster')).toHaveCount(1);
    await page.fill('#search', '');
  });

  test('film ve dizi detay sayfaları', async () => {
    await page.click('[data-section=vod]');
    await page.locator('.poster', { hasText: 'Metropolis' }).first().click();
    await expect(page.locator('.series-info h2')).toHaveText('Metropolis');
    await expect(page.locator('.dh-poster img')).toBeVisible();
    await page.click('[data-section=series]');
    await page.locator('.poster', { hasText: 'Bonanza' }).first().click();
    await expect.poll(() => page.locator('.episode').count()).toBeGreaterThan(5);
    expect(await page.locator('.seasons .chip').count()).toBe(4);
  });

  test('çoklu izleme iki kanalı birlikte oynatır', async () => {
    await page.click('[data-section=multi]');
    for (const i of [0, 1]) {
      await page.click(`[data-act=mv-pick][data-id="${i}"]`);
      await page.locator('#pickList .row').nth(i + 3).click();
    }
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('#mvGrid video')].filter((v) => v.currentTime > 1).length), { timeout: 25000 }).toBe(2);
    await page.click('[data-section=home]');
    expect(await page.evaluate(() => MV.players.length)).toBe(0);
  });

  test('sorun bildirme gizli bilgileri maskeler', async () => {
    await page.evaluate(() => console.warn('test ' + location.href + ' http://127.0.0.1:8199/live/demo/demo/1.ts'));
    await page.evaluate(() => openReport());
    const text = await page.locator('.report-box').inputValue();
    expect(text).not.toContain('127.0.0.1:8199');
    expect(text).not.toContain('/demo/demo/');
    expect(text).toContain('Version:');
    await page.keyboard.press('Escape');
  });

  test('TV modu yön tuşlarıyla gezinir', async () => {
    await page.click('[data-section=settings]');
    await page.check('input[name=tvMode][value=on]');
    await expect(page.locator('html')).toHaveClass(/tv/);
    await page.click('[data-section=home]');
    const before = await page.evaluate(() => document.activeElement.textContent.trim());
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    const after = await page.evaluate(() => document.activeElement.textContent.trim());
    expect(after).not.toBe(before);
    await page.click('[data-section=settings]');
    await page.check('input[name=tvMode][value=off]');
    await expect(page.locator('html')).not.toHaveClass(/tv/);
  });

  test('yedek dışa ve içe aktarılır', async () => {
    const backup = await page.evaluate(() => new Promise((resolve) => {
      const orig = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () { HTMLAnchorElement.prototype.click = orig; fetch(this.href).then((r) => r.text()).then(resolve); };
      exportBackup(false);
    }));
    const data = JSON.parse(backup);
    expect(data.app).toBe('catana-iptv');
    expect(JSON.stringify(data)).not.toContain('"password":"demo"');
    // favorileri sil, yedekten geri yükle
    await page.evaluate(() => localStorage.setItem('catana.favs.' + S.activeId, '{"live":[],"vod":[],"series":[]}'));
    await page.evaluate((txt) => { window.confirm = () => true; importBackup(new File([txt], 'b.json')); }, backup);
    await page.waitForSelector('#hero');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('catana.favs.' + S.activeId)).live.length)).toBe(1);
  });

  test('dil değişimi arayüzü çevirir', async () => {
    await page.click('[data-section=settings]');
    await page.check('input[name=langPick][value=de]');
    await page.click('[data-act=lang-save]');
    await expect(page.locator('.nav [data-section=home]')).toContainText('Startseite');
    await expect(page.locator('.nav [data-section=live]')).toContainText('Live-TV');
  });
});

test.describe('M3U listesi', () => {
  test('M3U profili kanalları ve filmleri yükler, kanal oynar', async () => {
    const { app, page } = await launch('en');
    await page.click('[data-ftype=m3u]');
    await page.fill('[name=m3u]', BASE + '/playlist.m3u');
    await page.click('#testBtn');
    await expect(page.locator('#formMsg')).toContainText('26');
    await page.click('#connectBtn');
    await expect(page.locator('#hero .hero-title')).toBeVisible();
    await expect(page.locator('.nav [data-section=series]')).toBeHidden();
    await page.click('[data-section=live]');
    await page.click('#viewToggle [data-view=grid]');
    await expect(page.locator('.tile')).toHaveCount(26);
    await page.locator('.tile').first().click();
    await expect.poll(() => playing(page), { timeout: 20000 }).toBeGreaterThan(1);
    const stored = await page.evaluate(() => localStorage.getItem('catana.profiles'));
    if (await page.evaluate(() => ENC_OK)) expect(stored).not.toContain('playlist.m3u');
    await app.close();
  });
});
