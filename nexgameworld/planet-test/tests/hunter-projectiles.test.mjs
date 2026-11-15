import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHunterArrow} from '../hunter-arrow.js?v=64608';
import {createHunterProjectiles,HUNTER_PROJECTILE_CAPACITY} from '../hunter-projectiles.js';

const arrows=scene=>scene.children.filter(node=>node.userData.hunterArrow);
const visible=scene=>arrows(scene).filter(node=>node.visible);
const near=(actual,expected,message)=>assert.ok(actual.distanceTo(expected)<1e-7,message);
const snapshot=scene=>arrows(scene).map(node=>({visible:node.visible,
 position:node.position.toArray(),quaternion:node.quaternion.toArray()}));
function meshes(group){
 const result=[];group.traverse(node=>{if(node.isMesh)result.push(node)});return result;
}

test('the reusable arrow has finite geometry and visible shaft, head and fletching colors',()=>{
 const first=createHunterArrow(THREE),second=createHunterArrow(THREE);
 assert.ok(first.isGroup&&second.isGroup);
 const metadata=first.userData.hunterArrow;
 assert.ok(metadata&&Number.isFinite(metadata.nockZ)&&Number.isFinite(metadata.tipZ));
 assert.ok(metadata.tipZ>metadata.nockZ);
 assert.ok(Math.abs(metadata.length-(metadata.tipZ-metadata.nockZ))<1e-7);
 first.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(first);
 assert.ok(bounds.min.toArray().every(Number.isFinite)&&bounds.max.toArray().every(Number.isFinite));
 assert.ok(bounds.max.z-bounds.min.z>1,'the asset contains a full arrow rather than a point');
 assert.ok(bounds.min.z<=metadata.nockZ+.03&&bounds.max.z>=metadata.tipZ-.03,
  'the declared nock and tip correspond to the rendered asset');
 const firstMeshes=meshes(first),secondMeshes=meshes(second);
 assert.ok(firstMeshes.length>0);
 assert.equal(firstMeshes.length,secondMeshes.length);
 let coloredVertices=0;
 for(let i=0;i<firstMeshes.length;i++){
  const a=firstMeshes[i],b=secondMeshes[i],position=a.geometry.getAttribute('position');
  assert.ok(position?.count>0);
  assert.ok(Array.from(position.array).every(Number.isFinite),'no invalid vertices reach WebGL');
  const normals=a.geometry.getAttribute('normal');
  assert.equal(normals?.count,position.count);
  assert.ok(Array.from(normals.array).every(Number.isFinite),'the shaft and feather lighting stays valid');
  const index=a.geometry.index,triangles=(index?.count??position.count)/3;
  const triangle=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
  const face=new THREE.Vector3(),averageNormal=new THREE.Vector3(),vertexNormal=new THREE.Vector3();
  for(let t=0;t<triangles;t++){
   averageNormal.set(0,0,0);
   for(let corner=0;corner<3;corner++){
    const vertex=index?index.getX(t*3+corner):t*3+corner;
    triangle[corner].fromBufferAttribute(position,vertex);
    averageNormal.add(vertexNormal.fromBufferAttribute(normals,vertex));
   }
   face.copy(triangle[1]).sub(triangle[0]).cross(vertexNormal.copy(triangle[2]).sub(triangle[0]));
   assert.ok(face.lengthSq()>1e-16,'arrow surfaces have no collapsed triangles');
   assert.ok(face.dot(averageNormal)>0,'the visible triangle winding agrees with its lighting normals');
  }
  assert.equal(a.geometry.userData.actorShared,true);
  assert.strictEqual(a.geometry,b.geometry,'arrows share immutable model geometry');
  const materials=[a.material].flat(),others=[b.material].flat();
  for(let j=0;j<materials.length;j++)assert.notStrictEqual(materials[j],others[j],
   'projectile tints cannot leak to a held arrow or another shooter');
  if(materials.some(material=>material.vertexColors)){
   const colors=a.geometry.getAttribute('color');
   assert.equal(colors?.count,position.count);
   assert.ok(Array.from(colors.array).every(Number.isFinite));
   coloredVertices+=colors.count;
  }
 }
 assert.ok(coloredVertices>0,'the modeled arrow retains its painted material separation');
});

