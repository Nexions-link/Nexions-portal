import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createForestSpatialBatches,forestBatchEligible} from '../forest-spatial-batches.js';
function fixture(){
 const source=new THREE.InstancedMesh(new THREE.SphereGeometry(.6,12,8),new THREE.MeshStandardMaterial(),1024);
 source.name='forest-spatial-test';source.castShadow=true;source.receiveShadow=true;
 const matrix=new THREE.Matrix4(),colour=new THREE.Color();
 for(let i=0;i<1024;i++){
  matrix.makeTranslation((i%32-16)*4,0,-4-Math.floor(i/32)*4);source.setMatrixAt(i,matrix);
  source.setColorAt(i,colour.setRGB(i/1024,.5,.3));
 }
 source.instanceMatrix.needsUpdate=true;source.instanceColor.needsUpdate=true;
 const scene=new THREE.Scene();scene.add(source);return {source,scene};
}
test('spatial batches preserve each matrix, colour, geometry and material exactly',()=>{
 const {scene,source}=fixture(),mask=source.layers.mask;
 const manager=createForestSpatialBatches(THREE,{scene});
 source.count=613;manager.update();
 assert.equal(manager.batchCount,1);assert.ok(manager.cellCount>4);
 assert.equal(source.layers.mask,0,'original world-sized draw is suppressed');
 const m=new THREE.Matrix4(),expected=new THREE.Matrix4(),colour=new THREE.Color(),expectedColour=new THREE.Color();
 const found=new Set();
 for(const child of source.children){
  assert.equal(child.geometry,source.geometry);assert.equal(child.material,source.material);
  assert.equal(child.frustumCulled,true);assert.equal(child.layers.mask,mask);
  assert.equal(child.castShadow,true);assert.equal(child.receiveShadow,true);
  for(let j=0;j<child.count;j++){
   child.getMatrixAt(j,m);
   const index=Math.round((-m.elements[14]-4)/4)*32+Math.round(m.elements[12]/4+16);
   source.getMatrixAt(index,expected);assert.deepEqual(m.elements,expected.elements);
   child.getColorAt(j,colour);source.getColorAt(index,expectedColour);
   assert.deepEqual(colour.toArray(),expectedColour.toArray());
   assert.ok(!found.has(index));found.add(index);
  }
 }
 assert.equal(found.size,613);assert.ok([...found].every(i=>i<613));
 manager.update();assert.equal(source.children.length,manager.cellCount,'repeated frames must not duplicate cells');
 manager.dispose();assert.equal(source.layers.mask,mask);assert.equal(source.children.length,0);
});
test('quality prefix and shadow toggles update without dropping nearby instances',()=>{
 const {scene,source}=fixture(),manager=createForestSpatialBatches(THREE,{scene});
 for(const count of [1024,215,0,700,1024]){
  source.count=count;source.castShadow=count>300;source.receiveShadow=count>0;manager.update();
  assert.equal(source.children.reduce((n,c)=>n+c.count,0),count);
  assert.ok(source.children.every(c=>c.castShadow===source.castShadow&&c.receiveShadow===source.receiveShadow));
 }
 source.visible=false;manager.update();assert.equal(source.visible,false,'base-mode parent visibility is preserved');
});
test('real camera frustum rejects distant cells instead of submitting the entire source batch',()=>{
 const {scene,source}=fixture(),manager=createForestSpatialBatches(THREE,{scene,cellSize:16});manager.update();
 const camera=new THREE.PerspectiveCamera(58,1,.1,45);camera.position.set(0,8,5);camera.lookAt(0,0,-15);camera.updateMatrixWorld();scene.updateMatrixWorld(true);
 const projection=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
 const frustum=new THREE.Frustum().setFromProjectionMatrix(projection);
 const visible=source.children.filter(c=>frustum.intersectsObject(c)).reduce((n,c)=>n+c.count,0);
 assert.ok(visible>0&&visible<source.count*.5,'close camera must not draw distant world geometry');
});
test('matrix refresh rebuilds bounds and failed optimisations restore the original draw',()=>{
 const {scene,source}=fixture(),manager=createForestSpatialBatches(THREE,{scene});manager.update();
 const matrix=new THREE.Matrix4().makeTranslation(600,0,-20);source.setMatrixAt(0,matrix);source.instanceMatrix.needsUpdate=true;manager.update();
 assert.ok(source.children.some(c=>c.boundingSphere.center.x>500));
 manager.dispose();
 const Broken={...THREE,InstancedMesh:class{constructor(){throw Error('allocation failed')}}};
 const safe=createForestSpatialBatches(Broken,{scene,logger:null});safe.update();
 assert.equal(source.layers.mask,1);assert.equal(source.children.length,0);assert.equal(source.count,1024);
 assert.equal(forestBatchEligible({isInstancedMesh:false}),false);
});

