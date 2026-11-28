import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {buildHearthHouse,LONGHOUSE,HOUSE_CHEST,fromHouseCoordinates} from '../hearth-house.js';
import {hearthSurfacePixel,buildHearthSurfacePixels,applyHearthSurfacePaint} from '../hearth-surface-paint.js';
import {createRoofTransparency,createSurfaceTransparency} from '../roof-transparency.js';
import {canWalkCamp} from '../sphere-physics.js';
import {createStartZone} from '../start-zone.js';
import {GRAPHICS_PRESETS,graphicsDensity} from '../graphics-quality.js';
import {installDom} from './harness.mjs';

const hash=array=>createHash('sha256').update(new Uint8Array(
 array.buffer,array.byteOffset,array.byteLength)).digest('hex');
function resources(root){
 const meshes=[],materials=new Set(),textures=new Set(),geometries=new Set();
 let instances=0,triangles=0;
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;
  meshes.push(mesh);geometries.add(mesh.geometry);
  instances+=mesh.count??1;
  triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*(mesh.count??1);
  for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   materials.add(material);
   for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
  }
 });
 return {meshes,materials,textures,geometries,instances,triangles};
}
function build(){
 const root=new THREE.Group();
 const house=buildHearthHouse(THREE,{root,villageVisuals:{addRoof(){}}});
 return {root,house};
}
function snapshot(mesh){
 return {mesh,geometry:mesh.geometry,material:mesh.material,
  attributes:Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([key,attribute])=>
   [key,{attribute,array:attribute.array,hash:hash(attribute.array)}])),
  index:mesh.geometry.index,indexHash:mesh.geometry.index?hash(mesh.geometry.index.array):null,
  transform:[...mesh.position.toArray(),...mesh.quaternion.toArray(),...mesh.scale.toArray()],
  instances:mesh.instanceMatrix?hash(mesh.instanceMatrix.array):null,
  colors:mesh.instanceColor?hash(mesh.instanceColor.array):null,
  flags:[mesh.visible,mesh.castShadow,mesh.receiveShadow,mesh.frustumCulled,mesh.renderOrder]};
}
function preserve(snapshot,{gableUV=false,material=true,flags=true}={}){
 const {mesh}=snapshot;
 assert.equal(mesh.geometry,snapshot.geometry);
 if(material)assert.equal(mesh.material,snapshot.material);
 for(const [name,entry] of Object.entries(snapshot.attributes)){
  assert.equal(mesh.geometry.attributes[name],entry.attribute);
  assert.equal(entry.attribute.array,entry.array);
  if(!(gableUV&&name==='uv'&&mesh.name==='hearth-house-hide-gable'))
   assert.equal(hash(entry.array),entry.hash,mesh.name+' '+name);
 }
 assert.equal(mesh.geometry.index,snapshot.index);
 assert.equal(mesh.geometry.index?hash(mesh.geometry.index.array):null,snapshot.indexHash);
 assert.deepEqual([...mesh.position.toArray(),...mesh.quaternion.toArray(),...mesh.scale.toArray()],snapshot.transform);
 assert.equal(mesh.instanceMatrix?hash(mesh.instanceMatrix.array):null,snapshot.instances);
 assert.equal(mesh.instanceColor?hash(mesh.instanceColor.array):null,snapshot.colors);
 if(flags)assert.deepEqual([mesh.visible,mesh.castShadow,mesh.receiveShadow,mesh.frustumCulled,mesh.renderOrder],snapshot.flags);
}
const namedMaps=root=>[...resources(root).textures].filter(map=>/^hearth-house-(wood|hide)-grain$/.test(map.name));

