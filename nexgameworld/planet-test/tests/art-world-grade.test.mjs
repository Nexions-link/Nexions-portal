import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {paintVillageGround,paintForestGround} from '../art-world-grade.js';
import {prepareLandscapeRoutes,landscapeGroundPixel} from '../../landscape.js';
import {forestGroundPixel,forestRoadProfile,forestTextureMask} from '../forest-ground-texture.js';
import {forestTrailLatitude,createForestLayout,forestColliders,createWhisperingForest}
 from '../whispering-forest.js';

test('R3 new terrain colours are visible, deterministic and in-bounds',()=>{
 const sample={worn:.93,earth:.24,moss:.22,dry:.68,moisture:.4,
  clump:.41,mineral:.63,flecks:.53,grit:.47,roadEdge:.9};
 const path=paintVillageGround([140,100,70],sample);
 const grass=paintVillageGround([100,130,75],{...sample,worn:0,moss:.62,earth:.25});
 assert.deepEqual(path,paintVillageGround([140,100,70],sample));
 assert.ok(path[0]>path[1]*1.24,'path is visibly warm ochre');
 assert.ok(grass[1]>grass[0]*1.4,'grass has strong natural green');
 assert.ok(path.every(n=>n>=0&&n<=255&&Number.isInteger(n)));
 const f=paintForestGround([80,90,65],{wear:1,wet:.2,grit:.53,scratch:.51});
 const moss=paintForestGround([80,90,65],{wear:0,moss:1,leaves:.1,wet:.8});
 assert.ok(f[0]>f[1]*1.22,'forest dirt stays warm');
 assert.ok(moss[1]>moss[0]*1.25,'moss remains cool deep-green');
});
test('painted materials actually reach native village and spherical forest texture',()=>{
 const route=prepareLandscapeRoutes([{ax:0,az:-20,bx:0,bz:20,width:3.5}]);
 const plain=landscapeGroundPixel(1.2,5,route,{r2:true});
 const painted=landscapeGroundPixel(1.2,5,route,{r2:true,art:true});
 assert.notDeepEqual(painted,plain);
 assert.equal(painted[3],255);
 const forestLat=forestTrailLatitude(.82);
 const track=forestGroundPixel(.82,forestLat,{r2:true,art:true});
 const oldTrack=forestGroundPixel(.82,forestLat,{r2:true});
 assert.notDeepEqual(track,oldTrack);
 assert.ok(forestRoadProfile(.82,forestLat).wear>.75);
 assert.ok(forestTextureMask(.82,forestLat)>.9);
 assert.deepEqual(forestGroundPixel(-.2,0,{r2:true,art:true}),[255,255,255,255]);
});
test('R3 forest crown volumes change, not population, instanced draw calls or collisions',()=>{
 const oldColliders=forestColliders(),layout=createForestLayout();
 const beforeScene=new THREE.Scene(),afterScene=new THREE.Scene();
 createWhisperingForest(THREE,{scene:beforeScene,radius:261,heightAt:()=>0,r2Vegetation:true});
 createWhisperingForest(THREE,{scene:afterScene,radius:261,heightAt:()=>0,r2Vegetation:true,artRemaster:true});
 const meshes=scene=>scene.children.filter(m=>m.isInstancedMesh&&m.name.startsWith('forest-'));
 const a=meshes(beforeScene),b=meshes(afterScene);
 assert.equal(a.length,12);assert.equal(b.length,a.length);
 for(let i=0;i<a.length;i++){
  assert.equal(b[i].instanceMatrix.count,a[i].instanceMatrix.count);
  assert.equal(b[i].geometry.attributes.position.count,a[i].geometry.attributes.position.count);
  assert.equal(b[i].geometry.index?.count||0,a[i].geometry.index?.count||0);
 }
 const find=(scene,name)=>scene.children.find(m=>m.name===name);
 const normal=find(beforeScene,'forest-oak-crown');
 const rich=find(afterScene,'forest-oak-crown');
 assert.notDeepEqual(Array.from(normal.instanceMatrix.array),Array.from(rich.instanceMatrix.array));
 assert.deepEqual(forestColliders(),oldColliders);
 assert.deepEqual(createForestLayout(),layout);
});
test('new art goes into default online game rather than a diagnostic panel',()=>{
 const s=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(s,/const artRemaster=!isPortalPreview/);
 assert.match(s,/createForestGroundTexture\(THREE,\{r2:r2Materials,art:artRemaster\}\)/);
 assert.match(s,/createWhisperingForest\(THREE,\{scene,radius:R,heightAt,r2Vegetation,artRemaster\}\)/);
 assert.match(s,/createStartZone\(THREE,scene,\(\)=>R,heightAt,\{r2Materials,r2Vegetation,artRemaster\}\)/);
 assert.doesNotMatch(s,/createR3Editor|R3ScreenshotWizard/);
});
