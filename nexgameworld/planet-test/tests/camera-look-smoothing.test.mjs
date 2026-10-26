import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {settleCameraLook} from '../camera-look-smoothing.js';
import {canWalkCamp} from '../sphere-physics.js';

test('camera look target glides across abrupt server correction without snapping',()=>{
 const aim=new THREE.Vector3(0,0,0),desired=new THREE.Vector3(5,0,0);
 settleCameraLook(aim,desired,1/60,{snap:true});
 assert.equal(aim.x,5,'first frame initializes immediately');
 const corrected=new THREE.Vector3(12,0,0);
 settleCameraLook(aim,corrected,1/60);
 assert.ok(aim.x>5&&aim.x<7,'new correction must not instantly rotate the screen');
 for(let i=0;i<60;i++)settleCameraLook(aim,corrected,1/60);
 assert.ok(Math.abs(aim.x-12)<.001,'aim catches up without persistent drift');
 assert.deepEqual(desired.toArray(),[5,0,0],'original server target not changed');
 assert.deepEqual(corrected.toArray(),[12,0,0]);
});
test('aim damping is stable across variable FPS and orientation resets',()=>{
 const origin=new THREE.Vector3(),goal=new THREE.Vector3(10,0,0);
 const a=origin.clone(),b=origin.clone();
 for(let i=0;i<60;i++)settleCameraLook(a,goal,1/60);
 for(let i=0;i<30;i++)settleCameraLook(b,goal,1/30);
 assert.ok(Math.abs(a.x-b.x)<.0001);
 settleCameraLook(a,new THREE.Vector3(-10,0,0),1/30,{snap:true});
 assert.equal(a.x,-10,'orbit switch must snap to orbit target');
 settleCameraLook(a,goal,NaN);
 assert.equal(a.x,-10);
});
test('mounted player collider is wider, and actual game uses the exact server radius',()=>{
 // At a fixed tree the 0.42m walker has more clearance than the 0.62m wolf.
 let found=false;
 for(const [cx,cz] of [[-26,21],[54,35],[34,-26],[-34,-30]]){
  for(let angle=0;angle<Math.PI*2;angle+=Math.PI/8){
   for(let d=.77;d<1.28;d+=.035){
    const x=cx+Math.cos(angle)*d,z=cz+Math.sin(angle)*d;
    if(canWalkCamp(x,z,.42,261)&&!canWalkCamp(x,z,.62,261)){found=true;break;}
   }
   if(found)break;
  }
  if(found)break;
 }
 assert.equal(found,true,'near a tree, unmounted passable and mounted blocked');
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(planet,/canWalkCamp\(x,z,mountState==='riding'\?\.62:\.42,R\)/);
 assert.match(planet,/settleCameraLook\(cameraLookTarget,desiredLook,dt,\{snap:snapLook\}\)/);
 assert.match(planet,/camera\.lookAt\(cameraLookTarget\)/);
});
