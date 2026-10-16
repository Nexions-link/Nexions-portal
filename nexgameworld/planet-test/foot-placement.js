// World-space ground probes for each hoof on a curved planet.
// Sampling uses the hero's current radial up and facing quaternion rather
// than a fixed world-Y plane; no raycasts or terrain mesh traversal required.
export const FOOT_HALF_WIDTH=.43;
export const FOOT_PITCH_PROBE=.27;
export const FOOT_ROLL_PROBE=.19;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function footStrideZ(phase,index){
 const p=((phase/(Math.PI*2)+index*.5)%1+1)%1;
 if(p<.58)return .775-1.55*p/.58;
 const t=(p-.58)/.42;
 return -.775+1.55*(t*t*(3-2*t));
}
export function sampleSphericalFooting({THREE,normal,quaternion,radius,heightAt,phase=0,walk=0}){
 if(!THREE||!normal||!quaternion||typeof heightAt!=='function'
  ||!Number.isFinite(radius)||radius<=0)return null;
 const centreHeight=heightAt(normal);
 if(!Number.isFinite(centreHeight))return null;
 const origin=normal.clone().multiplyScalar(radius+centreHeight);
 const right=new THREE.Vector3(1,0,0).applyQuaternion(quaternion);
 const forward=new THREE.Vector3(0,0,1).applyQuaternion(quaternion);
 right.addScaledVector(normal,-right.dot(normal)).normalize();
 forward.addScaledVector(normal,-forward.dot(normal)).normalize();
 if(right.lengthSq()<.99||forward.lengthSq()<.99)return null;
 function altitude(x,z){
  const projected=origin.clone().addScaledVector(right,x).addScaledVector(forward,z).normalize();
  const h=heightAt(projected);
  if(!Number.isFinite(h))return 0;
  return projected.multiplyScalar(radius+h).sub(origin).dot(normal);
 }
 const w=clamp(Number.isFinite(walk)?walk:0,0,1);
 return [0,1].map((index)=>{
  const x=(index===0?-1:1)*FOOT_HALF_WIDTH;
  const z=footStrideZ(phase,index)*w;
  const center=altitude(x,z);
  const forwardSlope=(altitude(x,z+FOOT_PITCH_PROBE)-altitude(x,z-FOOT_PITCH_PROBE))/(2*FOOT_PITCH_PROBE);
  const sideSlope=(altitude(x+FOOT_ROLL_PROBE,z)-altitude(x-FOOT_ROLL_PROBE,z))/(2*FOOT_ROLL_PROBE);
  return {
   // Allow natural uneven ground while keeping both knees inside their rig.
   height:clamp(center,-.31,.31),
   // Three.js X rotation lowers the forward toe for positive pitch.
   pitch:clamp(-Math.atan(forwardSlope),-.28,.28),
   // Three.js Z rotation lifts local +X for positive roll.
   roll:clamp(Math.atan(sideSlope),-.23,.23)
  };
 });
}
