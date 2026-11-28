import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createCanvas} from '@napi-rs/canvas';
import * as THREE from 'three';
import {createTentCanopyGeometry,paintTentHide,tentHidePixel} from '../tent-canopy-art.js';
import {createStartZone} from '../start-zone.js';
import {GRAPHICS_PRESETS,graphicsDensity} from '../graphics-quality.js';
import {canWalkCamp} from '../sphere-physics.js';
import {installDom} from './harness.mjs';

const TAU=Math.PI*2,radii=[4.2,3.8,3.4,3];
const layout=[[11,-7,4.2,-.5],[-15,12,3.8,2.2],[13,16,3.4,-1.7],[-23,-15,3,.5]];
const hash=array=>createHash('sha256').update(new Uint8Array(array.buffer,array.byteOffset,array.byteLength)).digest('hex');
const close=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const pixelHash=canvas=>hash(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data);
const isCanopy=mesh=>mesh.geometry.type==='ConeGeometry'&&radii.includes(mesh.geometry.parameters?.radius)&&
 Math.abs(mesh.geometry.parameters.height-mesh.geometry.parameters.radius*1.42)<1e-8;
// Frozen from actual c20e04d main20, independently loaded from its Git source.
// Every non-canopy mesh participates, including terrain colour and later seeded
// props: an accidental change to the shared 3600-draw cursor changes this digest.
const ORIGINAL_PROTECTED={
 170:'360defded692d76cda14bd6cca7da08523e8f06a31556c0bfeff3b09fa972fdf',
 261:'71106763dc7f41176579a9d8e4441c7392931ecb5ab084efd5d3882af7bfa0e8',
 510:'c7872076b7068e7fd817875076cba4e2b423fed8713fa9d29cd42fede780dedf'
};
function protectedScene(scene){
 const digest=createHash('sha256');let count=0;
 scene.traverse(mesh=>{
  if(!mesh.isMesh||isCanopy(mesh))return;count++;
  for(const [name,attribute] of Object.entries(mesh.geometry.attributes)){
   digest.update(name);digest.update(new Uint8Array(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));
  }
  for(const attribute of [mesh.geometry.index,mesh.instanceMatrix,mesh.instanceColor])if(attribute)
   digest.update(new Uint8Array(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));
  digest.update(JSON.stringify([...mesh.position.toArray(),...mesh.quaternion.toArray(),...mesh.scale.toArray()]
   .map(value=>Math.round(value*1e9)/1e9)));
 });
 return {count,sha256:digest.digest('hex')};
}
function resources(scene){
 const meshes=[],geometries=new Set(),materials=new Set(),textures=new Set();
 scene.traverse(mesh=>{
  if(mesh.isMesh)meshes.push(mesh);
  if(mesh.geometry)geometries.add(mesh.geometry);
  for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(material){
   materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
  }
 });
 return {meshes,geometries,materials,textures};
}

