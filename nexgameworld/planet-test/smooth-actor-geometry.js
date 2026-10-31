// Shared original actor surfaces. Refine the existing silhouette in-place;
// no added objects, joints, texture fetches or render passes.
const caches=new WeakMap();
function cacheFor(THREE){
 if(!caches.has(THREE))caches.set(THREE,{forms:new Map()});
 return caches.get(THREE);
}
export function getSmoothActorPrimitives(THREE){
 const cache=cacheFor(THREE);
 if(cache.primitives)return cache.primitives;
 // Project a subdivided cube onto a rounded cuboid, preserving unit bounds.
 const box=new THREE.BoxGeometry(1,1,1,4,4,4),p=box.attributes.position,n=box.attributes.normal;
 const v=new THREE.Vector3(),core=new THREE.Vector3();
 for(let i=0;i<p.count;i++){
  v.fromBufferAttribute(p,i);core.copy(v).clampScalar(-.40,.40);
  v.sub(core).normalize();n.setXYZ(i,v.x,v.y,v.z);
  v.multiplyScalar(.10).add(core);
  p.setXYZ(i,v.x,v.y,v.z);
 }
 cache.primitives={sphere:new THREE.SphereGeometry(1,20,14),box,
  cylinder:new THREE.CylinderGeometry(1,1,1,20),
  cone:new THREE.ConeGeometry(1,1,12)};
 for(const geometry of Object.values(cache.primitives))geometry.userData.actorShared=true;
 return cache.primitives;
}
// Cubic interpolation with limited tangent slopes prevents thin wrists, cloth
// or hooves from overshooting into negative radii between the authored rings.
function sample(rows,j,t,k){
 const value=i=>rows[Math.max(0,Math.min(rows.length-1,i))][k]||0;
 const a=value(j),b=value(j+1),delta=b-a;
 const tangent=(d1,d2)=>d1*d2<=0?0:Math.sign(d1)*Math.min(Math.abs((d1+d2)/2),2*Math.abs(d1),2*Math.abs(d2));
 const m0=j===0?delta:tangent(a-value(j-1),delta);
 const m1=j===rows.length-2?delta:tangent(delta,value(j+2)-b);
 return (2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*m0+
  (-2*t**3+3*t*t)*b+(t**3-t*t)*m1;
}
export function createSmoothActorForm(THREE,rings,{segments=20,power=1}={}){
 if(rings.length<2||rings.some(r=>r.some(v=>!Number.isFinite(v))||r[1]<=0||r[2]<=0))
  throw new RangeError('Invalid actor profile');
 const cache=cacheFor(THREE),key=JSON.stringify([rings,segments,power]);
 if(cache.forms.has(key))return cache.forms.get(key);
 const rows=[];
 for(let j=0;j<rings.length-1;j++)for(let n=0;n<3;n++)
  rows.push(Array.from({length:5},(_,k)=>sample(rings,j,n/3,k)));
 rows.push(Array.from({length:5},(_,k)=>rings.at(-1)[k]||0));
 const positions=[],uv=[],indices=[],tau=Math.PI*2;
 for(let j=0;j<rows.length;j++){
  const [y,rx,rz,cz,cx]=rows[j];
  for(let i=0;i<=segments;i++){
   const a=i/segments*tau,s=Math.sin(a),c=Math.cos(a);
   positions.push(cx+rx*Math.sign(s)*Math.abs(s)**power,y,cz+rz*Math.sign(c)*Math.abs(c)**power);
   uv.push(i/segments,j/(rows.length-1));
  }
 }
 for(let j=0;j<rows.length-1;j++)for(let i=0;i<segments;i++){
  const a=j*(segments+1)+i,b=a+segments+1;
  indices.push(a,a+1,b,b,a+1,b+1);
 }
 // Separate cap rims keep flat cut surfaces from denting the side normals.
 for(const [j,reverse] of [[0,false],[rows.length-1,true]]){
  const [y,,,cz,cx]=rows[j],center=positions.length/3;
  positions.push(cx,y,cz);uv.push(.5,.5);
  const rim=positions.length/3;
  for(let i=0;i<=segments;i++){
   const a=(j*(segments+1)+i)*3;
   positions.push(...positions.slice(a,a+3));uv.push(i/segments,j?1:0);
  }
  for(let i=0;i<segments;i++)indices.push(center,reverse?rim+i:rim+i+1,reverse?rim+i+1:rim+i);
 }
 const g=new THREE.BufferGeometry();g.name='NGW smooth actor profile';
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);
 g.computeVertexNormals();
 // Weld the lighting at the UV seam without destroying UV coordinates.
 const normals=g.attributes.normal,v=new THREE.Vector3(),other=new THREE.Vector3();
 for(let j=0;j<rows.length;j++){
  const a=j*(segments+1),b=a+segments;
  v.fromBufferAttribute(normals,a).add(other.fromBufferAttribute(normals,b)).normalize();
  normals.setXYZ(a,v.x,v.y,v.z);normals.setXYZ(b,v.x,v.y,v.z);
 }
 g.computeBoundingSphere();g.userData.actorShared=true;cache.forms.set(key,g);return g;
}
