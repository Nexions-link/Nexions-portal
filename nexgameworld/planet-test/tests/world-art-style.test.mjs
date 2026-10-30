import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORLD_ART_PALETTE as P,WORLD_ART_VERTEX as V,
 ART_STYLE_VERSION,ART_MATERIAL_SWATCHES,colorHexBytes,paletteColor}
 from '../world-art-style.js';
import {landscapeGroundPixel,prepareLandscapeRoutes} from '../../landscape.js';
import {forestGroundPixel,forestTextureMask} from '../forest-ground-texture.js';
import {forestTrailLatitude} from '../whispering-forest.js';
import {startColorAt,blendBiomeSoilAt} from '../start-zone.js';
import {forestBarkPixel} from '../forest-bark-texture.js';
import {forestColliders,createForestLayout} from '../whispering-forest.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const validHex=h=>/^#[0-9a-f]{6}$/i.test(h);
test('G-03 R1 palette has immutable original sRGB, mesh and light color roles',()=>{
 assert.equal(ART_STYLE_VERSION,'R1-G03-1');
 assert.equal(ART_MATERIAL_SWATCHES.length,10);
 assert.deepEqual(ART_MATERIAL_SWATCHES.map(row=>row.id),
 ['meadow','forest','moss','path','bark','pine','oak','stone','flower','sun']);
 for(const [family,roles] of Object.entries(P)){
  assert.ok(Object.isFrozen(roles),family);
  for(const [id,color] of Object.entries(roles)){
   assert.ok(Object.isFrozen(color)||typeof color==='string',family+'.'+id);
   if(typeof color==='string')assert.ok(validHex(color),family+'.'+id);
   else if(Array.isArray(color)&&typeof color[0]==='number'){
    assert.equal(color.length,3);
    for(const x of color)assert.ok(Number.isFinite(x)&&x>=0&&x<=255);
   }else if(Array.isArray(color)){
    assert.ok(color.every(validHex),family+'.'+id);
   }else assert.equal(typeof color,'number');
  }
 }
 for(const [id,c] of Object.entries(V)){
  assert.ok(Object.isFrozen(c),id);
  assert.equal(c.length,3);
  assert.ok(c.every(x=>x>=0&&x<=1));
 }
 assert.deepEqual(colorHexBytes('#a0855b'),[160,133,91]);
 assert.deepEqual(paletteColor('terrain','trailSun'),[160,134,91]);
 assert.throws(()=>colorHexBytes('rgb(11,11,11)'),RangeError);
 assert.throws(()=>paletteColor('terrain','unknown'),RangeError);
});
test('visual guide and preview feature all swatches and never promise a new camera',()=>{
 const doc=read('../../docs/NGW_ART_GUIDE_R1.md');
 const image=read('../../docs/NGW_ART_PALETTE_R1.svg');
 assert.match(doc,/NGW_ART_PALETTE_R1.svg/);
 assert.match(doc,/не перерабатывать штатную камеру/i);
 assert.match(doc,/цветовые роли/i);
 for(const swatch of ART_MATERIAL_SWATCHES){
  assert.ok(doc.toLowerCase().includes(swatch.hex.toLowerCase()),'doc '+swatch.id);
  assert.ok(image.toLowerCase().includes(swatch.hex.toLowerCase()),'image '+swatch.id);
 }
 assert.equal((image.match(/<g>/g)||[]).length,10);
 assert.match(image,/<svg/);
});
test('meadow and forest terrain use compatible path colors from one palette',()=>{
 const paths=prepareLandscapeRoutes([{ax:0,az:0,bx:30,bz:0,width:3.5}]);
 const startRoad=landscapeGroundPixel(15,0,paths);
 const forestRoad=forestGroundPixel(.8,forestTrailLatitude(.8));
 assert.ok(startRoad[0]>startRoad[2]&&forestRoad[0]>forestRoad[2]);
 const colorDistance=Math.hypot(...startRoad.slice(0,3).map((v,i)=>v-forestRoad[i]));
 assert.ok(colorDistance<93,'same ochre family at the path center');
 assert.equal(startRoad[3],255);
 assert.equal(forestRoad[3],255);
 assert.ok(forestTextureMask(.8,forestTrailLatitude(.8))>.95);
 assert.deepEqual(blendBiomeSoilAt(-83,-8,[100,110,90,255]),[100,110,90,255]);
 const start=startColorAt(3,8);
 assert.ok(start.every(x=>x>=0&&x<=1));
});
test('forest bark texture stays deterministic and original collision tree layout is untouched',()=>{
 const treeBefore=forestColliders();
 const a=forestBarkPixel(.322,.561),b=forestBarkPixel(.322,.561);
 assert.deepEqual(a,b);
 assert.equal(a.color[3],255);
 assert.equal(createForestLayout().trees.length,400);
 assert.deepEqual(forestColliders(),treeBefore);
});
test('live art roles are actually consumed across both spherical biomes',()=>{
 const targets=[
 ['../../landscape.js',/WORLD_ART_PALETTE/,/T\.trailSun/],
 ['../forest-ground-texture.js',/WORLD_ART_PALETTE/,/T\.forestTrailSun/],
 ['../start-zone.js',/WORLD_ART_VERTEX/,/V\.meadowTrail/],
 ['../whispering-forest.js',/WORLD_ART_PALETTE/,/C\.pineLower/,/C\.oakUpper/],
 ['../forest-ecology.js',/WORLD_ART_PALETTE/,/ART\.stone\.shade/],
 ['../forest-bark-texture.js',/WORLD_ART_PALETTE/,/ART\.wood\.albedo/],
 ['../painterly-biome.js',/WORLD_ART_PALETTE/,/ART\.flowers\.white/],
 ['../sphere-meadow.js',/WORLD_ART_VERTEX/,/V\.grassTip/],
 ['../planet.js',/WORLD_ART_PALETTE/,/ART\.light\.sun/],
 ['../terrain-art-materials.js',/ART_MATERIAL_SWATCHES/,/SWATCHES\[3\]/]
 ];
 for(const [file,...patterns] of targets){
  const content=read(file);
  for(const pattern of patterns)assert.match(content,pattern,file);
 }
 const planet=read('../planet.js');
 assert.match(planet,/new THREE\.PerspectiveCamera\(58, innerWidth \/ innerHeight, \.48, 1300\)/);
 assert.match(planet,/cameraPitch:previousWorld\?\.cameraPitch\?\?\.36/);
 assert.match(planet,/zoom:previousWorld\?\.zoom\?\?cameraSettings\?\.zoom\?\?13/);
 assert.match(planet,/referenceViewPose\(THREE,view/);
 assert.doesNotMatch(read('../world-art-style.js'),/fetch\(|WebSocket|localStorage/);
});
