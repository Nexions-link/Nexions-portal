import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createForestLayout,createWhisperingForest,FOREST_TRUNK_BASE_SCALE,
 proceduralForestTrunkOutline,forestColliders,forestLocalPoint,blocksForestAtLocal}
 from '../whispering-forest.js';
import {G11_TRUNK_VERSION,G11_FOREST_BOUND,G11_AMBIENT_BOUND,
 g11ForestSection,g11AmbientSection,createG11ForestTrunkGeometry,
 createG11AmbientTrunkGeometry} from '../trunk-silhouette-g11.js';
const src=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const TAU=Math.PI*2,avg=arr=>arr.reduce((a,b)=>a+b,0)/arr.length;

test('G-11 ages the forest outline without crossing the original authoritative tree cylinder',()=>{
 assert.equal(G11_TRUNK_VERSION,'R1-G11-1');
 assert.equal(G11_FOREST_BOUND,FOREST_TRUNK_BASE_SCALE);
 const rings=new Map();
 let displacement=0,scar=0,collar=0;
 for(const y of [-.5,-.42,-.31,-.20,-.09,0,.03,.19,.22,.5]){
  const rad=[];
  for(let i=0;i<360;i++){
   const a=TAU*i/360;
   const sample=g11ForestSection(y,a,proceduralForestTrunkOutline);
   const old=proceduralForestTrunkOutline(y,a);
   assert.ok(Number.isFinite(sample.radius+sample.curveX+sample.curveZ+sample.shade));
   assert.ok(sample.radius>.12 && sample.radius<=G11_FOREST_BOUND);
   const extent=Math.hypot(Math.cos(a)*sample.radius+sample.curveX,
    Math.sin(a)*sample.radius+sample.curveZ);
   assert.ok(extent<=G11_FOREST_BOUND+.00001,'visual shell must never exceed server footprint');
   rad.push(sample.radius);
   displacement+=Math.abs(sample.radius-old.radius);
   scar=Math.max(scar,sample.scar);
   collar=Math.max(collar,sample.collar);
  }
  rings.set(y,rad);
 }
 assert.ok(displacement>1,'G-11 must actually modify the old silhouette');
 assert.ok(collar>.025&&scar>.012,'aged branch collars and scars are visible');
 assert.ok(avg(rings.get(-.5))>avg(rings.get(-.42)));
 assert.ok(avg(rings.get(-.42))>avg(rings.get(0))*1.13);
 assert.ok(avg(rings.get(-.5))>avg(rings.get(.5))*2.7);
 assert.ok(Math.max(...rings.get(-.5))-Math.min(...rings.get(-.5))>.13);
 const anchored=g11ForestSection(-.5,.73,proceduralForestTrunkOutline);
 assert.equal(anchored.curveX,0);assert.equal(anchored.curveZ,0);
 assert.throws(()=>g11ForestSection(NaN,0,proceduralForestTrunkOutline),RangeError);
});

test('G-11 builds one forest trunk mesh with unchanged 20x18 indexed topology and instancing budget',()=>{
 const mesh=createG11ForestTrunkGeometry(THREE,proceduralForestTrunkOutline);
 const old=new THREE.CylinderGeometry(.52,G11_FOREST_BOUND,1,20,18);
 assert.equal(mesh.getAttribute('position').count,old.getAttribute('position').count);
 assert.equal(mesh.index.count,old.index.count);
 assert.equal(mesh.userData.g11Kind,'forest');
 assert.ok(mesh.userData.g11Trunk&&mesh.userData.instanced);
 const pos=mesh.getAttribute('position'),colors=mesh.getAttribute('color'),
  normals=mesh.getAttribute('normal');
 assert.equal(pos.count,colors.count);assert.equal(pos.count,normals.count);
 for(let i=0;i<pos.count;i++){
  const r=Math.hypot(pos.getX(i),pos.getZ(i));
  assert.ok(r<=G11_FOREST_BOUND+.00001);
  for(const a of [pos,colors,normals])for(let j=0;j<3;j++)
   assert.ok(Number.isFinite(a.array[i*3+j]));
  for(let j=0;j<3;j++)assert.ok(colors.array[i*3+j]>=0&&colors.array[i*3+j]<=1);
 }
 const duplicate=createG11ForestTrunkGeometry(THREE,proceduralForestTrunkOutline);
 assert.deepEqual([...duplicate.getAttribute('position').array],[...pos.array]);
 duplicate.dispose();mesh.dispose();old.dispose();
});

