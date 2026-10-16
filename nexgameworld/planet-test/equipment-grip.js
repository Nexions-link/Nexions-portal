// Native wrist bases plus the approved offsets. All transforms are actor-local,
// so the same grip is preserved at the poles and on the back of the planet.
export function equipmentGrip(slot,tuning={}){
 const radians=degrees=>(degrees||0)*Math.PI/180;
 return {x:(slot==='shield'?Math.PI:-Math.PI/2)+radians(tuning.handX),
  y:radians(tuning.handY),z:radians(tuning.handZ),order:'XYZ'};
}
export function applyEquipmentTransform(mesh,hand,{slot,kind,tuning,sourceId}){
 const radians=degrees=>degrees*Math.PI/180,key=slot==='shield'?'shield':kind;
 mesh.position.set(tuning.posX,tuning.posY,tuning.posZ);
 mesh.rotation.set(radians(tuning[key+'X']),radians(tuning[key+'Y']),radians(tuning[key+'Z']),'YXZ');
 mesh.scale.setScalar(slot==='shield'&&sourceId===2210?.8:1);
 const grip=equipmentGrip(slot,tuning);
 hand.rotation.set(grip.x,grip.y,grip.z,grip.order);
 return grip;
}
