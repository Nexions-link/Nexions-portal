import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {ANCIENT_PINE_ID,ANCIENT_PINE_METADATA,oldPineBarkSample,
 ancientPineTrunkRadius,createOldPineMaps,createAncientPine}
 from '../tree-library-ancient-pine.js';

test('original bark maps have seamless borders, opaque albedo and material channels',()=>{
 const a=oldPineBarkSample(.123,.875),b=oldPineBarkSample(1.123,-.125);
 assert.deepEqual(a.color,b.color);
 assert.equal(a.color[3],255);
 assert.ok(a.height>.05&&a.height<.95);
 assert.throws(()=>createOldPineMaps(THREE,{width:16,height:50}),RangeError);
 const maps=createOldPineMaps(THREE,{width:64,height:128});
 assert.equal(maps.map.image.width,64);
 assert.equal(maps.normalMap.colorSpace,THREE.NoColorSpace);
 assert.equal(maps.roughnessMap.colorSpace,THREE.NoColorSpace);
 assert.equal(maps.map.colorSpace,THREE.SRGBColorSpace);
 for(let i=3;i<maps.map.image.data.length;i+=4)
  assert.equal(maps.map.image.data[i],255);
 Object.values(maps).forEach(t=>t.dispose());
});
test('pine hero has sculpted trunk, roots, boughs, needle volumes and moss but no colliders',()=>{
 const one=createAncientPine(THREE,{seed:17,mapSize:64});
 const two=createAncientPine(THREE,{seed:17,mapSize:64});
 assert.equal(one.metadata.id,ANCIENT_PINE_ID);
 assert.equal(ANCIENT_PINE_METADATA.height,28);
 assert.equal(one.group.userData.geometryCounts.roots,9);
 assert.ok(one.group.userData.geometryCounts.branches>100);
 assert.ok(one.group.userData.geometryCounts.needleTufts>1000);
 assert.equal(one.group.userData.geometryCounts.mossPatches,260);
 assert.ok(one.group.children.some(o=>o.name.includes('merged root')));
 assert.ok(one.group.children.some(o=>o.isInstancedMesh&&o.name.includes('needle')));
 assert.ok(one.group.children.every(o=>!o.userData?.collider));
 assert.ok(ancientPineTrunkRadius(0,.3)>ancientPineTrunkRadius(15,.3));
 const p=one.group.children.find(o=>o.name.includes('fissured')).geometry.getAttribute('position');
 const p2=two.group.children.find(o=>o.name.includes('fissured')).geometry.getAttribute('position');
 assert.equal(p.count,p2.count);
 for(const j of [0,15,400,4000,p.count-1])assert.equal(p.getX(j),p2.getX(j));
 for(const child of one.group.children.filter(o=>o.isMesh)){
  const positions=child.geometry.getAttribute('position');
  assert.ok(positions.count>0);
  for(let j=0;j<Math.min(positions.count,120);j++)
   for(let axis=0;axis<3;axis++)assert.ok(Number.isFinite(positions.array[j*3+axis]));
 }
 one.dispose();two.dispose();
});
test('pilot is isolated to the lab while legacy tree remains selectable',()=>{
 const viewer=readFileSync(new URL('../terrain-art-lab-view.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../terrain-art-lab.html',import.meta.url),'utf8');
 assert.match(viewer,/createAncientPine/);
 assert.match(viewer,/createForestLibraryTree/);
 assert.match(viewer,/TREE_GALLERY_SITES/);
 assert.match(viewer,/treeRoots\.forEach\(\(r,i\)=>/);
 assert.match(html,/id="treeVariant"/);
 assert.match(html,/id="treeFocus"/);
 assert.match(html,/id="lightMode"/);
 assert.doesNotMatch(viewer,/WebSocket|accountLaunch|fetch\(/);
});
