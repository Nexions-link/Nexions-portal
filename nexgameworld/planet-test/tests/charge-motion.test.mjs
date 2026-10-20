import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleChargeMotion,chargeTravelHeading,easeChargeHeading} from '../charge-motion.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {harness} from './harness.mjs';
test('charge travels monotonically with smooth acceleration, cruise and braking',()=>{
 let last=0;
 for(let i=0;i<=120;i++){
  const s=sampleChargeMotion(i*.55/120,.55);
  assert.ok(s.distanceFraction>=last-1e-8&&s.distanceFraction<=1);
  assert.ok(s.drive>=0&&s.drive<=1&&s.landing>=0&&s.landing<=1);
  last=s.distanceFraction;
 }
 assert.ok(Math.abs(last-1)<1e-8);
 assert.equal(sampleChargeMotion(0,.55).distanceFraction,0);
 assert.equal(sampleChargeMotion(1,.55).finished,true);
 assert.equal(sampleChargeMotion(NaN,.55).distanceFraction,0);
 assert.ok(sampleChargeMotion(.02,.55).distanceFraction-sampleChargeMotion(.01,.55).distanceFraction<
  sampleChargeMotion(.29,.55).distanceFraction-sampleChargeMotion(.28,.55).distanceFraction);
 assert.ok(1-sampleChargeMotion(.54,.55).distanceFraction<.02);
});
test('heading follows spherical tangent instead of snapping',()=>{
 assert.ok(Math.abs(chargeTravelHeading([0,0,1],[.1,0,Math.sqrt(.99)]))<.0001);
 assert.equal(chargeTravelHeading([0,0,1],[0,0,1]),null);
 const yaw=easeChargeHeading(Math.PI,0,1/60);
 assert.ok(Math.abs(yaw-Math.PI)>.01&&Math.abs(yaw-Math.PI)<1);
});
test('sprint pose leans but preserves weapon and shield grips',()=>{
 const {hero}=harness();
 hero.root.userData.equipmentGrip={weapon:{x:-1.15,y:.2,z:.3},shield:{x:1.35,y:-.1,z:0}};
 animateSphericalTauren(hero,{dt:1/60,time:1,walk:1,phase:1,charge:{drive:0,landing:0}});
 const baseline=hero.chest.rotation.x,pos=hero.root.position.toArray();
 animateSphericalTauren(hero,{dt:1/60,time:1,walk:1,phase:1,charge:{drive:1,landing:0}});
 assert.ok(hero.chest.rotation.x>baseline+.2);
 assert.deepEqual(hero.root.position.toArray(),pos);
 assert.equal(hero.arms[1].hand.rotation.x,-1.15);
 assert.equal(hero.arms[0].hand.rotation.x,1.35);
 animateSphericalTauren(hero,{dt:1/60,time:1,walk:1,phase:1,charge:{drive:0,landing:1}});
 for(const leg of hero.legs)assert.ok(Number.isFinite(leg.hip.rotation.x));
});
