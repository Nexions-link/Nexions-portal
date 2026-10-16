// PT 0.5.1: terrain-conforming combat selection ring.
// A flat XZ ring intersects the curved planet and its high-resolution
// start-zone mesh. Sample each vertex against the SAME terrain heightAt()
// function used by the world and lift it safely above the surface.
export function createSphericalTargetRing({THREE,parent,getRadius,toNormal,heightAt}){
 const STEPS=64,UP=new THREE.Vector3(0,1,0);
 const red=new THREE.MeshBasicMaterial({
  color:0xff2535,transparent:true,opacity:.98,side:THREE.DoubleSide,
  depthTest:true,depthWrite:false,polygonOffset:true,
  polygonOffsetFactor:-3,polygonOffsetUnits:-4
 });
 const halo=new THREE.MeshBasicMaterial({
  color:0xe31d29,transparent:true,opacity:.46,side:THREE.DoubleSide,
  depthTest:true,depthWrite:false,polygonOffset:true,
  polygonOffsetFactor:-2,polygonOffsetUnits:-3
 });
 const root=new THREE.Group();
 root.name='sphere-selected-target-ring';root.visible=false;parent.add(root);
 function band(material,renderOrder){
  const geometry=new THREE.BufferGeometry();
  const pos=new Float32Array((STEPS+1)*2*3);
  geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const triangles=[];
  for(let i=0;i<STEPS;i++){
   const a=i*2,b=a+1,c=a+2,d=a+3;
   triangles.push(a,b,c,b,d,c);
  }
  geometry.setIndex(triangles);
  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  const mesh=new THREE.Mesh(geometry,material);
  mesh.frustumCulled=false;mesh.renderOrder=renderOrder;root.add(mesh);
  return {mesh,pos,position:geometry.attributes.position};
 }
 const glow=band(halo,28),core=band(red,29);
 const center=new THREE.Vector3(),n=new THREE.Vector3();
 const lateral=new THREE.Vector3(),forward=new THREE.Vector3();
 const point=new THREE.Vector3(),offset=new THREE.Vector3();
 const rotation=new THREE.Quaternion();
 let last=null,lastX=NaN,lastZ=NaN,lastR=NaN;
 function redraw(entity,radius){
  center.copy(toNormal(entity.x,entity.z,radius));
  rotation.setFromUnitVectors(UP,center);
  lateral.set(1,0,0).applyQuaternion(rotation);
  forward.set(0,0,1).applyQuaternion(rotation);
  const scale=entity.boss?1.75:entity.kind==='dummy'?1.16:1;
  function write(row,inner,outer,lift){
   const vals=row.pos;
   for(let i=0;i<=STEPS;i++){
    const angle=i/STEPS*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle);
    for(let k=0;k<2;k++){
     const rr=(k?outer:inner)*scale;
     offset.copy(lateral).multiplyScalar(rr*c).addScaledVector(forward,rr*s);
     // Project back to the unit sphere to respect a radial-up planet.
     n.copy(center).addScaledVector(offset,1/radius).normalize();
     point.copy(n).multiplyScalar(radius+heightAt(n)+lift);
     const j=(i*2+k)*3;
     vals[j]=point.x;vals[j+1]=point.y;vals[j+2]=point.z;
    }
   }
   row.position.needsUpdate=true;
  }
  write(glow,.73,1.11,.135);
  write(core,.82,1.01,.15);
  last=entity;lastX=entity.x;lastZ=entity.z;lastR=radius;
 }
 function update(entity){
  const alive=entity&&['mob','dummy'].includes(entity.kind)&&
   entity.root?.visible&&entity.hp>0&&!entity.dead&&!entity.corpse;
  root.visible=!!alive;
  if(!alive){last=null;return;}
  const radius=getRadius();
  if(entity!==last||Math.abs(entity.x-lastX)>.06||
    Math.abs(entity.z-lastZ)>.06||radius!==lastR)redraw(entity,radius);
 }
 function invalidate(){last=null;}
 return {root,update,invalidate,get target(){return last},get geometry(){return core.mesh.geometry}};
}
