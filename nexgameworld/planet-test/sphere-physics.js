import {blocksRockOrMesa} from './planet-landmarks.js?v=1';
// PT 0.6.0 — spherical contact and third-person camera constraints.
// Static footprints match the ORIGINAL camp's physical dimensions. Geometry
// tests operate in local geodesic chart metres; world-space rays are converted
// back to the radial normal before collision, never assumed to be planar Y-up.
const TENTS=[
 {x:11,z:-7,r:4.2,yaw:-.5},
 {x:-15,z:12,r:3.8,yaw:2.2},
 {x:13,z:16,r:3.4,yaw:-1.7},
 {x:-23,z:-15,r:3,yaw:.5}
];
const TREES=[[-26,21,1.2],[54,35,1],[34,-26,.95],[-34,-30,1.15],
 [9,49,1.2],[-39,40,1.1],[51,25,1.3],[50,-8,.8],[-47,-7,1.1]];
const TOTEMS=[[-3,-5,1],[5,9,.75],[-5,25,.8],[35,-14,1.25]];
const BANNERS=[[-4,19],[5,-14]];
const boxHit=(x,z,cx,cz,hw,hd)=>Math.abs(x-cx)<hw&&Math.abs(z-cz)<hd;
const circleHit=(x,z,cx,cz,r)=>Math.hypot(x-cx,z-cz)<r;
export function toHouseCoordinates(x,z){return {x:-(z+2),z:x+27};}
export function isInLonghouse(x,z){
 const p=toHouseCoordinates(x,z);return Math.abs(p.x)<9.25&&Math.abs(p.z)<10.15;
}
export function canWalkCamp(x,z,playerRadius=.42){
 if(!Number.isFinite(x)||!Number.isFinite(z))return false;
 if(blocksRockOrMesa(x,z,playerRadius))return false;
 if(Math.hypot(x,z)>90)return true; // Beyond camp: mesas still use shared collision.
 const r=playerRadius,p=toHouseCoordinates(x,z),ax=Math.abs(p.x),az=Math.abs(p.z);
 // Original longhouse measures 19.2×20.8 m with 6.8m front (+Z) doorway.
 // Collision affects shell only, leaving the interior walkable.
 const atWallX=ax>9.6-.54-r&&ax<9.6+.54+r&&az<10.4+.54+r;
 const atWallZ=az>10.4-.54-r&&az<10.4+.54+r&&ax<9.6+.54+r;
 const door=p.z>0&&ax<3.4-r;
 if(atWallX||(atWallZ&&!door))return false;
 // Main-game furniture: two bunks, shelf/chest and a solid table.
 if(boxHit(p.x,p.z,-5.2,-5,2.35+r,2.55+r))return false;
 if(boxHit(p.x,p.z,5.4,-6.2,1.7+r,1.2+r))return false;
 if(boxHit(p.x,p.z,3,-1,1.75+r,1.5+r))return false;
 for(const tent of TENTS){
  // Cone tents are solid in the current starting zone. Their fabric is a
  // surface obstacle but nearby interaction uses separate entity ranges.
  if(circleHit(x,z,tent.x,tent.z,tent.r*.86+r))return false;
 }
 for(const [tx,tz,scale] of TREES)if(circleHit(x,z,tx,tz,.39*scale+r))return false;
 for(const [tx,tz,scale] of TOTEMS)if(circleHit(x,z,tx,tz,.47*scale+r))return false;
 for(const [bx,bz] of BANNERS)if(circleHit(x,z,bx,bz,.19+r))return false;
 return true;
}
function geometryAt(x,z,height,interior=false){
 if(blocksRockOrMesa(x,z,.25,height))return true;
 const p=toHouseCoordinates(x,z),ax=Math.abs(p.x),az=Math.abs(p.z);
 if(height>=0&&height<13.8){
  const wallX=ax>9.25&&ax<10.05&&az<10.75;
  const wallZ=az>10.05&&az<10.75&&ax<10.05;
  const door=p.z>0&&ax<3.4&&height<7.2;
  if(wallX||(wallZ&&!door))return true;
  if(!interior&&ax<9.6&&az<10.4&&height>9.1&&height<13.7){
   // Two diagonal roof planes; conservative envelope and only outside.
   const roof=9.1+4.7*(1-ax/9.6);
   if(height>roof-.55&&height<roof+.8)return true;
  }
 }
 for(const tent of TENTS){
  const d=Math.hypot(x-tent.x,z-tent.z);
  if(d<tent.r*.98&&height>=0&&height<tent.r*1.42*(1-d/tent.r)+.75)return true;
 }
 for(const [tx,tz,scale] of TREES){
  if(circleHit(x,z,tx,tz,.42*scale)&&height<5.9*scale)return true;
 }
 return false;
}
export function cameraObstruction(THREE,{
 start,desired,getRadius,toLocal,heightAt,heroLocal,
 clearance=.7,maxSamples=140
}){
 if(!start||!desired)return null;
 const line=desired.clone().sub(start),length=line.length();
 if(!Number.isFinite(length)||length<.1)return null;
 const N=Math.min(maxSamples,Math.max(12,Math.ceil(length/.45)));
 const point=new THREE.Vector3(),direction=new THREE.Vector3();
 const radius=getRadius(),inside=heroLocal&&isInLonghouse(heroLocal.x,heroLocal.z);
 let safe=1,blocked=false;
 for(let i=2;i<=N;i++){
  const t=i/N;
  point.copy(start).addScaledVector(line,t);
  direction.copy(point).normalize();
  const loc=toLocal(direction,radius);
  const elevation=point.length()-radius-heightAt(direction);
  // Mesas sit at ~105-115 metres from camp, beyond the old 89m cutoff.
  // World coordinates remain geodesic for every sampled camera segment.
  if(elevation<clearance||geometryAt(loc.x,loc.z,elevation,inside)){
   safe=Math.max(.08,(i-2)/N);
   blocked=true;break;
  }
 }
 return blocked?start.clone().addScaledVector(line,safe):null;
}
export const CAMP_COLLISION_ASSETS=Object.freeze({tents:TENTS.length,trees:TREES.length,totems:TOTEMS.length});
