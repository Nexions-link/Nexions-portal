import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {startTerrainVisualPoint,startTerrainSeamNormalWeight,startColorAt} from '../start-zone.js';
import {forestGroundPixel,forestEntranceTilePixel} from '../forest-ground-texture.js';
import {createWhisperingForest,forestColliders,createForestLayout} from '../whispering-forest.js';

test('seam repair preserves the entire starting ground and shifts only the eastern visual rim',()=>{
 for(const [x,z] of [[0,0],[20,25],[60,9],[-84,0],[0,84]]){
  const moved=startTerrainVisualPoint(x,z);
  assert.deepEqual(moved,{x,z},'inner meadow and all other borders stay untouched');
 }
 const entry=startTerrainVisualPoint(84,0);
 assert.ok(entry.x>91&&entry.x<94,'the old 84m cut should move out to a masked forest apron');
 assert.equal(entry.z,0);
 for(const [x,z] of [[62,52],[78,-32],[82,13],[84,0]]){
  const p=startTerrainVisualPoint(x,z);
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));
  assert.ok(Math.hypot(p.x,p.z)-Math.hypot(x,z)<=9.001);
 }
 assert.deepEqual(startColorAt(15,13),startColorAt(15,13));
});
test('all used terrain-grid vertices stay within the original atlas footprint',()=>{
 const extent=87,grid=124,step=extent*2/grid;
 let oldTriangles=0;
 for(let j=0;j<grid;j++)for(let i=0;i<grid;i++){
  const cx=-extent+(i+.5)*step,cz=-extent+(j+.5)*step;
  if(Math.hypot(cx,cz)>=84)continue;
  oldTriangles+=2;
  for(const [dx,dz] of [[0,0],[1,0],[0,1],[1,1]]){
   const p=startTerrainVisualPoint(-extent+(i+dx)*step,-extent+(j+dz)*step);
   assert.ok(Math.abs(p.x)<=95&&Math.abs(p.z)<=95,
    'existing start terrain 190m canvas must cover the extended mesh UVs');
  }
 }
 assert.ok(oldTriangles>19000&&oldTriangles<31000,'original 124-grid budget remains unchanged');
});
test('the two rendered materials have matched normals and receive the same sunlight shadows',()=>{
 assert.equal(startTerrainSeamNormalWeight(14,20),0);
 assert.equal(startTerrainSeamNormalWeight(-92,0),0);
 assert.ok(startTerrainSeamNormalWeight(80,-3)>.15);
 assert.equal(startTerrainSeamNormalWeight(93,-2),1);
 const start=readFileSync(new URL('../start-zone.js',import.meta.url),'utf8');
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(start,/patch\.receiveShadow=shadowsEnabled/);
 assert.match(planet,/ground\.receiveShadow=enabled/);
 assert.match(start,/startTerrainSeamNormalWeight\(x,z\)/);
 assert.match(planet,/startTerrainSeamNormalWeight\(local\.x,local\.z\)/);
 assert.match(planet,/85\+9\*east/,'the globe stays recessed until the new mesh boundary');
 assert.match(start,/const extent=87, grid=124/,'no new terrain mesh or draw call');
 assert.match(planet,/new THREE\.MeshStandardMaterial\(\{map:groundTexture,vertexColors:true/);
});
test('new visual edge settles on the same forest texel while keeping opaque ground',()=>{
 const p=startTerrainVisualPoint(84,-2);
 const d=Math.hypot(p.x,p.z),k=Math.sin(d/261)/d;
 const lon=Math.atan2(p.x*k,Math.cos(d/261)),lat=Math.asin(p.z*k);
 const start=forestEntranceTilePixel(p.x,p.z,[91,124,69,255],{r2:true,art:true});
 const sphere=forestGroundPixel(lon,lat,{r2:true,art:true});
 assert.deepEqual(start,sphere);
 assert.equal(sphere[3],255);
});
test('medium forest receives cheap trunk shadows, high richer shadows, economy unchanged',()=>{
 const before=forestColliders(),layout=createForestLayout();
 const scene=new THREE.Scene();
 const forest=createWhisperingForest(THREE,{scene,radius:261,heightAt:()=>0,artRemaster:true});
 const batches=scene.children.filter(m=>m.isInstancedMesh&&m.name.startsWith('forest-'));
 const get=name=>batches.find(m=>m.name===name);
 assert.equal(batches.length,12);
 forest.setQuality('balanced');
 assert.equal(get('forest-ancient-trunks').castShadow,true);
 assert.equal(get('forest-oak-crown').castShadow,false);
 forest.setQuality('high');
 assert.equal(get('forest-ancient-trunks').castShadow,true);
 assert.equal(get('forest-oak-crown').castShadow,true);
 forest.setQuality('economy');
 assert.equal(get('forest-ancient-trunks').castShadow,false);
 assert.equal(get('forest-oak-crown').castShadow,false);
 assert.equal(forest.treeCount,400);
 assert.deepEqual(forestColliders(),before);
 assert.deepEqual(createForestLayout(),layout);
});
