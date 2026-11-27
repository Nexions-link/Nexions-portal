import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createCanvas} from '@napi-rs/canvas';
import * as THREE from 'three';
import {installDom} from './harness.mjs';
import {GRAPHICS_PRESETS,graphicsDensity} from '../graphics-quality.js';
import {lakeSurfaceColor,paintLakeRipples} from '../lake-surface-paint.js';
import {createStartZone,startHeightAt,normalToLocal,canWadeAtLocal,LAKE_SURFACE} from '../start-zone.js';

const TAU=Math.PI*2;
const hash=array=>createHash('sha256').update(new Uint8Array(
 array.buffer,array.byteOffset,array.byteLength)).digest('hex');
const luminance=rgb=>rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
const close=(actual,expected,tolerance=1e-7)=>assert.ok(
 Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected}`);
const closeColor=(actual,expected,tolerance=1e-7)=>actual.forEach((v,i)=>close(v,expected[i],tolerance));

// Frozen from the actual main18 renderer, d1c80da. These protect the original
// lake envelope, mesh connectivity and UVs independently of the paint helper.
// main18's cloned userData makes both water layers use the +.135m altitude;
// this art-only change deliberately preserves that rendered position.
const ORIGINAL_LAYER_HASHES={
 shore:{index:'19b26cb966af7ca86e7c233362aca99c731436e3bec59f6c1ec505aea05a5a2b',
  uv:'7da20f688ba4721a6f7246beb4bc7ab39c540145948c9dff9909e3072ddae58c'},
 water:{index:'6e15e365d7eee29c35d84b63bcd33c8e17bc8abc670572c705f659e87674b0f2',
  uv:'4221b5968834a9ede17f3b267ec68d30ff55f4139c0968d87f68d7c4382223dc'}
};
const ORIGINAL_POSITION_HASHES={
 170:{shore:'da58e5f08503019bb875a3a852dc88d492178aca36b8474e020f5c1778e88fa6',
  water:'78de6a470451d2f7dd747dcf7ad70cc2d37bcd9986d7050e7a475872d9fd7d28'},
 261:{shore:'1f849eea8be22cd6f70c67e866467c9dcc5570100536f589897a2622d265e708',
  water:'c34ef7035a282303ca0ee6235efaa915708a04fff27b15f434677358ae7b094b'},
 510:{shore:'6e9e3d89c35dc3bde8279e564080d55716822da7228937015a1a4dfd8a999193',
  water:'627706a934800b9cd482f40f02a500fefe2d0c9be8cd1406428e1dd2f8475bb0'}
};

function resources(scene){
 const meshes=[],geometries=new Set(),materials=new Set(),textures=new Set();
 scene.traverse(object=>{
  if(object.isMesh)meshes.push(object);
  if(object.geometry)geometries.add(object.geometry);
  for(const material of Array.isArray(object.material)?object.material:[object.material]){
   if(!material)continue;
   materials.add(material);
   for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
  }
 });
 return {meshes,geometries,materials,textures};
}
function lakeLayers(scene){
 const candidates=resources(scene).meshes.filter(object=>object.geometry.userData?.planar);
 return {
  shore:candidates.find(object=>object.geometry.userData.offsetMode==='shore'),
  water:candidates.find(object=>object.material.isMeshPhongMaterial),
  shimmer:candidates.find(object=>object.material.isMeshBasicMaterial)
 };
}
function createZone(radius=261,options={}){
 installDom();
 const scene=new THREE.Scene();
 const heightAt=normal=>{
  const local=normalToLocal(normal,radius);
  return startHeightAt(local.x,local.z);
 };
 return {scene,zone:createStartZone(THREE,scene,()=>radius,heightAt,options)};
}

test('lake pigments form a readable wet edge and deep centre without polar seams',()=>{
 const dry=new THREE.Color('#b4a179').toArray();
 for(const kind of ['shore','water'])for(const radius of [0,.08,.16,.43,.8,.97,1,1.07,1.17,1.22]){
  for(const angle of [-TAU,-.31,0,.73,Math.PI,TAU,TAU+.73]){
   const color=lakeSurfaceColor(kind,radius,angle);
   assert.equal(color.length,3,'RGB must never enable a vertex-alpha shader');
   assert.ok(color.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
   closeColor(color,lakeSurfaceColor(kind,radius,angle+TAU));
  }
 }
 for(const angle of [-3,-1,0,1,3,TAU]){
  closeColor(lakeSurfaceColor('shore',1.17,angle),dry);
  closeColor(lakeSurfaceColor('shore',1.22,angle),dry);
  closeColor(lakeSurfaceColor('water',0,angle),lakeSurfaceColor('water',0,0));
  closeColor(lakeSurfaceColor('water',.16,angle),lakeSurfaceColor('water',.16,0));
 }
 assert.ok(luminance(lakeSurfaceColor('shore',.97,0))<luminance(dry)-.015,
  'damp sand must remain visibly darker than the protected dry rim');
 assert.ok(luminance(lakeSurfaceColor('water',.97,0))>
  luminance(lakeSurfaceColor('water',0,0))+.04,'water depth needs visible value separation');
 assert.notDeepEqual(lakeSurfaceColor('shore',1.04,.4),lakeSurfaceColor('shore',1.04,2.1),
  'the wet band should have coherent angular variation');
 closeColor(lakeSurfaceColor('shore',1.04,TAU-1e-7),
  lakeSurfaceColor('shore',1.04,1e-7),1e-6);
 closeColor(lakeSurfaceColor('water',.75,TAU-1e-7),
  lakeSurfaceColor('water',.75,1e-7),1e-6);
});

for(const radius of [170,261,510])test(`paint preserves the original spherical lake and resource budget at R${radius}`,()=>{
 const {scene,zone}=createZone(radius),layers=lakeLayers(scene),all=resources(scene);
 assert.ok(layers.shore&&layers.water&&layers.shimmer);
 assert.deepEqual([all.meshes.length,all.geometries.size,all.materials.size,all.textures.size],
  [387,384,79,6],'paint must not create a mesh, geometry, material or texture');
 let triangles=0;
 for(const [kind,mesh] of Object.entries(layers)){
  const geometry=mesh.geometry,referenceKind=kind==='shore'?'shore':'water';
  assert.equal(hash(geometry.index.array),ORIGINAL_LAYER_HASHES[referenceKind].index);
  assert.equal(hash(geometry.attributes.uv.array),ORIGINAL_LAYER_HASHES[referenceKind].uv);
  assert.equal(hash(geometry.attributes.position.array),ORIGINAL_POSITION_HASHES[radius][referenceKind]);
  assert.equal(geometry.attributes.position.count,kind==='shore'?546:1183);
  assert.equal(geometry.attributes.color.itemSize,3);
  assert.equal(geometry.attributes.color.count,geometry.attributes.position.count);
  assert.equal(mesh.castShadow,false);
  assert.equal(mesh.receiveShadow,false);
  assert.equal(mesh.frustumCulled,false);
  triangles+=geometry.index.count/3;
 }
 assert.equal(triangles,5220);
 assert.equal(layers.shore.geometry.attributes.color.array.byteLength,6552);
 assert.equal(layers.water.geometry.attributes.color.array.byteLength,14196);
 assert.equal(layers.shore.material.vertexColors,true);
 closeColor(layers.shore.material.color.toArray(),[1,1,1]);
 const outer=layers.shore.geometry.attributes.color;
 const dry=new THREE.Color('#b4a179').toArray();
 for(let i=455;i<546;i++)closeColor([outer.getX(i),outer.getY(i),outer.getZ(i)],dry);
 assert.equal(layers.water.material.vertexColors,true);
 assert.equal(layers.water.material.opacity,.90);
 assert.equal(layers.water.material.transparent,true);
 assert.equal(layers.water.material.depthWrite,false);
 assert.equal(layers.water.material.shininess,65);
 assert.equal(layers.water.renderOrder,3);
 assert.equal(layers.shimmer.material.vertexColors,false);
 assert.equal(layers.shimmer.material.opacity,.34);
 assert.equal(layers.shimmer.material.transparent,true);
 assert.equal(layers.shimmer.material.depthWrite,false);
 assert.equal(layers.shimmer.material.blending,THREE.AdditiveBlending);
 assert.equal(layers.shimmer.renderOrder,4);
 for(const mesh of Object.values(layers)){
  assert.equal(mesh.material.side,THREE.DoubleSide);
  assert.equal(mesh.material.alphaTest,0);
  assert.equal(mesh.material.alphaMap,null);
 }
 const ripple=layers.shimmer.material.map;
 assert.equal(ripple.image.width,256);assert.equal(ripple.image.height,256);
 assert.equal(ripple.wrapS,THREE.RepeatWrapping);assert.equal(ripple.wrapT,THREE.RepeatWrapping);
 assert.deepEqual(ripple.repeat.toArray(),[5,3]);
 const protectedLayers=Object.values(layers).map(mesh=>({mesh,
  geometry:mesh.geometry,material:mesh.material,
  color:mesh.geometry.attributes.color,
  colorHash:hash(mesh.geometry.attributes.color.array),
  colorVersion:mesh.geometry.attributes.color.version,
  index:hash(mesh.geometry.index.array),uv:hash(mesh.geometry.attributes.uv.array),
  position:hash(mesh.geometry.attributes.position.array)}));
 const textureVersion=ripple.version,image=ripple.image;
 const pixelHash=hash(image.getContext('2d').getImageData(0,0,256,256).data);
 for(const [quality,preset] of Object.entries(GRAPHICS_PRESETS)){
  zone.setGraphics({...graphicsDensity(quality),waterColor:preset.waterColor,shadows:preset.shadowSize>0});
  assert.equal(layers.shimmer.material.opacity,preset.waterShimmer);
  for(const time of [0,.5,73,3600])zone.animate(time);
  closeColor(ripple.offset.toArray(),[3600*.006,3600*.003]);
  zone.rebuild();
  for(const snapshot of protectedLayers){
   const {mesh}=snapshot;
   assert.equal(mesh.geometry,snapshot.geometry);assert.equal(mesh.material,snapshot.material);
   assert.equal(mesh.geometry.attributes.color,snapshot.color);
   assert.equal(hash(snapshot.color.array),snapshot.colorHash);
   assert.equal(snapshot.color.version,snapshot.colorVersion,'animation must not upload paint again');
   assert.equal(hash(mesh.geometry.attributes.position.array),snapshot.position);
   assert.equal(hash(mesh.geometry.index.array),snapshot.index);
   assert.equal(hash(mesh.geometry.attributes.uv.array),snapshot.uv);
   assert.equal(mesh.castShadow,false);assert.equal(mesh.receiveShadow,false);
  }
  assert.equal(layers.water.material.opacity,.90);
  assert.equal(layers.water.material.vertexColors,true);
  assert.equal(layers.shimmer.material.vertexColors,false);
  assert.equal(ripple.version,textureVersion);assert.equal(ripple.image,image);
  assert.equal(hash(image.getContext('2d').getImageData(0,0,256,256).data),pixelHash);
  const current=resources(scene);
  assert.deepEqual([current.meshes.length,current.geometries.size,current.materials.size,current.textures.size],
   [387,384,79,6]);
 }
});

test('the active painted-world profile keeps the same three lake layers in every quality',()=>{
 const {scene,zone}=createZone(261,{artRemaster:true,r2Vegetation:true,r2Materials:true});
 const layers=lakeLayers(scene);
 const protectedLayers=Object.values(layers).map(mesh=>({mesh,
  geometry:mesh.geometry,material:mesh.material,
  color:mesh.geometry.attributes.color,
  colorHash:hash(mesh.geometry.attributes.color.array)}));
 const ripple=layers.shimmer.material.map;
 for(const [quality,preset] of Object.entries(GRAPHICS_PRESETS)){
  zone.setGraphics({...graphicsDensity(quality),waterColor:preset.waterColor,shadows:preset.shadowSize>0});
  zone.animate(19.5);zone.rebuild();
  for(const snapshot of protectedLayers){
   const {mesh}=snapshot,kind=mesh===layers.shore?'shore':'water';
   assert.equal(mesh.geometry,snapshot.geometry);assert.equal(mesh.material,snapshot.material);
   assert.equal(mesh.geometry.attributes.color,snapshot.color);
   assert.equal(hash(snapshot.color.array),snapshot.colorHash);
   assert.equal(hash(mesh.geometry.attributes.position.array),ORIGINAL_POSITION_HASHES[261][kind]);
   assert.equal(hash(mesh.geometry.attributes.uv.array),ORIGINAL_LAYER_HASHES[kind].uv);
   assert.equal(hash(mesh.geometry.index.array),ORIGINAL_LAYER_HASHES[kind].index);
   assert.equal(mesh.castShadow,false);assert.equal(mesh.receiveShadow,false);
  }
  assert.equal(new Set(Object.values(layers).map(mesh=>mesh.geometry)).size,3);
  assert.equal(new Set(Object.values(layers).map(mesh=>mesh.material)).size,3);
  assert.equal(layers.shimmer.material.map,ripple);
  assert.equal(layers.water.material.opacity,.90);
  assert.equal(layers.shimmer.material.opacity,preset.waterShimmer);
  assert.equal(layers.water.material.vertexColors,true);
  assert.equal(layers.shimmer.material.vertexColors,false);
 }
});

test('lake depth and walkable shallows retain their original physics values',()=>{
 const fixtures=[
  [30,26,-11.158420704380159,false],
  [11,26,-.4189025330573459,true],
  [14,26,-.44340064401504153,true],
  [30,11,1.2542359432382302,true],
  [50,26,-.31612109644182657,true],
  [22,26,-6.083387586732685,false],
  [60,20,-.5154900283696247,true]
 ];
 close(LAKE_SURFACE,-.658420704380159,1e-12);
 for(const [x,z,height,walkable] of fixtures){
  close(startHeightAt(x,z),height,1e-12);
  assert.equal(canWadeAtLocal(x,z),walkable,`unexpected wading at ${x},${z}`);
 }
});

function recordedRipples(){
 const canvas=createCanvas(256,256),context=canvas.getContext('2d');
 const strokes=[];let paths=[],path=null;
 const instrumented=new Proxy(context,{
  get(target,name){
   const member=target[name];
   if(typeof member!=='function')return member;
   return (...args)=>{
    if(name==='beginPath'){paths=[];path=null;}
    if(name==='moveTo'){path=[{name,args}];paths.push(path);}
    if(name==='bezierCurveTo')path?.push({name,args});
    if(name==='stroke')strokes.push(paths);
    return member.apply(target,args);
   };
  },
  set(target,name,value){target[name]=value;return true;}
 });
 paintLakeRipples(instrumented,256);
 return {strokes,pixels:context.getImageData(0,0,256,256).data};
}
function pathPoints(path){
 const points=[path[0].args];let current=points[0];
 for(const command of path.slice(1)){
  const [ax,ay,bx,by,x,y]=command.args;
  for(let i=1;i<=32;i++){
   const t=i/32,u=1-t;
   points.push([u*u*u*current[0]+3*u*u*t*ax+3*u*t*t*bx+t*t*t*x,
    u*u*u*current[1]+3*u*u*t*ay+3*u*t*t*by+t*t*t*y]);
  }
  current=[x,y];
 }
 return points;
}
function translatedPathEquals(path,other,dx,dy){
 return path.length===other.length&&path.every((command,i)=>
  command.name===other[i].name&&command.args.every((value,j)=>
   Math.abs(value+(j%2?dy:dx)-other[i].args[j])<1e-9));
}

test('the original 65 ripple strokes paint deterministically and wrap both tile seams',()=>{
 const {strokes,pixels}=recordedRipples(),second=recordedRipples();
 assert.equal(strokes.length,65,'periodic copies must share the original stroke submission');
 assert.deepEqual(pixels,second.pixels);
 const alpha=[];for(let i=3;i<pixels.length;i+=4)alpha.push(pixels[i]);
 assert.ok(alpha.some(value=>value>0));
 assert.ok(alpha.filter(value=>value>0).length<256*256*.4,
  'glints should leave most of the water visible');
 let wrappedX=0,wrappedY=0;
 for(const paths of strokes){
  assert.ok(paths.length>=1&&paths.length<=4,'wrap copies must remain bounded');
  for(const path of paths){
   assert.ok(path.length>=2,'glints need a painted curve');
   const points=pathPoints(path);
   const shifts=[];
   if(points.some(([x])=>x<0)){shifts.push([256,0]);wrappedX++;}
   if(points.some(([x])=>x>256)){shifts.push([-256,0]);wrappedX++;}
   if(points.some(([,y])=>y<0)){shifts.push([0,256]);wrappedY++;}
   if(points.some(([,y])=>y>256)){shifts.push([0,-256]);wrappedY++;}
   for(const [dx,dy] of shifts)assert.ok(paths.some(other=>translatedPathEquals(path,other,dx,dy)),
    'a glint crossing a tile edge must continue on the opposite edge');
  }
 }
 assert.ok(wrappedX>0&&wrappedY>0,'the seam checks must exercise both texture axes');
});
