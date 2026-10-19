import test from 'node:test';
import assert from 'node:assert/strict';
import {combatPose} from '../combat-pose.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {harness} from './harness.mjs';

test('weapon-specific anticipation and recovery are bounded and return to rest',()=>{
 for(const weaponKind of ['axe','sword','dagger','none']){
  const idle=combatPose({attack:-1,weaponKind});
  const wind=combatPose({attack:.29,weaponKind});
  const follow=combatPose({attack:.69,weaponKind});
  assert.equal(idle.stance,0);
  assert.ok(wind.anticipation>0&&wind.brace>=0);
  assert.ok(follow.recovery>0&&follow.lunge>=0);
  assert.equal(combatPose({attack:1,weaponKind}).lunge,0);
 }
 assert.ok(combatPose({attack:.29,weaponKind:'axe'}).brace>
  combatPose({attack:.29,weaponKind:'dagger'}).brace);
});
test('block and hit recoil change visual joints, not equipment grip or world root',()=>{
 const {hero}=harness();
 hero.root.userData.equipmentGrip={weapon:{x:-1.25,y:.2,z:.12},shield:{x:1.8,y:0,z:0}};
 const rootPosition=hero.root.position.clone(),rootQuaternion=hero.root.quaternion.clone();
 hero.root.userData.blockRecoil=.65;
 for(let i=0;i<12;i++){
  animateSphericalTauren(hero,{dt:1/60,time:i/60,walk:0,phase:0,
   attack:.25+i/60,blockRemaining:.4,weaponKind:'axe'});
 }
 assert.equal(hero.arms[1].hand.rotation.x,-1.25);
 assert.ok(hero.root.position.distanceTo(rootPosition)<1e-9);
 assert.ok(hero.root.quaternion.angleTo(rootQuaternion)<1e-9);
 assert.ok([hero.body.rotation.x,hero.body.rotation.z,hero.chest.rotation.x].every(Number.isFinite));
 for(let i=0;i<90;i++)animateSphericalTauren(hero,{
  dt:1/60,time:1+i/60,attack:-1,blockRemaining:0,weaponKind:'axe'
 });
 assert.ok(Math.abs(hero.body.rotation.x)<.001);
 assert.ok(Math.abs(hero.body.rotation.z)<.001);
 assert.ok(Math.abs(hero.body.position.z)<.001);
});
test('invalid combat inputs cannot produce NaN or excessive cosmetic displacement',()=>{
 const p=combatPose({attack:Infinity,blockRemaining:NaN,recoil:Infinity,walk:-9});
 assert.ok(Object.values(p).every(x=>typeof x==='boolean'||Number.isFinite(x)));
 assert.equal(p.active,false);
 assert.equal(p.guard,0);
 assert.equal(p.impact,0);
});