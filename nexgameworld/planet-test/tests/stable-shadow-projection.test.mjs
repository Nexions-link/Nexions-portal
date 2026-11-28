import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createStableShadowProjection} from '../stable-shadow-projection.js';
import {createSphericalDaylightRig} from '../spherical-daylight.js';
import {createShadowRefreshBudget} from '../render-budget.js';

const near=(a,b,epsilon=1e-8)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
function fixture(width=512,height=width){
 const scene=new THREE.Scene(),sun=new THREE.DirectionalLight(),fill=new THREE.DirectionalLight();
 const skyFill=new THREE.HemisphereLight(),gameCamera=new THREE.PerspectiveCamera(58,390/844,.1,2000);
 scene.add(sun,fill,skyFill);sun.castShadow=true;
 const c=sun.shadow.camera;
 Object.assign(c,{left:-31,right:31,top:31,bottom:-31,near:1,far:120});
 c.updateProjectionMatrix();sun.shadow.mapSize.set(width,height);
 sun.shadow.bias=-.00035;sun.shadow.normalBias=.035;
 const rig=createSphericalDaylightRig(THREE,{sun,fill,skyFill});
 rig.update(new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,261));
 const helper=createStableShadowProjection(THREE,sun);
 return {scene,sun,fill,skyFill,gameCamera,c,rig,helper};
}
function pixels(c,width,height,point=new THREE.Vector3()){
 const p=point.clone().project(c);return [(p.x*.5+.5)*width,(p.y*.5+.5)*height,p.z];
}
function nativeUpdate(sun){sun.updateMatrixWorld(true);sun.target.updateMatrixWorld(true);sun.shadow.updateMatrices(sun);}
function cameraState(c){return {position:c.position.toArray(),quaternion:c.quaternion.toArray(),
  projection:c.projectionMatrix.toArray(),inverse:c.projectionMatrixInverse.toArray(),view:{...c.view}};}

test('actual THREE sampler and frustum use a bounded texel-aligned orthographic projection',()=>{
 for(const [width,height] of [[512,512],[1024,1024],[511,777]]){
  const {sun,c,helper}=fixture(width,height),base=c.projectionMatrix.clone();
  assert.equal(helper.update(),true);nativeUpdate(sun);
  const origin=pixels(c,width,height);
  near(origin[0],Math.round(origin[0]));near(origin[1],Math.round(origin[1]));
  assert.ok(Math.abs(c.view.offsetX)<=.5+1e-10&&Math.abs(c.view.offsetY)<=.5+1e-10);
  for(const i of [0,5,10,14])near(c.projectionMatrix.elements[i],base.elements[i]);
  assert.ok(Math.abs(c.projectionMatrix.elements[12]-base.elements[12])<=1/width+1e-10);
  assert.ok(Math.abs(c.projectionMatrix.elements[13]-base.elements[13])<=1/height+1e-10);
  for(const ndc of [[0,0,0],[.8,-.9,.7],[-.8,.9,-.7]]){
   const world=new THREE.Vector3(...ndc).unproject(c);
   assert.equal(sun.shadow.getFrustum().containsPoint(world),true);
   const sampled=world.clone().applyMatrix4(sun.shadow.matrix);
   near(sampled.x,(ndc[0]+1)/2);near(sampled.y,(ndc[1]+1)/2);near(sampled.z,(ndc[2]+1)/2);
  }
  for(const ndc of [[1.01,0,0],[0,-1.01,0],[0,0,1.01]])
   assert.equal(sun.shadow.getFrustum().containsPoint(new THREE.Vector3(...ndc).unproject(c)),false);
 }
});

test('fixed-direction subtexel translations keep ground sampling pinned and crossings advance whole texels',()=>{
 for(const size of [512,1024]){
  const {sun,c,helper}=fixture(size);nativeUpdate(sun);
  const right=new THREE.Vector3().setFromMatrixColumn(c.matrixWorld,0).normalize();
  const step=(c.right-c.left)/c.zoom/size,raw=pixels(c,size,size)[0];
  const anchor=sun.target.position.clone().addScaledVector(right,(raw-Math.round(raw))*step);
  const offset=sun.position.clone().sub(sun.target.position),ground=new THREE.Vector3(0,0,261);
  let pinned;
  for(const amount of [0,.1,.2,.3,.4,.65,2.3]){
   sun.target.position.copy(anchor).addScaledVector(right,amount*step);
   sun.position.copy(sun.target.position).add(offset);
   assert.equal(helper.update(),true);nativeUpdate(sun);
   const actual=pixels(c,size,size,ground);
   if(!pinned)pinned=actual;
   near(actual[0]-pinned[0],amount<.5?0:amount<1?-1:-2);
   near(actual[1],pinned[1]);near(actual[2],pinned[2]);
  }
 }
});

test('resizing and repeated redraws never accumulate projection drift or replace camera resources',()=>{
 const {sun,c,helper}=fixture(),view=c.view,projection=c.projectionMatrix,inverse=c.projectionMatrixInverse;
 for(const [w,h] of [[512,512],[1024,1024],[513,769],[512,512]]){
  sun.shadow.mapSize.set(w,h);helper.update();nativeUpdate(sun);
  const initial=cameraState(c);
  for(let i=0;i<100;i++){helper.update();nativeUpdate(sun);}
  assert.deepEqual(cameraState(c),initial);
  assert.equal(c.view,view);assert.equal(c.projectionMatrix,projection);assert.equal(c.projectionMatrixInverse,inverse);
  const origin=pixels(c,w,h);near(origin[0],Math.round(origin[0]));near(origin[1],Math.round(origin[1]));
 }
});

