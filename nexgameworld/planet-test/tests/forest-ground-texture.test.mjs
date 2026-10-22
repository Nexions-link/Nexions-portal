import test from 'node:test';
import assert from 'node:assert/strict';
import {forestTextureMask,forestGroundPixel,buildForestGroundPixels,createForestGroundTexture}
 from '../forest-ground-texture.js';
import {forestTrailLatitude} from '../whispering-forest.js';
test('world texture remains fully opaque; unrelated biomes are neutral white',()=>{
 const width=128,height=64,data=buildForestGroundPixels(width,height);
 assert.equal(data.length,width*height*4);
 for(let i=3;i<data.length;i+=4)assert.equal(data[i],255);
 const out=forestGroundPixel(-1,.2);
 assert.deepEqual(out,[255,255,255,255]);
 assert.equal(forestTextureMask(-1,0),0);
 assert.equal(forestTextureMask(2,0),0);
 assert.ok(forestTextureMask(.83,forestTrailLatitude(.83))>.95);
});
test('forest soil varies beyond green turf, and path is visibly compacted',()=>{
 const colors=[];
 for(let lon=.4;lon<1.4;lon+=.11){
  for(const offset of [-.20,-.1,.08,.20])
   colors.push(forestGroundPixel(lon,forestTrailLatitude(lon)+offset));
 }
 assert.ok(new Set(colors.map(c=>c[0]+','+c[1]+','+c[2])).size>25);
 assert.ok(colors.some(([r,g])=>r>g),'soil and leaf patches should be brown');
 const track=forestGroundPixel(.8,forestTrailLatitude(.8));
 assert.ok(track[0]>track[2]);
});
test('CanvasTexture creation uses standard sRGB texture and graceful fallback',()=>{
 assert.equal(createForestGroundTexture({}, {documentRef:null}),null);
 const canvas={width:0,height:0,getContext:()=>({
  createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
  putImageData:()=>{}
 })};
 class FakeCanvasTexture{constructor(surface){this.image=surface}}
 const texture=createForestGroundTexture({CanvasTexture:FakeCanvasTexture,SRGBColorSpace:'srgb'},
  {width:32,height:16,documentRef:{createElement:()=>canvas}});
 assert.ok(texture instanceof FakeCanvasTexture);
 assert.equal(texture.image.width,32);
 assert.equal(texture.image.height,16);
 assert.equal(texture.colorSpace,'srgb');
});
test('main globe keeps regular opaque material and no custom shader',async()=>{
 const {readFileSync}=await import('node:fs');
 const src=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(src,/map:groundTexture,vertexColors:true/);
 assert.match(src,/transparent:false,depthWrite:true/);
 assert.doesNotMatch(src,/installForestGroundShader/);
});
