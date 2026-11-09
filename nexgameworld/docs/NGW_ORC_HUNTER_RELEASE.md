# NexGameWorld 0.6.46.0 — Orc and Hunter

Baseline audited: main 87169d9, 0.6.45.79. Server allowlisted only hornfolk/warrior; hunter was a locked registry entry. Account creation lived solely in portal. Client and server action bars hardcoded warrior; remote avatars always used Tauren.

Implemented: original orc rig; race/class selection and native rotating 3D preview; persistent certified race/class in world sessions and remote snapshots; hunter mana, starting equipped bow, auto shot, arcane shot, concussive slow, level-4 multi-shot, level-8 aimed shot; class-specific server-validated hotbar; bounded cosmetic arrows. Existing warrior defaults, characters, camera and TeamSpeak are untouched. No database schema migration is needed.

The hunter is an initial playable ranged class, not a complete reproduction of Classic. Pets, traps, talents, ammunition and racial active abilities are not implemented in this release. Aimed shot is instant with a stationary requirement, not a long cast. Hunter bow damage scales with level; additional bow tiers remain future content.

Account page now lives in canonical portal/account.html and portal/account.js and is delivered by the normal tested mirror workflow. Existing account login, recovery, deletion confirmation and slot limit are preserved.

Validation: class/race input, class/level/mana/weapon/range checks, slow expiry, charge denial, persisted hotbar; existing multiplayer and progression suites. CI browser checks render all four combinations, verify mobile overflow and submitted creation payload, and upload screenshots. Publication requires source CI, VPS, mirror, Pages and live production audit.
