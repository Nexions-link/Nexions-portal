import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {BANDIT_CAMP} from '../bandit-camp-data.js';
import {startVisualRouteSegments,ROUTES,lakeRadius,startHeightAt} from '../start-zone.js';
import {roadVergeLayout,roadVergeBudget,roadVergeGeometryData,
 createRoadVerge,ROAD_VERGE_CAPS,ROAD_VERGE_VERSION} from '../road-verge.js';
import {paintedTrailProfile} from '../trail-art.js';
import {createForestLayout,forestDistance,FOREST_CAMP,FOREST_SITE_CLEARINGS,
 forestColliders,forestTrailLatitude} from '../whispering-forest.js';
const src=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const args={startSegments:startVisualRouteSegments(),lakeRadius};

test('G-09 shares exact route segments with the baked start map',()=>{
 assert.equal(ROAD_VERGE_VERSION,'R1-G09-1');
 assert.equal(args.startSegments.length,ROUTES.reduce((sum,route)=>sum+(route.length-1)*3,0));
 assert.ok(args.startSegments.length>60);
 assert.ok(args.startSegments.every(seg=>Number.isFinite(seg.ax)&&Number.isFinite(seg.az)&&
  Number.isFinite(seg.bx)&&Number.isFinite(seg.bz)&&seg.width>=2.25));
 assert.deepEqual(startVisualRouteSegments(),startVisualRouteSegments());
 const start=src('../start-zone.js'),world=src('../planet.js');
 assert.match(start,/const routeSegments=startVisualRouteSegments\(\)/);
 assert.match(world,/startSegments:startVisualRouteSegments\(\)/);
 assert.match(world,/artSafety\.register\('road-verge'/);
 assert.match(world,/import\('\.\/road-verge\.js\?v=1'\)/);
});

test('G-09 generated roadside flora is deterministic and leaves every critical zone free',()=>{
 const layout=roadVergeLayout(args),again=roadVergeLayout(args);
 assert.deepEqual(layout,again);
 const trees=createForestLayout().trees,colliders=forestColliders();
 let starter=0,forest=0;
 for(const [kind,rows] of Object.entries(layout)){
  assert.ok(rows.length>0,'Empty verge type '+kind);
  assert.ok(rows.length<=ROAD_VERGE_CAPS[kind]);
  for(const p of rows){
   assert.ok(p.size>0&&p.size<.9);
   assert.ok(Number.isFinite(p.yaw)&&Number.isFinite(p.variation));
   assert.ok(p.edgeStrength>=0&&p.edgeStrength<=1);
   if(p.zone==='start'){
    starter++;
    assert.ok(Math.hypot(p.x,p.z)>=18,'village centre unobstructed');
    assert.ok(Math.hypot(p.x+27,p.z+2)>=19,'house/NPC area unobstructed');
    assert.ok(Math.hypot(p.x-BANDIT_CAMP.center.x,p.z-BANDIT_CAMP.center.z)>=13);
    assert.ok(lakeRadius(p.x,p.z)>=1.36);
   }else{
    forest++;
    assert.ok(Math.abs(p.lat-forestTrailLatitude(p.lon))*261>=3.1);
    assert.ok(forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>=
      FOREST_CAMP.clearingRadius+5.8);
    assert.ok(FOREST_SITE_CLEARINGS.every(site=>forestDistance(p.lon,p.lat,site.lon,site.lat)>=site.radius+4.8));
    assert.ok(trees.every(tree=>forestDistance(p.lon,p.lat,tree.lon,tree.lat)>=tree.radius*.8+.75));
   }
  }
 }
 assert.ok(starter>25,'Starter roads have natural verges');
 assert.ok(forest>40,'Forest corridor has natural verges');
 assert.deepEqual(forestColliders(),colliders);
});

test('G-09 decorative 3D forms are real geometry and stay close to ground',()=>{
 for(const kind of Object.keys(ROAD_VERGE_CAPS)){
  const g=roadVergeGeometryData(kind);
  assert.equal(g.positions.length%9,0,kind);
  assert.equal(g.positions.length,g.colors.length);
  assert.ok(g.positions.length>=36,kind);
  assert.ok(g.positions.every(Number.isFinite)&&g.colors.every(Number.isFinite));
  const h=g.positions.filter((v,i)=>i%3===1);
  assert.ok(Math.max(...h)<.8,'ornaments must not block interactions');
  assert.ok(h.every(v=>v>=0));
  assert.ok(new Set(g.colors.map(c=>Math.round(c*100))).size>3);
 }
 assert.throws(()=>roadVergeGeometryData('unknown'),RangeError);
});

test('instancing stays within four draw calls and G-04 quality fallback keeps base world',()=>{
 const scene=new THREE.Scene();
 const before=forestColliders();
 const result=createRoadVerge(THREE,{scene,radius:261,heightAt:()=>0,...args});
 assert.ok(result.decorativeOnly);
 assert.equal(result.drawCalls,4);
 assert.equal(scene.children.length,4);
 assert.ok(scene.children.every(x=>x.isInstancedMesh&&x.name.includes('no-collision')));
 for(const child of scene.children){
  assert.ok(child.count>0);
  assert.equal(child.castShadow,false);
  assert.equal(child.receiveShadow,false);
  assert.equal(child.material.roughness,1);
 }
 result.setQuality('high');
 const totals=scene.children.map(x=>x.count);
 result.setQuality('balanced');
 assert.ok(scene.children.every((x,i)=>x.count<=totals[i]));
 result.setQuality('economy');
 assert.ok(scene.children.every((x,i)=>x.count<=totals[i]));
 result.setQuality('high',true);
 assert.ok(scene.children.every(x=>x.count===0&&!x.visible));
 result.setQuality('high');
 assert.ok(scene.children.every(x=>x.visible));
 assert.deepEqual(forestColliders(),before);
 for(const k of Object.keys(ROAD_VERGE_CAPS)){
  const low=roadVergeBudget('economy')[k],mid=roadVergeBudget('balanced')[k],
   high=roadVergeBudget('high')[k],hidden=roadVergeBudget('high',true)[k];
  assert.ok(high>mid&&mid>low);
  assert.equal(hidden,0);
 }
});

test('G-09 does not modify camera, server, terrain elevation, controls, or online',()=>{
 const gameplay=src('../planet.js'),verge=src('../road-verge.js');
 const executable=verge.split('\n').filter(line=>!line.trimStart().startsWith('//')).join('\n');
 assert.doesNotMatch(executable,/WebSocket|camera\.|localStorage|fetch\(|setHeightAt|accountProfile/);
 assert.match(gameplay,/new THREE\.PerspectiveCamera\(58, innerWidth \/ innerHeight, \.48, 1300\)/);
 assert.match(gameplay,/cameraPitch:previousWorld\?\.cameraPitch\?\?\.36/);
 assert.match(gameplay,/artSafety\.update\(qualityName,isPortalPreview\)/);
 assert.ok(Number.isFinite(startHeightAt(0,0)));
 const profile=paintedTrailProfile(40,11,3.9,3.65);
 assert.ok(profile.verge>0||profile.wear>0);
});
