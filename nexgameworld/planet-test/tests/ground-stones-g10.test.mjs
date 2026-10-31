import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {startVisualRouteSegments,lakeRadius,ROUTES} from '../start-zone.js';
import {BANDIT_CAMP} from '../bandit-camp-data.js';
import {VALLEY_ROCKS} from '../planet-landmarks.js';
import {FOREST_CAMP,FOREST_SITE_CLEARINGS,createForestLayout,
 forestDistance,forestTrailLatitude,forestColliders} from '../whispering-forest.js';
import {G10_STONE_VERSION,G10_STONE_CAPS,g10StoneBudget,g10StoneLayout,
 g10StoneGeometryData,createG10GroundStones} from '../ground-stones-g10.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const segments=startVisualRouteSegments();
const args={startSegments:segments,lakeRadius};
const dist=(x,z,a,b)=>Math.hypot(x-a,z-b);
function distanceToLine(x,z,s){
 const dx=s.bx-s.ax,dz=s.bz-s.az,len=dx*dx+dz*dz;
 if(len<1e-9)return Infinity;
 const t=Math.max(0,Math.min(1,((x-s.ax)*dx+(z-s.az)*dz)/len));
 return dist(x,z,s.ax+dx*t,s.az+dz*t);
}
test('G-10 source of truth is the playable R1 trail and a deterministic capped layout',()=>{
 assert.equal(G10_STONE_VERSION,'R1-G10-1');
 assert.equal(segments.length,ROUTES.reduce((n,r)=>n+(r.length-1)*3,0));
 const one=g10StoneLayout(args),two=g10StoneLayout(args);
 assert.deepEqual(one,two);
 for(const [kind,items] of Object.entries(one)){
  assert.equal(items.length,G10_STONE_CAPS[kind],kind);
  assert.ok(items.some(x=>x.zone==='start'),kind+' start');
  assert.ok(items.some(x=>x.zone==='forest'),kind+' forest');
  for(const p of items)assert.ok(p.size>0&&Number.isFinite(p.yaw)&&p.tint>=0&&p.tint<1);
 }
});
test('G-10 respects all protected sites, blockers and the real walking corridors',()=>{
 const existing=forestColliders(),trees=createForestLayout().trees;
 const layout=g10StoneLayout(args);
 for(const [kind,items] of Object.entries(layout))for(const p of items){
  const big=kind==='boulders'||kind==='outcrops';
  if(p.zone==='start'){
   assert.ok(dist(p.x,p.z,0,0)>=20&&dist(p.x,p.z,0,0)<=79);
   assert.ok(dist(p.x,p.z,-27,-2)>=20);
   assert.ok(dist(p.x,p.z,BANDIT_CAMP.center.x,BANDIT_CAMP.center.z)>=16);
   assert.ok(lakeRadius(p.x,p.z)>=1.48);
   assert.ok(segments.every(s=>distanceToLine(p.x,p.z,s)>=(big?7.4:3.35)));
   assert.ok(VALLEY_ROCKS.every(s=>dist(p.x,p.z,s.x,s.z)>=s.radius+(big?2.8:.9)));
  }else{
   assert.ok(Math.abs(p.lat-forestTrailLatitude(p.lon))*261>=(big?8.8:3.75)-1e-9);
   assert.ok(forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>=FOREST_CAMP.clearingRadius+8+(big?2:0));
   assert.ok(FOREST_SITE_CLEARINGS.every(s=>forestDistance(p.lon,p.lat,s.lon,s.lat)>=s.radius+7+(big?2:0)));
   assert.ok(trees.every(s=>forestDistance(p.lon,p.lat,s.lon,s.lat)>=s.radius+(big?3.4:1.4)));
  }
 }
 assert.deepEqual(forestColliders(),existing,'server/physics tree blockers unchanged');
});
test('G-10 creates original 3D stone bodies with buried bottoms, shades and earthen strata',()=>{
 for(const kind of Object.keys(G10_STONE_CAPS)){
  const {positions,colors}=g10StoneGeometryData(kind);
  assert.ok(positions.length>120&&positions.length%9===0,kind);
  assert.equal(positions.length,colors.length,kind);
  assert.ok(positions.every(Number.isFinite)&&colors.every(x=>Number.isFinite(x)&&x>=0&&x<=1));
  const y=positions.filter((_,i)=>i%3===1);
  assert.ok(Math.min(...y)<-.17,'base is buried');
  assert.ok(Math.max(...y)>.075,'visible height');
  assert.ok(new Set(colors.map(v=>Math.round(v*100))).size>8,'varied weathering');
 }
 assert.throws(()=>g10StoneGeometryData('bad'),RangeError);
});
test('G-10 visual meshes contact both spherical soil patches and cannot intercept taps',()=>{
 const scene=new THREE.Scene();
 const before=forestColliders();
 const render=createG10GroundStones(THREE,{scene,radius:261,heightAt:()=>0,...args});
 assert.equal(render.drawCalls,4);
 assert.equal(scene.children.length,4);
 assert.ok(render.decorativeOnly);
 for(const mesh of scene.children){
  assert.ok(mesh.isInstancedMesh&&mesh.name.includes('no-collision'));
  assert.equal(mesh.material.roughness,1);
  assert.equal(mesh.castShadow,false);
  const kind=mesh.name.split('-')[1],points=render.layout[kind];
  for(const i of [0,points.length-1]){
   const mat=new THREE.Matrix4();mesh.getMatrixAt(i,mat);
   const centre=new THREE.Vector3().setFromMatrixPosition(mat);
   const surface=points[i].zone==='start'?.153:.046;
   assert.ok(Math.abs(centre.length()-(261+surface))<.002);
   const position=mesh.geometry.getAttribute('position');
   let min=Infinity;
   for(let v=0;v<position.count;v++){
    const point=new THREE.Vector3().fromBufferAttribute(position,v).applyMatrix4(mat);
    min=Math.min(min,point.length());
   }
   assert.ok(min<261+surface-.003,'rock skirt enters terrain');
  }
 }
 scene.updateMatrixWorld(true);
 const hits=new THREE.Raycaster().intersectObjects(scene.children,false);
 assert.equal(hits.length,0,'no raycastable mineral art');
 render.setQuality('high');assert.ok(scene.children.every(x=>x.count>0));
 const high=scene.children.map(x=>x.count);
 render.setQuality('balanced');assert.ok(scene.children.every((x,i)=>x.count<high[i]));
 render.setQuality('economy');assert.ok(scene.children.every((x,i)=>x.count<high[i]));
 render.setQuality('high',true);assert.ok(scene.children.every(x=>!x.visible&&x.count===0));
 assert.deepEqual(forestColliders(),before);
});
test('G-10 is an optional G-04 layer; camera, online systems and underlying ground are untouched',()=>{
 const planet=read('../planet.js'),g10=read('../ground-stones-g10.js');
 assert.match(planet,/artSafety\.register\('ground-stones-g10'/);
 assert.match(planet,/import\('\.\/ground-stones-g10\.js\?v=1'\)/);
 assert.match(planet,/new THREE\.PerspectiveCamera\(58, innerWidth \/ innerHeight, \.48, 1300\)/);
 assert.match(planet,/artSafety\.update\(qualityName,isPortalPreview\)/);
 const executable=g10.split('\n').filter(x=>!x.trimStart().startsWith('//')).join('\n');
 assert.doesNotMatch(executable,/WebSocket|localStorage|camera\.|setHeightAt|createCollider|addCollider/);
 for(const quality of ['economy','balanced','high']){
  const b=g10StoneBudget(quality);
  for(const k of Object.keys(G10_STONE_CAPS))assert.ok(b[k]<=G10_STONE_CAPS[k]&&b[k]>0);
 }
 assert.ok(Object.values(g10StoneBudget('high',true)).every(v=>v===0));
});
