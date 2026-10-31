# NexGameWorld PC ES module bootstrap hardening

- Diagnosed screenshot: Chrome/desktop failed to fetch `/nexgameworld/planet-test/planet.js?v=250`. The previous HTML imported Three.js r160 from `cdn.jsdelivr.net`, which may be unreachable from the player's network. Such errors show the top-level dynamic import even if a *dependency* fails. Precise failure cause in that PC session still requires the browser's Network tab.
- Fix release 0.6.45.44: self-host an **unaltered** upstream Three.js r160 `build/three.module.js` on `/nexgameworld/planet-test/vendor/three.module.js` (MIT licensed, LICENSE retained). The native HTML import map and modulepreload now use a same-origin URL. No new dependencies, no CORS/CDN requirement.
- Errors now offer a manual "Повторить загрузку" button, with a cache-busting page query to avoid a failed ES-module cache entry. No silent reload loop.
- External audit additionally checks the **exact** `planet.js?v=251` requested by the HTML, vendor module, start zone, tree and meadow modules, and JavaScript MIME types where supplied.
- This fixes a reliability gap, not the movement/game code. The graphics G-14, camera, collisions, WebSocket API and VPS/TeamSpeak configurations are unchanged.
- Automated acceptance: `planet-test/tests/three-vendor-bootstrap.test.mjs`, `ops/audit-production.test.mjs`, complete spherical/client/server CI, mirror sync, Pages, live domain and VPS readiness. End-to-end PC browser verification requires a user-side reload.
