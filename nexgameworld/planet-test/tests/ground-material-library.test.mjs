import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 GROUND_MATERIAL_LIBRARY_VERSION,GROUND_MATERIALS,
 groundMaterialWeights,groundMaterialPixel,groundMaterialRoughness
} from '../ground-material-library.js';
import {landscapeGroundPixel,prepareLandscapeRoutes}
 from '../../landscape.js';
import {forestGroundPixel,forestTextureMask,buildForestGroundPixels}
 from '../forest-ground-texture.js';
import {forestTrailLatitude,forestColliders}
 from '../whispering-forest.js';
import {startHeightAt,blendBiomeSoilAt,lakeRadius}
 from '../start-zone.js';
const src=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('G-06 defines six distinct original physical surface materials',()=>{
 assert.equal(GROUND_MATERIAL_LIBRARY_VERSION,'R1-G06-1');
 assert.deepEqual(GROUND_MATERIALS.map(x=>x.id),
  ['humus','packed','moss','sand','trail','wet']);
 assert.equal(new Set(GROUND_MATERIALS.map(m=>m.base.join(','))).size,6);
 for(const role of GROUND_MATERIALS){
  assert.ok(Object.isFrozen(role)&&Object.isFrozen(role.base));
  assert.ok(role.base.every(x=>Number.isInteger(x)&&x>=0&&x<=255));
  assert.ok(role.roughness>=.85&&role.roughness<=1);
  assert.ok(role.motif.length>20);
 }
});
test('all six materials blend with stable, normalized non-binary environment weights',()=>{
 const fields=['humus','packed','moss','sand','trail','wet'];
 const samples=[];
 for(const biome of ['meadow','forest'])for(let k=0;k<=40;k++){
  const t=k/40;
  const w=groundMaterialWeights({biome,earth:t,moisture:1-t,
   moss:t,leaves:t,dry:1-t,roadWear:t,roadRuts:t*.4,shore:t});
  assert.equal(w.length,fields.length);
  assert.ok(w.every(n=>n>0&&n<1));
  assert.ok(Math.abs(w.reduce((a,b)=>a+b,0)-1)<1e-12);
  samples.push(w);
 }
 for(let i=1;i<41;i++)for(let k=0;k<6;k++)
  assert.ok(Math.abs(samples[i][k]-samples[i-1][k])<.055,
   'weights must not create visible steps');
 const trail=groundMaterialWeights({roadWear:1,biome:'forest'});
 assert.ok(trail[4]>.65,'trampled soil dominates worn roads');
 const dryBank=groundMaterialWeights({biome:'meadow',shore:1,dry:1});
 const meadow=groundMaterialWeights({biome:'meadow',shore:0,dry:.2});
 assert.ok(dryBank[3]>meadow[3],'sandy soil dominates shore');
 const wet=groundMaterialWeights({moisture:1,dry:0});
 const dry=groundMaterialWeights({moisture:0,dry:1});
 assert.ok(wet[5]>dry[5]);
 const moss=groundMaterialWeights({moss:1,biome:'forest'});
 const bare=groundMaterialWeights({moss:0,biome:'forest'});
 assert.ok(moss[2]>bare[2]);
 assert.throws(()=>groundMaterialWeights({biome:'bog'}),RangeError);
});
test('pigment repeats neither on a fixed UV grid nor between independent biomes',()=>{
 const signals={biome:'forest',earth:.44,moisture:.76,moss:.48,
  leaves:.60,dry:.3,roadWear:.15};
 const colors=[];
 for(let i=0;i<250;i++)colors.push(groundMaterialPixel(i*.41,Math.sin(i*.14)*8,signals));
 assert.ok(new Set(colors.map(x=>x.join(','))).size>150);
 assert.deepEqual(groundMaterialPixel(42.1,2.6,signals),
  groundMaterialPixel(42.1,2.6,signals));
 for(const [x,z] of [[1.25,4.3],[12,8],[43,21],[77,-6]])
  assert.notDeepEqual(groundMaterialPixel(x,z,signals),
   groundMaterialPixel(x+64,z+64,signals),'no repeating 64m tile');
 for(const c of colors){assert.equal(c[3],255);assert.ok(c.every(v=>v>=0&&v<=255))}
 assert.throws(()=>groundMaterialPixel(Infinity,0,signals),RangeError);
});
test('wet, mossy, sandy, humid humus and packed path surfaces are distinguishable',()=>{
 const x=12,z=23;
 const cases={
  wet:{biome:'forest',moisture:1,dry:0,moss:0,roadWear:0,earth:.8},
  moss:{biome:'forest',moisture:.7,moss:1,earth:.2,dry:.1},
  sand:{biome:'meadow',shore:1,dry:1,moss:0,roadWear:0},
  humus:{biome:'forest',leaves:1,earth:.8,moss:.1,dry:.2},
  packed:{biome:'meadow',earth:1,moisture:.2,moss:0,leaves:0},
  trail:{biome:'forest',roadWear:1,roadRuts:.1,dry:.7}
 };
 const pixels=Object.fromEntries(Object.entries(cases).map(([key,signal])=>
  [key,groundMaterialPixel(x,z,signal)]));
 assert.ok(new Set(Object.values(pixels).map(v=>v.join(','))).size>=5);
 assert.ok(pixels.trail[0]>pixels.trail[2]);
 assert.ok(pixels.moss[1]>pixels.moss[2]);
 assert.ok(pixels.wet[0]<pixels.trail[0]);
 for(const cfg of Object.values(cases)){
  const rough=groundMaterialRoughness(cfg);
  assert.ok(rough>=.87&&rough<=1);
 }
});
test('real meadow and forest road render share six material families and remain warm',()=>{
 const routes=prepareLandscapeRoutes([{ax:0,az:0,bx:36,bz:0,width:3.5}]);
 const meadow=landscapeGroundPixel(18,0,routes);
 const forest=forestGroundPixel(.8,forestTrailLatitude(.8));
 assert.ok(meadow[0]>meadow[2]);
 assert.ok(forest[0]>forest[2]);
 assert.ok(Math.hypot(...meadow.slice(0,3).map((v,i)=>v-forest[i]))<93);
 const terrain=src('../../landscape.js');
 const woods=src('../forest-ground-texture.js');
 const start=src('../start-zone.js');
 assert.match(terrain,/groundMaterialPixel\(x,z,\{biome:'meadow'/);
 assert.match(woods,/groundMaterialPixel\(x,z,\{biome:'forest'/);
 assert.match(start,/shoreAt:\(x,z\)=>/);
 assert.match(start,/blendPixel:blendBiomeSoilAt/);
 const entrance=blendBiomeSoilAt(83,-8,landscapeGroundPixel(83,-8));
 assert.equal(entrance[3],255);
 assert.ok(startHeightAt(0,0)<12);
 assert.ok(Number.isFinite(lakeRadius(25,21)));
});
test('no geometry, camera, server or collision mutations for G-06',()=>{
 const before=forestColliders();
 const world=src('../planet.js');
 assert.match(world,/new THREE\.PerspectiveCamera\(58, innerWidth \/ innerHeight, \.48, 1300\)/);
 assert.match(world,/cameraPitch:previousWorld\?\.cameraPitch\?\?\.36/);
 assert.match(world,/cameraFollow:previousWorld\?\.cameraFollow\?\?cameraSettings\?\.follow\?\?false/);
 assert.match(world,/createStartZone\(THREE,scene,\(\)=>R,heightAt,\{globeGeometry:groundGeo\}\)/);
 const lib=src('../ground-material-library.js');
 assert.doesNotMatch(lib,/(?:fetch\(|WebSocket|localStorage|window\.)/);
 assert.deepEqual(forestColliders(),before);
 const bytes=buildForestGroundPixels(80,40);
 for(let i=3;i<bytes.length;i+=4)assert.equal(bytes[i],255);
 assert.deepEqual(forestGroundPixel(-1,.3),[255,255,255,255]);
 assert.equal(forestTextureMask(-1,0),0);
});
