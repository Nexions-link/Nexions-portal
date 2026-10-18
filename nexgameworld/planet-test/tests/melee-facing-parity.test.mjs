import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sphericalMeleeFacing} from '../sphere-combat.js';
import {facesMob,normalToLocal,localToNormal,createSphericalMobs,applySphereAttack} from '../../server/spherical-pve.js';

test('server and visible hero accept the same melee angles on the sphere',()=>{
 for(const radius of [87,174,261])for(const local of [[0,0],[-9,-24],[140,90]]){
  const n=new THREE.Vector3(...localToNormal(...local,radius));
  const lon=Math.atan2(n.x,n.z),east=new THREE.Vector3(Math.cos(lon),0,-Math.sin(lon));
  const north=new THREE.Vector3().crossVectors(n,east).normalize();
  for(const heading of [0,1.2,-2.4]){
   const fwd=east.clone().multiplyScalar(Math.cos(heading)).addScaledVector(north,Math.sin(heading));
   const right=new THREE.Vector3().crossVectors(n,fwd).normalize();
   const root=new THREE.Group();root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,n,fwd));
   for(const degrees of [0,50,65,80,87,89,100,180,-65,-80]){
    const radians=degrees*Math.PI/180;
    const toward=fwd.clone().multiplyScalar(Math.cos(radians)).addScaledVector(right,Math.sin(radians));
    const other=n.clone().multiplyScalar(Math.cos(2.1/radius)).addScaledVector(toward,Math.sin(2.1/radius));
    const mob=normalToLocal(other.toArray(),radius);
    const client=sphericalMeleeFacing(THREE,n,root,other);
    const server=facesMob({normal:n.toArray(),heading},mob,radius);
    assert.equal(server,client,JSON.stringify({radius,local,heading,degrees}));
    assert.equal(server,Math.cos(radians)>=.04);
   }
  }
 }
});
test('a visible front-side enemy at 2.1m accepts autoattack; rear and distant enemies remain rejected',()=>{
 const mobs=createSphericalMobs(),mob=mobs[0],r=261,a=75*Math.PI/180;
 const player={id:'hero',normal:localToNormal(0,0,r),radius:r,heading:0,hp:120,level:1,resource:0,equipment:{weapon:{id:'wornAxe'}},abilityCooldowns:{}};
 mob.x=2.1*Math.cos(a);mob.z=2.1*Math.sin(a);
 const hit=applySphereAttack(mobs,player,'autoAttack',mob.id,1000,()=>.5);
 assert.equal(hit.ok,true);assert.ok(mob.hp<mob.maxHp);
 mob.x=-2.1;mob.z=0;
 assert.equal(applySphereAttack(mobs,player,'autoAttack',mob.id,10000).ok,false);
 mob.x=20;
 assert.equal(applySphereAttack(mobs,player,'autoAttack',mob.id,20000).ok,false);
});
