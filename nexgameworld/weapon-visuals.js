// Single source of truth for weapon visuals and distinct attack poses.
// No combat numbers or player inventory are modified by this module.
export const WEAPON_KINDS=Object.freeze(['axe','sword','dagger']);
const POSES=Object.freeze({
 axe:Object.freeze({
  torsoWindup:.32,torsoSwing:.42,shoulderWindup:1.85,shoulderSwing:.48,
  elbowWindup:.60,wristWindup:.38,wristSwing:.85,shoulderSlash:0
 }),
 sword:Object.freeze({
  torsoWindup:.19,torsoSwing:.58,shoulderWindup:1.12,shoulderSwing:1.10,
  elbowWindup:.28,wristWindup:.12,wristSwing:1.25,shoulderSlash:-.37
 }),
 dagger:Object.freeze({
  torsoWindup:.10,torsoSwing:.25,shoulderWindup:.62,shoulderSwing:1.30,
  elbowWindup:.35,wristWindup:.08,wristSwing:.42,shoulderSlash:0
 }),
 none:Object.freeze({
  torsoWindup:.20,torsoSwing:.36,shoulderWindup:1.1,shoulderSwing:.58,
  elbowWindup:.2,wristWindup:0,wristSwing:.40,shoulderSlash:0
 })
});

/**
 * A narrow straight stab with three deliberate phases:
 * pull weapon toward the ribs, extend toward target, retract.
 * The strike reaches full extension at t = 0.425, matching the existing
 * melee impact at 0.34 s of the unchanged 0.8 s attack animation.
 * This function is purely visual; no attack cooldown or damage changes.
 */
const eased=(a,b,t)=>{
 const x=Math.max(0,Math.min(1,(t-a)/(b-a)));
 return x*x*(3-2*x);
};
export function daggerThrustPose(progress){
 if(!Number.isFinite(progress)||progress<0)return {draw:0,extend:0};
 const t=Math.max(0,Math.min(1,progress));
 return {
  draw:eased(.01,.17,t)*(1-eased(.20,.32,t)),
  extend:eased(.18,.39,t)*(1-eased(.47,.77,t))
 };
}

export const weaponSwingProfile=kind=>POSES[kind]||POSES.none;
export function visibleWeaponKind(hand){
 if(!hand?.getObjectByName)return 'none';
 return WEAPON_KINDS.find(kind=>hand.getObjectByName('gear-'+kind)?.visible)||'none';
}
export function equippedWeaponKind(equipment,catalog){
 const id=equipment?.weapon?.id;
 const kind=catalog?.[id]?.weaponKind;
 return WEAPON_KINDS.includes(kind)?kind:'none';
}
// Works on hero, character preview, and remote players. The underlying model
// names remain the same for both procedural fallbacks and loaded GLB assets.
export function setWeaponVisuals(root,kind,shield=false){
 if(!root?.getObjectByName)return;
 for(const type of WEAPON_KINDS){
  const model=root.getObjectByName('gear-'+type);
  if(model)model.visible=type===kind;
 }
 const shieldMesh=root.getObjectByName('gear-shield');
 if(shieldMesh)shieldMesh.visible=!!shield;
}