test('original hide pigments are opaque, periodic, deterministic and readable after coarse filtering',()=>{
 for(const [u,v] of [[0,0],[.18,.46],[.64,.727],[-.34,.91]]){
  const pixel=tentHidePixel(u,v);assert.equal(pixel[3],255);
  assert.ok(pixel.every(x=>Number.isInteger(x)&&x>=0&&x<=255));
  assert.deepEqual(tentHidePixel(u+1,v),pixel);
  assert.deepEqual(tentHidePixel(u-2,v),pixel);
 }
 for(const v of [0,.13,.4,.64,.727,1]){
  const a=tentHidePixel(-1e-8,v),b=tentHidePixel(1e-8,v);
  a.forEach((x,i)=>assert.ok(Math.abs(x-b[i])<=1));
 }
 const canvas=createCanvas(128,128),context=canvas.getContext('2d');
 context.fillStyle='red';context.fillRect(0,0,128,128);
 paintTentHide(context);const first=pixelHash(canvas);paintTentHide(context);
 assert.equal(pixelHash(canvas),first);assert.equal(context.canvas,canvas);
 const pixels=context.getImageData(0,0,128,128).data;
 for(let i=3;i<pixels.length;i+=4)assert.equal(pixels[i],255);
 const blocks=[];
 for(let by=0;by<16;by++)for(let bx=0;bx<16;bx++){
  let sum=0;for(let y=by*8;y<(by+1)*8;y++)for(let x=bx*8;x<(bx+1)*8;x++)
   sum+=pixels[(y*128+x)*4]*.2126+pixels[(y*128+x)*4+1]*.7152+pixels[(y*128+x)*4+2]*.0722;
  blocks.push(sum/64);
 }
 assert.ok(Math.max(...blocks)-Math.min(...blocks)>65,'painted masses must survive phone-distance mipmapping');
 assert.ok(tentHidePixel(.125,.727)[0]>tentHidePixel(.17,.727)[0],'lozenge has an original warm inset');
 assert.throws(()=>tentHidePixel(NaN,0),TypeError);
 assert.throws(()=>createTentCanopyGeometry(THREE,0),RangeError);
});

test('middle cloth ring reuses exactly42 indexed triangles and preserves old base, apex and UV scheme',()=>{
 for(const r of radii){
  const geometry=createTentCanopyGeometry(THREE,r),old=new THREE.ConeGeometry(r,r*1.42,14);
  const regular=new THREE.ConeGeometry(r,r*1.42,14,2,true),p=geometry.attributes.position,n=geometry.attributes.normal;
  assert.equal(p.count,45);assert.equal(geometry.index.count,old.index.count);assert.equal(geometry.index.count/3,42);
  assert.equal(p.array.byteLength+n.array.byteLength+geometry.attributes.uv.array.byteLength,
   (45*8)*4,'fewer vertex bytes than the original59-vertex cone');
  assert.deepEqual([...geometry.attributes.uv.array],[...regular.attributes.uv.array]);
  for(let i=0;i<45;i++){
   const base=i>=30,apex=i<15;
   if(base||apex){
    const oi=base?i-15:i;
    for(let axis=0;axis<3;axis++)assert.equal(p.array[i*3+axis],old.attributes.position.array[oi*3+axis]);
   }else{
    const delta=Math.hypot(p.getX(i),p.getZ(i))-Math.hypot(regular.attributes.position.getX(i),regular.attributes.position.getZ(i));
    assert.ok(delta>=0&&delta<=r*.012+1e-6);assert.equal(p.getY(i),0);
   }
   close(Math.hypot(n.getX(i),n.getY(i),n.getZ(i)),1);
  }
  for(const [a,b] of [[0,14],[15,29],[30,44]])for(let axis=0;axis<3;axis++){
   close(p.array[a*3+axis],p.array[b*3+axis]);close(n.array[a*3+axis],n.array[b*3+axis]);
  }
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),centre=new THREE.Vector3();
  for(let i=0;i<geometry.index.count;i+=3){
   a.fromBufferAttribute(p,geometry.index.getX(i));b.fromBufferAttribute(p,geometry.index.getX(i+1));c.fromBufferAttribute(p,geometry.index.getX(i+2));
   centre.copy(a).add(b).add(c).multiplyScalar(1/3);centre.y=0;
   const normal=b.sub(a).cross(c.sub(a));assert.ok(normal.lengthSq()>1e-12);assert.ok(normal.dot(centre)>0);
  }
 }
});

