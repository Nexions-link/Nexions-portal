# NexGame → spherical world migration

> Current checklist: [MIGRATION-PLAN.md](./MIGRATION-PLAN.md), audited against
> main / PT 0.6.2 on 2026-10-16. This file retains historical milestones;
> earlier "not yet ported" lists are not the current feature inventory.

Goal: keep the complete original NexGame RPG, assets, user interface and proven iPhone gesture handling, but replace the flat-world render, physics and world-coordinates with a true spherical planet. The canonical public test URL is `https://nexions-link.github.io/Nexgame/planet-test/`. Never change the main `app.html`, `game.js`, `style.css` or live online server while developing the prototype.

## Source of truth

The **main game** is the authoritative implementation of gameplay. Its `game.js` provides inventory, equipment, quests, mob AI, combat, NPCs, minimap, hotbar, houses, vendors, training dummy and movement/camera fixes. Reuse logic rather than independently rewriting it in `planet-test`.

The **prototype** is currently a separate Three.js scene. It is NOT the complete RPG yet. It already imports the unchanged original `../movement-controls.js`, `../landscape.js`; it copies the iOS Safari gesture guards from the main `game.js`; and has a local snapshot of camp terrain, lake, Tauren procedural model and hide-texture source.

## Roadmap for the full offline RPG port

1. Make a **test-only** entrypoint using the exact main HUD/CSS/assets and the existing game core. Disable network connection explicitly (`WORLD_WS_URL` must never cause a WebSocket in test mode). Namespace any user-save data by test mode so main characters cannot be overwritten by prototype experiments.
2. Add a **spherical world adapter**. Keep local `x,z` coordinates in metres for the initial starting area to preserve established quest and collision data. Map them via `normal=expMap(x,z,R)` into 3D sphere and orient models by the radial up vector. Do not simply scale or reposition the main game into a flat tangent plane.
3. Render the main game's baked painted terrain, houses, lake, decorations and NPCs on the curved surface. Adapt large meshes vertex-by-vertex, but transform rigid actors/buildings via radial transforms while retaining real-world metres.
4. Adapt camera follow/pitch/obstacle avoidance, player movement, target picking, ground clicks, collision checks, mob patrol/aggro and combat range to surface distances. In multiplayer, the server would eventually need to understand surface coordinates; **online is out of scope now**.
5. Bring original quest/gathering/loot/inventory/equipment/skills/merchant/chest UI and logic into the offline sphere. Reuse the main modules `items.js`, `skills.js`, `hotbar.js`, `training.js` and others rather than writing parallel rules.
6. Validate on iPhone Safari before switching the canonical `planet-test/` entrypoint to the complete engine. Keep the current lightweight spherical scene available as a fallback until gameplay parity is verified.

## Must-not-regress checks

- Double-tap never causes Safari smart zoom; touch gestures do not permanently change page scale.
- Game world touches and long presses never select text or call up the system context menu.
- Joystick/camera controls remain camera-relative; no unintended movement when camera-follow changes.
- House roof, carpet and thin fabric do not flicker at multiple zoom levels.
- Player and structures keep real-world scale across radius choices of 87, 174 and 261 m.
- Single permanent test URL: `/Nexgame/planet-test/`. Do not require `?v=...` on the **page** URL; internal module cache-busting is allowed.
- Main stable NexGame and its player saves must not change when testing the globe.
- Offline mode must not silently connect to the Render multiplayer service.

## Current implementation status (2026-10-15)

Implemented in lightweight prototype: closed spherical mesh, radius selector (261 m default), radial player positioning, camp/lake layout and Tauren model snapshot, painted landscape texture, hide/canvas material, basic lake shore boundary, procedural foliage, and main game iOS gesture guards plus shared movement math.

Not yet ported: main game HUD, quests, inventory/gear, combat, skillbook/hotbar, NPC interactions, server-authoritative mob system, real building collision and indoor transitions. Never describe these features as migrated unless tested on the actual spherical build.

## Offline gameplay integration — stage 1 (2026-10-15)

A first playable offline RPG layer has been integrated into the separate spherical test. It imports the unchanged production rules from `../items.js`, `../skills.js`, `../hotbar.js` and `../training.js`; uses the actual Tauren generator and Dolgonog GLB/animation clips and the existing weapon/shield GLBs. Player progress is namespaced under `nexgame-planet-test-offline-rpg-v1` and does not affect main saves. Prototype gameplay includes two NPCs (mentor and merchant), a three-kill Dolgonog quest, target selection, local wildlife chase/attack within the 23 m spawn leash, corpse looting and respawning, 12-slot bag, character gear and attributes, purchase, healing potions, 8-slot editable hotbar, a training dummy, and basic house/tent collision.

**Still not ported:** the full production quest chains, interactive gathering and cast bar, all NPC dialogue, chest and party features, advanced animation/visual effects, advanced hit detection and camera collision, and the main game's exact full HUD. The present code is test-only and neither reads nor writes the live character save. Browser rendering has not yet been verified on the user's iPhone; static code checks and GitHub Pages builds alone are not proof of full functional parity.

