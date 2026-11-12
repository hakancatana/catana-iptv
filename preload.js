const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('native', {
  // Windows'ta DPAPI ile şifreler: yalnızca bu Windows kullanıcısı çözebilir
  canEncrypt: () => ipcRenderer.sendSync('crypto:available'),
  encrypt: (text) => ipcRenderer.sendSync('crypto:encrypt', text),
  decrypt: (b64) => ipcRenderer.sendSync('crypto:decrypt', b64),
  keepAwake: (on) => ipcRenderer.send('power:keepAwake', !!on),
  openExternal: (url) => ipcRenderer.send('shell:open', url),
  setFullScreen: (on) => ipcRenderer.send('win:fullscreen', !!on),
  platform: process.platform,
  winCtl: (cmd) => ipcRenderer.send('win:ctl', cmd),
  onWinState: (cb) => ipcRenderer.on('win:state', (e, st) => cb(st)),
  installUpdate: (url) => ipcRenderer.invoke('update:install', url),
  onUpdateProgress: (cb) => ipcRenderer.on('update:progress', (e, p) => cb(p)),
  versions: { app: ipcRenderer.sendSync('app:version'), electron: process.versions.electron, chrome: process.versions.chrome }
});
