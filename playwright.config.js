// Uçtan uca testler: gerçek Electron uygulaması + sahte Xtream/M3U sunucusu (test/mock-server.js)
module.exports = {
  testDir: 'test',
  timeout: 90000,
  expect: { timeout: 15000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list'
};
