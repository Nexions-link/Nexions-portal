import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCanvas} from '@napi-rs/canvas';
import {createTauren} from '../start-zone.js';
import {installDom} from './harness.mjs';
import {getTaurenSurfaceMaps,paintTaurenFur,TAUREN_FUR_ATLAS_SIZE,TAUREN_MUZZLE_ATLAS_SIZE} from '../tauren-fur-textures.js?v=2';

function render(short=false){
 const size=short?TAUREN_MUZZLE_ATLAS_SIZE:TAUREN_FUR_ATLAS_SIZE;
 const canvas=createCanvas(size,size);
 const result=paintTaurenFur(canvas.getContext('2d'),size,{short});
 const data=canvas.getContext('2d').getImageData(0,0,size,size).data;
 return {result,data,size};
}
test('original fur is multitone, opaque and does not leave repeating transparent gaps',()=>{
 for(const short of [false,true]){
  const {result,data,size}=render(short);
  assert.equal(result.width,size);assert.equal(result.height,size);
  assert.equal(data.length,size*size*4);
  const luminance=new Set();
  let lo=255,hi=0,avg=0;
  for(let i=0;i<data.length;i+=4){
   const v=(data[i]+data[i+1]+data[i+2])/3;
   luminance.add(Math.round(v/4));
   lo=Math.min(lo,v);hi=Math.max(hi,v);avg+=v;
   assert.equal(data[i+3],255,'no holes in the fur atlas');
  }
  avg/=size*size;
  assert.ok(hi-lo>28,'irregular low/mid-frequency hue variation must be visible');
  assert.ok(luminance.size>=12,'avoid flat plastic fur');
  assert.ok(avg>140&&avg<239,'neutral texture preserves individual brown/red player colors');
  assert.ok(result.strands>0);
 }
});
test('fiber atlas is reproducible and distinguishes short muzzle fur from longer hide',()=>{
 const a=render(false),b=render(false),c=render(true);
 assert.deepEqual(a.data,b.data,'no flicker or random shader generation per client');
 assert.notEqual(a.result.strands,c.result.strands,'muzzle hair is visibly shorter');
 assert.equal(a.size,256);assert.equal(c.size,128);
});
test('players with different fur colors reuse shared map textures, not tinted player materials',()=>{
 installDom();
 const first=createTauren(THREE,new THREE.Scene(),{player:true,fur:0x836144});
 const second=createTauren(THREE,new THREE.Scene(),{remotePlayer:true,fur:0x92715a});
 const shared=getTaurenSurfaceMaps(THREE);
 assert.strictEqual(shared,getTaurenSurfaceMaps(THREE));
 assert.notStrictEqual(shared.pelt,shared.muzzle);
 for(const map of [shared.pelt,shared.muzzle,shared.horn]){
  assert.ok(map.isCanvasTexture,'should upload a CanvasTexture only once per asset class');
  assert.equal(map.colorSpace,THREE.SRGBColorSpace);
  assert.equal(map.wrapS,THREE.RepeatWrapping);
  assert.equal(map.wrapT,THREE.RepeatWrapping);
  assert.equal(map.anisotropy,2,'do not increase mobile GPU anisotropy cost');
 }
 const findPelt=a=>a.chest.children.find(n=>n.isMesh&&n.material?.map===shared.pelt);
 const firstPelt=findPelt(first),secondPelt=findPelt(second);
 assert.ok(firstPelt&&secondPelt,'shared fur must be used by visible body');
 assert.notStrictEqual(firstPelt.material,secondPelt.material,'different avatars keep individual material tint');
 assert.equal(firstPelt.material.color.getHex(),0x836144);
 assert.equal(secondPelt.material.color.getHex(),0x92715a);
 assert.ok(first.head.children.some(n=>n.isMesh&&n.material?.map===shared.muzzle),
  'muzzle gets finer, separate short-fiber surface');
 assert.ok(first.anatomy.meshes.some(n=>n.material===firstPelt.material),
  'extra muscle forms use original pelt material, avoiding unpainted patches');
});
test('fur refinement does not change eyes, joint hierarchy, equipment grip or additional sculpt budget',()=>{
 installDom();
 const actor=createTauren(THREE,new THREE.Scene(),{player:true});
 for(const mesh of actor.head.children.filter(m=>m.isMesh&&m.material?.color?.getHex()===0x231f19)){
  if(Math.abs(mesh.position.y-.134)>.002)continue;
  assert.ok(mesh.position.z>.5,'both pupil surfaces remain in front of the face');
  assert.equal(mesh.material.map,null,'iris pupils stay opaque rather than fur-textured');
 }
 const eyes=actor.head.children.filter(m=>m.isMesh&&Math.abs(m.position.y-.134)<.002&&
  m.material?.color?.getHex()===0x231f19);
 assert.equal(eyes.length,2);
 actor.anatomy.setQuality(1);
 assert.ok(actor.anatomy.triangles<=18000);
 assert.equal(actor.arms.length,2);
 assert.equal(actor.legs.length,2);
 assert.ok(actor.arms.every(a=>a.hand&&a.elbow&&a.shoulder));
});

test('a second online avatar does not allocate another fur, muzzle or horn canvas',()=>{
 const library={CanvasTexture:THREE.CanvasTexture,SRGBColorSpace:THREE.SRGBColorSpace,
  RepeatWrapping:THREE.RepeatWrapping};
 let canvases=0;
 const create=()=>{canvases++;return createCanvas(16,16)};
 const maps=getTaurenSurfaceMaps(library,{createCanvas:create});
 assert.equal(canvases,3,'one atlas each for fur, muzzle and horns');
 const next=getTaurenSurfaceMaps(library,{createCanvas:()=>{throw Error('Cache miss on second avatar')}});
 assert.strictEqual(next,maps);
 assert.equal(canvases,3,'new avatar must reuse all three GPU uploads');
});
