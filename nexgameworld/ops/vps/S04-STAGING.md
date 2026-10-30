# VPS S-04 — безопасная загрузка серверной части

Workflow: `.github/workflows/ngw-vps-stage.yml`. Manual `workflow_dispatch` only.

What it does:
- Checks out the selected commit and verifies `server/index.js` syntax.
- Authenticates SSH to `ngw-deploy@94.103.87.93` using repository secret `SSH_PRIVATE_KEY` and a pinned, independently provided ED25519 host key.
- Uploads only the `server/` subtree into a new `/opt/nexgameworld/releases/staging-RUNID-ATTEMPT/` directory.
- Runs `npm install --omit=dev --ignore-scripts`, verifies JS syntax and dependencies.
- Prints `STAGING_OK` on success.

What it does NOT do: start or restart a service, update `current`, alter firewall/ports, access Neon, touch TeamSpeak or Render, change the client, or publish a game release.

Caution: package-lock.json is currently absent from `server/`; npm install is not yet a reproducible locked install. Before production cutover add lockfile, secure loopback binding and HTTPS/WSS reverse proxy, confirm required environment variables and persistence, and avoid simultaneous authoritative servers.

Run from GitHub Actions > NGW VPS S-04 stage server files > Run workflow (branch main).
