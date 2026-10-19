import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STRIDE_METRES,advanceStridePhase,movementStrength,turnStrength} from '../locomotion.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {harness} from './harness.mjs';

test('gait advances from actual travelled metres, never from held joystick input',()=>{
 const step=4.05/60;
 let phase=0;
 for(let i=0;i<60;i++)phase=advanceStridePhase(phase,step);
 const expected=(4.05*2*Math.PI/STRIDE_METRES)%(2*Math.PI);
 assert.ok(Math.abs(phase-expected)<1e-9);
 assert.equal(advanceStridePhase(phase,0),phase,'standing against collision holds the gait');
 assert.equal(movementStrength(0,1/60,4.05),0);
 assert.ok(Math.abs(movementStrength(step,1/60,4.05)-1)<1e-10);
 assert.equal(movementStrength(step/2,1/60,4.05),.5);
});
test('phase and angular velocity remain safe after bad packets and teleports',()=>{
 assert.equal(advanceStridePhase(Number.NaN,Number.NaN),0);
 assert.equal(advanceStridePhase(0,1e9),0,'large correction never spins many cycles');
 assert.equal(movementStrength(-1,1/60,4.05),0);
 assert.equal(movementStrength(1,0,4.05),0);
 assert.equal(movementStrength(Infinity,1/60,4.05),0);
 assert.equal(turnStrength(0,0,1/60),0);
 assert.equal(turnStrength(0,1e9,0),0);
 const seam=turnStrength(Math.PI-.01,-Math.PI+.01,1/60);
 assert.ok(seam>0&&seam<1,'rotation near +/-pi keeps its intended direction');
 assert.ok(turnStrength(0,-.5,1/60)<0);
});
test('root lean and turning settle back to neutral without altering equipment grips',()=>{
 const {hero}=harness();
 hero.root.userData.equipmentGrip={
  weapon:{x:-1.25,y:.2,z:.12},shield:{x:1.5,y:.1,z:-.06}
 };
 for(let i=0;i<18;i++)animateSphericalTauren(hero,{
  dt:1/60,time:i/60,phase:i*.15,walk:1,turn:.8,weaponKind:'axe'
 });
 assert.ok(hero.root.userData.walkBlend>.9);
 assert.ok(hero.body.rotation.z<-.008,'body banks towards the turn');
 assert.ok(hero.chest.rotation.y>.015,'upper body leads the turn');
 assert.equal(hero.arms[1].hand.rotation.x,-1.25);
 for(let i=0;i<60;i++)animateSphericalTauren(hero,{
  dt:1/60,time:1+i/60,phase:3,walk:0,turn:0,weaponKind:'axe'
 });
 assert.ok(hero.root.userData.walkBlend<.002);
 assert.ok(Math.abs(hero.body.rotation.z)<.002,'turning lean decays with time');
 assert.ok(Math.abs(hero.body.rotation.y)<.002);
 for(const leg of hero.legs){
  assert.ok([leg.hip.rotation.x,leg.knee.rotation.x,leg.foot.rotation.x,
   leg.foot.rotation.y,leg.foot.rotation.z].every(Number.isFinite));
 }
});
