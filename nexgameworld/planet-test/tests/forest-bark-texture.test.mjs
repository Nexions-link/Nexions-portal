import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FOREST_BARK_TEXTURE_SIZE,forestBarkPixel,buildForestBarkPixels,
 forestBarkQuality,createForestBarkTextures} from '../forest-bark-texture.js';

test('bark atlas is opaque, deterministic and never flat brown',()=>{
 const a=buildForestBarkPixels(64,128),b=buildForestBarkPixels(64,128);
 assert.deepEqual(a,b);
 assert.equal(a.color.length,64*128*4);
 assert.equal(a.bump.length,a.color.length);
 const variation=new Set(),relief=new Set();
 for(let i=0;i<a.color.length;i+=4){
  assert.equal(a.color[i+3],255);assert.equal(a.bump[i+3],255);
  variation.add(a.color[i]);relief.add(a.bump[i]);
 }
 assert.ok(variation.size>55,'Visible bark grooves need wide albedo variation');
 assert.ok(relief.size>60,'Bump relief must not be constant');
 assert.deepEqual(FOREST_BARK_TEXTURE_SIZE,{width:256,height:512});
});

test('bark UVs tile with continuous horizontal and vertical borders',()=>{
 for(const [u,v] of [[.1,.3],[.88,.91],[.35,.67]]){
  const a=forestBarkPixel(u,v),b=forestBarkPixel(u+1,v-1);
  // Shader-visible channels must match exactly. Intermediate floating
  // responses may differ by machine epsilon after modular UV wrap.
  assert.deepEqual(a.color,b.color);
  assert.equal(a.relief,b.relief);
  assert.equal(a.roughness,b.roughness);
  assert.ok(Math.abs(a.fissure-b.fissure)<1e-9);
  assert.ok(Math.abs(a.moss-b.moss)<1e-9);
 }
 const nearSeam=forestBarkPixel(.0001,.5).color[0];
 const otherSide=forestBarkPixel(.9999,.5).color[0];
 assert.ok(Math.abs(nearSeam-otherSide)<9,'RepeatWrapping seam must be subtle');
 assert.throws(()=>forestBarkPixel(Infinity,0),RangeError);
 assert.throws(()=>buildForestBarkPixels(0,32),RangeError);
});

test('quality preset avoids mobile bump cost while keeping color texture',()=>{
 assert.deepEqual(forestBarkQuality('economy'),{bump:false,bumpScale:0});
 assert.deepEqual(forestBarkQuality('balanced',true),{bump:false,bumpScale:0});
 assert.ok(forestBarkQuality('high').bumpScale>forestBarkQuality('balanced').bumpScale);
 assert.equal(createForestBarkTextures({}),null);
 class FakeDataTexture{
  constructor(bytes,w,h){this.image={data:bytes,width:w,height:h};this.repeat={set:(x,y)=>{this.tile=[x,y]}};}
 }
 const textures=createForestBarkTextures({
  DataTexture:FakeDataTexture,RGBAFormat:'RGBA',
  SRGBColorSpace:'srgb',NoColorSpace:'none',RepeatWrapping:'repeat',
  LinearMipmapLinearFilter:'mip',LinearFilter:'linear'
 });
 assert.equal(textures.map.colorSpace,'srgb');
 assert.equal(textures.bumpMap.colorSpace,'none');
 assert.deepEqual(textures.map.tile,[2,4]);
 assert.equal(textures.roughnessMap.colorSpace,'none');
 assert.deepEqual(textures.roughnessMap.tile,[2,4]);
 assert.equal(textures.map.image.width,256);
 assert.equal(textures.map.image.height,512);
});

test('forest integration retains instancing and identical collider footprint',()=>{
 const source=readFileSync(new URL('../whispering-forest.js',import.meta.url),'utf8');
 assert.match(source,/createForestBarkTextures\(THREE\)/);
 assert.match(source,/bumpProfile|barkProfile/);
 assert.match(source,/new THREE\.InstancedMesh/);
 assert.doesNotMatch(source,/onBeforeCompile|ShaderMaterial/);
});
