// Spherical test only: rotate a +Z-forward creature towards its target
// in the creature's tangent plane, rather than treating map X/Z as world X/Z.
// Three.js local +Z matches the original Dolgonog mesh and attack animations.
export function sphereFacingYaw(THREE, normal, targetNormal) {
 const forward=targetNormal.clone().addScaledVector(normal,-targetNormal.dot(normal));
 if(forward.lengthSq()<1e-12)return null;
 const anchor=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
 forward.applyQuaternion(anchor.invert());
 return Math.atan2(forward.x,forward.z);
}
export function turnSphereYaw(current, desired, dt, turnSpeed=12) {
 if(desired==null||!Number.isFinite(desired))return current;
 const difference=Math.atan2(Math.sin(desired-current),Math.cos(desired-current));
 const fraction=1-Math.exp(-Math.max(0,dt)*turnSpeed);
 return current+difference*fraction;
}
export function sphereFacingError(yaw,desired) {
 if(desired==null)return Math.PI;
 return Math.abs(Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw)));
}
