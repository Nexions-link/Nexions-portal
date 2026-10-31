# Asset provenance — NexGameWorld asset forest

The file `kaykit-forest-atlas.glb` (396,480 bytes; Git blob `386f990dfc5580dd6c6063a1ee4838bdf4df6742`) is a compact scene containing 16 visual meshes (trees, shrubs, grass, rocks) and one embedded color atlas.

- **Artist:** Kay Lousberg (KayKit), Forest Nature Pack, FREE edition.
- **Original license:** CC0 1.0 (public domain dedication): https://creativecommons.org/publicdomain/zero/1.0/
- **Official artist page:** https://kaylousberg.itch.io/kaykit-forest
- **Bundled/derived source:** https://github.com/Station-Sciences/bot-crossing/blob/main/public/assets/forest.glb
- **Provenance declaration of the bundled source:** https://github.com/Station-Sciences/bot-crossing/blob/main/public/assets/CREDITS.md

The mesh geometry/texture is third-party ready-made game art, **not** generated from a model's description. It is licensed independently of the NexGameWorld code.

The local `vendor/GLTFLoader.js` and `vendor/BufferGeometryUtils.js` are adapted from Three.js r160, MIT licensed (existing Three.js LICENSE retained in the vendor directory). Their sole import path change keeps them both on the same origin.

For safety on mobile:
- the legacy nine tree meshes remain visible until GLB has fully loaded;
- asset replacements are optional, instanced, and entirely cosmetic;
- the same client can disable them with `?asset-pack=0`;
- graphics settings scale density and shadow generation;
- a failure logs a warning and leaves the original trees in place.
