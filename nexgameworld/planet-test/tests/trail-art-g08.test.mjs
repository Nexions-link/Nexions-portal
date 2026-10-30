import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PATH_ART_VERSION,paintedTrailProfile,paintTrailSurface} from '../trail-art.js';
import {landscapeGroundPixel,prepareLandscapeRoutes} from '../../landscape.js';
import {forestGroundPixel,forestRoadProfile,forestTextureMask} from '../forest-ground-texture.js';
import {forestTrailLatitude,forestLocalPoint,forestColliders} from '../whispering-forest.js';
import {FOREST_ROAD_CONNECTOR,ROUTES,blendBiomeSoilAt} from '../start-zone.js';
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('G-08 produces eroded but continuous physical-width trail shoulders',()=>{
 assert.equal(PATH_ART_VERSION,'R1-G08-1');
 const range=[];
 for(let x=0;x<=130;x+=.35){
  const p=paintedTrailProfile(x,2,0,3.5);
  assert.ok(p.wear>.92,'navigable centre must remain visually readable');
  assert.ok(p.width>2.5&&p.width<4.4);
  assert.ok(p.core>.30);
  range.push(p.width);
 }
 assert.ok(Math.max(...range)-Math.min(...range)>.25,'width should gently vary');
 for(let d=0;d<12;d+=.07){
  const p=paintedTrailProfile(34,18,d,3.65),q=paintedTrailProfile(34,18,d+.01,3.65);
  for(const k of ['wear','core','ruts','verge'])
   assert.ok(Math.abs(p[k]-q[k])<.08,'no jagged discrete material boundary: '+k);
  assert.ok(Object.values(p).every(Number.isFinite));
  assert.ok(p.wear>=0&&p.wear<=1);
 }
 assert.ok(paintedTrailProfile(34,18,12,3.65).wear===0);
 assert.ok(paintedTrailProfile(34,18,0,3.65).wear>.9);
 assert.throws(()=>paintedTrailProfile(NaN,0,0),RangeError);
 assert.throws(()=>paintedTrailProfile(1,2,0,0),RangeError);
});
test('two asymmetric soft ruts, golden compacted centre and stones stay deterministic',()=>{
 const variants=[];
 for(let x=10;x<75;x+=.45){
  const p=paintedTrailProfile(x,7,1.5,3.5);
  assert.ok(p.ruts>=0&&p.ruts<=1);
  assert.ok(p.flecks>=0&&p.flecks<=1);
  assert.ok(p.gravel>=0&&p.gravel<=1);
  const rgb=paintTrailSurface([103,113,75],p,x,7);
  assert.equal(rgb.length,3);
  assert.ok(rgb.every(v=>Number.isInteger(v)&&v>=0&&v<=255));
  variants.push(rgb.join(','));
 }
 assert.ok(new Set(variants).size>35);
 const on=paintedTrailProfile(16,5,0,3.5);
 const off=paintedTrailProfile(16,5,12,3.5);
 assert.notDeepEqual(paintTrailSurface([93,113,61],on,16,5),
  paintTrailSurface([93,113,61],off,16,5));
 assert.deepEqual(paintTrailSurface([96,108,70],off,16,5),[96,108,70]);
 assert.throws(()=>paintTrailSurface([1,NaN,3],on,0,0),TypeError);
});
test('forest path follows unchanged forestTrailLatitude geometry, without a new mesh',()=>{
 const first=forestColliders();
 for(const lon of [.18,.24,.40,.65,.86,1.05,1.34,1.45]){
  const centre=forestTrailLatitude(lon);
  const p=forestRoadProfile(lon,centre);
  assert.ok(p.wear>.9);
  assert.equal(p.dist,0);
  assert.ok(p.width>2.5&&p.width<4.8);
  const outside=forestRoadProfile(lon,centre+.048);
  assert.equal(outside.wear,0);
  const left=forestRoadProfile(lon,centre+.006),
   right=forestRoadProfile(lon,centre-.006);
  assert.ok(left.wear>=0&&right.wear>=0);
  assert.ok(left.ruts>=0&&right.ruts>=0);
 }
 assert.equal(forestRoadProfile(NaN,0).wear,0);
 assert.deepEqual(forestColliders(),first);
 const forest=source('../whispering-forest.js');
 assert.match(forest,/The earlier opaque road ribbon has been retired/);
 const road=source('../forest-ground-texture.js');
 assert.match(road,/paintedTrailProfile\(x,z,signedDistance,3\.65\)/);
 assert.match(road,/paintTrailSurface\(\[r,g,b\],road,x,z\)/);
});
test('start and forest trails join in colour and no hard texture cut at the connector',()=>{
 assert.equal(FOREST_ROAD_CONNECTOR.length,13);
 assert.ok(ROUTES[1].length>=17);
 const trailSegments=ROUTES[1].slice(0,-1).map((a,i)=>({
  ax:a[0],az:a[1],bx:ROUTES[1][i+1][0],bz:ROUTES[1][i+1][1],width:3.25
 }));
 const segments=prepareLandscapeRoutes(trailSegments);
 const colors=[];
 for(const lon of [.20,.22,.24,.26,.28,.30]){
  const lat=forestTrailLatitude(lon);
  const local=forestLocalPoint(lon,lat);
  const start=landscapeGroundPixel(local.x,local.z,segments);
  const forest=forestGroundPixel(lon,lat);
  const blended=blendBiomeSoilAt(local.x,local.z,start);
  const dist=Math.hypot(...start.slice(0,3).map((v,i)=>v-forest[i]));
  // While the forest mask is still transparent, forestGroundPixel is
  // intentionally near white: comparing that to opaque village dirt is
  // physically meaningless. Compare true forest pigment only at full blend.
  if(forestTextureMask(lon,lat)>.86)
   assert.ok(dist<95,'warm path albedos stay related at the material join');
  assert.ok(start[0]>start[2]&&forest[0]>forest[2]);
  assert.ok(blended.every(n=>n>=0&&n<=255));
  assert.equal(blended[3],255);
  assert.ok(forestTextureMask(lon,lat)>0);
  colors.push(start.join(','));
 }
 assert.ok(new Set(colors).size>3);
 const meadow=source('../../landscape.js');
 assert.match(meadow,/paintedTrailProfile\(x,z,signed,seg\.width\)/);
 assert.match(meadow,/paintTrailSurface\(\[r,g,b\],roadArt,x,z\)/);
 assert.doesNotMatch(meadow,/new THREE\.PlaneGeometry|new THREE\.Mesh\(/);
});
test('the G-08 module has no camera, shader overrides, network or physical changes',()=>{
 const s=source('../trail-art.js'),game=source('../planet.js');
 const executable=s.split('\n').filter(line=>!line.trimStart().startsWith('//')).join('\n');
 assert.doesNotMatch(executable,/fetch\(|WebSocket|camera|new THREE|document|heightAt|localStorage/);
 assert.match(game,/new THREE\.PerspectiveCamera\(58, innerWidth \/ innerHeight, \.48, 1300\)/);
 assert.match(game,/cameraPitch:previousWorld\?\.cameraPitch\?\?\.36/);
 assert.match(game,/artSafety\.update\(qualityName,isPortalPreview\)/);
 assert.match(game,/createStartZone\(THREE,scene,\(\)=>R,heightAt,\{globeGeometry:groundGeo\}\)/);
});
