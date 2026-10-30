# VPS release activation preparation

The existing S-04 workflow uploads `server/` contents directly into `/opt/nexgameworld/releases/staging-RUNID-ATTEMPT/`. Therefore the systemd unit's `WorkingDirectory=/opt/nexgameworld/current` is correct once the symlink is created.

As `ngw-deploy`, run `bash ops/vps/select-release.sh staging-RUNID-ATTEMPT` from a checked-out copy of the repository, or use the same script through a controlled GitHub Actions job. This only changes the symlink and validates the staged files; it does not start the game.

Before starting the service, provision `/opt/nexgameworld/shared/server.env` securely, set the chest data file to shared storage, confirm all Render environment flags, and plan a single-authoritative-server cutover to avoid two processes writing to the same Neon database.

Do not copy secrets into GitHub Actions logs or source control. Verify `/health`, `/ready`, HTTPS/WSS and TeamSpeak before changing the public client.
