// Radial sphere movement solver: prefer the intended great-circle arc, then
// slide along whichever local tangent direction remains walkable.
// All probes follow the actual planet normal; no planar coordinate translation.
export function sphericalSlideStep({THREE,normal,travel,step,radius,toLocal,canStep}){
 if(!Number.isFinite(step)||step<=0||!Number.isFinite(radius)||radius<=0)
  return {normal,travelled:0,slid:false};
 const tangent=travel.clone().addScaledVector(normal,-travel.dot(normal));
 if(tangent.lengthSq()<1e-12)return {normal,travelled:0,slid:false};
 tangent.normalize();
 function probe(direction,length){
  const axis=new THREE.Vector3().crossVectors(normal,direction).normalize();
  if(axis.lengthSq()<1e-12)return null;
  const proposed=normal.clone().applyAxisAngle(axis,length/radius).normalize();
  const p=toLocal(proposed,radius);
  return canStep(p.x,p.z,p.d)?proposed:null;
 }
 const full=probe(tangent,step);
 if(full)return {normal:full,travelled:step,slid:false};
 // Sample smooth parallel motion along the tangent to the obstacle boundary.
 // Trying smaller steps first prevents getting stuck on sharply curved stones.
 for(const fraction of [.65,.35]){
  const short=probe(tangent,step*fraction);
  if(short)return {normal:short,travelled:step*fraction,slid:false};
 }
 const sideways=new THREE.Vector3().crossVectors(normal,tangent).normalize();
 for(const offset of [.42,-.42,.72,-.72,1.05,-1.05]){
  const candidate=tangent.clone().multiplyScalar(Math.cos(offset))
   .addScaledVector(sideways,Math.sin(offset)).normalize();
  const next=probe(candidate,step*.55);
  if(next)return {normal:next,travelled:step*.55,slid:true};
 }
 return {normal,travelled:0,slid:false};
}
