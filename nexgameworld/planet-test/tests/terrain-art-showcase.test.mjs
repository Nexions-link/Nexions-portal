import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {ART_LAB,artLabHeight,artLabBiomeHeight,artLabNormal,
 artLabScenicRelief,artLabSurfaceQuality,artLabWorldPoint}
 from '../terrain-art-lab.js';
import {SHOWCASE_TIERS,SHOWCASE_LANDMARKS,showcaseTerrainRelief,
 showcaseLayout,showcaseGeometryCounts,createStonewindShowcase}
 from '../terrain-art-showcase.js';

test('the experimental hillside rises naturally and fades to the unmodified sphere',()=>{
 for(let z=-20;z<=20;z+=2)for(let x=-20;x<=20;x+=2){
  const n=artLabNormal(x,z),h=artLabHeight(x,z),relief=artLabScenicRelief(x,z);
  assert.ok(Number.isFinite(h)&&Number.isFinite(relief));
  assert.equal(showcaseTerrainRelief(x,z),relief);
  const xyz=artLabWorldPoint(x,z,0);
  assert.ok(Math.abs(Math.hypot(...xyz)-(ART_LAB.radius+h))<1e-7);
  assert.ok(Math.abs(Math.hypot(...n)-1)<1e-12);
  if(Math.hypot(x,z)>=17)assert.equal(relief,0);
 }
 const hill=artLabScenicRelief(-9,8),lower=artLabScenicRelief(0,3.2);
 assert.ok(hill>lower,'the high slope and shaded hollow must contrast');
 assert.ok(hill>.2);
 assert.throws(()=>artLabScenicRelief(NaN,1),RangeError);
});

test('five material layers, real quality tiers and handcrafted landmarks remain original',()=>{
 assert.ok(artLabSurfaceQuality('high').atlas>=1536);
 assert.ok(artLabSurfaceQuality('balanced').atlas>=896);
 assert.ok(ART_LAB.treeSites.length>=4);
 assert.equal(SHOWCASE_LANDMARKS.hero.x,ART_LAB.treeSites[0][0]);
 assert.equal(SHOWCASE_LANDMARKS.hero.z,ART_LAB.treeSites[0][1]);
 for(const id of ['fallenLog','granite','stump','lightWell','hero']){
  const point=SHOWCASE_LANDMARKS[id];
  assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.z));
  assert.ok(Math.abs(point.x)<ART_LAB.halfSize&&Math.abs(point.z)<ART_LAB.halfSize);
 }
 assert.ok(SHOWCASE_TIERS.high.grass>SHOWCASE_TIERS.balanced.grass);
 assert.ok(SHOWCASE_TIERS.balanced.fern>SHOWCASE_TIERS.economy.fern);
 assert.ok(SHOWCASE_TIERS.high.shafts>0);
 assert.equal(SHOWCASE_TIERS.economy.shafts,0);
});

test('forest habitat samples are deterministic with clear trail and root footprints',()=>{
 const a=showcaseLayout(53177),b=showcaseLayout(53177);
 assert.deepEqual(a,b);
 for(const name of ['fern','grass','flowers','moss','mushrooms','glimmer']){
  assert.ok(a[name].length>=8,name);
  for(const p of a[name]){
   assert.ok(Math.hypot(p.x,p.z)<=15.46);
   assert.ok(p.scale>.3&&p.scale<2.0);
   assert.ok(ART_LAB.treeSites.every(([x,z])=>Math.hypot(p.x-x,p.z-z)>=1.55));
  }
 }
 assert.ok(a.forest.length>=200);
 assert.equal(showcaseGeometryCounts().forest,a.forest.length);
});

test('standalone beauty passes preserve draw-call limits and never add colliders',()=>{
 const scene=new THREE.Scene();
 const art=createStonewindShowcase(THREE,{scene});
 assert.equal(scene.children.length,1);
 assert.equal(art.root.name,'stonewind-original-showcase-decorative-no-collision');
 assert.ok(art.drawCalls<=10);
 const original=art.root.children.filter(o=>o.isInstancedMesh);
 assert.ok(original.length>=8);
 const all=original.reduce((a,m)=>a+m.instanceMatrix.count,0);
 assert.ok(all>500);
 art.setQuality('economy',true);
 assert.ok(original.some(m=>m.count<m.instanceMatrix.count));
 art.setQuality('high',true);
 assert.ok(original.every(m=>m.count===m.instanceMatrix.count));
 art.setQuality('high',false);
 assert.equal(art.root.visible,false);
 art.setQuality('balanced',true);
 assert.equal(art.root.visible,true);
 art.dispose();
 assert.equal(scene.children.length,0);
});

test('the P2.4.2 scene is visually rich yet isolated from gameplay and resources of WoW',()=>{
 const view=readFileSync(new URL('../terrain-art-lab-view.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../terrain-art-lab.html',import.meta.url),'utf8');
 const world=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const materials=readFileSync(new URL('../terrain-art-materials.js',import.meta.url),'utf8');
 assert.match(view,/createStonewindShowcase\(THREE,\{scene\}\)/);
 assert.match(view,/showcase\.setQuality\(quality,artEnabled\)/);
 assert.match(view,/index===0\?20\.3/);
 assert.match(html,/P2\.4\.2/);
 assert.match(html,/import\('\.\/terrain-art-lab-view\.js\?v=4'\)/);
 assert.match(materials,/\[512,768,896,1024,1536\]/);
 assert.doesNotMatch(world,/createStonewindShowcase|terrain-art-showcase/);
 for(const s of [view,html,materials]){
  assert.doesNotMatch(s,/azerothsurvivors|worldofwarcraft\.com|\.\.?\/\.\.?\/wow\//i);
 }
});
