import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cameraObstruction,createCameraProbe} from '../sphere-physics.js';
import {createShadowRefreshBudget,BALANCED_SHADOW_HZ,HIGH_SHADOW_HZ} from '../render-budget.js';

test('camera scratch ray returns exactly the same collision as allocation-based ray',()=>{
 const start=new THREE.Vector3(0,263,0),desired=new THREE.Vector3(0,258,12);
 const options={start,desired,getRadius:()=>261,toLocal:()=>({x:0,z:120}),
  heightAt:()=>0,heroLocal:{x:0,z:120},clearance:.82};
 const savedStart=start.clone(),savedDesired=desired.clone();
 const legacy=cameraObstruction(THREE,options),scratch=createCameraProbe(THREE);
 const pooled=cameraObstruction(THREE,options,scratch);
 assert.ok(legacy&&pooled,'camera must remain protected from underground sweep');
 assert.ok(pooled.distanceTo(legacy)<1e-9);
 assert.equal(pooled,scratch.result,'ray output is pooled');
 assert.ok(start.equals(savedStart)&&desired.equals(savedDesired),
  'camera inputs must never be mutated by collision probing');
 const second=cameraObstruction(THREE,options,scratch);
 assert.equal(second,pooled,'repeated camera sweeps reuse the same result vector');
});
test('camera scratch preserves an unobstructed line without fake collisions',()=>{
 const start=new THREE.Vector3(0,500,0),desired=new THREE.Vector3(0,500,5);
 const options={start,desired,getRadius:()=>261,toLocal:()=>({x:0,z:120}),
  heightAt:()=>0,heroLocal:null,clearance:.8};
 assert.equal(cameraObstruction(THREE,options),null);
 assert.equal(cameraObstruction(THREE,options,createCameraProbe(THREE)),null);
});
test('balanced shadows stay capped at 20 Hz independently of 60 Hz beauty rendering',()=>{
 const budget=createShadowRefreshBudget();
 let refreshed=0;
 for(let i=0;i<120;i++)if(budget.next(1/60,{enabled:true,quality:'balanced'}))refreshed++;
 assert.equal(refreshed,40);
 assert.equal(BALANCED_SHADOW_HZ,20);
});
test('high quality retains full shadow fidelity; economy and orbital view never draw shadow map',()=>{
 const budget=createShadowRefreshBudget();
 let refreshed=0;
 for(let i=0;i<60;i++)refreshed+=Number(budget.next(1/60,{enabled:true,quality:'high'}));
 assert.equal(refreshed,HIGH_SHADOW_HZ);
 for(let i=0;i<60;i++)assert.equal(
  budget.next(1/60,{enabled:false,quality:'economy'}),false);
 assert.equal(budget.next(1/60,{enabled:true,quality:'balanced'}),true,
  're-enabled shadows must redraw immediately');
 assert.equal(budget.next(1/60,{enabled:false,quality:'balanced'}),false,
  'orbital view must disable shadow work');
 assert.equal(budget.next(1/60,{enabled:true,quality:'high'}),true);
});
test('balanced shadow scheduling tracks 45/90 Hz mobile screens without dt runaway',()=>{
 for(const fps of [45,90]){
  const budget=createShadowRefreshBudget();let redraws=0;
  for(let i=0;i<fps*2;i++)
   redraws+=Number(budget.next(1/fps,{enabled:true,quality:'balanced'}));
  assert.ok(redraws>=38&&redraws<=42,
   'expected approximately 40 shadow redraws over 2s at '+fps+' fps; got '+redraws);
 }
});
