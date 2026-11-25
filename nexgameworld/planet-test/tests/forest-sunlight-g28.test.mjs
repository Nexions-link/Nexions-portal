import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createForestLightPools,forestSunbreakLayout} from '../forest-lighting.js';
import {createForestAtmosphere} from '../forest-atmosphere.js';
import {r2AtmosphereBudget} from '../r2-lighting.js';
import {sphericalSunDirection,SPHERICAL_SUN_OFFSETS,createSphericalDaylightRig} from '../spherical-daylight.js';
import {forestColliders,createForestLayout} from '../whispering-forest.js';

const normalAt=p=>new THREE.Vector3(Math.cos(p.lat)*Math.sin(p.lon),Math.sin(p.lat),Math.cos(p.lat)*Math.cos(p.lon));
const near=(actual,expected,tolerance=1e-5)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);
const POOL_VERTICES=81*3;

test('G28 every dappled corner follows local hills and globe at several world radii',()=>{
 const oldLayout=createForestLayout(),oldColliders=forestColliders();
 for(const radius of [170,261,510]){
  const scene=new THREE.Scene();
  // Steep, varying terrain exposes the former single-height tangent plane.
  const heightAt=n=>3*Math.sin(n.x*60)-2*Math.cos(n.y*80)+.5*n.z;
  const pools=createForestLightPools(THREE,{scene,radius,heightAt,r2Lighting:true});
  const mesh=scene.getObjectByName('forest-canopy-sunbreaks');
  assert.equal(scene.children.length,1);assert.ok(mesh.isMesh&&!mesh.isInstancedMesh);
  const position=mesh.geometry.attributes.position,color=mesh.geometry.attributes.color;
  assert.equal(position.count,pools.spotCount*POOL_VERTICES);
  assert.equal(color.count,position.count);assert.equal(color.itemSize,4);
  const point=new THREE.Vector3(),normal=new THREE.Vector3();
  for(let j=0;j<position.count;j++){
   point.fromBufferAttribute(position,j);normal.copy(point).normalize();
   assert.ok([point.x,point.y,point.z].every(Number.isFinite));
   near(point.length()-radius-heightAt(normal),.13,.00005);
   assert.ok(color.getW(j)>=0&&color.getW(j)<=.27+.00001);
  }
  assert.equal(mesh.material.depthWrite,false);assert.equal(mesh.material.polygonOffset,true);
 }
 assert.deepEqual(createForestLayout(),oldLayout);assert.deepEqual(forestColliders(),oldColliders);
});

test('G28 irregular ground-light ellipses share the projected sun direction without repeating round discs',()=>{
 const scene=new THREE.Scene(),radius=261;
 const pools=createForestLightPools(THREE,{scene,radius,heightAt:()=>0,r2Lighting:true});
 const position=scene.children[0].geometry.attributes.position;
 for(let i=0;i<pools.spotCount;i++){
  const p=pools.spots[i],normal=normalAt(p);
  const along=sphericalSunDirection(normal,new THREE.Vector3());
  along.addScaledVector(normal,-along.dot(normal)).normalize();
  const across=new THREE.Vector3().crossVectors(normal,along),x=[],z=[];
  for(let j=0;j<POOL_VERTICES;j++){
   const point=new THREE.Vector3().fromBufferAttribute(position,i*POOL_VERTICES+j)
    .addScaledVector(normal,-radius-.13);
   x.push(point.dot(along));z.push(point.dot(across));
  }
  assert.ok(Math.max(...x)-Math.min(...x)>(Math.max(...z)-Math.min(...z))*1.08);
  // Nine disconnected soft islands retain many different edge distances.
  assert.ok(new Set(x.map(v=>v.toFixed(3))).size>60);
 }
});

