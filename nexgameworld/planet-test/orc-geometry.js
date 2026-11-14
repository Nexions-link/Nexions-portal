// Original sculpted profiles and rigid surface batching for the orc rig.
// Static artwork is cached; articulated shoulder/elbow/hand joints stay separate.
import {createSmoothActorForm} from './smooth-actor-geometry.js';
const caches=new WeakMap();
const cacheFor=THREE=>{
 if(!caches.has(THREE))caches.set(THREE,new Map());
 return caches.get(THREE);
};
export function orcProfile(THREE,name,rings,{segments=24,power=.82,sculpt=null,shade=null}={}){
 const cache=cacheFor(THREE),key='profile:'+name;
 if(cache.has(key))return cache.get(key);
 // Authors describe limbs from shoulder to wrist, while the shared loft's
 // winding expects bottom-to-top rows. Normalize without mutating the rig data.
 const ordered=rings[0][0]>rings.at(-1)[0]?[...rings].reverse():rings;
 const g=createSmoothActorForm(THREE,ordered,{segments,power}).clone();
 g.name='NGW orc '+name;
 const p=g.attributes.position,colors=[];
 for(let i=0;i<p.count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  if(sculpt)[x,y,z]=sculpt(x,y,z);
  p.setXYZ(i,x,y,z);
  const front=Math.max(0,z),tone=(.88+.095*Math.min(1,front*2)+.035*Math.sin(y*2.7))*(shade?shade(x,y,z):1);
  colors.push(tone,tone*.994,tone*.965);
 }
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.computeVertexNormals();
 const normal=g.attributes.normal,v=new THREE.Vector3(),other=new THREE.Vector3();
 const sideRows=(ordered.length-1)*3+1;
 for(let row=0;row<sideRows;row++){
  const a=row*(segments+1),b=a+segments;
  v.fromBufferAttribute(normal,a).add(other.fromBufferAttribute(normal,b)).normalize();
  normal.setXYZ(a,v.x,v.y,v.z);normal.setXYZ(b,v.x,v.y,v.z);
 }
 g.computeBoundingSphere();g.userData.actorShared=true;
 cache.set(key,g);return g;
}
export function orcCurve(THREE,name,points,radii,{sides=9}={}){
 const cache=cacheFor(THREE),key='curve:'+name;
 if(cache.has(key))return cache.get(key);
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const count=Math.max(8,(points.length-1)*4),frames=curve.computeFrenetFrames(count,false);
 const positions=[],uv=[],indices=[];
 for(let j=0;j<=count;j++){
  const t=j/count,u=t*(radii.length-1),k=Math.min(radii.length-2,Math.floor(u));
  const r=radii[k]+(radii[k+1]-radii[k])*(u-k),center=curve.getPointAt(t);
  for(let i=0;i<=sides;i++){
   const angle=i/sides*Math.PI*2;
   const point=center.clone().addScaledVector(frames.normals[j],Math.cos(angle)*r)
    .addScaledVector(frames.binormals[j],Math.sin(angle)*r);
   positions.push(...point.toArray());uv.push(i/sides,t);
   if(j<count&&i<sides){const a=j*(sides+1)+i,b=a+sides+1;indices.push(a,a+1,b,b,a+1,b+1);}
  }
 }
 const g=new THREE.BufferGeometry();g.name='NGW orc '+name;
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);
 g.computeVertexNormals();g.computeBoundingSphere();g.userData.actorShared=true;
 cache.set(key,g);return g;
}
export function orcPlate(THREE,name,outline,depth=.04){
 const cache=cacheFor(THREE),key='plate:'+name;
 if(cache.has(key))return cache.get(key);
 const shape=new THREE.Shape();outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.018,bevelThickness:.012,bevelSegments:2,steps:1});
 g.name='NGW orc '+name;g.computeBoundingSphere();g.userData.actorShared=true;
 cache.set(key,g);return g;
}
export function orcRibbon(THREE,name,points,width=.18,depth=.035){
 const cache=cacheFor(THREE),key='ribbon:'+name;
 if(cache.has(key))return cache.get(key);
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const positions=[],uv=[],indices=[],count=20;
 for(let j=0;j<=count;j++){
  const t=j/count,center=curve.getPoint(t),tangent=curve.getTangent(t);
  const across=new THREE.Vector3(tangent.y,-tangent.x,0).normalize();
  for(const [s,z] of [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]]){
   const v=center.clone().addScaledVector(across,s*width/2);v.z+=z*depth/2;
   positions.push(...v.toArray());uv.push((s+1)/2,t);
  }
  if(j<count)for(let i=0;i<4;i++){const a=j*5+i,b=a+5;indices.push(a,b,a+1,b,b+1,a+1);}
 }
 const g=new THREE.BufferGeometry();g.name='NGW orc '+name;
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);
 g.computeVertexNormals();g.computeBoundingSphere();g.userData.actorShared=true;cache.set(key,g);return g;
}
export function batchOrcJoint(THREE,joint){
 joint.updateWorldMatrix(true,true);
 const inverse=joint.matrixWorld.clone().invert(),buckets=new Map();
 const visit=node=>{
  if(node!==joint&&node.userData.orcJoint)return;
  if(node.isMesh&&!Array.isArray(node.material)){
   if(!buckets.has(node.material))buckets.set(node.material,[]);
   buckets.get(node.material).push(node);
  }
  for(const child of [...node.children])visit(child);
 };
 visit(joint);
 for(const [material,meshes] of buckets){
  const key='batch:'+joint.name+':'+material.name,cache=cacheFor(THREE);
  let geometry=cache.get(key);
  if(!geometry){
   const positions=[],normals=[],uv=[],colors=[],indices=[];
   const vertex=new THREE.Vector3(),normal=new THREE.Vector3();
   for(const mesh of meshes){
    const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color,t=g.attributes.uv;
    const matrix=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
    const normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix),offset=positions.length/3;
    for(let i=0;i<p.count;i++){
     vertex.fromBufferAttribute(p,i).applyMatrix4(matrix);positions.push(...vertex.toArray());
     if(n)normal.fromBufferAttribute(n,i).applyNormalMatrix(normalMatrix);else normal.set(0,1,0);
     normals.push(...normal.toArray());uv.push(t?t.getX(i):0,t?t.getY(i):0);
     colors.push(c?c.getX(i):1,c?c.getY(i):1,c?c.getZ(i):1);
    }
    const count=g.index?.count||p.count;
    for(let i=0;i<count;i++)indices.push(offset+(g.index?g.index.getX(i):i));
   }
   geometry=new THREE.BufferGeometry();geometry.name='NGW sculpted orc '+joint.name+' '+material.name;
   for(const [name,data,size] of [['position',positions,3],['normal',normals,3],['uv',uv,2],['color',colors,3]])
    geometry.setAttribute(name,new THREE.Float32BufferAttribute(data,size));
   geometry.setIndex(indices);geometry.computeBoundingSphere();geometry.userData.actorShared=true;
   geometry.userData.orcParts=meshes.map(m=>m.name);cache.set(key,geometry);
  }
  for(const mesh of meshes)mesh.removeFromParent();
  const batch=new THREE.Mesh(geometry,material);batch.name=joint.name+'-'+material.name;
  batch.castShadow=true;batch.receiveShadow=true;joint.add(batch);
 }
}
