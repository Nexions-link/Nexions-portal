import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {partitionForestTerrain,forestAtlasUV,FOREST_ATLAS} from '../forest-terrain-atlas.js';
import {createForestCanopyShadows} from '../forest-canopy-shadows.js';
import {createSurfaceMicrodetail} from '../surface-microdetail.js';
import {forestColliders} from '../whispering-forest.js';
test('forest atlas partitions every original globe face exactly once without moving vertices',()=>{
 const geo=new THREE.SphereGeometry(261,180,112);
 const positions=geo.attributes.position.array.slice(),normals=geo.attributes.normal.array.slice();
 const faces=g=>Array.from({length:g.index.count/3},(_,i)=>[0,1,2].map(j=>g.index.getX(i*3+j)).join(',')).sort();
 const before=faces(geo),stats=partitionForestTerrain(THREE,geo);
 assert.deepEqual(faces(geo),before);
 assert.deepEqual(geo.attributes.position.array,positions);
 assert.deepEqual(geo.attributes.normal.array,normals);
 assert.equal(geo.groups.length,2);
 assert.equal(geo.groups.reduce((n,g)=>n+g.count,0),geo.index.count);
 assert.ok(stats.forestTriangles>1000);
 const group=geo.groups[1],uv=geo.attributes.uv1;
 for(let i=group.start;i<group.start+group.count;i++){
  const k=geo.index.getX(i);assert.ok(uv.getX(k)>=0&&uv.getX(k)<=1&&uv.getY(k)>=0&&uv.getY(k)<=1);
 }
 assert.deepEqual(forestAtlasUV(FOREST_ATLAS.west,FOREST_ATLAS.south),[0,0]);
 assert.ok(261*(FOREST_ATLAS.east-FOREST_ATLAS.west)/FOREST_ATLAS.width<.17);
});
test('balanced canopy shadows are nearby, capped, invisible in colour and disabled at other presets',()=>{
 const colliders=forestColliders(),scene=new THREE.Scene();
 const s=createForestCanopyShadows(THREE,{scene,radius:261,heightAt:()=>0});
 const n=new THREE.Vector3(Math.sin(.7),0,Math.cos(.7));
 s.setQuality('balanced');s.update(n);
 assert.ok(s.mesh.count>0&&s.mesh.count<=48);
 assert.equal(s.mesh.material.colorWrite,false);assert.equal(s.mesh.material.depthWrite,false);
 assert.equal(s.mesh.geometry.attributes.position.count/3,80);
 s.setQuality('economy');assert.equal(s.mesh.visible,false);
 s.setQuality('high');assert.equal(s.mesh.visible,false);
 s.setQuality('balanced',true);assert.equal(s.mesh.visible,false);
 assert.deepEqual(forestColliders(),colliders);
});
test('fine forest soil receives actual lighting and shadows without another overlay',()=>{
 const scene=new THREE.Scene();
 const d=createSurfaceMicrodetail(THREE,{scene,radius:261,heightAt:()=>0});
 assert.equal(d.drawCalls,3);
 const forest=scene.children.find(x=>x.name==='surface-microdetail-forest-decorative-no-collision');
 assert.equal(forest.material.isMeshStandardMaterial,true);
 assert.equal(forest.receiveShadow,true);
 const village=scene.children.find(x=>x.name==='surface-microdetail-start-decorative-no-collision');
 assert.equal(village.material.isMeshBasicMaterial,true);
});