test('spherical occlusion rejects only cells completely hidden by the planet',async()=>{
 const {forestCellOccluded}=await import('../forest-spatial-batches.js');
 const camera=new THREE.Vector3(0,0,275);
 assert.equal(forestCellOccluded(camera,new THREE.Vector3(0,0,-261),3),true);
 assert.equal(forestCellOccluded(camera,new THREE.Vector3(0,0,261),3),false);
 assert.equal(forestCellOccluded(camera,new THREE.Vector3(160,0,206),45),false,'horizon-intersecting bounds must remain visible');
 assert.equal(forestCellOccluded(new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-20),2),false);
});
test('distant tiny plants are skipped without changing density or hiding close foliage',()=>{
 const {source,scene}=fixture();source.name='painterly-groundcover';source.castShadow=false;
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,6,0);
 const manager=createForestSpatialBatches(THREE,{scene,cellSize:16,planetRadius:0});
 manager.update(camera,'economy');
 const near=source.children.filter(c=>c.visible).reduce((n,c)=>n+c.count,0);
 assert.ok(near>0&&near<1024);
 manager.update(camera,'high');
 const high=source.children.filter(c=>c.visible).reduce((n,c)=>n+c.count,0);
 assert.ok(high>near);
 assert.equal(source.children.reduce((n,c)=>n+c.count,0),1024,'original population is retained');
 camera.position.set(1000,0,0);manager.update(camera,'balanced');
 assert.ok(source.children.every(c=>!c.visible));
 camera.position.set(0,6,0);manager.update(camera,'balanced');
 assert.ok(source.children.some(c=>c.visible),'walking back restores vegetation');
});

test('distant leaf geometry switches back to full detail when the camera approaches',()=>{
 const {source,scene}=fixture();source.name='painterly-ferns';source.castShadow=false;
 const distant=new THREE.SphereGeometry(.6,4,2);source.geometry.userData.ngwDistantGeometry=distant;
 const manager=createForestSpatialBatches(THREE,{scene,cellSize:16,planetRadius:0});
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,6,0);manager.update(camera,'high');
 assert.ok(source.children.some(c=>c.visible&&c.geometry===source.geometry));
 const far=source.children.find(c=>c.visible&&c.geometry===distant);assert.ok(far);
 camera.position.copy(far.boundingSphere.center);camera.position.y+=2;manager.update(camera,'high');
 assert.equal(far.geometry,source.geometry,'nearby leaf fidelity must be restored');
 manager.update();assert.ok(source.children.every(c=>c.geometry===source.geometry));
});
test('occluded cells have no tested surface point visible in front of the planet',async()=>{
 const {forestCellOccluded}=await import('../forest-spatial-batches.js');
 const camera=new THREE.Vector3(0,0,275),occluder=new THREE.Sphere(new THREE.Vector3(),249);
 const ray=new THREE.Ray(),hit=new THREE.Vector3();let rejected=0;
 for(let i=0;i<40;i++){
  const a=i*.157,centre=new THREE.Vector3(Math.sin(a)*270,Math.sin(i*2)*4,Math.cos(a)*270),radius=2+i%13;
  if(!forestCellOccluded(camera,centre,radius))continue;rejected++;
  for(const axis of [new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1)])for(const side of [-1,1]){
   const point=centre.clone().addScaledVector(axis,radius*side);
   ray.set(camera,point.clone().sub(camera).normalize());
   assert.ok(ray.intersectSphere(occluder,hit));
   assert.ok(hit.distanceTo(camera)<point.distanceTo(camera));
  }
 }
 assert.ok(rejected>10);
});
