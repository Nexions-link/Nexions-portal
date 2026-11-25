import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createForestPropContactField,forestPropContactFootprint} from '../../ops/forest-prop-contact.mjs';
import {createForestEcology,forestEcologyLayout} from '../forest-ecology.js';
import {forestShrubFamilyProfile} from '../forest-art-ecology.js';
import {forestContactLightAt} from '../forest-contact-light.js';
import {createForestLayout,forestColliders,FOREST_CAMP,FOREST_SITE_CLEARINGS,forestTrailLatitude} from '../whispering-forest.js';

const pointAt=(lon,lat)=>new THREE.Vector3(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon));
function offset(p,x,z,height=0){
 const normal=pointAt(p.lon,p.lat),east=new THREE.Vector3(p.ex,0,p.ez),north=new THREE.Vector3(p.nx,p.ny,p.nz);
 // Geodesic exponential map: changing terrain radius/height leaves the same
 // metre-sized footprint on the canonical sphere (height is radial only).
 const distance=Math.hypot(x,z),angle=distance/261;
 if(distance)normal.multiplyScalar(Math.cos(angle)).addScaledVector(east,Math.sin(angle)*x/distance)
  .addScaledVector(north,Math.sin(angle)*z/distance);
 normal.multiplyScalar(261+height).normalize();
 return [Math.atan2(normal.x,normal.z),Math.asin(normal.y)];
}

test('G29 every baked prop is actually visible in both balanced and high render prefixes',()=>{
 const field=createForestPropContactField(),layout=forestEcologyLayout();
 assert.equal(field.anchors.filter(p=>p.kind==='rock').length,Math.floor(layout.rocks.length*.65));
 let shrubs=0;
 for(const family of ['broad','lanceolate','toothed']){
  const count=layout.shrubs.filter(p=>forestShrubFamilyProfile(p.variation).family===family).length;
  const actual=field.anchors.filter(p=>p.kind==='shrub'&&p.family===family).length;
  assert.equal(actual,Math.floor(count*.65));shrubs+=actual;
 }
 assert.equal(field.anchors.length,Math.floor(layout.rocks.length*.65)+shrubs);
 const scene=new THREE.Scene(),ecology=createForestEcology(THREE,{scene,radius:261,heightAt:()=>0});
 const matrix=new THREE.Matrix4(),position=new THREE.Vector3();
 for(const quality of ['balanced','high']){
  ecology.setQuality(quality);
  for(const p of field.anchors){
   const mesh=scene.getObjectByName(p.kind==='rock'?'forest-stones':'forest-shrubs-'+p.family);
   let found=false;
   for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix).normalize();
    if(position.distanceTo(pointAt(p.lon,p.lat))<1e-6){found=true;break;}
   }
   assert.ok(found,quality+' baked anchor must have an existing visible prop');
  }
 }
});

test('G29 rotated irregular contacts are compact, continuous, bounded and radial-height independent',()=>{
 const field=createForestPropContactField();
 for(const kind of ['rock','shrub']){
  const p=field.anchors.find(p=>p.kind===kind&&p.lon>.7);
  const cap=kind==='rock'?.18:.09;
  assert.ok(p);assert.ok(p.reach<1.7);
  const center=forestPropContactFootprint(p,p.lon,p.lat);
  assert.ok(Math.abs(center-cap)<1e-7);
  const sides=[];
  for(let i=0;i<48;i++){
   const angle=i*Math.PI/24;
   const x=Math.cos(angle)*p.rx*.75,z=Math.sin(angle)*p.rz*.75;
   const unrotated=[x*p.cos-z*p.sin,x*p.sin+z*p.cos];
   const coord=offset(p,...unrotated),raised=offset(p,...unrotated,18);
   const sample=forestPropContactFootprint(p,...coord);
   assert.ok(sample>=0&&sample<=cap);sides.push(sample);
   assert.ok(Math.abs(sample-forestPropContactFootprint(p,...raised))<1e-10);
   const outside=offset(p,Math.cos(angle)*p.reach*1.1,Math.sin(angle)*p.reach*1.1);
   assert.equal(forestPropContactFootprint(p,...outside),0);
  }
  assert.ok(Math.max(...sides)-Math.min(...sides)>.003,'not a rotationally uniform dark disc');
  // No abrupt cutoff or black rim at the support boundary.
  const edge=offset(p,p.reach,0),nearEdge=offset(p,p.reach*.999,0);
  assert.ok(Math.abs(forestPropContactFootprint(p,...edge)-forestPropContactFootprint(p,...nearEdge))<.001);
 }
});

test('G29 road cores, worn surfaces, forest entrance and quest clearings stay clear',()=>{
 const field=createForestPropContactField();
 const visible=field.anchors.find(p=>field.sample(p.lon,p.lat)>.10);
 assert.ok(visible,'some visible rocks must acquire meaningful contact depth');
 const value=field.sample(visible.lon,visible.lat);
 assert.equal(field.sample(visible.lon,visible.lat,{roadWear:1}),0);
 assert.ok(field.sample(visible.lon,visible.lat,{roadWear:.5})<=value*.251);
 for(const p of [FOREST_CAMP,...FOREST_SITE_CLEARINGS])assert.equal(field.sample(p.lon,p.lat),0);
 for(let lon=.28;lon<1.5;lon+=.025)assert.equal(field.sample(lon,forestTrailLatitude(lon)),0);
 assert.equal(field.sample(.2,0),0);assert.equal(field.sample(NaN,0),0);
 for(const p of field.anchors){
  const value=field.sample(p.lon,p.lat);
  assert.ok(Number.isFinite(value)&&value>=0&&value<=.18);
 }
});

test('G29 offline field is deterministic and cannot alter layouts, colliders or the old tree light',()=>{
 const layout=forestEcologyLayout(),trees=createForestLayout(),colliders=forestColliders();
 const coords=trees.trees.slice(0,40).map(p=>[p.lon,p.lat]);
 const treeSamples=coords.map(p=>forestContactLightAt(...p));
 const a=createForestPropContactField(),b=createForestPropContactField();
 assert.deepEqual(a.anchors,b.anchors);assert.equal(Object.isFrozen(a.anchors),true);
 for(const p of a.anchors){assert.equal(Object.isFrozen(p),true);assert.equal(a.sample(p.lon,p.lat),b.sample(p.lon,p.lat));}
 assert.deepEqual(forestEcologyLayout(),layout);assert.deepEqual(createForestLayout(),trees);
 assert.deepEqual(forestColliders(),colliders);assert.deepEqual(coords.map(p=>forestContactLightAt(...p)),treeSamples);
 const ground=readFileSync(new URL('../forest-ground-texture.js',import.meta.url),'utf8');
 const contact=readFileSync(new URL('../forest-contact-light.js',import.meta.url),'utf8');
 assert.doesNotMatch(ground+contact,/forest-prop-contact|createForestPropContactField/);
 const helper=readFileSync(new URL('../../ops/forest-prop-contact.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(helper,/ShaderMaterial|new THREE\.|fetch\(|WebGLRenderTarget/);
});
