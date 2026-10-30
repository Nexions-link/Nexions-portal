import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {painterlyBiomeLayout,painterlyBiomeBudget,painterlyPlantGeometryData,
 PAINTERLY_BIOME_CAPS} from '../painterly-biome.js';
import {blendBiomeSoilAt} from '../start-zone.js';
import {forestGroundPixel,forestTextureMask} from '../forest-ground-texture.js';
import {forestTrailLatitude,forestColliders} from '../whispering-forest.js';
import {landscapeGroundPixel} from '../../landscape.js';

test('painterly foliage stays deterministic without altering collision definitions',()=>{
 const before=forestColliders(),a=painterlyBiomeLayout(),b=painterlyBiomeLayout();
 assert.deepEqual(a,b);
 for(const [kind,cap] of Object.entries(PAINTERLY_BIOME_CAPS)){
  assert.ok(a[kind].length>cap*.75,kind+' should fill most of the intended budget');
  assert.ok(a[kind].every(p=>p.zone==='start'||p.zone==='forest'));
  assert.ok(a[kind].every(p=>p.size>0&&Number.isFinite(p.yaw)));
 }
 assert.deepEqual(forestColliders(),before);
});

test('all plants are true 3D procedural shapes, with a soft-alpha light layer',()=>{
 for(const kind of Object.keys(PAINTERLY_BIOME_CAPS)){
  const v=painterlyPlantGeometryData(kind);
  assert.ok(v.positions.length>90,kind);
  assert.equal(v.positions.length%3,0);
  assert.equal(v.colors.length,v.positions.length/3*(v.alpha?4:3));
  assert.ok(v.positions.every(Number.isFinite));
  assert.ok(v.colors.every(Number.isFinite));
  if(kind!=='sunflecks')assert.ok(v.positions.some((q,i)=>i%3===1&&q>.25),kind+' must have geometry above ground');
 }
});
test('graphics presets retain a budgeted scene with a full high-density option',()=>{
 const high=painterlyBiomeBudget('high'),balanced=painterlyBiomeBudget('balanced'),
  low=painterlyBiomeBudget('economy'),preview=painterlyBiomeBudget('high',true);
 assert.equal(high.groundcover,PAINTERLY_BIOME_CAPS.groundcover);
 for(const kind of Object.keys(high)){
  assert.ok(high[kind]>balanced[kind]&&balanced[kind]>low[kind]);
  assert.equal(preview[kind],0);
 }
});

test('meadow forest entrance shares the actual forest baked soil near the outer rim',()=>{
 const x=83,z=-8,d=Math.hypot(x,z),k=Math.sin(d/261)/d;
 const lon=Math.atan2(x*k,Math.cos(d/261)),lat=Math.asin(z*k);
 assert.ok(forestTextureMask(lon,lat)>.9);
 const base=landscapeGroundPixel(x,z);
 const blended=blendBiomeSoilAt(x,z,base);
 const reference=forestGroundPixel(lon,lat);
 assert.ok(blended.every((v,i)=>i===3||Math.abs(v-reference[i])<12));
 assert.deepEqual(blendBiomeSoilAt(3,12,base),base);
 assert.deepEqual(blendBiomeSoilAt(-83,-8,base),base);
 assert.equal(blended[3],255);
 // At the beginning of the forest connector, the join remains gradual.
 const near=blendBiomeSoilAt(52,-8,base);
 assert.ok(near.every(Number.isFinite));
 assert.ok(forestTrailLatitude(lon)<.1);
});

test('world actually enables the botanical batches and preserves the opaque globe',()=>{
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(planet,/createPainterlyBiome\(THREE,/);
 assert.match(planet,/painterlyBiome\?\.setQuality/);
 assert.match(planet,/map:groundTexture,vertexColors:true/);
 assert.match(planet,/transparent:false,depthWrite:true/);
});
