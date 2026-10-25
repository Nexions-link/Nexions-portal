import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createWhisperingForest,forestCampPoint,FOREST_CAMP,FOREST_CAMP_PROPS,
 forestColliders} from '../whispering-forest.js';

test('camp shelters track local spherical terrain instead of floating on center tangent plane',()=>{
 const R=261,scene=new THREE.Scene(),before=forestColliders();
 const heightAt=n=>2.7*n.x+1.3*n.z+1.9*Math.sin(n.x*13)+.8*Math.cos(n.z*17);
 const forest=createWhisperingForest(THREE,{scene,radius:R,heightAt});
 const camp=scene.children.find(o=>o.name==='forest-expedition-camp');
 assert.ok(camp);
 camp.updateMatrixWorld(true);
 for(const shelter of FOREST_CAMP_PROPS.filter(p=>p.kind==='tent')){
  const foundation=camp.children.find(o=>o.geometry?.type==='CylinderGeometry'&&
   Math.abs(o.geometry.parameters.radiusTop-shelter.r)<1e-6);
  assert.ok(foundation,'missing tent foundation');
  const pos=foundation.getWorldPosition(new THREE.Vector3());
  const geo=forestCampPoint(shelter.dx,shelter.dz,R);
  const normal=new THREE.Vector3(Math.cos(geo.lat)*Math.sin(geo.lon),
   Math.sin(geo.lat),Math.cos(geo.lat)*Math.cos(geo.lon));
  const targetRadius=R+heightAt(normal);
  const actual=pos.dot(normal);
  assert.ok(Math.abs(actual-targetRadius-.19)<.11,
   'tent center must follow its own terrain, not center-camp altitude');
  assert.ok(foundation.geometry.parameters.height>=1.1,
   'lower tent skirt must extend below small terrain slopes');
 }
 assert.deepEqual(forestColliders(),before);
 assert.equal(forest.treeCount,400);
});
test('ground sampling applies to all camp props but never changes server collision positions',()=>{
 const source=readFileSync(new URL('../whispering-forest.js',import.meta.url),'utf8');
 assert.match(source,/function campGroundOffset\(dx,dz\)/);
 assert.match(source,/forestCampPoint\(dx,dz,radius\)/);
 assert.match(source,/y\+campGroundOffset\(x,z\)/);
 assert.doesNotMatch(source,/FOREST_CAMP_PROPS\.push/);
});
