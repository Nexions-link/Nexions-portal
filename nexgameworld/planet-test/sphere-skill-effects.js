// Native Thunder Stomp ground shockwave projected onto the curved terrain.
// No planar XZ geometry or world-Y offsets; radial-up frame per vertex.
export function createSphericalStomp({THREE,parent,getRadius,heightAt}){
 const N=52,duration=.55,up=new THREE.Vector3(0,1,0);
 const geometry=new THREE.BufferGeometry(),verts=new Float32Array((N+1)*6);
 geometry.setAttribute('position',new THREE.BufferAttribute(verts,3).setUsage(THREE.DynamicDrawUsage));
 const indices=[];
 for(let i=0;i<N;i++){const a=2*i,b=a+1,c=a+2,d=a+3;indices.push(a,b,c,b,d,c)}
 geometry.setIndex(indices);
 const material=new THREE.MeshBasicMaterial({color:0xe9c66b,transparent:true,opacity:0,
  side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
 const ring=new THREE.Mesh(geometry,material);ring.frustumCulled=false;ring.visible=false;
 ring.renderOrder=27;parent.add(ring);
 const center=new THREE.Vector3(),east=new THREE.Vector3(),north=new THREE.Vector3(),
   temp=new THREE.Vector3(),out=new THREE.Vector3(),normal=new THREE.Vector3();
 let time=duration;
 function trigger(centerNormal){center.copy(centerNormal).normalize();time=0;ring.visible=true;redraw()}
 function redraw(){
  if(time>=duration){ring.visible=false;material.opacity=0;return}
  const progress=time/duration,radius=getRadius(),r=.85+3.7*progress;
  const seed=Math.abs(center.y)>.96?new THREE.Vector3(1,0,0):up;
  east.crossVectors(seed,center).normalize();
  north.crossVectors(center,east).normalize();
  for(let i=0;i<=N;i++){
   const angle=i/N*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle);
   for(let k=0;k<2;k++){
    const span=r+(k?.12:-.12);
    temp.copy(east).multiplyScalar(c*span).addScaledVector(north,s*span);
    normal.copy(center).addScaledVector(temp,1/radius).normalize();
    out.copy(normal).multiplyScalar(radius+heightAt(normal)+.19);
    const offset=(i*2+k)*3;
    verts[offset]=out.x;verts[offset+1]=out.y;verts[offset+2]=out.z;
   }
  }
  geometry.attributes.position.needsUpdate=true;
  material.opacity=.68*Math.pow(1-progress,1.3);
 }
 function update(dt){if(time>=duration)return;time=Math.min(duration,time+Math.max(0,dt));redraw()}
 function invalidate(){if(ring.visible)redraw()}
 return {ring,trigger,update,invalidate,get active(){return ring.visible}};
}