test('actual cloth triangles remain inside all nine visible stitch lines and outside the old cone envelope',()=>{
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),ray=new THREE.Raycaster();
 const surface=(mesh,r,angle,height)=>{
  const d=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
  const origin=d.clone().multiplyScalar(2*r);origin.y=height*r;ray.set(origin,d.negate());
  const hit=ray.intersectObject(mesh)[0];assert.ok(hit,'cloth side must have no open seam');
  return Math.hypot(hit.point.x,hit.point.z);
 };
 for(const r of radii){
  const mesh=new THREE.Mesh(createTentCanopyGeometry(THREE,r),material);
  const old=new THREE.Mesh(new THREE.ConeGeometry(r,r*1.42,14),material);
  for(const m of [mesh,old]){m.position.y=r*.71;m.updateMatrixWorld();}
  for(let i=0;i<9;i++)for(let j=0;j<=40;j++){
   const h=.08+(1.4-.08)*j/40,t=(h-.08)/(1.445-.08);
   const cloth=surface(mesh,r,i*TAU/9,h),threadCentre=.957*r*(1-t);
   assert.ok(threadCentre-cloth>.009,'stitch centreline and outward thread side remain visible');
  }
  for(let i=0;i<112;i++)for(const h of [.08,.25,.5,.71,.95,1.2,1.4]){
   const angle=(i+.371)*TAU/112;
   assert.ok(surface(mesh,r,angle,h)>=surface(old,r,angle,h)-1e-6,'new cloth cannot retreat inside the old obstacle');
  }
 }
});

for(const R of [170,261,510])test(`R${R} keeps every non-canopy buffer, downstream seeded prop and original rim unchanged`,()=>{
 installDom();const scene=new THREE.Scene();createStartZone(THREE,scene,()=>R,()=>0);
 assert.deepEqual(protectedScene(scene),{count:383,sha256:ORIGINAL_PROTECTED[R]});
 const all=resources(scene),tents=scene.children.filter(g=>g.name==='camp-hide-tent');
 assert.equal(tents.length,4);
 // Include the pre-existing Sprite's geometry/material/map, as the renderer
 // does; a mesh-only traversal instead reports 383/78/5.
 assert.deepEqual([all.meshes.length,all.geometries.size,all.materials.size,all.textures.size],[387,384,79,6]);
 const maps=new Set(),materials=new Set();let triangles=0;
 for(const [i,tent] of tents.entries()){
  const cone=tent.getObjectByName('camp-tent-canopy'),rim=tent.getObjectByName('camp-tent-rim'),r=cone.geometry.parameters.radius;
  const [x,z,radius,yaw]=layout[i],distance=Math.hypot(x,z),s=Math.sin(distance/R)/distance;
  const normal=new THREE.Vector3(x*s,z*s,Math.cos(distance/R));
  const position=normal.clone().multiplyScalar(R+.06);
  const rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal)
   .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw));
  assert.equal(r,radius);assert.equal(tent.parent,scene);
  tent.position.toArray().forEach((v,k)=>close(v,position.toArray()[k]));
  tent.quaternion.toArray().forEach((v,k)=>close(v,rotation.toArray()[k]));
  assert.deepEqual(tent.scale.toArray(),[1,1,1]);
  for(const surface of [cone,rim]){maps.add(surface.material.map);materials.add(surface.material);triangles+=surface.geometry.index.count/3;
   assert.equal(surface.material.vertexColors,false);assert.equal(surface.material.transparent,false);assert.equal(surface.material.side,THREE.DoubleSide);
   assert.equal(surface.material.opacity,1);assert.equal(surface.material.depthWrite,true);assert.equal(surface.material.alphaTest,0);
   assert.equal(surface.material.roughness,1);assert.equal(surface.material.flatShading,true);assert.equal(surface.material.color.getHexString(),'e0c899');}
  const original=new THREE.CylinderGeometry(r,r,.49,14);
  for(const key of ['position','normal','uv'])assert.equal(hash(rim.geometry.attributes[key].array),hash(original.attributes[key].array));
  assert.equal(hash(rim.geometry.index.array),hash(original.index.array));
  assert.deepEqual(rim.position.toArray(),[0,.24,0]);assert.deepEqual(cone.position.toArray(),[0,r*.71,0]);
 }
 assert.equal(triangles,392);assert.equal(maps.size,1);assert.equal(materials.size,2);
 const map=[...maps][0];assert.equal(map.image.width,128);assert.equal(map.image.height,128);
 assert.deepEqual(map.repeat.toArray(),[3,1]);assert.equal(map.wrapS,THREE.RepeatWrapping);
 assert.equal(map.wrapT,THREE.ClampToEdgeWrapping);assert.equal(map.colorSpace,THREE.SRGBColorSpace);
 assert.equal(map.flipY,true);assert.equal(map.generateMipmaps,true);assert.equal(map.version,1);
 assert.equal(map.magFilter,THREE.LinearFilter);assert.equal(map.minFilter,THREE.LinearMipmapLinearFilter);
 assert.equal(map.format,THREE.RGBAFormat);assert.equal(map.type,THREE.UnsignedByteType);
 assert.equal(map.premultiplyAlpha,false);assert.deepEqual(map.offset.toArray(),[0,0]);
});

