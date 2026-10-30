import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {SURFACE_DETAIL_TILE_SIZE,SURFACE_DETAIL_METRES,
 surfaceDetailPixel,surfaceDetailWarp,surfaceDetailTint,buildSurfaceDetailPixels,surfaceDetailQuality,
 surfacePatchSample,createSurfaceMicrodetail}
 from '../surface-microdetail.js';
import {forestColliders,forestTrailLatitude} from '../whispering-forest.js';
import {lakeRadius} from '../start-zone.js';

test('locally repeated texture retains fine grain and remains translucent',()=>{
 assert.equal(SURFACE_DETAIL_TILE_SIZE,512);
 assert.ok(SURFACE_DETAIL_METRES<=4);
 const a=surfaceDetailPixel(.34,.62),b=surfaceDetailPixel(.34,.62);
 assert.deepEqual(a,b);
 assert.deepEqual(a,surfaceDetailPixel(1.34,-.38),'tiled noise must repeat exactly');
 assert.equal(a.rgba.length,4);
 assert.ok(a.rgba.every(x=>Number.isInteger(x)&&x>=0&&x<=255));
 assert.ok(a.rgba[3]>0&&a.rgba[3]<200);
 assert.ok(a.relief>0&&a.relief<255);
 const data=buildSurfaceDetailPixels(64);
 assert.equal(data.diffuse.length,64*64*4);
 assert.equal(data.relief.length,64*64*4);
 assert.ok(new Set(Array.from(data.diffuse.filter((_,i)=>i%4===3))).size>14);
 assert.ok(new Set(Array.from(data.relief.filter((_,i)=>i%4===0))).size>14);
 assert.throws(()=>buildSurfaceDetailPixels(2048),RangeError);
});

test('ground detail hides by clearings / lake / sphere borders rather than floating',()=>{
 const start=surfacePatchSample('start',.5,.5);
 assert.equal(start.fade,1);
 assert.ok(surfacePatchSample('start',0,0).fade===0);
 assert.ok(start.x===0&&start.z===0);
 const water=surfacePatchSample('start',(30+78)/156,(26+78)/156);
 assert.ok(lakeRadius(water.x,water.z)<1);
 assert.equal(water.fade,0);
 const forest=surfacePatchSample('forest',.5,.5);
 assert.ok(forest.fade>.99);
 assert.ok(Math.abs(forest.lat-forestTrailLatitude(forest.lon))<.000001);
 assert.equal(surfacePatchSample('forest',0,.5).fade,0);
 assert.equal(surfacePatchSample('forest',1,.5).fade,0);
 assert.equal(surfacePatchSample('forest',.5,0).fade,0);
});

test('presets bound overdraw and texture allocations',()=>{
 assert.deepEqual(surfaceDetailQuality('economy'),{visible:false,opacity:0,bump:false});
 assert.deepEqual(surfaceDetailQuality('high',true),{visible:false,opacity:0,bump:false});
 assert.ok(surfaceDetailQuality('high').opacity>surfaceDetailQuality('balanced').opacity);
 assert.ok(surfaceDetailQuality('high').bumpScale<.1);
});

test('new local meshes and tree contacts preserve original forest physics',()=>{
 const before=forestColliders();
 const scene=new THREE.Scene();
 const polish=createSurfaceMicrodetail(THREE,{scene,radius:261,heightAt:()=>0});
 assert.ok(polish,'stock Three materials and DataTextures should build in Node');
 assert.equal(polish.drawCalls,3);
 assert.equal(scene.children.length,3);
 assert.equal(scene.children.filter(o=>o.name.includes('decorative-no-collision')).length,3);
 assert.ok(polish.reliefGlobe.isDataTexture);
 assert.ok(polish.reliefVillage.isDataTexture);
 assert.equal(polish.reliefGlobe.repeat.x,409);
 assert.equal(polish.reliefVillage.repeat.x,48);
 const terrain=scene.children.filter(o=>o.name.startsWith('surface-microdetail'));
 assert.ok(terrain.every(o=>o.geometry.getAttribute('uv').count>4500));
 const uv=terrain[0].geometry.getAttribute('uv');
 assert.ok(Math.abs(uv.getX(100)-uv.getX(101))<1.2);
 polish.setQuality('economy');
 assert.ok(scene.children.every(o=>!o.visible));
 polish.setQuality('high');
 assert.ok(scene.children.every(o=>o.visible));
 const shadows=scene.children.find(o=>o.name.includes('contact-shade'));
 assert.equal(shadows.count,400);
 assert.deepEqual(forestColliders(),before);
});

test('existing globe stays an opaque unmodified standard material',()=>{
 const world=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(world,/groundMaterial=new THREE.MeshStandardMaterial/);
 assert.match(world,/transparent:false,depthWrite:true,side:THREE.FrontSide/);
 assert.match(world,/artSafety\.register\('microdetail'/);
 assert.match(world,/artSafety\.update\(qualityName,isPortalPreview\)/);
 assert.match(world,/artSafety\.getLayer\('microdetail'\)/);
 assert.match(world,/detail\?\.normalGlobe/);
 assert.match(world,/groundMaterial\.roughnessMap=roughness/);
 assert.doesNotMatch(world,/installForestGroundShader\(/);
});

test('warped UVs remain continuous while avoiding a repeated four-metre stamp',()=>{
 const a=surfaceDetailWarp(0,19),b=surfaceDetailWarp(4,19);
 assert.ok(Number.isFinite(a.u)&&Number.isFinite(a.v));
 assert.ok(Number.isFinite(b.u)&&Number.isFinite(b.v));
 assert.ok(Math.abs((b.u-a.u)-1)>.015,
  'world-space domain warp must decorrelate identical adjacent tiles');
 for(let x=-40;x<60;x+=.55){
  const p=surfaceDetailWarp(x,17),q=surfaceDetailWarp(x+.01,17);
  assert.ok(Math.hypot(p.u-q.u,p.v-q.v)<.02,
   'smooth warped UV cannot jump or create visible patch seams');
 }
 assert.throws(()=>surfaceDetailWarp(NaN,1),RangeError);
});
test('microdetail coloration respects soil moisture and protects compacted roads',()=>{
 const point=surfacePatchSample('forest',.5,.5);
 const track=surfaceDetailTint('forest',point);
 const off={...point,lat:point.lat+11/261};
 const wood=surfaceDetailTint('forest',off);
 assert.ok(track.alpha<wood.alpha,'needles should not obscure the trail');
 assert.ok(wood.g>0&&wood.r>0&&wood.b>0);
});
