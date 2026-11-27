import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {installDom} from './harness.mjs';
import {createStartZone,localToNormal} from '../start-zone.js';
import {VALLEY_MESAS,VALLEY_ROCKS,blocksRockOrMesa} from '../planet-landmarks.js';
import {valleyStoneVertex,sculptValleyStoneGeometry,createValleyStoneGeometry} from '../valley-stone-sculpt.js';

const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
const source=kind=>kind==='boulders'?new THREE.DodecahedronGeometry(1,0):
 kind==='base'?new THREE.CylinderGeometry(.8,1,1,8):
 kind==='cap'?new THREE.CylinderGeometry(.82,.85,1,8):new THREE.CylinderGeometry(.76,.82,1,8);
const kinds=['base','cap','grass','boulders'];
const triangles=g=>(g.index?.count??g.attributes.position.count)/3;
function ring(g,y,scale=1){
 const p=g.attributes.position,points=new Map();
 for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i)-y)<1e-6&&Math.hypot(p.getX(i),p.getZ(i))>.1){
  const x=p.getX(i)*scale,z=p.getZ(i)*scale;
  points.set(x.toFixed(6)+':'+z.toFixed(6),[x,z]);
 }
 return [...points.values()].sort((a,b)=>Math.atan2(a[0],a[1])-Math.atan2(b[0],b[1]));
}
function edgeDistance(a,b){return Math.abs(a[0]*b[1]-a[1]*b[0])/Math.hypot(b[0]-a[0],b[1]-a[1]);}
function insideConvex(point,polygon){
 let sign=0;
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length];
  const cross=(b[0]-a[0])*(point[1]-a[1])-(b[1]-a[1])*(point[0]-a[0]);
  if(Math.abs(cross)<1e-6)continue;
  if(sign&&Math.sign(cross)!==sign)return false;
  sign=Math.sign(cross);
 }
 return true;
}

test('sandstone keeps the exact old topology and UVs without mutating its source',()=>{
 for(const kind of kinds){
  const old=source(kind),positions=Array.from(old.attributes.position.array),indices=old.index&&Array.from(old.index.array);
  const g=sculptValleyStoneGeometry(THREE,old,kind),p=g.attributes.position;
  assert.notEqual(g,old);assert.equal(p.count,old.attributes.position.count);
  assert.deepEqual(g.index&&Array.from(g.index.array),indices);
  assert.deepEqual(g.groups,old.groups);assert.deepEqual(Array.from(g.attributes.uv.array),Array.from(old.attributes.uv.array));
  assert.deepEqual(Array.from(old.attributes.position.array),positions);
  assert.equal(old.attributes.color,undefined);assert.equal(triangles(g),kind==='boulders'?36:32);
  assert.equal(g.attributes.color.itemSize,3);assert.equal(g.attributes.color.count,p.count);
  assert.ok(Array.from(p.array).every(Number.isFinite));assert.ok(Array.from(g.attributes.normal.array).every(Number.isFinite));
  for(let i=0;i<p.count;i++)near(p.getY(i),old.attributes.position.getY(i));
  assert.deepEqual(Array.from(createValleyStoneGeometry(THREE,kind).attributes.position.array),Array.from(p.array));
 }
});

test('side, cap and face duplicate vertices stay joined after the sculpt',()=>{
 for(const kind of kinds){
  const old=source(kind),g=createValleyStoneGeometry(THREE,kind),seen=new Map(),p=old.attributes.position,q=g.attributes.position;
  let duplicates=0;
  for(let i=0;i<p.count;i++){
   const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(5)).join(':');
   const value=[q.getX(i),q.getY(i),q.getZ(i)];
   if(seen.has(key)){duplicates++;seen.get(key).forEach((v,j)=>near(v,value[j],1e-6));}
   else seen.set(key,value);
  }
  assert.ok(duplicates>10);
 }
});

