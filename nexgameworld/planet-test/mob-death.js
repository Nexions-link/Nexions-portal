// Planet-only death pose, blended from the exact live animation frame.
// The gameplay root keeps radial-up orientation; only the visible animal falls.
export const MOB_DEATH_SECONDS=1.45;
const smooth=(a,b,t)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x)};
export function createMobDeath({THREE,entity,visual,getRadius,heightAt,mixer=null}){
 const nodes=[];
 visual.traverse(node=>{
  nodes.push({node,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()});
 });
 const meshes=nodes.filter(({node})=>node.isMesh&&node.geometry?.attributes.position).map(({node})=>node);
 const body=visual.getObjectByName('Body')||visual;
 const shadowRest=entity.contactShadow?.position.clone();
 const vector=new THREE.Vector3(),point=new THREE.Vector3(),normal=new THREE.Vector3(),
  up=new THREE.Vector3(),east=new THREE.Vector3(),north=new THREE.Vector3(),
  planeUp=new THREE.Vector3(),seed=new THREE.Vector3(),direction=new THREE.Vector3(),
  targetQ=new THREE.Quaternion(),deltaQ=new THREE.Quaternion(),euler=new THREE.Euler();
 let elapsed=0,active=false,finished=false,side=1,start=null,mixerSpeed=1;
 // Only the two support directions affected by local slope are needed. The
 // vertex scan is allocation-free; terrain is sampled once per mesh support,
 // rather than once for every one of the GLB's ~10,000 vertices.
 function groundContact(){
  const radius=getRadius();
  entity.root.updateWorldMatrix(true,true);
  up.copy(entity.root.position).normalize();
  east.set(1,0,0).applyQuaternion(entity.root.quaternion);
  north.set(0,0,1).applyQuaternion(entity.root.quaternion);
  const sample=axis=>{
   normal.copy(up).addScaledVector(axis,1/radius).normalize();const a=heightAt(normal);
   normal.copy(up).addScaledVector(axis,-1/radius).normalize();return (a-heightAt(normal))/2;
  };
  planeUp.copy(up).addScaledVector(east,-sample(east)).addScaledVector(north,-sample(north)).normalize();
  let gap=Infinity;
  for(const mesh of meshes){
   const attr=mesh.geometry.attributes.position,m=mesh.matrixWorld;
   // Pull the terrain normal into mesh coordinates for a cheap support scan.
   const a=m.elements;
   const dx=planeUp.x*a[0]+planeUp.y*a[1]+planeUp.z*a[2],
    dy=planeUp.x*a[4]+planeUp.y*a[5]+planeUp.z*a[6],
    dz=planeUp.x*a[8]+planeUp.y*a[9]+planeUp.z*a[10];
   let lowest=Infinity,index=0;
   for(let i=0;i<attr.count;i++){
    const d=attr.getX(i)*dx+attr.getY(i)*dy+attr.getZ(i)*dz;
    if(d<lowest){lowest=d;index=i;}
   }
   point.fromBufferAttribute(attr,index).applyMatrix4(m);
   normal.copy(point).normalize();
   gap=Math.min(gap,point.length()-radius-heightAt(normal));
  }
  if(Number.isFinite(gap)){
   entity.root.getWorldScale(vector);
   const correction=(.025-gap)/Math.max(.01,vector.y);
   // No initial snap down to the ground: retain the live foot clearance and
   // ease into contact as weight shifts. Penetration is prevented immediately.
   visual.position.y+=correction*(correction>0?1:smooth(0,.22,elapsed));
  }
 }
 function pose(){
  const fold=smooth(.06,.65,elapsed),fall=smooth(.16,1.04,elapsed),
   settle=smooth(1.04,MOB_DEATH_SECONDS,elapsed),relax=smooth(.3,1.25,elapsed),
   recoil=Math.sin(Math.PI*Math.min(1,elapsed/.32))*(1-fall),
   bounce=elapsed>1.04?.038*Math.exp(-(elapsed-1.04)*12)*Math.sin((elapsed-1.04)*24):0;
  const blend=smooth(0,.75,elapsed);
  for(let i=0;i<nodes.length;i++){
   const rest=nodes[i],node=rest.node,from=start[i];
   node.position.copy(from.position).lerp(rest.position,blend);
   node.scale.copy(from.scale).lerp(rest.scale,blend);
   let x=0,y=0,z=0,amount=relax;
   switch(node.name){
    case 'Body':node.position.y-=.30*fold;x=-.09*recoil+.12*fold;z=-side*.12*fold;amount=fold;break;
    case 'Neck':x=.68*relax;y=-side*.12*relax;z=side*.22*relax;break;
    case 'Head':x=.35*relax;z=-side*.18*relax;break;
    case 'Leg_L':case 'Leg_R':x=-.72*fold;z=(node.name==='Leg_L'?-.13:.10)*fold;amount=fold;break;
    case 'Shin_L':case 'Shin_R':x=1.12*fold;amount=fold;break;
    case 'Foot_L':case 'Foot_R':x=-.28*fold;amount=fold;break;
    case 'Wing_L':case 'Wing_R':z=(node.name==='Wing_L'?-1:1)*(.28*fold-.12*settle);amount=fold;break;
    case 'Tail':x=-.18*relax;z=side*.12*relax;break;
   }
   deltaQ.setFromEuler(euler.set(x,y,z));targetQ.copy(rest.quaternion).multiply(deltaQ);
   node.quaternion.copy(from.quaternion).slerp(targetQ,Math.max(blend,amount));
  }
  const from=start[0],rest=nodes[0];
  // A small body recoil precedes gravity. Contact damps into a still corpse.
  deltaQ.setFromEuler(euler.set(-.10*recoil+.10*fall,0,side*(1.49*fall+bounce*(1-settle))));
  targetQ.copy(rest.quaternion).multiply(deltaQ);
  visual.quaternion.copy(from.quaternion).slerp(targetQ,smooth(0,.4,elapsed));
  visual.position.x+=-side*.27*fall;
  visual.position.z+=-.12*fold;
  visual.position.y-=.48*fold;
  groundContact();
  if(entity.contactShadow){
   // The blob follows the falling torso along the curved ground, rather than
   // remaining under the original standing point while the body tips sideways.
   body.getWorldPosition(point);normal.copy(point).normalize();
   point.copy(normal).multiplyScalar(getRadius()+heightAt(normal)+.06);
   entity.root.worldToLocal(point);entity.contactShadow.position.copy(point);
  }
 }
 return {
  get active(){return active},get finished(){return finished},get elapsed(){return elapsed},
  begin(attackerNormal=null){
   if(active||finished)return false;
   start=nodes.map(({node})=>({position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()}));
   if(attackerNormal){
    up.copy(entity.root.position).normalize();
    direction.copy(attackerNormal).addScaledVector(up,-attackerNormal.dot(up));
    seed.set(1,0,0).applyQuaternion(entity.root.quaternion);
    const lateral=direction.dot(seed);side=Math.abs(lateral)>1e-5?(lateral>0?1:-1):(entity.index%2?1:-1);
   }else side=entity.index%2?1:-1;
   // stopAllAction() would restore bind transforms and cause the old snap.
   if(mixer){mixerSpeed=mixer.timeScale;mixer.timeScale=0;}
   elapsed=0;active=true;entity.dying=true;return true;
  },
  update(dt){
   if(!active)return false;
   elapsed=Math.min(MOB_DEATH_SECONDS,elapsed+Math.max(0,Number.isFinite(dt)?dt:0));
   pose();
   if(elapsed>=MOB_DEATH_SECONDS){active=false;finished=true;entity.dying=false;}
   return true;
  },
  refresh(){if(start)pose()},
  reset(){
   if(mixer)mixer.timeScale=mixerSpeed;
   for(const rest of nodes){rest.node.position.copy(rest.position);rest.node.quaternion.copy(rest.quaternion);rest.node.scale.copy(rest.scale);}
   if(shadowRest)entity.contactShadow.position.copy(shadowRest);
   elapsed=0;active=false;finished=false;start=null;entity.dying=false;
  }
 };
}
