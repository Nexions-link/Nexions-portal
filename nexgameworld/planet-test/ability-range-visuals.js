// Pure hotbar range indicator rules. These do not change cast/autopilot logic.
export function getAbilityRangeIndicator(def,{targetDistance=Infinity,nearestHostileDistance=Infinity,approachRange=20}={}){
 if(!def)return {outOfRange:false,limit:null};
 // Autoattack can engage an enemy at <=20 m through existing auto-approach.
 if(def.id==='autoAttack')return {outOfRange:!(Number.isFinite(targetDistance)&&targetDistance<=approachRange),limit:approachRange};
 // Single-target skills only light up at their actual attack range.
 if(def.requiresTarget)return {outOfRange:!(Number.isFinite(targetDistance)&&targetDistance<=def.range),limit:def.range};
 // An area attack is usable with any living foe nearby, even without a selected target.
 if(def.kind==='area')return {outOfRange:!(Number.isFinite(nearestHostileDistance)&&nearestHostileDistance<=def.range),limit:def.range};
 // Potions and non-offensive actions must never be greyed out by enemy distance.
 return {outOfRange:false,limit:null};
}

// Shared resource readiness for every current and future ability definition.
// The same resourceCost field is validated by skills.js on activation.
export function getAbilityResourceIndicator(def,{resource=0}={}){
 const declared=Number(def?.resourceCost);
 const required=Number.isFinite(declared)?Math.max(0,declared):0;
 const actual=Number(resource);
 const available=Number.isFinite(actual)?Math.max(0,actual):0;
 // Match the tolerance used by abilityFailure to avoid visual/activation drift.
 return {insufficient:required>0&&available+1e-7<required,required,available};
}