test('spherical daylight at multiple radii, poles and longitude seams keeps bounded finite maps and untouched light/game camera state',()=>{
 const {sun,fill,skyFill,c,rig,helper,gameCamera}=fixture();
 gameCamera.position.set(9,7,272);gameCamera.lookAt(0,0,261);gameCamera.updateMatrixWorld();
 const originalGame=cameraState(gameCamera),shadow=sun.shadow,shadowCamera=c;
 for(const R of [170,261,510])for(const [lon,lat] of [[0,0],[.8,.13],[-Math.PI+1e-7,.2],[Math.PI-1e-7,.2],[1.2,Math.PI/2],[1.2,-Math.PI/2]]){
  const normal=new THREE.Vector3(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon));
  const anchor=normal.clone().multiplyScalar(R+1.7);rig.update(normal,anchor);
  const original=[sun,fill,skyFill].map(light=>({position:light.position.toArray(),color:light.color.toArray(),intensity:light.intensity}));
  const target=sun.target.position.clone(),normalCopy=normal.clone(),anchorCopy=anchor.clone();
  assert.equal(helper.update(),true);nativeUpdate(sun);
  assert.deepEqual([sun,fill,skyFill].map(light=>({position:light.position.toArray(),color:light.color.toArray(),intensity:light.intensity})),original);
  assert.deepEqual(sun.target.position,target);assert.deepEqual(normal,normalCopy);assert.deepEqual(anchor,anchorCopy);
  assert.deepEqual(cameraState(gameCamera),originalGame);assert.equal(sun.shadow,shadow);assert.equal(sun.shadow.camera,shadowCamera);
  assert.ok(c.projectionMatrix.elements.every(Number.isFinite)&&c.matrixWorld.elements.every(Number.isFinite));
  const origin=pixels(c,512,512);near(origin[0],Math.round(origin[0]));near(origin[1],Math.round(origin[1]));
  assert.ok(Math.abs(c.view.offsetX)<=.5+1e-8&&Math.abs(c.view.offsetY)<=.5+1e-8);
  assert.equal(sun.shadow.bias,-.00035);assert.equal(sun.shadow.normalBias,.035);
 }
});

test('disabled and invalid visual inputs leave the owned projection unchanged',()=>{
 const {sun,c,helper}=fixture();helper.update();nativeUpdate(sun);
 for(const invalid of [
  ()=>{sun.shadow.mapSize.x=0;},()=>{sun.shadow.mapSize.y=NaN;},
  ()=>{sun.position.x=NaN;},()=>{sun.target.position.z=Infinity;},
  ()=>{sun.target.position.copy(sun.position);},()=>{c.zoom=0;},()=>{c.zoom=1e-308;},
  ()=>{c.right=c.left;},()=>{c.far=c.near;},()=>{c.up.set(0,0,0);}
 ]){
  const saved={x:sun.shadow.mapSize.x,y:sun.shadow.mapSize.y,position:sun.position.clone(),target:sun.target.position.clone(),
   zoom:c.zoom,right:c.right,far:c.far,up:c.up.clone()};
  invalid();const before=cameraState(c);
  assert.equal(helper.update(),false);assert.deepEqual(cameraState(c),before);
  sun.shadow.mapSize.set(saved.x,saved.y);sun.position.copy(saved.position);sun.target.position.copy(saved.target);
  c.zoom=saved.zoom;c.right=saved.right;c.far=saved.far;c.up.copy(saved.up);
 }
 const before=cameraState(c);assert.equal(helper.update(false),false);assert.deepEqual(cameraState(c),before);
 assert.throws(()=>createStableShadowProjection(THREE,new THREE.PointLight()),TypeError);
});

test('only existing scheduled shadow redraws stabilize the map, without allocations or budget changes',()=>{
 const {sun,c}=fixture();let vectors=0;
 class CountedVector extends THREE.Vector3{constructor(...args){super(...args);vectors++;}}
 const helper=createStableShadowProjection({...THREE,Vector3:CountedVector},sun),budget=createShadowRefreshBudget();
 const map=sun.shadow.map,view=c.view;let redraws=0;
 for(let i=0;i<120;i++)if(budget.next(1/60,{enabled:true,quality:'balanced'})){helper.update();redraws++;}
 assert.equal(redraws,60);assert.equal(vectors,3);assert.equal(c.view,view);assert.equal(sun.shadow.map,map);
 const before=cameraState(c);
 for(const quality of ['economy','balanced','high'])for(let i=0;i<30;i++)
  if(budget.next(1/60,{enabled:false,quality}))helper.update();
 assert.deepEqual(cameraState(c),before);
 const source=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const daylight=source.lastIndexOf('daylightRig?.update(state.normal,actor.position,redrawShadows||!shadowActive);');
 const stabilization=source.indexOf('if(redrawShadows)shadowProjection?.update();',daylight);
 const render=source.indexOf('renderer.render(scene,camera);',stabilization);
 assert.ok(daylight>0&&stabilization>daylight&&render>stabilization);
 assert.match(source,/shadowProjection=isPortalPreview\?null:createStableShadowProjection\(THREE,sun\)/);
 assert.equal((source.match(/shadowProjection\?\.update\(/g)||[]).length,1);
 const helperSource=readFileSync(new URL('../stable-shadow-projection.js',import.meta.url),'utf8');
 assert.doesNotMatch(helperSource.slice(helperSource.indexOf('function update(')),/new THREE\.|\.clone\(|new Array|\[\]/);
 assert.doesNotMatch(helperSource,/\.updateMatrices\s*=/);
});
