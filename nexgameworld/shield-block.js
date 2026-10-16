// Pure, low-cost combat pose for an actual successful shield block.
// Animated on the left shoulder/elbow/wrist; never changes approved GLB grips,
// combat odds, damage, global cooldown or persistent equipment.
export const SHIELD_BLOCK_SECONDS=.46;
function smooth(a,b,t){
 const p=Math.max(0,Math.min(1,(t-a)/(b-a)));
 return p*p*(3-2*p);
}
export function shieldBlockStrength(remaining){
 if(!Number.isFinite(remaining)||remaining<=0)return 0;
 const elapsed=1-Math.max(0,Math.min(SHIELD_BLOCK_SECONDS,remaining))/SHIELD_BLOCK_SECONDS;
 // Raise rapidly, brace for the hit, recover smoothly.
 return smooth(0,.18,elapsed)*(1-smooth(.46,1,elapsed));
}
export function shieldBlockPose(remaining){
 const power=shieldBlockStrength(remaining);
 return {
  power,
  shoulderX:-1.03*power, // lift shield forward in character-local +Z
  shoulderZ:.64*power, // move left forearm in front of the torso
  elbowX:-.42*power,
  wristX:.10*power,
  chestX:-.075*power,
  chestY:-.085*power
 };
}