test('G28 shaft axes exactly match the existing real sun, preserving shaft length and 60 triangles',()=>{
 assert.deepEqual(SPHERICAL_SUN_OFFSETS,{up:44,east:27,north:20});
 assert.equal(Object.isFrozen(SPHERICAL_SUN_OFFSETS),true);
 const scene=new THREE.Scene(),radius=261,heightAt=()=>0;
 createForestAtmosphere(THREE,{scene,radius,heightAt,r2Lighting:true});
 const rays=scene.getObjectByName('forest-filtered-sunlight-no-collision');
 const position=rays.geometry.attributes.position;
 assert.equal(position.count/3,60);assert.ok(rays.isInstancedMesh);
 const sun=new THREE.DirectionalLight(),fill=new THREE.DirectionalLight(),skyFill=new THREE.HemisphereLight();
 const rig=createSphericalDaylightRig(THREE,{sun,fill,skyFill});
 const matrix=new THREE.Matrix4(),spots=forestSunbreakLayout();
 for(let i=0;i<spots.length;i++){
  const p=spots[i],normal=normalAt(p),anchor=normal.clone().multiplyScalar(radius+.22);
  rays.getMatrixAt(i,matrix);
  const bottom=new THREE.Vector3(),top=new THREE.Vector3();let bottomCount=0,topCount=0;
  for(let j=0;j<position.count;j++){
   const y=position.getY(j),point=new THREE.Vector3().fromBufferAttribute(position,j).applyMatrix4(matrix);
   if(y===0){bottom.add(point);bottomCount++;}
   if(y===1){top.add(point);topCount++;}
  }
  bottom.divideScalar(bottomCount);top.divideScalar(topCount);
  near(bottom.distanceTo(anchor),0,.00002);
  const axis=top.sub(bottom),length=axis.length();
  near(length,19+3.5*p.tint,.00003);
  rig.update(normal,anchor);
  const key=sun.position.clone().sub(sun.target.position).normalize();
  near(axis.normalize().dot(key),1,.000001);
  near(axis.dot(sphericalSunDirection(normal,new THREE.Vector3())),1,.000001);
  near(axis.dot(normal),44/Math.hypot(44,27,20),.000001);
 }
});

test('G28 visible motes remain inside the same inclined shaft corridors before and after animation',()=>{
 const scene=new THREE.Scene(),radius=261;
 const heightAt=n=>.5*Math.sin(n.x*13);
 const atmosphere=createForestAtmosphere(THREE,{scene,radius,heightAt,r2Lighting:true});
 const dust=scene.getObjectByName('forest-floating-motes-no-collision');
 const spots=forestSunbreakLayout();
 atmosphere.setQuality('high');
 for(const time of [0,1,4,9]){
  // Dust retains the existing every-third-frame animation cadence.
  for(let k=0;k<3;k++)atmosphere.animate(time,1);
  const position=dust.geometry.attributes.position;
  for(let i=0;i<dust.geometry.drawRange.count;i++){
   const patch=spots[Math.floor(i/12)%spots.length],normal=normalAt(patch);
   const axis=sphericalSunDirection(normal,new THREE.Vector3());
   const anchor=normal.clone().multiplyScalar(radius+heightAt(normal)+.22);
   const point=new THREE.Vector3().fromBufferAttribute(position,i).sub(anchor);
   const distance=point.dot(axis);
   assert.ok(distance>.7&&distance<13.1,'motes stay above the same pool and below the shaft top');
   point.addScaledVector(axis,-distance);
   assert.ok(point.length()<patch.radius*.94*.93,'dust follows the inclined light, not a radial column');
  }
 }
});

test('G28 preserves transparent batch, triangle, material and preset budgets',()=>{
 for(const r2Lighting of [false,true]){
  const scene=new THREE.Scene(),radius=261,heightAt=()=>0;
  const pools=createForestLightPools(THREE,{scene,radius,heightAt,r2Lighting});
  const atmosphere=createForestAtmosphere(THREE,{scene,radius,heightAt,r2Lighting});
  const pool=scene.getObjectByName('forest-canopy-sunbreaks');
  const rays=scene.getObjectByName('forest-filtered-sunlight-no-collision');
  assert.equal(scene.children.length,4,'same pool, haze, rays and dust batches');
  assert.ok(scene.children.every(x=>!x.isLight&&!x.castShadow));
  for(const quality of ['economy','balanced','high']){
   pools.setQuality(quality);atmosphere.setQuality(quality);
   const count=Math.min(pools.spotCount,quality==='economy'?5:quality==='high'?22:13);
   assert.equal(pool.geometry.drawRange.count,count*POOL_VERTICES);
   const beamCount=r2Lighting?r2AtmosphereBudget(quality).beams:
    quality==='economy'?0:quality==='high'?22:10;
   assert.equal(rays.count,Math.min(spotsCount(),beamCount));
   assert.ok(rays.geometry.attributes.position.count*rays.count/3<=22*60);
  }
  pools.setQuality('high',true);atmosphere.setQuality('high',true);
  assert.equal(pool.visible,false);assert.equal(pool.geometry.drawRange.count,0);
  assert.equal(rays.visible,false);
 }
 for(const name of ['forest-lighting.js','forest-atmosphere.js']){
  const code=readFileSync(new URL('../'+name,import.meta.url),'utf8');
  assert.doesNotMatch(code,/ShaderMaterial|onBeforeCompile|WebGLRenderTarget|new THREE\.\w*Light\(/);
 }
});
function spotsCount(){return forestSunbreakLayout().length;}
