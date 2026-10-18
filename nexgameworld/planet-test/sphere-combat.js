// Sphere-local melee parity with original NexGame: block can only occur
// against an incoming enemy within the front hemisphere of the equipped shield.
// The player's root faces local +Z; radial normal replaces global world-up.
import {MELEE_FACING_COSINE} from './melee-facing.js?v=1';
import {armorReduction} from '../items.js?v=0.3.5.17';
import {SHIELD_BLOCK_SECONDS} from '../shield-block.js?v=0.3.7.1';
export const MELEE_ANIMATION_SECONDS=.8;
export const MELEE_IMPACT_SECONDS=.34;
export function sphericalForwardFacing(THREE,heroNormal,heroRoot,enemyNormal){
 const facing=new THREE.Vector3(0,0,1).applyQuaternion(heroRoot.quaternion);
 const tangent=new THREE.Vector3().copy(enemyNormal).addScaledVector(heroNormal,-enemyNormal.dot(heroNormal));
 if(tangent.lengthSq()<1e-12)return false;
 return facing.dot(tangent.normalize())>=0;
}
// The native warrior swing only lands within the front hemisphere
// (at least 0.04 forward cosine), calculated in the radial tangent frame.
export function sphericalMeleeFacing(THREE,heroNormal,heroRoot,enemyNormal,minimumCos=MELEE_FACING_COSINE){
 const forward=new THREE.Vector3(0,0,1).applyQuaternion(heroRoot.quaternion);
 const toward=new THREE.Vector3().copy(enemyNormal).addScaledVector(heroNormal,-enemyNormal.dot(heroNormal));
 if(toward.lengthSq()<1e-12)return true;
 return forward.dot(toward.normalize())>=minimumCos;
}
export function incomingShieldHit({THREE,heroNormal,heroRoot,enemyNormal,stats,raw,attackerLevel=1,rng=Math.random}){
 const hasShield=(stats?.blockChance||0)>0;
 const front=hasShield?sphericalForwardFacing(THREE,heroNormal,heroRoot,enemyNormal):false;
 const blocked=front&&rng()<stats.blockChance;
 const absorbed=blocked?stats.blockValue:0;
 const dealt=Math.max(blocked?0:1,Math.round(raw*(1-armorReduction(stats.armor,attackerLevel))-absorbed));
 return {blocked,damage:dealt,absorbed,blockSeconds:blocked?SHIELD_BLOCK_SECONDS:0};
}
export function attackProgress(remaining){
 return Number.isFinite(remaining)&&remaining>0?
  Math.max(0,Math.min(1,1-remaining/MELEE_ANIMATION_SECONDS)):-1;
}
