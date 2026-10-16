// Run after npm install: node --test planet-test/village-visuals.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVillageVisuals,VILLAGE_VISUAL_COUNTS} from './village-visuals.js';

function sceneFixture(){
 let radius=261;
 const scene=new THREE.Scene();
 const normal=(x,z,r)=>{
  const d=Math.hypot(x,z),t=d/r;
  return d<1e-8?new THREE.Vector3(0,0,1):
   new THREE.Vector3(x*Math.sin(t)/d,z*Math.sin(t)/d,Math.cos(t));
 };
 const visuals=createVillageVisuals(THREE,{scene,getRadius:()=>radius,
  toNormal:normal,heightAt:()=>.2});
 const roof=new THREE.Mesh(new THREE.BoxGeometry(10,.27,20),new THREE.MeshStandardMaterial());
 const tent=new THREE.Group();
 visuals.addRoof(roof,10,20);
 visuals.addTent(tent,4);
 visuals.addTree(20,16,1);
 visuals.addTree(-12,21,.85);
 visuals.rebuild();
 return {scene,visuals,roof,tent,setRadius:value=>{radius=value;}};
}

test('ornaments are batched and anchored to existing buildings',()=>{
 const {scene,visuals,roof,tent}=sceneFixture();
 const counts=visuals.counts;
 assert.equal(counts.roofs,1);
 assert.equal(counts.tents,1);
 assert.equal(counts.trees,2);
 assert.equal(counts.tufts,2*VILLAGE_VISUAL_COUNTS.treeTufts);
 assert.equal(roof.getObjectByName('nexgameworld-roof-shingles').count,
  VILLAGE_VISUAL_COUNTS.roofColumns*VILLAGE_VISUAL_COUNTS.roofRows);
 assert.equal(tent.getObjectByName('nexgameworld-tent-stitching').count,
  VILLAGE_VISUAL_COUNTS.tentSeams);
 // The factory starts with economy detail (no active crown instances).
 assert.equal(scene.getObjectByName('nexgameworld-tree-crown-detail').count,0);
 visuals.applyQuality(1);
 assert.equal(scene.getObjectByName('nexgameworld-tree-crown-detail').count,counts.tufts);
});

test('economy hides detail; balanced and high progressively reveal it',()=>{
 const {scene,visuals,roof,tent}=sceneFixture();
 const shingles=roof.getObjectByName('nexgameworld-roof-shingles');
 const stitches=tent.getObjectByName('nexgameworld-tent-stitching');
 const crowns=scene.getObjectByName('nexgameworld-tree-crown-detail');
 visuals.applyQuality(.15);
 assert.equal(shingles.visible,false);
 assert.equal(stitches.visible,false);
 assert.equal(crowns.count,0);
 visuals.applyQuality(.68);
 assert.equal(shingles.visible,true);
 assert.equal(stitches.visible,true);
 assert.equal(crowns.count,visuals.counts.tufts/2);
 visuals.applyQuality(1);
 assert.equal(crowns.count,visuals.counts.tufts);
});

test('roof decor respects longhouse interior visibility across quality changes',()=>{
 const {visuals,roof}=sceneFixture();
 const shingles=roof.getObjectByName('nexgameworld-roof-shingles');
 visuals.applyQuality(1);
 assert.equal(shingles.visible,true);
 visuals.setInterior(true);
 assert.equal(shingles.visible,false);
 visuals.applyQuality(.68);
 assert.equal(shingles.visible,false);
 visuals.setInterior(false);
 assert.equal(shingles.visible,true);
});

test('decorative crowns rebuild onto a resized sphere and keep quality',()=>{
 const {scene,visuals,setRadius}=sceneFixture();
 const crown=scene.getObjectByName('nexgameworld-tree-crown-detail');
 const a=new THREE.Matrix4(),b=new THREE.Matrix4();
 visuals.applyQuality(.68);
 crown.getMatrixAt(0,a);
 setRadius(174);
 visuals.rebuild();
 crown.getMatrixAt(0,b);
 assert.notDeepEqual(a.elements,b.elements);
 assert.equal(crown.count,visuals.counts.tufts/2);
 assert.equal(crown.castShadow,false);
});

test('new village detailing never adds an interaction or collision primitive',()=>{
 const {scene,visuals,roof,tent}=sceneFixture();
 visuals.applyQuality(1);
 const found=[roof.getObjectByName('nexgameworld-roof-shingles'),
  tent.getObjectByName('nexgameworld-tent-stitching'),
  scene.getObjectByName('nexgameworld-tree-crown-detail')];
 assert.ok(found.every(item=>item.isInstancedMesh));
 assert.ok(found.every(item=>item.userData.collidable!==true));
 assert.ok(found.every(item=>item.userData.targetable!==true));
});
