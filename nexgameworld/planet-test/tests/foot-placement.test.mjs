import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {footStrideZ,sampleSphericalFooting} from '../foot-placement.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {harness} from './harness.mjs';

function orientation(normal){
 const right=new THREE.Vector3(1,0,0).projectOnPlane(normal);
 if(right.lengthSq()<.01)right.set(0,0,1).projectOnPlane(normal);
 right.normalize();
 const forward=new THREE.Vector3().crossVectors(right,normal).normalize();
 const quat=new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().makeBasis(right,normal,forward));
 return {right,forward,quat};
}
function samples(normal,radius,heightAt,phase=0,walk=0){
 const {quat}=orientation(normal);
 return sampleSphericalFooting({THREE,normal,quaternion:quat,radius,heightAt,phase,walk});
}
const standing=()=>[{height:0,pitch:0,roll:0},{height:0,pitch:0,roll:0}];
const nearly=(a,b,tol=.02)=>assert.ok(Math.abs(a-b)<tol,`expected ${a} close to ${b}`);

test('flat spherical terrain keeps both hooves near baseline at equator, pole and antipode',()=>{
 for(const n of [new THREE.Vector3(0,0,1),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,-1)]){
  for(const radius of [87,174,261]){
   const f=samples(n,radius,()=>1.4);
   assert.equal(f.length,2);
   for(const foot of f){
    assert.ok(Math.abs(foot.height)<.005);
    // Even a perfectly smooth sphere has slight lateral curvature across
    // the 0.43m hoof spacing, especially on the smallest 87m test planet.
    nearly(foot.pitch,0,.007);
    nearly(foot.roll,0,.007);
   }
  }
 }
});

test('each hoof reaches independent radial height and banks with the local slope',()=>{
 const n=new THREE.Vector3(0,0,1),radius=261,{right}=orientation(n);
 const heightAt=n1=>2+radius*.22*n1.dot(right);
 const f=samples(n,radius,heightAt);
 assert.ok(f[0].height<-.07,`left hoof should be lower: ${f[0].height}`);
 assert.ok(f[1].height>.07,`right hoof should be higher: ${f[1].height}`);
 for(const foot of f){assert.ok(foot.roll>.14&&foot.roll<.23);nearly(foot.pitch,0,.004)}
});

test('slope in the heading direction tilts both hooves by the correct sign on the sphere',()=>{
 const n=new THREE.Vector3(0,1,0),radius=174,{forward}=orientation(n);
 const heightAt=n1=>1+radius*.30*n1.dot(forward);
 const f=samples(n,radius,heightAt);
 for(const foot of f){
  assert.ok(foot.pitch<-.20,`toe should rise uphill: ${foot.pitch}`);
  nearly(foot.roll,0,.006);
 }
});

test('walking stride ground probes move individually without invalid positions',()=>{
 const n=new THREE.Vector3(0,0,1),R=261;
 const {forward}=orientation(n);
 const heightAt=v=>1+R*.20*v.dot(forward);
 const idle=samples(n,R,heightAt,0,0);
 const moving=samples(n,R,heightAt,0,1);
 assert.ok(moving[0].height>idle[0].height+.08);
 assert.ok(moving[1].height<idle[1].height-.05);
 assert.ok(footStrideZ(0,0)>.7&&footStrideZ(0,1)<-.5);
 for(let i=0;i<30;i++){
  const feet=samples(n,R,heightAt,i*.5,1);
  assert.ok(feet.every(f=>Object.values(f).every(Number.isFinite)));
 }
});

test('extreme geometry is clamped safely and nonsensical input is ignored',()=>{
 const n=new THREE.Vector3(0,0,1),R=87,{forward,right,quat}=orientation(n);
 const f=samples(n,R,v=>R*3*v.dot(forward)+R*3*v.dot(right));
 for(const foot of f){
  assert.ok(Math.abs(foot.height)<=.3100001);
  assert.ok(Math.abs(foot.pitch)<=.2800001);
  assert.ok(Math.abs(foot.roll)<=.2300001);
 }
 assert.equal(sampleSphericalFooting({THREE,normal:n,quaternion:quat,radius:0,heightAt:()=>0}),null);
});

test('the existing two-bone rig smoothly settles onto tilted ground and recovers to flat',()=>{
 const {hero}=harness();
 const left=hero.legs[0],right=hero.legs[1];
 const slope=[{height:-.17,pitch:-.19,roll:.15},{height:.16,pitch:-.19,roll:.15}];
 for(let i=0;i<30;i++)animateSphericalTauren(hero,{
  dt:1/60,time:i/60,walk:0,phase:0,terrainFeet:slope,weaponKind:'axe'
 });
 const state=hero.root.userData.terrainFeet;
 assert.ok(state[0].height<-.15&&state[1].height>.14);
 assert.ok(left.foot.rotation.x<0);
 assert.ok(left.foot.rotation.z>.12&&right.foot.rotation.z>.12);
 for(const leg of hero.legs){
  assert.ok(Number.isFinite(leg.hip.rotation.x));
  assert.ok(Number.isFinite(leg.knee.rotation.x));
  assert.ok(Number.isFinite(leg.foot.rotation.x));
 }
 const previous=state[0].height;
 animateSphericalTauren(hero,{dt:1/60,time:1,terrainFeet:standing()});
 assert.ok(state[0].height>previous&&state[0].height<0,'transition does not snap to level ground');
 for(let i=0;i<45;i++)animateSphericalTauren(hero,{dt:1/60,time:2+i/60,terrainFeet:standing()});
 assert.ok(Math.abs(state[0].height)<.001&&Math.abs(state[1].height)<.001);
 assert.ok(Math.abs(left.foot.rotation.z)<.001&&Math.abs(right.foot.rotation.z)<.001);
});

test('combat, gathering and stomping retain finite animation poses on uneven ground',()=>{
 const {hero}=harness();
 const tilted=[{height:.25,pitch:.2,roll:-.18},{height:-.27,pitch:-.2,roll:.2}];
 for(const param of [
  {walk:1,phase:Math.PI/3,attack:.5,weaponKind:'sword'},
  {walk:0,gather:true},
  {walk:0,stomp:.3,blockRemaining:.4,weaponKind:'axe'}
 ]){
  for(let i=0;i<12;i++)animateSphericalTauren(hero,{
   dt:1/60,time:i/60,terrainFeet:tilted,...param
  });
  for(const leg of hero.legs){
   assert.ok([leg.hip.rotation.x,leg.knee.rotation.x,leg.foot.rotation.x,
     leg.foot.rotation.z].every(Number.isFinite));
  }
 }
});