test('painted wood and hides repeat seamlessly with broad pigment contrast and opaque pixels',()=>{
 for(const kind of ['wood','hide']){
  for(const [u,v] of [[0,0],[1,1],[-.37,.92],[.13,.29],[.83,-.21]]){
   const pixel=hearthSurfacePixel(kind,u,v);
   assert.ok(pixel.every(Number.isFinite));
   assert.ok(pixel.every(channel=>Number.isInteger(channel)&&channel>=0&&channel<=255));
   assert.equal(pixel[3],255);
   for(const [du,dv] of [[1,0],[0,-1],[-2,3]])
    assert.deepEqual(hearthSurfacePixel(kind,u+du,v+dv),pixel);
  }
  for(const v of [.1,.43,.9]){
   const left=hearthSurfacePixel(kind,-1e-8,v),right=hearthSurfacePixel(kind,1e-8,v);
   left.forEach((channel,i)=>assert.ok(Math.abs(channel-right[i])<=1));
  }
  const pixels=buildHearthSurfacePixels(kind);
  assert.equal(pixels.length,64*64*4);
  assert.equal(hash(pixels),hash(buildHearthSurfacePixels(kind)));
  const blocks=[];
  for(let by=0;by<8;by++)for(let bx=0;bx<8;bx++){
   let sum=0;
   for(let y=by*8;y<(by+1)*8;y++)for(let x=bx*8;x<(bx+1)*8;x++){
    const offset=(y*64+x)*4;
    assert.equal(pixels[offset+3],255);
    sum+=pixels[offset]*.2126+pixels[offset+1]*.7152+pixels[offset+2]*.0722;
   }
   blocks.push(sum/64);
  }
  assert.ok(Math.max(...blocks)-Math.min(...blocks)>12,
   kind+' needs readable masses after phone-distance mipmapping');
  assert.ok(Math.min(...blocks)>185&&Math.max(...blocks)<252,'pigment must retain the existing warm material tints');
 }
 assert.throws(()=>hearthSurfacePixel('stone',0,0),TypeError);
 assert.throws(()=>hearthSurfacePixel('wood',NaN,0),TypeError);
 assert.throws(()=>hearthSurfacePixel('hide',0,Infinity),TypeError);
 assert.throws(()=>buildHearthSurfacePixels('wood',0),RangeError);
});

test('painting reuses the original maps and preserves every house surface except normalized gable UVs',()=>{
 const {root,house}=build(),before=resources(root),snapshots=before.meshes.map(snapshot);
 const transforms=[];
 root.traverse(node=>transforms.push({node,parent:node.parent,children:[...node.children],
  transform:[...node.position.toArray(),...node.quaternion.toArray(),...node.scale.toArray()]}));
 const materialSettings=Array.from(before.materials,material=>({material,
  settings:[material.opacity,material.transparent,material.depthWrite,material.side,
   material.roughness,material.metalness,material.alphaTest,material.alphaMap,
   material.flatShading,material.vertexColors,...material.color.toArray()]}));
 const maps=namedMaps(root).map(map=>({map,image:map.image,data:map.image.data,
  hash:hash(map.image.data),version:map.version,settings:[map.image.width,map.image.height,
   map.wrapS,map.wrapT,...map.repeat.toArray(),map.magFilter,map.minFilter,map.generateMipmaps,map.colorSpace]}));
 const facade=house.accents.getObjectByName('hearth-house-hide-wall-panels');
 const gables=before.meshes.filter(mesh=>mesh.name==='hearth-house-hide-gable');
 assert.equal(facade.material.map,null);assert.equal(gables.length,2);
 assert.ok(gables.every(mesh=>mesh.material.map===null));
 applyHearthSurfacePaint(house);
 const after=resources(root);
 for(const all of [before,after])assert.deepEqual([all.meshes.length,all.instances,all.materials.size,
  all.textures.size,all.geometries.size,all.triangles],[133,533,24,2,133,12450]);
 assert.deepEqual(after.meshes,before.meshes);
 assert.deepEqual(after.materials,before.materials);assert.deepEqual(after.textures,before.textures);
 snapshots.forEach(entry=>preserve(entry,{gableUV:true}));
 for(const {node,parent,children,transform} of transforms){
  assert.equal(node.parent,parent);assert.deepEqual(node.children,children);
  assert.deepEqual([...node.position.toArray(),...node.quaternion.toArray(),...node.scale.toArray()],transform);
 }
 for(const {material,settings} of materialSettings)assert.deepEqual([
  material.opacity,material.transparent,material.depthWrite,material.side,
  material.roughness,material.metalness,material.alphaTest,material.alphaMap,
  material.flatShading,material.vertexColors,...material.color.toArray()],settings);
 for(const entry of maps){
  const {map}=entry;
  assert.equal(map.image,entry.image);assert.equal(map.image.data,entry.data);
  assert.notEqual(hash(entry.data),entry.hash);assert.equal(map.version,entry.version+1);
  assert.deepEqual([map.image.width,map.image.height,map.wrapS,map.wrapT,...map.repeat.toArray(),
   map.magFilter,map.minFilter,map.generateMipmaps,map.colorSpace],entry.settings);
  assert.deepEqual(map.repeat.toArray(),[2,2]);
  for(let offset=3;offset<entry.data.length;offset+=4)assert.equal(entry.data[offset],255);
 }
 const hide=maps.find(entry=>entry.map.name==='hearth-house-hide-grain').map;
 assert.equal(facade.material.map,hide);assert.equal(facade.count,23);
 for(const gable of gables){
  assert.equal(gable.material.map,hide);
  assert.deepEqual([...gable.geometry.attributes.uv.array],[0,0,.5,1,1,0]);
 }
 const pixels=maps.map(entry=>hash(entry.data));
 applyHearthSurfacePaint(house);
 assert.deepEqual(maps.map(entry=>hash(entry.data)),pixels,'paint must be deterministic on reapplication');
});