test('every mesa side section covers the unchanged radius .85 collider within the old unit envelope',()=>{
 const g=createValleyStoneGeometry(THREE,'base'),top=ring(g,.5),bottom=ring(g,-.5);
 assert.equal(top.length,8);assert.equal(bottom.length,8);
 // Match each lower corner to its nearby upper corner. No extra height rings
 // are invented: interpolation follows the original side edges.
 const pairs=bottom.map(a=>[a,top.reduce((best,b)=>
  Math.hypot(b[0]-a[0],b[1]-a[1])<Math.hypot(best[0]-a[0],best[1]-a[1])?b:best,top[0])]);
 let minDistance=Infinity;
 for(let step=0;step<=100;step++){
  const t=step/100,section=pairs.map(([a,b])=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
  for(let i=0;i<section.length;i++){
   const point=section[i];assert.ok(Math.hypot(...point)<=1.000001);
   const distance=edgeDistance(point,section[(i+1)%section.length]);minDistance=Math.min(minDistance,distance);
   assert.ok(distance>=.85,'the visible scarp must cover its unchanged circle collider');
  }
 }
 assert.ok(minDistance>.89);assert.ok(new Set(top.map(p=>Math.hypot(...p).toFixed(4))).size>=5,'not a regular octagonal tube');
});

test('the old three vertical layers overlap and remain nested without cap gaps',()=>{
 const base=createValleyStoneGeometry(THREE,'base'),cap=createValleyStoneGeometry(THREE,'cap'),grass=createValleyStoneGeometry(THREE,'grass');
 for(const point of ring(cap,-.5,.85))assert.ok(insideConvex(point,ring(base,.5)));
 for(const point of ring(grass,-.5,.76))assert.ok(insideConvex(point,ring(cap,.5,.85)));
 for(const mesa of VALLEY_MESAS){
  const baseTop=mesa.height/2-2+.5*mesa.height;
  const capBottom=mesa.height-2.8-.5*2.3,capTop=mesa.height-2.8+.5*2.3;
  const grassBottom=mesa.height-1-.5*1.3;
  assert.ok(capBottom<baseTop);near(capTop,grassBottom);
 }
});

test('boulder ray sections do not recede from the legacy contour at any gameplay height',()=>{
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 const before=new THREE.Mesh(source('boulders'),material),after=new THREE.Mesh(createValleyStoneGeometry(THREE,'boulders'),material);
 for(const mesh of [before,after]){mesh.scale.set(1,.7,.9);mesh.position.y=.34;mesh.updateMatrixWorld(true);}
 const ray=new THREE.Raycaster(),origin=new THREE.Vector3(),direction=new THREE.Vector3();
 for(let h=0;h<=20;h++)for(let a=0;a<180;a++){
  origin.set(0,h*.7/20,0);direction.set(Math.sin(a*Math.PI/90),0,Math.cos(a*Math.PI/90));ray.set(origin,direction);
  const oldHit=ray.intersectObject(before,false)[0],newHit=ray.intersectObject(after,false)[0];
  assert.ok(oldHit&&newHit);assert.ok(newHit.distance>=oldHit.distance-1e-6,'unchanged collider must not gain an invisible band');
 }
});

test('painted facets have finite bounded colours, both warm and cool patches, and lighter upper scars',()=>{
 for(const kind of kinds){
  const a=createValleyStoneGeometry(THREE,kind),b=createValleyStoneGeometry(THREE,kind),c=a.attributes.color,p=a.attributes.position;
  assert.deepEqual(Array.from(c.array),Array.from(b.attributes.color.array));
  assert.ok(Array.from(c.array).every(v=>Number.isFinite(v)&&v>=0&&v<=1));
  assert.ok(Math.max(...c.array)-Math.min(...c.array)>.2);
  if(kind==='base'||kind==='boulders'){
   let warm=false,cool=false;
   for(let i=0;i<c.count;i++){warm||=c.getX(i)>c.getZ(i);cool||=c.getZ(i)>c.getX(i);}
   assert.ok(warm&&cool);
  }
  if(kind==='base'){
   const light=y=>{let sum=0,n=0;for(let i=0;i<c.count;i++)if(p.getY(i)===y){sum+=c.getX(i)+c.getY(i)+c.getZ(i);n++;}return sum/n;};
   assert.ok(light(.5)>light(-.5)+.08);
  }
 }
 assert.throws(()=>valleyStoneVertex('toString',0,0,0),RangeError);
 assert.throws(()=>createValleyStoneGeometry(THREE,'missing'),RangeError);
 assert.throws(()=>valleyStoneVertex('base',NaN,0,0),RangeError);
});

test('real zone keeps four unchanged static batches, shared material fallbacks and spherical instance transforms',()=>{
 installDom();let radius=261;
 const scene=new THREE.Scene(),heightAt=n=>.3*Math.sin(n.x*13)+.2*n.y;
 const oldLayout=structuredClone({mesas:VALLEY_MESAS,rocks:VALLEY_ROCKS});
 const zone=createStartZone(THREE,scene,()=>radius,heightAt),batches=kinds.map(kind=>scene.children.find(o=>o.geometry?.name===(kind==='boulders'?'valley-boulders':'valley-mesa-'+kind)));
 assert.ok(batches.every(Boolean));assert.equal(new Set(batches.map(o=>o.material)).size,4);
 const oldPositions=batches.map(o=>Array.from(o.geometry.attributes.position.array));
 const expectedCount=[25,25,25,38],matrix=new THREE.Matrix4(),up=new THREE.Vector3(0,1,0),dummy=new THREE.Object3D();
 for(const r of [261,170,510]){
  radius=r;zone.rebuild();zone.animate(2);zone.setGraphics({detail:.68,reeds:.82,shimmer:.3,shadows:false});
  for(const [index,batch] of batches.entries()){
   assert.ok(batch.isInstancedMesh);assert.equal(batch.count,expectedCount[index]);
   assert.equal(batch.frustumCulled,false);assert.equal(batch.castShadow,false);
   assert.equal(batch.material.vertexColors,true);assert.deepEqual(batch.material.defaultAttributeValues,{color:[1,1,1]});
   assert.equal(batch.material.map,null);assert.equal(batch.material.transparent,false);
   assert.deepEqual(Array.from(batch.geometry.attributes.position.array),oldPositions[index]);
   for(const [i,item] of (index===3?VALLEY_ROCKS:VALLEY_MESAS).entries()){
    const size=item.radius/.7,offset=index===0?item.height/2-2:index===1?item.height-2.8:index===2?item.height-1:size*.34;
    const scale=index===0?[item.radius,item.height,item.radius]:index===1?[item.radius*.85,2.3,item.radius*.85]:index===2?[item.radius*.76,1.3,item.radius*.76]:[size,size*.7,size*.9];
    const n=localToNormal(item.x,item.z,radius);
    dummy.position.copy(n).multiplyScalar(radius+heightAt(n)+offset);
    dummy.quaternion.setFromUnitVectors(up,n).multiply(new THREE.Quaternion().setFromAxisAngle(up,item.spin));
    dummy.scale.set(...scale);dummy.updateMatrix();batch.getMatrixAt(i,matrix);
    assert.deepEqual(Array.from(new Float32Array(matrix.elements)),Array.from(new Float32Array(dummy.matrix.elements)));
   }
  }
 }
 // Shared leaf/rock materials are also used by old uncoloured village props;
 // the explicit white fallback preserves their colours without extra buffers.
 for(const batch of [batches[2],batches[3]]){
  let oldProp=false;
  scene.traverse(o=>{if(o!==batch&&o.material===batch.material&&!o.geometry.attributes.color)oldProp=true;});
  assert.ok(oldProp);
 }
 assert.deepEqual({mesas:VALLEY_MESAS,rocks:VALLEY_ROCKS},oldLayout);
 for(const item of [...VALLEY_MESAS,...VALLEY_ROCKS])assert.equal(blocksRockOrMesa(item.x,item.z,0,0),true);
 assert.equal(batches.reduce((n,o)=>n+triangles(o.geometry)*o.count,0),3768);
});
