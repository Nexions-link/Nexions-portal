// G-26: one painted daylight rig carried in the globe's local tangent frame.
// Repositions the three EXISTING lights only. No lights, render targets,
// materials, shadow passes or per-frame Vector3 allocations are introduced.
export function createSphericalDaylightRig(THREE,{sun,fill,skyFill}){
 const up=new THREE.Vector3(),east=new THREE.Vector3(),north=new THREE.Vector3();
 const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);
 function update(normal,anchor,updateSun=true){
  if(!finitePoint(normal)||!finitePoint(anchor)||normal.lengthSq()<1e-12)return false;
  up.copy(normal).normalize();
  const longitude=Math.atan2(up.x,up.z);
  east.set(Math.cos(longitude),0,-Math.sin(longitude));
  north.crossVectors(up,east).normalize();
  // HemisphereLight uses its world position as a direction: world +Y is
  // not "above" the village at +Z, nor above the opposite side of the globe.
  skyFill.position.copy(up);
  // A cool, softer counter-light reveals faces and the shaded side of bark
  // instead of lighting the underside from a fixed global coordinate.
  fill.target.position.copy(anchor);
  fill.position.copy(anchor).addScaledVector(up,28)
   .addScaledVector(east,-34).addScaledVector(north,-24);
  fill.target.updateMatrixWorld();
  // Keep the existing sun/shadow-camera geometry. With shadows enabled this
  // runs only on their existing refresh cadence; without them it still tracks
  // the traveller, giving economy the same art direction as other presets.
  if(updateSun){
   sun.target.position.copy(anchor);
   sun.position.copy(anchor).addScaledVector(up,44)
    .addScaledVector(east,27).addScaledVector(north,20);
   sun.target.updateMatrixWorld();
  }
  return true;
 }
 return {update};
}
