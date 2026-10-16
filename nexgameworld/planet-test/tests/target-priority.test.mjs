import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cycleHostileTarget,FORWARD_TARGET_COSINE} from '../interaction-targeting.js';
import {harness} from './harness.mjs';

const entity=(id,d,alignment)=>({
 id,hp:54,kind:'mob',dead:false,corpse:false,root:{visible:true},
 d,alignment
});
const distance=e=>e.d, facing=e=>e.alignment;
const select=(rows,current=null,step=1)=>
 cycleHostileTarget(rows,null,current,distance,step,facing);

test('first button press prefers a farther opponent directly in front over a nearer one at the side',()=>{
 const side=entity('side',3,.05),front=entity('front',19,.998),behind=entity('behind',2,-.9);
 assert.equal(FORWARD_TARGET_COSINE,.5);
 assert.equal(select([side,behind,front]),front);
 assert.equal(select([side,behind,front],front),behind);
 assert.equal(select([side,behind,front],behind),side);
 assert.equal(select([side,behind,front],side),front);
});

test('within forward cone alignment outweighs moderate distance; distance breaks equivalent angles',()=>{
 const centered=entity('centered',23,1),rim=entity('rim',3,.55);
 const same1=entity('same-near',7,.96),same2=entity('same-far',18,.96);
 assert.equal(select([rim,centered]),centered);
 assert.equal(select([same2,same1]),same1);
 assert.equal(select([rim,centered],rim),centered);
});

test('without forward opponents nearest-first fallback remains available',()=>{
 const side=entity('side',11,.25),rear=entity('rear',5,-.9),hidden=entity('hidden',1,1);
 hidden.root.visible=false;
 assert.equal(select([side,rear,hidden]),rear);
 assert.equal(select([side,rear,hidden],rear),side);
 // Older distance-only callers still get the original nearest-first behavior.
 assert.equal(cycleHostileTarget([side,rear,hidden],null,null,distance),rear);
});

test('existing cycle can move backward and reaches out-of-cone targets',()=>{
 const front=entity('front',30,.96),side=entity('side',6,0),behind=entity('behind',1,-.8);
 assert.equal(select([front,side,behind],front,-1),side);
 assert.equal(select([front,side,behind],side,-1),behind);
 assert.equal(select([front,side,behind],behind,-1),front);
});

test('dead, invisible, nonfinite or beyond-40m enemies are excluded, while dummy remains eligible',()=>{
 const dead=entity('dead',1,1);dead.dead=true;
 const corpse=entity('corpse',2,1);corpse.corpse=true;
 const lost=entity('lost',3,1);lost.root.visible=false;
 const far=entity('far',41,1);
 const broken=entity('broken',NaN,1);
 const dummy={...entity('dummy',16,.95),kind:'dummy'};
 assert.equal(cycleHostileTarget([dead,corpse,lost,far,broken],dummy,null,distance,1,facing),dummy);
 assert.equal(cycleHostileTarget([far],null,null,distance,1,facing),null);
});

test('direction scores are evaluated on a tangent plane, not flat global coordinates',()=>{
 for(const normal of [new THREE.Vector3(0,0,1),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,-1)]){
  const tangent=new THREE.Vector3(0,0,1);
  if(Math.abs(tangent.dot(normal))>.99)tangent.set(1,0,0);
  tangent.addScaledVector(normal,-tangent.dot(normal)).normalize();
  const front=normal.clone().addScaledVector(tangent,.03).normalize();
  const side=normal.clone().addScaledVector(new THREE.Vector3().crossVectors(normal,tangent),.01).normalize();
  const alignment=target=>{
   const offset=target.clone().addScaledVector(normal,-target.dot(normal)).normalize();
   return tangent.dot(offset);
  };
  assert.ok(alignment(front)>.99);
  assert.ok(Math.abs(alignment(side))<.001);
 }
});

test('actual RPG target button prioritizes facing the training dummy over closer birds',()=>{
 // x=0,z=-17: birds are at roughly 10-15m, but the training dummy at
 // x=-7,z=15 lies 33m straight ahead. The hero faces the dummy.
 const h=harness({x:0,z:-17});
 h.rpg.targetNearest();
 assert.equal(h.get('targetName').textContent,'Тренировочный манекен');
 h.rpg.targetNearest();
 assert.notEqual(h.get('targetName').textContent,'Тренировочный манекен');
 h.get('targetClear').click();
 h.rpg.targetNearest();
 assert.equal(h.get('targetName').textContent,'Тренировочный манекен');
});
