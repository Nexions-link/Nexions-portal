import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCanvas} from '@napi-rs/canvas';
import {createOrcMaterials} from '../orc-materials.js';

const canvasFactory=()=>createCanvas(1,1);

test('orc instances own their materials while reusable surface maps survive preview disposal',()=>{
 const namespace={...THREE};
 let painted=0;
 const factory=()=>{painted++;return canvasFactory()};
 const first=createOrcMaterials(namespace,{createCanvas:factory});
 const initialCanvasCount=painted;
 assert.ok(initialCanvasCount>0,'the first actor creates its original surface maps');
 const second=createOrcMaterials(namespace,{createCanvas:factory});
 assert.equal(painted,initialCanvasCount,'additional avatars do not repaint or allocate texture canvases');
 assert.notStrictEqual(first,second);
 for(const name of ['skin','skinDark','skinLight','ivory','hair','eye','black',
  'metal','metalDark','leather','leatherDark','cloth','trim']){
  assert.ok(first[name]?.isMeshStandardMaterial,name+' is available to body and head builders');
  assert.equal(first[name].vertexColors,true,name+' preserves the sculpted mesh shading');
  assert.notStrictEqual(first[name],second[name],name+' material belongs to one actor');
  assert.strictEqual(first[name].map,second[name].map,name+' map is shared');
  assert.ok(Number.isFinite(first[name].roughness)&&Number.isFinite(first[name].metalness),name);
 }
 const secondSkinColor=second.skin.color.getHex();
 first.skin.color.set(0xff0000);
 assert.equal(second.skin.color.getHex(),secondSkinColor,'per-character tint does not leak');
 const maps=new Set(Object.values(second).flatMap(material=>
  ['map','roughnessMap','bumpMap','normalMap'].map(slot=>material[slot]).filter(Boolean)));
 let disposedTextures=0;
 for(const texture of maps)texture.addEventListener('dispose',()=>disposedTextures++);
 for(const material of new Set(Object.values(first)))material.dispose();
 assert.equal(disposedTextures,0,'closing one preview must not dispose shared maps used by live avatars');
 for(const material of Object.values(second)){
  if(material.map)assert.ok(maps.has(material.map));
 }
});

test('original orc surface maps contain valid opaque painted pixels',()=>{
 const materials=createOrcMaterials({...THREE},{createCanvas:canvasFactory});
 for(const name of ['skin','leather','metal','ivory','cloth','hair']){
  const texture=materials[name].map;
  assert.ok(texture?.isTexture,name+' has an original local surface');
  assert.equal(texture.userData.actorShared,true,name+' declares shared texture ownership');
  const canvas=texture.image;
  assert.ok(Number.isSafeInteger(canvas.width)&&canvas.width>=16&&canvas.width<=1024,name+' width is bounded');
  assert.ok(Number.isSafeInteger(canvas.height)&&canvas.height>=16&&canvas.height<=1024,name+' height is bounded');
  const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  const tones=new Set();
  for(let i=0;i<pixels.length;i+=4){
   assert.equal(pixels[i+3],255,name+' does not leave holes in the character');
   tones.add((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2]);
  }
  assert.ok(tones.size>8,name+' carries visible painted variation');
 }
});

test('creating materials without a DOM does not poison subsequent textured avatars',()=>{
 const previousDocument=globalThis.document;
 const previousOffscreenCanvas=globalThis.OffscreenCanvas;
 const namespace={...THREE};
 try{
  delete globalThis.document;
  delete globalThis.OffscreenCanvas;
  const fallback=createOrcMaterials(namespace);
  assert.ok(fallback.skin.isMeshStandardMaterial);
  assert.equal(fallback.skin.map,null);
  const textured=createOrcMaterials(namespace,{createCanvas:canvasFactory});
  assert.ok(textured.skin.map?.isTexture,'a later browser/canvas context can still create cached maps');
  assert.notStrictEqual(textured.skin,fallback.skin);
 }finally{
  if(previousDocument===undefined)delete globalThis.document;
  else globalThis.document=previousDocument;
  if(previousOffscreenCanvas===undefined)delete globalThis.OffscreenCanvas;
  else globalThis.OffscreenCanvas=previousOffscreenCanvas;
 }
});

test('partial canvas adapters fall back cleanly and do not retain incomplete texture atlases',()=>{
 const namespace={...THREE};
 const created=[];
 class ObservedCanvasTexture extends THREE.CanvasTexture {
  constructor(canvas){
   super(canvas);
   const record={texture:this,disposed:false};
   this.addEventListener('dispose',()=>{record.disposed=true});
   created.push(record);
  }
 }
 namespace.CanvasTexture=ObservedCanvasTexture;
 let canvases=0;
 const first=createOrcMaterials(namespace,{createCanvas:()=>++canvases<=2?
  canvasFactory():{getContext:()=>({measureText:()=>({width:1})})}});
 assert.equal(first.skin.map,null,'an incomplete atlas is never attached to an avatar');
 assert.ok(created.length>0,'the adapter failed after the first valid surface');
 assert.ok(created.every(record=>record.disposed),'temporary GPU textures are released after partial failure');
 const recovered=createOrcMaterials(namespace,{createCanvas:canvasFactory});
 assert.ok(recovered.skin.map?.isTexture,'a later real canvas must recover without restarting the app');
 assert.ok(created.some(record=>record.texture===recovered.skin.map&&!record.disposed));
});
