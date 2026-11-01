import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {forestFloorLayout,forestFloorBudget,forestFloorColors,
 forestLitterPatchData,FOREST_LITTER_TRIANGLES,createForestFloor}
 from '../forest-floor.js';
import {forestGroundPixel,forestEntranceBlend,forestRoadProfile}
 from '../forest-ground-texture.js';
import {forestColliders,createForestLayout,FOREST_CAMP,FOREST_SITE_CLEARINGS,
 forestDistance,forestTrailLatitude} from '../whispering-forest.js';

test('G-24 separate leaves, seed and twig are deterministic six-facet micro patches',()=>{
 const layout=forestFloorLayout();
 assert.equal(layout.litter.length,920);
 const samples=[layout.litter[0],layout.litter.find(p=>p.kind==='twig')];
 assert.ok(samples.every(Boolean));
 for(const item of samples){
  const patch=forestLitterPatchData(item);
  assert.equal(patch.length,FOREST_LITTER_TRIANGLES);
  assert.equal(patch.filter(p=>p.kind==='leaf').length,4);
  assert.equal(patch.filter(p=>p.kind==='seed').length,1);
  assert.equal(patch.filter(p=>p.kind==='twig').length,1);
  assert.deepEqual(forestLitterPatchData(item),patch);
  const heights=patch.flatMap(p=>p.corners.map(x=>x[2]));
  assert.ok(heights.every(v=>v>=.109&&v<=.136),'micro-mesh stays safely above soil/moss');
  assert.ok(new Set(heights.map(x=>x.toFixed(3))).size>=6,'varied height and curl');
  assert.ok(patch.flatMap(p=>p.corners).every(c=>c.length===3&&c.every(Number.isFinite)));
  const coords=patch.flatMap(p=>p.corners);
  assert.ok(Math.max(...coords.map(c=>c[0]))-Math.min(...coords.map(c=>c[0]))>.14);
 }
 assert.throws(()=>forestLitterPatchData({lon:0,lat:0,size:-1,angle:0,kind:'leaf'}),TypeError);
});

test('G-24 each individual forest-floor microvertex follows real spherical terrain height',()=>{
 const oldTrees=createForestLayout(),oldColliders=forestColliders();
 const scene=new THREE.Scene(),R=261;
 const heightAt=n=>.43*n.x-.27*n.y+.11*n.z;
 const floor=createForestFloor(THREE,{scene,radius:R,heightAt});
 const mesh=scene.getObjectByName('forest-floor-leaves-and-twigs-no-collision');
 assert.ok(mesh?.isMesh);
 assert.equal(scene.children.length,2);
 assert.equal(floor.drawCalls,2);
 assert.equal(mesh.geometry.attributes.position.count,920*18);
 assert.equal(mesh.geometry.attributes.color.count,920*18);
 assert.equal(mesh.geometry.drawRange.count,565*18);
 assert.equal(mesh.material.transparent,false);
 assert.equal(mesh.material.depthWrite,true);
 assert.equal(mesh.material.polygonOffset,true);
 const pos=mesh.geometry.getAttribute('position');
 const items=floor.layout.litter;
 for(const index of [0,23,218,564,919]){
  const item=items[index],patch=forestLitterPatchData(item);
  const corners=patch.flatMap(t=>t.corners);
  for(let j=0;j<corners.length;j++){
   const [x,z,off]=corners[j];
   const lon=item.lon+x/(R*Math.cos(item.lat));
   const lat=Math.max(-1.53,Math.min(1.53,item.lat+z/R));
   const n=new THREE.Vector3(Math.cos(lat)*Math.sin(lon),Math.sin(lat),
    Math.cos(lat)*Math.cos(lon));
   const expected=n.multiplyScalar(R+heightAt(n)+off);
   const actual=new THREE.Vector3().fromBufferAttribute(pos,index*18+j);
   assert.ok(actual.distanceTo(expected)<.00012,
    'every litter vertex hugs sphere and local elevation without z-fighting');
  }
 }
 floor.setQuality('economy');
 assert.equal(mesh.geometry.drawRange.count,210*18);
 floor.setQuality('high');
 assert.equal(mesh.geometry.drawRange.count,920*18);
 floor.setQuality('high',true);
 assert.equal(mesh.geometry.drawRange.count,0);
 assert.equal(mesh.visible,false);
 assert.deepEqual(forestColliders(),oldColliders);
 assert.deepEqual(createForestLayout(),oldTrees);
});

test('G-24 layout and interactive paths unchanged; no extra render batches',()=>{
 const layout=forestFloorLayout(),again=forestFloorLayout();
 assert.deepEqual(layout,again);
 for(const p of layout.litter){
  const dist=Math.abs(p.lat-forestTrailLatitude(p.lon))*261;
  assert.ok(dist>=3.4+p.size);
  assert.ok(forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>
   FOREST_CAMP.clearingRadius+p.size+2);
  assert.ok(FOREST_SITE_CLEARINGS.every(site=>
   forestDistance(p.lon,p.lat,site.lon,site.lat)>site.radius+p.size+1));
 }
 assert.deepEqual(forestFloorBudget('economy'),{moss:155,litter:210});
 assert.deepEqual(forestFloorBudget(),{moss:410,litter:565});
 assert.deepEqual(forestFloorBudget('high'),{moss:680,litter:920});
});

test('G-24 opaque atlas pigment respects road wear, entrance blend and original materials',()=>{
 const source=readFileSync(new URL('../forest-ground-texture.js',import.meta.url),'utf8');
 assert.match(source,/const floorCover=art\?/);
 assert.match(source,/forestBlend\*\(1-road\.wear\)/);
 assert.match(source,/const detailedFloor=/);
 assert.doesNotMatch(source,/new THREE\.ShaderMaterial|onBeforeCompile/);
 const forestPixel=forestGroundPixel(1.09,forestTrailLatitude(1.09)+.047,{r2:true,art:true});
 assert.equal(forestPixel[3],255);
 assert.ok(forestPixel.slice(0,3).every(v=>Number.isInteger(v)&&v>=0&&v<=255));
 const road=forestRoadProfile(.91,forestTrailLatitude(.91));
 assert.ok(road.wear>.85);
 assert.ok(forestEntranceBlend(.8,forestTrailLatitude(.8))>.98);
 const floor=forestFloorColors(.91,forestTrailLatitude(.91),.52);
 assert.ok([floor.leaves,floor.twig].every(v=>v.every(c=>c>=0&&c<=1)));
 const code=readFileSync(new URL('../forest-floor.js',import.meta.url),'utf8');
 assert.match(code,/vertices\.push\(\.\.\.point\(item\.lon\+x\/\(radius\*Math\.cos\(item\.lat\)\)/);
 assert.doesNotMatch(code,/new THREE\.ShaderMaterial|registerPickup|addCollider/);
});
