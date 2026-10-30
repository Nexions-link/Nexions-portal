import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {installDom} from './harness.mjs';
import {createGlobeSurfaceSampler,seamRadius,seamAlpha,seamEase,
 SEAM_MESH_EXTENT,SEAM_MESH_GRID,SEAM_INNER_RADIUS,SEAM_ALPHA_START,SEAM_ALPHA_END}
 from '../terrain-seam.js';
import {createStartZone,localToNormal,initStartZoneMath} from '../start-zone.js';
import {forestColliders} from '../whispering-forest.js';

test('G-05 feather ring is continuous and invisible before the hard mesh edge',()=>{
 assert.ok(SEAM_MESH_EXTENT>SEAM_ALPHA_END);
 assert.ok(SEAM_ALPHA_END>SEAM_ALPHA_START);
 assert.ok(SEAM_ALPHA_START>SEAM_INNER_RADIUS);
 assert.ok(SEAM_MESH_GRID>=124);
 for(const d of [0,10,50,70,81,83])assert.equal(seamAlpha(d),1);
 for(const d of [90,92,100])assert.equal(seamAlpha(d),0);
 let previous=1;
 for(let d=SEAM_ALPHA_START;d<=SEAM_ALPHA_END;d+=.02){
  const alpha=seamAlpha(d);
  assert.ok(alpha>=0&&alpha<=1);
  assert.ok(alpha<=previous+1e-12);
  previous=alpha;
 }
 assert.equal(seamEase(82,86,81),0);
 assert.equal(seamEase(82,86,87),1);
 const core=261.2,globe=260.83;
 assert.equal(seamRadius(core,globe,70),core+.12);
 assert.ok(Math.abs(seamRadius(core,globe,90)-(globe+.028))<1e-6);
 assert.ok(Math.abs(seamRadius(core,globe,81)-seamRadius(core,globe,81.01))<.002);
 assert.throws(()=>seamRadius(NaN,260,85),RangeError);
});
test('samples the actual deformed THREE globe triangles, not interpolated analytic height',()=>{
 const geometry=new THREE.SphereGeometry(261,180,112),pos=geometry.attributes.position;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),n=new THREE.Vector3(x,y,z).normalize();
  const height=Math.sin(n.x*12+n.z*7)*.55+Math.cos(n.y*14)*.27;
  const scale=(261+height)/Math.hypot(x,y,z);
  pos.setXYZ(i,x*scale,y*scale,z*scale);
 }
 geometry.computeVertexNormals();
 const sampler=createGlobeSurfaceSampler(THREE,geometry);
 const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
 const caster=new THREE.Raycaster();
 initStartZoneMath(THREE);
 let found=0;
 for(const d of [82.1,83.8,85,87.2,88.8])for(const a of [-.65,-.31,0,.26,.6,1.18,2.4]){
  const n=localToNormal(Math.cos(a)*d,Math.sin(a)*d,261);
  const sampled=sampler.sample(n);
  assert.ok(Number.isFinite(sampled),'sampler returned a valid radius at '+a+'/'+d);
  caster.set(new THREE.Vector3(),n);
  const hits=caster.intersectObject(mesh,false);
  assert.ok(hits.length>0);
  assert.ok(Math.abs(sampled-hits[0].distance)<.0005,
   'radial point exactly intersects same triangulated sphere, even across triangle diagonals');
  const blended=seamRadius(261+.18,sampled,d);
  assert.ok(Number.isFinite(blended)&&blended>257&&blended<265);
  if(d>=87)assert.ok(Math.abs(blended-sampled-.028)<.0005);
  found++;
 }
 assert.ok(found>=30);
 assert.equal(sampler.sample({x:NaN,y:0,z:1}),null);
 assert.throws(()=>createGlobeSurfaceSampler(THREE,{}),TypeError);
 geometry.dispose();
});
test('actual meadow tile has RGBA edge, smooth spherical overlap and no collision edits',()=>{
 installDom();initStartZoneMath(THREE);
 const original=forestColliders();
 const globe=new THREE.SphereGeometry(261,180,112);
 const scene=new THREE.Scene();
 const zone=createStartZone(THREE,scene,()=>261,()=>0,{globeGeometry:globe});
 const tile=scene.children.find(item=>item.isMesh&&item.geometry?.getAttribute('color')?.itemSize===4);
 assert.ok(tile,'start tile uses vertex RGBA');
 const position=tile.geometry.getAttribute('position'),rgba=tile.geometry.getAttribute('color');
 assert.equal(position.count,rgba.count);
 assert.equal(tile.material.transparent,true);
 assert.equal(tile.material.vertexColors,true);
 assert.equal(tile.material.alphaTest,.008);
 assert.equal(tile.material.polygonOffset,true);
 let core=0,outer=0,transition=0;
 const sampler=createGlobeSurfaceSampler(THREE,globe);
 for(let i=0;i<position.count;i++){
  const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
  const n=new THREE.Vector3(x,y,z).normalize(),r=Math.hypot(x,y,z);
  const normalAngle=Math.acos(Math.min(1,Math.max(-1,n.z)));
  const d=261*normalAngle;
  const alpha=rgba.getW(i);
  assert.ok(Number.isFinite(r)&&Number.isFinite(alpha));
  assert.ok(alpha>=0&&alpha<=1);
  assert.equal(rgba.getX(i),1);assert.equal(rgba.getY(i),1);assert.equal(rgba.getZ(i),1);
  if(d<70){core++;assert.ok(Math.abs(r-261.12)<.02)}
  if(d>86&&d<88.8){
   transition++;
   assert.ok(alpha<1&&alpha>0);
   const base=sampler.sample(n);
   assert.ok(base!==null&&Math.abs(r-base-.028)<.10,'edge follows exact background triangles');
  }
  if(d>90){outer++;assert.equal(alpha,0)}
 }
 assert.ok(core>1000&&transition>150&&outer>100);
 zone.rebuild();
 assert.deepEqual(forestColliders(),original);
 assert.equal(globe.index.count>10000,true);
 globe.dispose();
});
test('live integration passes actual globe mesh without changing game camera or R1 art controls',()=>{
 const world=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const start=readFileSync(new URL('../start-zone.js',import.meta.url),'utf8');
 assert.match(world,/createStartZone\(THREE,scene,\(\)=>R,heightAt,\{globeGeometry:groundGeo\}\)/);
 assert.match(start,/globeSampler\?\.sample\(n\)/);
 assert.match(start,/seamAlpha\(Math\.hypot\(x,z\)\)/);
 assert.match(world,/new THREE\.PerspectiveCamera\(58, innerWidth \/ innerHeight, \.48, 1300\)/);
 assert.match(world,/cameraPitch:previousWorld\?\.cameraPitch\?\?\.36/);
 assert.match(world,/cameraFollow:previousWorld\?\.cameraFollow\?\?cameraSettings\?\.follow\?\?false/);
 assert.match(world,/artSafety\.update\(qualityName,isPortalPreview\)/);
 assert.doesNotMatch(start,/WebSocket|fetch\(|localStorage\.setItem/);
});