test('an exact shot appears immediately and points its tip toward the target',()=>{
 const scene=new THREE.Scene(),projectiles=createHunterProjectiles(THREE,scene);
 const from=new THREE.Vector3(2,10,-3),to=new THREE.Vector3(11,14,6);
 assert.equal(projectiles.fire(from,to,'autoShot',{exactOrigin:true,exactTarget:true,flightTime:.4}),true);
 const [arrow]=visible(scene);assert.ok(arrow);
 near(arrow.position,from,'the initial render must show the actual shot origin');
 const direction=new THREE.Vector3(0,0,1).applyQuaternion(arrow.quaternion);
 assert.ok(direction.dot(to.clone().sub(from).normalize())>.999999,'local +Z is the arrow tip');
 projectiles.update(.2);
 near(arrow.position,from.clone().lerp(to,.5),'the arrow travels toward the supplied target');
 projectiles.update(.201);
 assert.equal(arrow.visible,false,'the cosmetic projectile expires after reaching the target');
 assert.deepEqual(from.toArray(),[2,10,-3],'firing does not mutate actor coordinates');
 assert.deepEqual(to.toArray(),[11,14,6],'firing does not mutate target coordinates');
});

test('legacy world coordinates retain radial shooting and impact heights',()=>{
 const scene=new THREE.Scene(),projectiles=createHunterProjectiles(THREE,scene);
 const from=new THREE.Vector3(0,261,0),to=new THREE.Vector3(30,260,0);
 assert.equal(projectiles.fire(from,to,'arcaneShot'),true);
 const [arrow]=visible(scene);
 const raisedFrom=from.clone().addScaledVector(from.clone().normalize(),1.7);
 const raisedTo=to.clone().addScaledVector(to.clone().normalize(),1.4);
 near(arrow.position,raisedFrom,'legacy callers start at radial hand height');
 projectiles.update(.11);
 near(arrow.position,raisedFrom.lerp(raisedTo,.5),'legacy impacts keep the radial torso height');
});

test('a nock-anchored shot leaves the string at its tail and lands its tip on the requested point',()=>{
 const scene=new THREE.Scene(),projectiles=createHunterProjectiles(THREE,scene);
 const from=new THREE.Vector3(2,10,-3),to=new THREE.Vector3(11,14,6);
 const direction=to.clone().sub(from).normalize(),duration=.4;
 assert.equal(projectiles.fire(from,to,'autoShot',
  {exactOrigin:true,exactTarget:true,originAtNock:true,flightTime:duration}),true);
 const [arrow]=visible(scene),metadata=arrow.userData.hunterArrow;
 arrow.updateMatrixWorld(true);
 near(arrow.localToWorld(new THREE.Vector3(0,0,metadata.nockZ)),from,
  'the fired arrow tail starts at the actual string position');
 const firstCenter=arrow.position.clone();
 const endCenter=to.clone().addScaledVector(direction,-metadata.tipZ);
 projectiles.update(duration/2);
 near(arrow.position,firstCenter.clone().lerp(endCenter,.5),
  'nock and tip offsets do not distort the forward flight');
 assert.ok(arrow.position.clone().sub(firstCenter).dot(direction)>0,'the arrow moves forward after release');
 projectiles.update(duration/2+.001);
 assert.equal(arrow.visible,false);
 arrow.updateMatrixWorld(true);
 near(arrow.localToWorld(new THREE.Vector3(0,0,metadata.tipZ)),to,
  'the modeled steel tip reaches the requested target before hiding');
});

test('rapid shots remain bounded, and cleared projectiles reuse their scene objects',()=>{
 const scene=new THREE.Scene(),projectiles=createHunterProjectiles(THREE,scene);
 const originalObjects=arrows(scene);
 assert.equal(originalObjects.length,HUNTER_PROJECTILE_CAPACITY);
 assert.equal(visible(scene).length,0);
 for(let i=0;i<HUNTER_PROJECTILE_CAPACITY*4;i++){
  assert.equal(projectiles.fire(new THREE.Vector3(i,30,0),new THREE.Vector3(i+5,30,8),'autoShot',
   {exactOrigin:true,exactTarget:true}),true);
 }
 assert.equal(arrows(scene).length,HUNTER_PROJECTILE_CAPACITY,'online volleys do not grow the scene');
 assert.ok(visible(scene).length<=HUNTER_PROJECTILE_CAPACITY);
 projectiles.clear();assert.equal(visible(scene).length,0);
 assert.deepEqual(arrows(scene),originalObjects,'clearing keeps the reusable pool');
 assert.equal(projectiles.fire(new THREE.Vector3(1,2,3),new THREE.Vector3(4,5,6),'concussiveShot',
  {exactOrigin:true,exactTarget:true}),true);
 assert.ok(originalObjects.includes(visible(scene)[0]));
});

