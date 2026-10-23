import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {ART_LAB,artLabHeight,artLabWorldPoint,artLabNormal}
 from '../terrain-art-lab.js';
import {TREE_LIBRARY,TREE_GALLERY_SITES,forestBarkSample,
 createForestBarkMaps,forestTrunkRadius,trunkCenterAt,createForestLibraryTree}
 from '../tree-library-forest-types.js';

const ids=['tree_pine_ancient','tree_oak_whispering','tree_dead_sentinel',
 'tree_broadleaf_moss','tree_root_ancient'];
test('five distinct original trees have stable gallery anchors and documented maps',()=>{
 assert.deepEqual(TREE_LIBRARY.map(x=>x.id),ids);
 assert.equal(TREE_LIBRARY.length,ART_LAB.treeSites.length);
 assert.deepEqual(TREE_GALLERY_SITES,ART_LAB.treeSites);
 assert.equal(new Set(TREE_LIBRARY.map(x=>x.material)).size,5);
 for(let i=0;i<ids.length;i++){
  const p=TREE_GALLERY_SITES[i];
  assert.ok(p.every(Number.isFinite));assert.ok(Math.hypot(...p)<ART_LAB.halfSize);
  const n=artLabNormal(...p),world=artLabWorldPoint(...p);
  assert.ok(Math.abs(Math.hypot(...n)-1)<1e-8);
  assert.ok(Math.abs(Math.hypot(...world)-(ART_LAB.radius+artLabHeight(...p)))<1e-6);
 }
});
test('original bark is nonuniform, opaque, tileable and uses correct PBR color spaces',()=>{
 for(const id of ids.slice(1)){
  const a=forestBarkSample(id,.19,.28),b=forestBarkSample(id,1.19,-.72);
  for(let i=0;i<4;i++)assert.ok(Math.abs(a.color[i]-b.color[i])<=1);
  assert.equal(a.color[3],255);
  const alt=forestBarkSample(id,.32,.49);
  assert.notDeepEqual(a.color,alt.color);
  assert.ok(a.height>.02&&a.height<1);
  const mats=createForestBarkMaps(THREE,id,{width:64,height:128});
  assert.equal(mats.map.colorSpace,THREE.SRGBColorSpace);
  for(const k of ['normalMap','roughnessMap','heightMap'])
   assert.equal(mats[k].colorSpace,THREE.NoColorSpace);
  assert.equal(mats.map.image.data.length,64*128*4);
  Object.values(mats).forEach(t=>t.dispose());
  assert.throws(()=>createForestBarkMaps(THREE,id,{width:50,height:65}),RangeError);
 }
});
test('four bespoke trees produce full 3D sculpted roots, branching and foliage',()=>{
 for(const id of ids.slice(1)){
  const tree=createForestLibraryTree(THREE,{id,mapSize:64,seed:47,
   groundHeight:(x,z)=>.14*Math.sin(x*.4+z)});
  const info=tree.group.userData.geometryCounts;
  assert.equal(tree.group.userData.assetId,id);
  assert.ok(info.height>=20);assert.ok(info.roots>=8);
  assert.ok(info.branches>=20);
  assert.ok(tree.group.children.some(o=>o.name.includes('unified visible root')));
  assert.ok(tree.group.children.every(o=>o.userData?.collider!==true));
  assert.ok(forestTrunkRadius(id,0,.4)>forestTrunkRadius(id,.77,.4));
  assert.ok(trunkCenterAt(id,.9,17).every(Number.isFinite));
  if(id==='tree_dead_sentinel'){
   assert.equal(info.leafClusters,0);
   assert.ok(tree.group.children.some(o=>o.name.includes('dark hollow')));
  }else{
   assert.ok(info.leafClusters>300);
   assert.ok(tree.group.children.some(o=>o.isInstancedMesh&&o.name.includes('3D leaves')));
  }
  let all=0;
  tree.group.traverse(o=>{
   if(!o.isMesh)return;
   const p=o.geometry.getAttribute('position');assert.ok(p.count);
   all+=p.count;
   for(let i=0;i<Math.min(p.count,25);i++)
    for(let axis=0;axis<3;axis++)assert.ok(Number.isFinite(p.array[i*3+axis]));
  });
  assert.ok(all>1500);
  tree.dispose();assert.equal(tree.group.parent,null);
 }
});
test('gallery is presentation only: no gameplay, network, physics or quest modifications',()=>{
 const script=readFileSync(new URL('../terrain-art-lab-view.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../terrain-art-lab.html',import.meta.url),'utf8');
 for(const id of ids)assert.match(html,new RegExp(id));
 assert.match(script,/gallery= TREE_LIBRARY\.map/);
 assert.match(script,/newTreesEnabled/);
 assert.match(script,/groundHeight=/);
 assert.match(html,/treeSelect/);
 assert.doesNotMatch(script,/WebSocket|accountLaunch|createSphericalPresence/);
});
