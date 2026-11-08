# Contributing

Thanks for helping to improve Catana IPTV!

## Getting started

```bash
git clone https://github.com/hakancatana/catana-iptv.git
cd catana-iptv
npm install
npm start
```

No account needed for development: start the mock server and log in with `http://127.0.0.1:8199`, user `demo`, password `demo` (or the M3U playlist `http://127.0.0.1:8199/playlist.m3u`).

```bash
node test/mock-server.js
```

## Project layout

| Path | What |
|---|---|
| `main.js` | Electron main process: window, encryption, updates |
| `preload.js` | The small API the UI may use (`window.native`) |
| `src/index.html`, `src/style.css` | Markup and styles |
| `src/app.js` | All UI logic (plain JavaScript, no framework) |
| `src/i18n.js` | Translations — the UI is written in Turkish and translated at runtime |
| `test/` | Playwright end-to-end tests and the mock Xtream/M3U server |

## Tests

```bash
npm test                 # Windows / macOS
xvfb-run -a npm test     # Linux without a display
```

Tests run automatically on every push and pull request.

## Translations

Add the Turkish text as a key in `DICT` (or a pattern in `RULES`) in `src/i18n.js`, with one translation per language in this order: en, de, fr, es, it, ru, zh, hi.

## Pull requests

- Keep changes focused; one feature or fix per pull request.
- Add or update a test when you change behaviour.
- Never commit real server addresses, credentials or playlists.