## Offline gameplay integration — stage 2 (PT 0.2.0, 2026-10-15)

Added original herbalist at (8,1), all three gathering quests from live game.js with 18 resource spawn coordinates, spherical mesh projection, interaction/cast progress bar (1.5 s), temporary kneeling, loot window and 32-second node respawn. Created 18-slot chest at (-33.2,-7.4) inside the existing longhouse with test-only inventory transfers. The offline test uses saved character state `nexgame-planet-test-offline-rpg-v1`; no multiplayer WebSocket or production inventory is accessed. Added source modules `gather-world.js` and `camp-actions.js`, including dry-shore correction for lake-adjacent resource coordinates. Verified harvesting and chest actions in a mock-environment smoke test.

Still missing: the full five-quest monster chain and boss, shared/server-authoritative chest, complete world NPC roster, production-accurate object collisions, additional terrain/biomes and equipment visuals beyond copied assets. Test-only implementation remains separate from the main NexGame.

## Visual and animation port — PT 0.3.0 (2026-10-15)

Single animation authority: `planet-test/tauren-animation.js` operates on the copied Tauren rig's body/chest/neck/shoulder/elbow/hip/knee/foot/tail/braids nodes. It follows main-game harvesting body offset of 0.47 m, arm reach and two-link leg IK. The obsolete overwriting limb assignments in `planet.js` and `camp-actions.js` were removed. Existing GLB plainstriders now use the exact core animation blending from `../plainstrider-model.js`. NPC names use native Georgia bold stroked sprites (512x96 sRGB), and colour variants from the main NPC roster. Damage values use `sphere-combat-feedback.js`: the original CSS and timing, with radial up instead of a world-Y displacement.

Tests: static JavaScript syntax, DOM dependencies, and a pure animated rig pose test for kneel and recovery. Browser/Safari visual testing is pending user confirmation.

## PT 0.5.0 — native Narache adventure systems (2026-10-15)

Completed the full five-trial mentor quest port from main `game.js` using a state machine 0–12 in `mentor-chain.js`: hunt three normal birds; gather ancestor feather at (35, -11.8); scout waypoint at (12, 37); hunt 108HP elite giant Dolgonog at (39, 47). The crimson quest route is an instanced spherical tangent-space geometry in `mentor-world.js` (29 dashes / 1 draw call); the original minimap displays the same guide. Former PT 0.4.x `quest` string values migrate without wiping the isolated `nexgame-planet-test-offline-rpg-v1` save.

Returned native mentor quest glyphs, mobile three-tab quest journal and assignable 8-slot hotbar; added GPU-light radial ground shadows and idle animations to villagers, ambient roaming/alert visuals to normal birds. End-to-end pure quest-flow and geometry-construction mock tests passed. Browser/iPhone runtime validation is still pending.

Still not present: connected online world (multiplayer parties/shared chest), full production class selection and non-warrior abilities, equipment and mob persistence across browsers, complete open-planet zone content and physics/obstacle system across the antipode, and gameplay outside the original Narache quest/harvest chains.

## PT 0.6.0 — combat + visual world + spherical collision upgrade (2026-10-16)

**Stage 1:** The hero rig now evaluates native per-weapon swing profiles and the dagger thrust, successful shield block from the native shield-block module, a shared radial front/behind check, and the main 0.8 s swing with a 0.34 s impact. Weapon GLB grip tuner transforms are preserved between pose frames. Restored quality colors, rage decay, +3 HP/sec regeneration out of combat after five seconds, GCD/cooldown visual overlays, and clear-all-mobs aggression after respawn.

**Stage 2:** Original hand-authored building details (gable ends, rafters, entrance curtains, warm interior light, furniture and see-through roof/walls), animated shoreline reeds/shimmers, native item quality and loot visuals, five instanced meadow batches from the original geometry/density (2100 grass, 330 flower, 125 shrub), 25 mesas and 38 boulders. All visual geometry is repositioned along radial normals on planet radius changes; original distant biomes remain experimental.

**Stage 3:** Shared collision footprints for tent shells, house, furniture, trees, totems, banner posts, isolated rocks and mesas; local geodesic x/z coordinates and radial-normal projections replace flat global Y assumptions. Follow-camera option is restored with joystick-independent recenter and saved in the test view. The camera tests obstructions both at desired position and after interpolation. Local lake wading matches the original 1.12 m depth rule. No WebSocket/multiplayer modules were introduced.

**Important remaining parity work:** manually exercise hero movement, shield hits, weapon loading/grip/quality, mob chase/return, gather UI and indoor cameras in iPhone Safari; profile GPU time after the meadow upgrade. Exact geometry/material equivalence across every house/biome and correctness of wall collision beyond the fully modelled start valley still require a visual review. Offline-only character/chest persistence is intentionally not shared with the main game's multiplayer backend. Historical "not yet ported" paragraphs above document older milestones rather than today's feature inventory. Do not claim complete parity until browser/device acceptance.
