import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {installDom} from './harness.mjs';
import {surfaceDetailPixel,buildSurfaceDetailPixels,
 createSurfaceMicrodetail,SURFACE_DETAIL_METRES} from '../surface-microdetail.js';
import {createStartZone} from '../start-zone.js';
import {forestColliders} from '../whispering-forest.js';

const file=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('G-07 original physical material has non-flat height, normal and roughness response',()=>{
 const samples=[.13,.24,.36,.47,.59,.68,.82].flatMap(u=>
  [.17,.39,.55,.77].map(v=>surfaceDetailPixel(u,v)));
 assert.ok(samples.every(p=>p.relief>=0&&p.relief<=255));
 assert.ok(samples.every(p=>p.roughness>205&&p.roughness<=255));
 assert.ok(new Set(samples.map(p=>p.relief)).size>7);
 assert.ok(new Set(samples.map(p=>p.roughness)).size>5);
 const image=buildSurfaceDetailPixels(96);
 for(const type of ['diffuse','relief','normals','roughness'])
  assert.equal(image[type].length,96*96*4,type);
 assert.equal(image.size,96);
 const cols=new Set(),normalColors=new Set(),rough=new Set();
 for(let i=0;i<image.normals.length;i+=4){
  const x=image.normals[i],y=image.normals[i+1],z=image.normals[i+2];
  assert.equal(image.normals[i+3],255);
  assert.ok(z>=225,'normal Z must face the surface, not turn sideways');
  assert.ok(Math.abs(x-128)<70&&Math.abs(y-128)<70,'subtle normal perturbation');
  assert.equal(image.roughness[i],image.roughness[i+1]);
  assert.equal(image.roughness[i+2],image.roughness[i+1]);
  assert.equal(image.roughness[i+3],255);
  assert.ok(image.roughness[i+1]>=205&&image.roughness[i+1]<=255);
  normalColors.add(x+','+y+','+z);rough.add(image.roughness[i+1]);
  cols.add(image.diffuse[i]+','+image.diffuse[i+1]+','+image.diffuse[i+2]);
 }
 assert.ok(normalColors.size>100);
 assert.ok(rough.size>=10);
 assert.ok(cols.size>100);
 assert.ok(SURFACE_DETAIL_METRES<=4);
});
test('G-07 uses same genuine world-metric repeat as diffuse and former bump texture',()=>{
 const scene=new THREE.Scene();
 const before=forestColliders();
 const created=createSurfaceMicrodetail(THREE,{scene,radius:261,heightAt:()=>0});
 assert.ok(created);
 for(const group of ['Globe','Village']){
  const normal=created['normal'+group],rough=created['roughness'+group],relief=created['relief'+group];
  assert.ok(normal.isDataTexture);
  assert.ok(rough.isDataTexture);
  assert.equal(normal.colorSpace,THREE.NoColorSpace);
  assert.equal(rough.colorSpace,THREE.NoColorSpace);
  assert.equal(normal.repeat.x,relief.repeat.x);
  assert.equal(normal.repeat.y,relief.repeat.y);
  assert.equal(rough.repeat.x,relief.repeat.x);
  assert.equal(rough.repeat.y,relief.repeat.y);
  assert.equal(normal.wrapS,THREE.RepeatWrapping);
  assert.equal(normal.minFilter,THREE.LinearMipmapLinearFilter);
  assert.ok(normal.image.data.some((n,i)=>i%4!==3&&n!==128));
  assert.ok(rough.image.data.some((n,i)=>i%4===1&&n!==255));
 }
 assert.equal(created.normalGlobe.repeat.x,409);
 assert.equal(created.normalVillage.repeat.x,48);
 assert.equal(created.drawCalls,3,'G07 must not add new geometry');
 assert.equal(scene.children.length,3);
 assert.deepEqual(forestColliders(),before);
});
test('village retains old bump fallback, but switches to real PBR maps on high',()=>{
 installDom();const scene=new THREE.Scene();
 const zone=createStartZone(THREE,scene,()=>261,()=>0);
 const ground=scene.children.find(c=>c.isMesh&&c.material?.map?.name?.includes('natural mineral meadow'));
 assert.ok(ground);const material=ground.material;
 assert.equal(material.normalMap,null);assert.equal(material.roughnessMap,null);
 zone.setGraphics({detail:1,shadows:false});
 assert.equal(material.bumpMap,material.map);
 const art=createSurfaceMicrodetail(THREE,{scene:new THREE.Scene(),radius:261,heightAt:()=>0});
 zone.setGraphics({detail:1,shadows:false,microNormal:art.normalVillage,microRoughness:art.roughnessVillage,microBump:art.reliefVillage});
 assert.equal(material.bumpMap,null);
 assert.equal(material.normalMap,art.normalVillage);
 assert.equal(material.roughnessMap,art.roughnessVillage);
 assert.ok(material.normalScale.x>0&&material.normalScale.x<.5);
 zone.setGraphics({detail:.15,shadows:false});
 assert.equal(material.bumpMap,null);assert.equal(material.normalMap,null);
 assert.equal(material.roughnessMap,null);
 zone.setGraphics({detail:1,portal:true,microNormal:art.normalVillage,microRoughness:art.roughnessVillage});
 assert.equal(material.normalMap,null);
});
test('core globe remains standard opaque geometry, all G07 maps follow G04 fallback',()=>{
 const world=file('../planet.js'),start=file('../start-zone.js'),detail=file('../surface-microdetail.js');
 assert.match(world,/new THREE\.PerspectiveCamera\(58, innerWidth \/ innerHeight, \.48, 1300\)/);
 assert.match(world,/groundMaterial=new THREE\.MeshStandardMaterial/);
 assert.match(world,/transparent:false,depthWrite:true,side:THREE.FrontSide/);
 assert.match(world,/normalMap=normal/);
 assert.match(world,/roughnessMap=roughness/);
 assert.match(world,/artSafety\.getLayer\('microdetail'\)/);
 assert.match(start,/terrainMaterial\.normalMap=normal/);
 assert.match(start,/terrainMaterial\.roughnessMap=roughness/);
 assert.match(start,/terrainMaterial\.bumpMap=bump/);
 assert.match(detail,/normalGlobe\.repeat\.set\(409,205\)/);
 assert.match(detail,/roughnessVillage\.repeat\.set\(48,48\)/);
 assert.doesNotMatch(detail,/fetch\(|WebSocket|localStorage/);
 const before=forestColliders();
 assert.deepEqual(forestColliders(),before);
});