test('canopies keep pixels, materials, topology and physics static through quality, radius and animation changes',()=>{
 installDom();let R=261;const scene=new THREE.Scene(),zone=createStartZone(THREE,scene,()=>R,()=>0);
 const tents=scene.children.filter(g=>g.name==='camp-hide-tent'),surfaces=tents.flatMap(g=>g.children.filter(m=>m.isMesh));
 const snapshot=surfaces.map(m=>({m,material:m.material,map:m.material.map,geometry:m.geometry,
  attributes:Object.fromEntries(Object.entries(m.geometry.attributes).map(([k,v])=>[k,hash(v.array)])),
  index:hash(m.geometry.index.array),instances:m.instanceMatrix?hash(m.instanceMatrix.array):null,
  local:[...m.position.toArray(),...m.quaternion.toArray(),...m.scale.toArray()]}));
 const map=tents[0].getObjectByName('camp-tent-canopy').material.map,canvas=map.image,version=map.version,pixels=pixelHash(canvas);
 const collision=[];for(const [x,z] of [[11,-7],[-15,12],[13,16],[-23,-15],[0,0],[11,-13],[11,-3]])collision.push(canWalkCamp(x,z));
 assert.deepEqual(collision,[false,false,false,false,true,true,false]);
 for(const radius of [170,261,510]){R=radius;zone.rebuild();
  for(const [quality,preset] of Object.entries(GRAPHICS_PRESETS)){
   zone.setGraphics({...graphicsDensity(quality),waterColor:preset.waterColor,shadows:preset.shadowSize>0});
   for(let i=0;i<100;i++)zone.animate(i/30);
   for(const s of snapshot){assert.equal(s.m.material,s.material);assert.equal(s.m.material.map,s.map);assert.equal(s.m.geometry,s.geometry);
    for(const [k,v] of Object.entries(s.m.geometry.attributes))assert.equal(hash(v.array),s.attributes[k]);
    assert.equal(hash(s.m.geometry.index.array),s.index);assert.equal(s.m.instanceMatrix?hash(s.m.instanceMatrix.array):null,s.instances);
    assert.deepEqual([...s.m.position.toArray(),...s.m.quaternion.toArray(),...s.m.scale.toArray()],s.local);}
   assert.equal(map.image,canvas);assert.equal(map.version,version);assert.equal(pixelHash(canvas),pixels);
  }
 }
 assert.deepEqual([[11,-7],[-15,12],[13,16],[-23,-15],[0,0],[11,-13],[11,-3]].map(([x,z])=>canWalkCamp(x,z)),collision);
 const source=readFileSync(new URL('../start-zone.js',import.meta.url),'utf8');
 assert.match(source,/for\(let i=0;i<900;i\+\+\)\{c.fillStyle=rand\(\)>\.5[\s\S]*?c.fillRect\(rand\(\)\*s,rand\(\)\*s,rand\(\)\*12,1\)\}/);
 assert.match(source,/paintTentHide\(c,s\)\}\);/);
});
