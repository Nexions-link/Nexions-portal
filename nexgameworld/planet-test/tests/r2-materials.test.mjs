import test from 'node:test';
import assert from 'node:assert/strict';
import {r2MeadowGrade,r2ForestGrade,buildR2MaterialDetail,createR2MaterialMaps}
 from '../r2-materials.js';
import {forestGroundPixel} from '../forest-ground-texture.js';
import {landscapeGroundPixel} from '../../landscape.js';

test('opt-in colour grade changes actual meadow and forest pixels, baseline remains unchanged',()=>{
 const normal=landscapeGroundPixel(8,11,[]);
 const r2=landscapeGroundPixel(8,11,[],{r2:true});
 assert.notDeepEqual(normal,r2);
 assert.deepEqual(normal,landscapeGroundPixel(8,11,[],{r2:false}));
 const forest=forestGroundPixel(.8,0);
 const forestR2=forestGroundPixel(.8,0,{r2:true});
 assert.notDeepEqual(forest,forestR2);
 assert.deepEqual(forest,forestGroundPixel(.8,0,{r2:false}));
 assert.deepEqual(forestGroundPixel(-1,.3,{r2:true}),[255,255,255,255]);
});
test('new R2 material colours are bounded and preserve opacity',()=>{
 for(const v of [0,.3,.8,1])for(const p of [r2MeadowGrade([90,114,60],{worn:v,earth:v,moss:v,dry:v,moisture:v}),
  r2ForestGrade([83,100,67],{wear:v,moss:v,leaves:v,wet:v,canopy:v})])
  assert.ok(p.length===3&&p.every(c=>Number.isInteger(c)&&c>=0&&c<=255));
});
test('R2 PBR tile is repeatable, compact, linear and releases GPU resources',()=>{
 const first=buildR2MaterialDetail(128),second=buildR2MaterialDetail(128);
 assert.deepEqual(first.normal,second.normal);
 assert.deepEqual(first.roughness,second.roughness);
 assert.equal(first.normal.length,128*128*4);
 assert.ok(new Set(first.roughness.filter((_,i)=>i%4===0)).size>5);
 assert.throws(()=>buildR2MaterialDetail(13),RangeError);
 class DataTexture{
  constructor(data,w,h,format){this.image={data,width:w,height:h};this.format=format;
   this.repeat={set:(x,y)=>{this.repeat.x=x;this.repeat.y=y}};}
  dispose(){this.disposed=true;}
 }
 const three={DataTexture,RGBAFormat:'rgba',RepeatWrapping:'repeat',NoColorSpace:'linear',
  LinearMipmapLinearFilter:'mipmap',LinearFilter:'linear'};
 const maps=createR2MaterialMaps(three,{repeatX:95,repeatY:95});
 assert.equal(maps.normalMap.repeat.x,95);
 assert.equal(maps.roughnessMap.colorSpace,'linear');
 assert.equal(maps.normalMap.image.width,128);
 maps.dispose();
 assert.equal(maps.normalMap.disposed,true);
 assert.equal(maps.roughnessMap.disposed,true);
});
test('R2 is optional and inserted into true playable terrain, not a concept image',async()=>{
 const {readFileSync}=await import('node:fs');
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const start=readFileSync(new URL('../start-zone.js',import.meta.url),'utf8');
 assert.match(planet,/get\('r2materials'\)==='1'/);
 assert.match(planet,/createForestGroundTexture\(THREE,\{r2:r2Materials,art:artRemaster\}\)/);
 assert.match(start,/createLandscapeMap\(THREE,routeSegments,1280,\{r2:r2Materials,art:artRemaster\}\)/);
});
