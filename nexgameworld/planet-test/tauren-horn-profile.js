// One horn centreline for both the sculpted mesh and its tiny carved accents.
// The first point is deliberately INSIDE the head at the eyebrow/temple,
// preventing the horns from looking like detached pieces during animation.
export const TAUREN_HORN_PROFILE=Object.freeze([
 Object.freeze([.30,.28,.00]),
 Object.freeze([.70,.41,-.155]),
 Object.freeze([1.04,.63,-.22]),
 Object.freeze([1.15,.97,-.13]),
 Object.freeze([1.05,1.27,.04])
]);
export function hornPathPoints(THREE,sign){
 if(sign!==1&&sign!==-1)throw Error('Horn side must be +1 or -1');
 return TAUREN_HORN_PROFILE.map(([x,y,z])=>new THREE.Vector3(sign*x,y,z));
}
export function hornRadius(t){
 const u=Math.max(0,Math.min(1,Number(t)||0));
 return .205*Math.pow(1-u,.83)+.003;
}