test('invalid shots and time deltas are rejected without corrupting existing arrows',()=>{
 const scene=new THREE.Scene(),projectiles=createHunterProjectiles(THREE,scene);
 const from=new THREE.Vector3(1,2,3),to=new THREE.Vector3(8,9,10);
 projectiles.fire(from,to,'autoShot',{exactOrigin:true,exactTarget:true});
 const before=snapshot(scene);
 const invalidShots=[
  [null,to,{}],[from,undefined,{}],[new THREE.Vector3(NaN,2,3),to,{}],
  [from,new THREE.Vector3(0,Infinity,0),{}],
  [from,from.clone(),{exactOrigin:true,exactTarget:true}],
  [from,to,{flightTime:NaN}],[from,to,{flightTime:Infinity}],
  [from,to,{flightTime:0}],[from,to,{flightTime:-1}],
  [from,to,{exactOrigin:1}],[from,to,{exactTarget:'true'}],
  [from,to,{originAtNock:'true'}],
  [from,from.clone().add(new THREE.Vector3(1,0,0)),
   {exactOrigin:true,exactTarget:true,originAtNock:true}],
  [from,to,null]
 ];
 for(const [origin,target,options] of invalidShots){
  assert.equal(projectiles.fire(origin,target,'autoShot',options),false);
  assert.deepEqual(snapshot(scene),before,'invalid input must not consume or reset an active slot');
 }
 for(const delta of [NaN,Infinity,-.1,0]){
  projectiles.update(delta);
  assert.deepEqual(snapshot(scene),before,'invalid frame time must not damage projectile transforms');
 }
 projectiles.update(.1);
 assert.ok(visible(scene).every(arrow=>arrow.position.toArray().every(Number.isFinite)));
});

test('disposing one projectile effect releases its own objects without destroying shared arrow geometry',()=>{
 const scene=new THREE.Scene(),unrelated=new THREE.Group();scene.add(unrelated);
 const projectiles=createHunterProjectiles(THREE,scene);
 const pool=arrows(scene),arrowMeshes=pool.flatMap(meshes);
 const geometries=new Set(arrowMeshes.map(mesh=>mesh.geometry));
 const materials=new Set(arrowMeshes.flatMap(mesh=>[mesh.material].flat()));
 let disposedGeometry=0,disposedMaterial=0;
 for(const geometry of geometries)geometry.addEventListener('dispose',()=>disposedGeometry++);
 for(const material of materials)material.addEventListener('dispose',()=>disposedMaterial++);
 projectiles.dispose();
 assert.equal(arrows(scene).length,0);
 assert.ok(scene.children.includes(unrelated),'cleanup is limited to its own scene objects');
 assert.equal(disposedMaterial,materials.size,'the effect releases its private material instances');
 assert.equal(disposedGeometry,0,'a held arrow or another effect still owns the shared model');
 const another=createHunterArrow(THREE);
 assert.ok(meshes(another).every(mesh=>geometries.has(mesh.geometry)));
});

test('extreme finite flight times are bounded to useful cosmetic durations',()=>{
 for(const [flightTime,early,late] of [[.001,.049,.002],[10,1.49,.02]]){
  const scene=new THREE.Scene(),projectiles=createHunterProjectiles(THREE,scene);
  assert.equal(projectiles.fire(new THREE.Vector3(1,2,3),new THREE.Vector3(8,9,10),'autoShot',
   {exactOrigin:true,exactTarget:true,flightTime}),true);
  projectiles.update(early);assert.equal(visible(scene).length,1);
  projectiles.update(late);assert.equal(visible(scene).length,0);
 }
});
