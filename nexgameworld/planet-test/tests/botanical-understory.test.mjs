import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {botanicalUnderstoryData} from '../botanical-understory.js';
import {createPainterlyBiome,painterlyBiomeLayout} from '../painterly-biome.js';
import {forestTrailLatitude,FOREST_CAMP,FOREST_SITE_CLEARINGS,forestDistance} from '../whispering-forest.js';
import {pathWear,lakeRadius} from '../start-zone.js';

test('compound leaves have finite curved surfaces and short grass stays below the player',()=>{
 for(const kind of ['lawn','groundcover','ferns']){
  const data=botanicalUnderstoryData(kind);
  assert.deepEqual(data,botanicalUnderstoryData(kind));
  assert.equal(data.colors.length,data.positions.length);
  assert.ok(data.positions.every(Number.isFinite));
  const p=data.positions;
  for(let i=0;i<p.length;i+=9){
   const a=new THREE.Vector3(...p.slice(i,i+3));
   const b=new THREE.Vector3(...p.slice(i+3,i+6));
   const c=new THREE.Vector3(...p.slice(i+6,i+9));
   assert.ok(b.sub(a).cross(c.sub(a)).length()>1e-9,kind+' must have no degenerate triangles');
  }
  const heights=p.filter((_,i)=>i%3===1);
  assert.ok(Math.max(...heights)<1);
  if(kind==='lawn')assert.ok(Math.max(...heights)<=.35);
  if(kind==='ferns')assert.ok(p.length/9>1000,'separate pinnate leaflets');
 }
});
test('new lawn preserves roads, lake and quest clearings in both biomes',()=>{
 const layout=painterlyBiomeLayout();
 for(const p of layout.lawn){
  if(p.zone==='start'){
   assert.ok(pathWear(p.x,p.z)<=.12);
   assert.ok(lakeRadius(p.x,p.z)>=1.28);
   assert.ok(Math.hypot(p.x+27,p.z+2)>=16);
  }else{
   assert.ok(Math.abs(p.lat-forestTrailLatitude(p.lon))*261>=3.8);
   assert.ok(forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>=FOREST_CAMP.clearingRadius+5);
   assert.ok(FOREST_SITE_CLEARINGS.every(s=>forestDistance(p.lon,p.lat,s.lon,s.lat)>=s.radius+3));
  }
 }
});
test('real instanced plants receive shadows and petals keep their original colour',()=>{
 const scene=new THREE.Scene();
 const layer=createPainterlyBiome(THREE,{scene,radius:261,heightAt:()=>0});
 assert.equal(scene.children.length,7);
 const flower=scene.children.find(x=>x.name.includes('daisies'));
 const tint=new THREE.Color();flower.getColorAt(0,tint);
 assert.equal(tint.getHexString(),'ffffff');
 for(const mesh of scene.children){
  if(!mesh.name.includes('sunflecks'))assert.equal(mesh.receiveShadow,true);
  const matrix=new THREE.Matrix4();mesh.getMatrixAt(0,matrix);
  assert.ok(matrix.elements.every(Number.isFinite));
 }
 layer.setQuality('high',true);
 assert.ok(scene.children.every(x=>!x.visible));
 layer.setQuality('high');
 assert.ok(scene.children.every(x=>x.count>0&&x.visible));
});

test('distant botanical geometry keeps the same leaves and bounds with fewer subdivisions',()=>{
 for(const kind of ['ferns','groundcover']){
  const full=botanicalUnderstoryData(kind),distant=botanicalUnderstoryData(kind,'distant');
  assert.ok(distant.positions.length<=full.positions.length*.4);
  const vertices=new Set();
  for(let i=0;i<full.positions.length;i+=3)vertices.add(full.positions.slice(i,i+3).map(v=>v.toFixed(8)).join(','));
  for(let i=0;i<distant.positions.length;i+=3)
   assert.ok(vertices.has(distant.positions.slice(i,i+3).map(v=>v.toFixed(8)).join(',')),kind+' must retain the original leaf envelope');
 }
});
