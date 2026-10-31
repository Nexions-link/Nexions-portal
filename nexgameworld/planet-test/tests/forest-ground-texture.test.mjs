import test from 'node:test';
import assert from 'node:assert/strict';
import {forestTextureMask,forestGroundPixel,buildForestGroundPixels,createForestGroundTexture,
 forestEntranceBlend,forestEntranceTilePixel}
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

test('village-to-forest transition fades through a genuine meadow apron',()=>{
 const lat=forestTrailLatitude(.34);
 assert.ok(forestEntranceBlend(.30,lat)<.18);
 assert.ok(forestEntranceBlend(.48,lat)>.1&&forestEntranceBlend(.48,lat)<.95);
 assert.equal(forestEntranceBlend(.81,lat),1);
 const meadow=forestGroundPixel(.32,forestTrailLatitude(.32)+.12,{r2:true,art:true});
 assert.ok(meadow[1]>meadow[0]*1.16);
 assert.equal(meadow[3],255);
});
test('village core is identical, and the eastern boundary matches the globe',()=>{
 const original=[91,124,69,255];
 for(const [x,z] of [[0,0],[56,-4],[40,70],[-82,0],[67,-1]]){
  assert.deepEqual(forestEntranceTilePixel(x,z,original,{r2:true,art:true}),original);
 }
 const edge=forestEntranceTilePixel(84,-2,original,{r2:true,art:true});
 const d=Math.hypot(84,-2),k=Math.sin(d/261)/d;
 const lon=Math.atan2(84*k,Math.cos(d/261)),lat=Math.asin(-2*k);
 assert.deepEqual(edge,forestGroundPixel(lon,lat,{r2:true,art:true}));
 const mid=forestEntranceTilePixel(76,-2,original,{r2:true,art:true});
 assert.notDeepEqual(mid,original);
 assert.notDeepEqual(mid,edge);
 assert.equal(edge[3],255);
});
