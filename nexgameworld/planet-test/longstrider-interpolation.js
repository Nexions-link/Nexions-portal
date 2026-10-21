// Uniform visual-only interpolation of the 5 Hz server mob snapshots.
// The root used by gameplay remains at authoritative mob.x/z/yaw.
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const finite=Number.isFinite;
export function queueLongstriderSnapshot(mob,{x,z,yaw},time){
 if(!mob||![x,z,yaw,time].every(finite))return false;
 const px=finite(mob.renderX)?mob.renderX:mob.x;
 const pz=finite(mob.renderZ)?mob.renderZ:mob.z;
 const py=finite(mob.renderYaw)?mob.renderYaw:mob.yaw;
 if(![px,pz,py].every(finite))return false;
 if(Math.hypot(x-px,z-pz)>5.5){
  mob.renderX=x;mob.renderZ=z;mob.renderYaw=yaw;
  mob.longstriderSegment=null;mob.longstriderPacketAt=time;
  return true;
 }
 const interval=finite(mob.longstriderPacketAt)?time-mob.longstriderPacketAt:.20;
 mob.longstriderPacketAt=time;
 mob.longstriderSegment={
  fromX:px,fromZ:pz,fromYaw:py,toX:x,toZ:z,
  deltaYaw:angle(yaw,py),duration:clamp(interval,.16,.30),elapsed:0
 };
 return true;
}
export function sampleLongstriderSnapshot(mob,dt){
 const segment=mob?.longstriderSegment;
 if(!segment)return false;
 segment.elapsed=Math.min(segment.duration,segment.elapsed+(finite(dt)?clamp(dt,0,.12):0));
 const t=segment.elapsed/segment.duration;
 mob.renderX=segment.fromX+(segment.toX-segment.fromX)*t;
 mob.renderZ=segment.fromZ+(segment.toZ-segment.fromZ)*t;
 mob.renderYaw=segment.fromYaw+segment.deltaYaw*t;
 if(t>=1)mob.longstriderSegment=null;
 return true;
}
export function resetLongstriderSnapshot(mob){
 if(mob){mob.longstriderSegment=null;mob.longstriderPacketAt=null;}
}
