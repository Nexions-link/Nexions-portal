# S-05: VPS service security prerequisites

The game server supports `HOST=127.0.0.1` to bind only to loopback on the VPS. Render retains its previous default `0.0.0.0`.

Do not start a second authoritative server with the same Neon database until a safe cutover is planned.

Before starting:
1. Friend/root installs `ops/vps/nexgameworld.service` only after verifying the exact release directory and a safe `current` symlink.
2. Private `/opt/nexgameworld/shared/server.env` must contain `HOST=127.0.0.1`, `PORT=9800`, database settings and flags migrated securely from Render; permissions 0600, never commit secrets.
3. Configure reverse proxy and HTTPS/WSS on an available public endpoint, without changing TeamSpeak's bound ports.
4. Validate auth, health/readiness, persistent chest storage, client connectivity, multiplayer and rollback.
5. Cut over client endpoint and only then retire Render.

The existing systemd unit is a draft, not activated. The S-04 staging workflow does not start a service.
