import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FOREST_SURFACE,forestSurfacePoint,forestSurfaceCoverage,forestSurfaceRecess} from '../forest-surface-profile.js';
import {createForestSurface,forestSurfaceGeometry,forestSurfacePixels,forestSurfacePixel} from '../forest-surface.js';
import {forestGroundPixel} from '../forest-ground-texture.js';
import {forestColliders} from '../whispering-forest.js';
import {createGlobeSurfaceSampler} from '../terrain-seam.js';
import {readFileSync} from 'node:fs';
const R=261;
const normal=(lon,lat)=>new THREE.Vector3(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon));
const heightAt=n=>Math.sin(n.x*9)*.6+Math.cos(n.y*11)*.4;
function globe(){
 const g=new THREE.SphereGeometry(R,180,112),p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const n=new THREE.Vector3().fromBufferAttribute(p,i).normalize();
  const recess=forestSurfaceRecess(Math.atan2(n.x,n.z),Math.asin(n.y));
  p.setXYZ(i,...n.multiplyScalar(R+heightAt(n)-recess).toArray());
 }
 return g;
}
test('forest coverage joins outside the starter seam and feathers at every edge',()=>{
 for(const [lon,lat] of [[0,0],[.22,0],[1.51,0],[.7,.6]])assert.equal(forestSurfaceCoverage(lon,lat),0);
 assert.equal(forestSurfaceCoverage(NaN,0),0);
 for(let a=-Math.PI;a<Math.PI;a+=.1){
  const d=89/R,n=new THREE.Vector3(Math.cos(a)*Math.sin(d),Math.sin(a)*Math.sin(d),Math.cos(d));
  assert.equal(forestSurfaceCoverage(Math.atan2(n.x,n.z),Math.asin(n.y)),0,'starter feather stays untouched');
 }
 for(let i=0;i<=50;i++)for(let j=0;j<=30;j++){
  const p=forestSurfacePoint(i/50,j/30),a=forestSurfaceCoverage(p.lon,p.lat);
  assert.ok(a>=0&&a<=1&&Number.isFinite(a));
 }
 assert.equal(forestSurfaceCoverage(.72,forestSurfacePoint((.72-.22)/1.29,.5).lat),1);
});
test('forest albedo has local UV density comparable with starter terrain and correct north/south orientation',()=>{
 assert.ok((FOREST_SURFACE.lonMax-FOREST_SURFACE.lonMin)*R/FOREST_SURFACE.textureWidth<.18);
 const w=32,h=16,data=forestSurfacePixels(w,h);
 assert.deepEqual(data,forestSurfacePixels(w,h));
 for(const [x,y] of [[0,0],[12,6],[31,15]]){
  const p=forestSurfacePoint((x+.5)/w,1-(y+.5)/h);
  assert.deepEqual([...data.slice((y*w+x)*4,(y*w+x)*4+4)],forestSurfacePixel(p.lon,p.lat));
 }
 assert.throws(()=>forestSurfacePixels(0,16),RangeError);
});
test('fine forest geometry follows actor height in the core and actual globe triangles at its boundary',()=>{
 const g=globe(),sampler=createGlobeSurfaceSampler(THREE,g);
 const mesh=forestSurfaceGeometry(THREE,{radius:R,heightAt,globeGeometry:g,columns:32,rows:16});
 const p=mesh.attributes.position,c=mesh.attributes.color,uv=mesh.attributes.uv;
 assert.equal(p.count,33*17);
 let cores=0,edges=0;
 for(let i=0;i<p.count;i++){
  const pos=new THREE.Vector3().fromBufferAttribute(p,i),n=pos.clone().normalize(),a=c.getW(i);
  assert.ok(pos.toArray().every(Number.isFinite));
  if(a===1){assert.ok(Math.abs(pos.length()-(R+heightAt(n)+.035))<.00004);cores++;}
  if(a===0){assert.ok(Math.abs(pos.length()-sampler.sample(n)-.018)<.00005);edges++;}
  assert.ok(uv.getX(i)>=0&&uv.getX(i)<=1&&uv.getY(i)>=0&&uv.getY(i)<=1);
 }
 assert.ok(cores>100&&edges>40);
 // The visible side faces outward; no flipped forest terrain triangles.
 const idx=mesh.index;
 for(let i=0;i<idx.count;i+=3){
  const a=new THREE.Vector3().fromBufferAttribute(p,idx.getX(i));
  const b=new THREE.Vector3().fromBufferAttribute(p,idx.getX(i+1));
  const d=new THREE.Vector3().fromBufferAttribute(p,idx.getX(i+2));
  assert.ok(b.sub(a).cross(d.sub(a)).dot(a)>0);
 }
});
test('surface receives true shadows, shares physical maps without mutating starter textures and has safe quality transitions',()=>{
 const before=forestColliders(),scene=new THREE.Scene();
 const surface=createForestSurface(THREE,{scene,radius:R,heightAt,globeGeometry:globe(),textureWidth:32,textureHeight:16});
 assert.equal(scene.children.length,1);assert.equal(surface.drawCalls,1);
 assert.equal(surface.material.isMeshStandardMaterial,true);
 surface.setSurfaceMaps(null,'balanced');
 assert.equal(surface.material.normalMap,null,'missing optional maps retain stock material');
 const source=new THREE.DataTexture(new Uint8Array(16),2,2,THREE.RGBAFormat);
 source.repeat.set(409,205);
 surface.setSurfaceMaps({normalGlobe:source,roughnessGlobe:source},'high');
 assert.notEqual(surface.material.normalMap,source);
 assert.deepEqual(source.repeat.toArray(),[409,205]);
 assert.ok(Math.abs(surface.material.normalMap.repeat.x-1.29*R/4)<1e-8);
 for(const q of ['balanced','high']){surface.setQuality(q);assert.equal(surface.mesh.receiveShadow,true);}
 surface.setQuality('economy');surface.setSurfaceMaps(null,'economy');
 assert.equal(surface.mesh.receiveShadow,false);assert.equal(surface.material.normalMap,null);
 surface.setQuality('high',true);assert.equal(surface.mesh.visible,false);
 surface.setQuality('high');assert.equal(surface.mesh.visible,true);
 assert.deepEqual(forestColliders(),before);
 const main=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(main,/ground\.receiveShadow=enabled/);
 assert.match(main,/catch\(error\)\{forestSurfaceActive=false;reshapeGround\(\);throw error;\}/);
 assert.match(main,/forestSurfaceActive!==wantForestSurface/,'base mode must restore the background globe');
});

test('forest turf keeps roads and survey clearings while mixing exposed soil with green cover',()=>{
 let green=0,brown=0;
 for(let lon=.42;lon<1.4;lon+=.037){
  const centre=forestSurfacePoint((lon-.22)/1.29,.5).lat;
  assert.deepEqual(forestSurfacePixel(lon,centre),forestGroundPixel(lon,centre),'path pigment stays shared');
  for(const metres of [-34,-18,-8,8,18,34]){
   const [r,g]=forestSurfacePixel(lon,centre+metres/261);
   if(g>r)green++;else brown++;
  }
 }
 assert.ok(green>20&&brown>20,'both turf/moss and exposed humus remain visible');
});

test('recess does not create a sunken belt under plants in the blended seam',()=>{
 for(let lon=.335;lon<.40;lon+=.0002){
  const {lat}=forestSurfacePoint((lon-.22)/1.29,.5);
  const a=forestSurfaceCoverage(lon,lat);
  const recess=forestSurfaceRecess(lon,lat);
  assert.ok(recess*(1-a)<.055,'feather can never sink 40 cm under grass');
 }
});
