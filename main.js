const { app, BrowserWindow, Menu, shell, ipcMain, safeStorage, powerSaveBlocker, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Donanım destekliyse HEVC (H.265) çözmeyi aç — bazı 4K kanallar HEVC yayınlıyor.
app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport');
// Film/dizi dosyalarında (mp4/mkv) çoklu ses dili seçimi için video.audioTracks API'si.
app.commandLine.appendSwitch('enable-blink-features', 'AudioVideoTracks');
// Canlı yayını 30 dk geri sarabilmek için MSE tampon sınırlarını büyüt (varsayılan ~150 MB).
app.commandLine.appendSwitch('mse-video-buffer-size-limit-mb', '1500');
app.commandLine.appendSwitch('mse-audio-buffer-size-limit-mb', '120');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Ubuntu 24.04+ AppArmor, AppImage içindeki Chromium korumalı alanını engelliyor; .deb/.rpm kurulumlarında gerek yok
if (process.platform === 'linux' && process.env.APPIMAGE) app.commandLine.appendSwitch('no-sandbox');

// ---- şifreleme (Windows: DPAPI, macOS: Anahtar Zinciri)
ipcMain.on('crypto:available', (e) => {
  let ok = safeStorage.isEncryptionAvailable();
  // Linux'ta anahtar zinciri yoksa Electron sabit anahtarla "şifreler"; bunu gerçek şifreleme saymıyoruz
  if (ok && process.platform === 'linux') { try { ok = safeStorage.getSelectedStorageBackend() !== 'basic_text'; } catch { ok = false; } }
  e.returnValue = ok;
});
ipcMain.on('crypto:encrypt', (e, text) => {
  try { e.returnValue = safeStorage.encryptString(String(text)).toString('base64'); } catch { e.returnValue = null; }
});
ipcMain.on('crypto:decrypt', (e, b64) => {
  try { e.returnValue = safeStorage.decryptString(Buffer.from(String(b64), 'base64')); } catch { e.returnValue = null; }
});
ipcMain.on('app:version', (e) => { e.returnValue = app.getVersion(); });

// ---- izlerken ekran kararmasın / uyku olmasın
let blocker = null;
ipcMain.on('power:keepAwake', (e, on) => {
  if (on && blocker === null) blocker = powerSaveBlocker.start('prevent-display-sleep');
  if (!on && blocker !== null) { powerSaveBlocker.stop(blocker); blocker = null; }
});

// ---- güncelleme: Windows kurulum dosyasını indir, çalıştır, uygulamayı kapat
ipcMain.handle('update:install', async (e, url) => {
  if (process.platform !== 'win32' || !/^https:\/\/github\.com\/hakancatana\/catana-iptv\/releases\/download\//.test(String(url))) throw new Error('bad url');
  const res = await net.fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const total = +res.headers.get('content-length') || 0;
  const file = path.join(app.getPath('temp'), 'Catana-IPTV-Setup.exe');
  const out = fs.createWriteStream(file);
  const reader = res.body.getReader();
  let got = 0, last = -1;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    got += value.length;
    if (!out.write(Buffer.from(value))) await new Promise((r) => out.once('drain', r));
    const pct = total ? Math.floor(got / total * 100) : 0;
    if (pct !== last) { last = pct; e.sender.send('update:progress', pct); }
  }
  await new Promise((r) => out.end(r));
  spawn(file, [], { detached: true, stdio: 'ignore' }).unref();
  setTimeout(() => app.quit(), 800);
  return true;
});

ipcMain.on('shell:open', (e, url) => { if (/^https?:\/\//i.test(String(url))) shell.openExternal(url); });

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0E1014',
    title: 'Catana IPTV',
    icon: path.join(__dirname, 'src', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Xtream sunucuları CORS başlığı göndermez; masaüstü uygulamada bu kontrolü kapatıyoruz.
      webSecurity: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F12' || (isMac && input.meta && input.alt && input.key.toLowerCase() === 'i')) win.webContents.toggleDevTools();
  });
}

const isMac = process.platform === 'darwin';
// macOS'ta uygulama menüsü olmadan ⌘C/⌘V/⌘Q gibi kısayollar çalışmaz
Menu.setApplicationMenu(isMac ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]) : null);
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (!isMac) app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