test('painted facade and gables retain map identity through the existing reversible envelope fade',()=>{
 const {root,house}=build();applyHearthSurfacePaint(house);
 const maps=namedMaps(root),pixels=maps.map(map=>hash(map.image.data));
 const facade=house.accents.getObjectByName('hearth-house-hide-wall-panels');
 const gable=house.roof.getObjectByName('hearth-house-hide-gable');
 const originals=[facade.material,gable.material],floor=house.floor.children[1].material;
 const roof=createRoofTransparency(house.roof,{indoorOpacity:.12});
 const walls=createSurfaceTransparency(house.walls,{indoorOpacity:.20});
 assert.notEqual(facade.material,originals[0]);assert.notEqual(gable.material,originals[1]);
 assert.equal(facade.material.map,originals[0].map);assert.equal(gable.material.map,originals[1].map);
 for(const progress of [0,.2,.5,1,.7,0]){
  roof.setProgress(progress);walls.setProgress(progress);
  for(const [mesh,opacity] of [[facade,1-.8*progress],[gable,1-.88*progress]]){
   assert.ok(Math.abs(mesh.material.opacity-opacity)<1e-9);
   assert.equal(mesh.material.transparent,progress>0);
   assert.equal(mesh.material.depthWrite,progress===0);
  }
  assert.equal(floor.opacity,1);assert.equal(floor.transparent,false);
  assert.equal(house.walls.visible,true);assert.equal(house.roof.visible,true);
  assert.deepEqual(maps.map(map=>hash(map.image.data)),pixels);
 }
});

test('paint integration retains doorway, chest physics and the shared geometry module contract',()=>{
 const {house}=build();applyHearthSurfacePaint(house);
 for(const [x,z,expected] of [[0,10.4,true],[-2.8,10.4,true],[2.8,10.4,true],
  [-7,10.4,false],[7,10.4,false],[0,-8.6,false],[0,-6.65,true],[5.4,-6.2,true]]){
  const point=fromHouseCoordinates(x,z);
  assert.equal(canWalkCamp(point.x,point.z),expected);
 }
 assert.equal(LONGHOUSE.doorWidth,6.8);
 assert.deepEqual(HOUSE_CHEST,{x:-35.6,z:-2,range:3.25});
 const source=readFileSync(new URL('../start-zone.js',import.meta.url),'utf8');
 assert.match(source,/hearth-house\.js\?v=10/);
 assert.match(source,/hearth-surface-paint\.js\?v=1/);
 const buildAt=source.indexOf('const longhouse=buildHearthHouse(');
 const paintAt=source.indexOf('applyHearthSurfacePaint(longhouse);');
 const fadeAt=source.indexOf('const roofTransparency=createRoofTransparency(');
 assert.ok(buildAt<paintAt&&paintAt<fadeAt,'paint must precede fade material clones and the first frame');
});

test('actual spherical zone keeps house pixels static through every radius, quality, animation and fade',()=>{
 installDom();let radius=261;
 const scene=new THREE.Scene(),zone=createStartZone(THREE,scene,()=>radius,()=>0);
 const facade=scene.getObjectByName('hearth-house-hide-wall-panels');
 const root=facade.parent.parent.parent;
 const maps=namedMaps(root),snapshots=resources(root).meshes.filter(mesh=>
  !mesh.name.startsWith('house-rat')).map(snapshot);
 assert.equal(maps.length,2);
 const protectedMaps=maps.map(map=>({map,image:map.image,data:map.image.data,
  pixels:hash(map.image.data),version:map.version}));
 for(const value of [170,261,510]){
  radius=value;zone.rebuild();
  for(const [quality,preset] of Object.entries(GRAPHICS_PRESETS)){
   zone.setGraphics({...graphicsDensity(quality),waterColor:preset.waterColor,shadows:preset.shadowSize>0});
   for(const time of [0,.5,73,3600])zone.animate(time);
   zone.updateInteriorView(-27,-2,.25);zone.updateInteriorView(0,0,.25);
   for(const entry of protectedMaps){
    assert.equal(entry.map.image,entry.image);assert.equal(entry.image.data,entry.data);
    assert.equal(hash(entry.data),entry.pixels);assert.equal(entry.map.version,entry.version);
   }
   // Roof shadow flags and envelope material opacity legitimately follow
   // their existing controllers; surface geometry and local transforms do not.
   snapshots.forEach(entry=>preserve(entry,{flags:false}));
  }
 }
});
