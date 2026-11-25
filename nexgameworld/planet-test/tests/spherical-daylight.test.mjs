import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createSphericalDaylightRig} from '../spherical-daylight.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
function fixture(){
 const scene=new THREE.Scene();
 const sun=new THREE.DirectionalLight('#fff0c9',2.46);
 const fill=new THREE.DirectionalLight('#b4dbe9',.66);
 const skyFill=new THREE.HemisphereLight('#f7e6c6','#486b70',1.92);
 scene.add(sun,fill,skyFill);
 return {scene,sun,fill,skyFill,rig:createSphericalDaylightRig(THREE,{sun,fill,skyFill})};
}
function frame(lon,lat){
 const up=new THREE.Vector3(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon));
 const east=new THREE.Vector3(Math.cos(lon),0,-Math.sin(lon));
 return {up,east,north:new THREE.Vector3().crossVectors(up,east).normalize(),anchor:up.clone().multiplyScalar(263)};
}
const direction=light=>light.position.clone().sub(light.target.position);

test('the same warm key, cool counter-light and overhead sky follow both hemispheres',()=>{
 const {rig,sun,fill,skyFill}=fixture();
 for(const [lon,lat] of [[0,0],[.72,.03],[1.2,-.15],[Math.PI,0],[-2.4,-.7],[0,Math.PI/2],[0,-Math.PI/2]]){
  const {up,east,north,anchor}=frame(lon,lat);
  assert.equal(rig.update(up,anchor),true);
  const key=direction(sun),counter=direction(fill);
  near(key.dot(up),44);near(key.dot(east),27);near(key.dot(north),20);
  near(counter.dot(up),28);near(counter.dot(east),-34);near(counter.dot(north),-24);
  near(skyFill.position.dot(up),1);
  near(skyFill.position.length(),1);
  near(sun.target.position.distanceTo(anchor),0);
  near(fill.target.position.distanceTo(anchor),0);
  // Targets are intentionally not scene children: their world matrices must
  // still follow the traveller for THREE's directional-light uniforms.
  near(new THREE.Vector3().setFromMatrixPosition(fill.target.matrixWorld).distanceTo(anchor),0);
  near(new THREE.Vector3().setFromMatrixPosition(sun.target.matrixWorld).distanceTo(anchor),0);
 }
});

test('economy updates the same sunlight while shaded mode retains its scheduled shadow frustum',()=>{
 const {rig,sun,fill,skyFill}=fixture();
 const village=frame(0,0),forest=frame(.9,.08);
 rig.update(village.up,village.anchor,true);
 const scheduledSun=sun.position.clone(),scheduledTarget=sun.target.position.clone();
 rig.update(forest.up,forest.anchor,false);
 assert.deepEqual(sun.position,scheduledSun);
 assert.deepEqual(sun.target.position,scheduledTarget);
 near(skyFill.position.dot(forest.up),1);
 near(direction(fill).dot(forest.up),28);
 // Economy has no shadow refresh events, but still reorients its sun.
 rig.update(forest.up,forest.anchor,true);
 near(direction(sun).dot(forest.up),44);
 near(direction(sun).dot(forest.east),27);
 assert.ok(sun.position.distanceTo(scheduledSun)>100);
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(planet,/daylightRig\?\.update\(state\.normal,actor\.position,redrawShadows\|\|!shadowActive\)/);
 assert.match(planet,/renderer\.shadowMap\.needsUpdate=redrawShadows/);
 assert.match(planet,/daylightRig=isPortalPreview\?null:/);
});

test('moving the rig preserves diffuse face and surface lighting around the spherical world',()=>{
 const {rig,sun,fill,skyFill}=fixture();
 let baseline;
 for(const [lon,lat] of [[0,0],[.72,.03],[1.2,-.15],[Math.PI,0],[-2.4,-.7]]){
  const {up,east,north,anchor}=frame(lon,lat);
  rig.update(up,anchor);
  const surface=up.clone().multiplyScalar(.5).addScaledVector(east,.7).addScaledVector(north,.1).normalize();
  const sample=[
   Math.max(0,surface.dot(direction(sun).normalize()))*sun.intensity,
   Math.max(0,surface.dot(direction(fill).normalize()))*fill.intensity,
   (surface.dot(skyFill.position)+1)*.5*skyFill.intensity
  ];
  if(!baseline)baseline=sample;
  else sample.forEach((value,i)=>near(value,baseline[i]));
 }
});

test('the rig allocates no scene objects and preserves all light and shadow budgets',()=>{
 const {rig,scene,sun,fill,skyFill}=fixture();
 const oldChildren=[...scene.children];
 const oldLights=[sun,fill,skyFill].map(light=>({intensity:light.intensity,color:light.color.getHex(),castShadow:light.castShadow}));
 const oldShadow=sun.shadow;
 for(let i=0;i<100;i++){
  const {up,anchor}=frame(i*.03,.1);
  rig.update(up,anchor,i%2===0);
 }
 assert.deepEqual(scene.children,oldChildren);
 assert.equal(scene.children.filter(child=>child.isLight).length,3);
 assert.equal(sun.shadow,oldShadow);
 assert.deepEqual([sun,fill,skyFill].map(light=>({intensity:light.intensity,color:light.color.getHex(),castShadow:light.castShadow})),oldLights);
 const source=readFileSync(new URL('../spherical-daylight.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/new THREE\.(?:\w*Light|\w*Material|\w*Geometry|\w*Mesh|\w*Texture|WebGLRenderTarget)/);
 assert.doesNotMatch(source.slice(source.indexOf('function update(')),/new THREE\./);
});

test('invalid visual inputs cannot poison the renderer or modify authoritative vectors',()=>{
 const {rig,sun,fill,skyFill}=fixture();
 const {up,anchor}=frame(.8,.1),oldUp=up.clone(),oldAnchor=anchor.clone();
 rig.update(up,anchor);
 assert.deepEqual(up,oldUp);assert.deepEqual(anchor,oldAnchor);
 const positions=[sun,fill,skyFill].map(light=>light.position.clone());
 for(const normal of [new THREE.Vector3(),new THREE.Vector3(NaN,0,1),null])
  assert.equal(rig.update(normal,anchor),false);
 assert.equal(rig.update(up,new THREE.Vector3(0,Infinity,0)),false);
 [sun,fill,skyFill].forEach((light,i)=>assert.deepEqual(light.position,positions[i]));
});
