// Chest Atlas preview: use the current hinge angle rather than replaying the
// GLB Close clip from its authored start pose (fully open).
// This does not change the GLB animations consumed by the game.
export function createChestMotion(hinge, {openAngle = -1.65, duration = 1.15} = {}) {
 if (!hinge || !Number.isFinite(openAngle) || !duration || duration <= 0) {
  throw new Error('A valid chest hinge and motion settings are required');
 }
 let motion = null;
 return {
  select(name) {
   if (name === 'Idle') {
    // Pausing a preview must not force an open lid to the default closed pose.
    motion = null;
    return true;
   }
   if (name !== 'Open' && name !== 'Close') return false;
   const from = hinge.rotation.x;
   const to = name === 'Open' ? openAngle : 0;
   const distance = Math.abs(to - from);
   if (distance < 1e-5) {
    hinge.rotation.x = to;
    motion = null;
   } else {
    motion = {from, to, elapsed: 0,
      duration: Math.max(0.15, duration * distance / Math.abs(openAngle))};
   }
   return true;
  },
  update(dt) {
   if (!motion || !Number.isFinite(dt) || dt <= 0) return;
   motion.elapsed = Math.min(motion.duration, motion.elapsed + dt);
   const t = motion.elapsed / motion.duration;
   // Smooth at both ends without overshooting, even if reversed mid-animation.
   const eased = (1 - Math.cos(t * Math.PI)) / 2;
   hinge.rotation.x = motion.from + (motion.to - motion.from) * eased;
   if (t >= 1) motion = null;
  },
  get isMoving() { return motion !== null; }
 };
}