test('G-11 replaces six-sided background cylinders with smooth, bent, root-flared mini trees',()=>{
 const ambient=createG11AmbientTrunkGeometry(THREE);
 const old=new THREE.CylinderGeometry(.18,G11_AMBIENT_BOUND,1.55,14,14);
 assert.equal(ambient.getAttribute('position').count,old.getAttribute('position').count);
 assert.equal(ambient.index.count,old.index.count);
 const lower=[],upper=[],attribute=ambient.getAttribute('position');
 for(let i=0;i<attribute.count;i++){
  const x=attribute.getX(i),y=attribute.getY(i),z=attribute.getZ(i);
  const r=Math.hypot(x,z);
  assert.ok(r<=G11_AMBIENT_BOUND+.001,'miniature tree footprint must not grow');
  assert.ok(Number.isFinite(x+y+z));
  if(y<-.77)lower.push(r);
  if(y>.77)upper.push(r);
 }
 assert.ok(lower.length>=14&&upper.length>=14);
 assert.ok(avg(lower)>avg(upper)*1.8);
 assert.ok(Math.max(...lower)-Math.min(...lower)>.025,'roots must not be circular');
 const a=g11AmbientSection(-.5,2.1),b=g11AmbientSection(.5,2.1);
 assert.ok(a.radius>b.radius*1.8);
 assert.equal(a.curveX,0);assert.equal(a.curveZ,0);
 assert.ok(Math.abs(b.curveX)+Math.abs(b.curveZ)>.005);
 assert.throws(()=>g11AmbientSection(Infinity,0),RangeError);
 old.dispose();ambient.dispose();
});

test('G-11 runs on the 400 original forest trees with zero extra draw calls and unchanged blockers',()=>{
 const colliders=forestColliders(),layout=createForestLayout();
 const scene=new THREE.Scene(),result=createWhisperingForest(THREE,{scene,radius:261,heightAt:()=>0});
 const meshes=scene.children.filter(x=>x.isInstancedMesh&&x.name.startsWith('forest-'));
 assert.equal(meshes.length,12);
 assert.equal(result.treeCount,400);
 const trunks=scene.children.find(x=>x.name==='forest-ancient-trunks');
 assert.ok(trunks?.geometry.userData.g11Trunk);
 assert.equal(trunks.count,layout.trees.length);
 for(const tree of layout.trees){
  const p=forestLocalPoint(tree.lon,tree.lat);
  assert.ok(blocksForestAtLocal(p.x,p.z));
 }
 assert.deepEqual(forestColliders(),colliders);
});

test('G-11 affects only geometries; original camera, player controls and server remain isolated',()=>{
 const forest=src('../whispering-forest.js'),planet=src('../planet.js'),
  module=src('../trunk-silhouette-g11.js');
 assert.match(forest,/createG11ForestTrunkGeometry\(THREE,proceduralForestTrunkOutline\)/);
 assert.match(planet,/createG11AmbientTrunkGeometry\(THREE\)/);
 assert.match(planet,/new THREE\.PerspectiveCamera\(58, innerWidth \/ innerHeight, \.48, 1300\)/);
 assert.match(planet,/cameraPitch:previousWorld\?\.cameraPitch\?\?\.36/);
 assert.doesNotMatch(module,/WebSocket|localStorage|fetch\(|camera\.|playerPosition|createCollider/);
 assert.match(planet,/from '\.\/whispering-forest\.js\?v=\d+'/);
});
