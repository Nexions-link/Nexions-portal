// G-19: coherent grass carpets along the woodland trail.
// Pure deterministic world-space cover; used by the existing grass instances
// and by the already-baked opaque globe atlas, never a new overlay or collider.
import {forestTrailLatitude,forestMoodAt,FOREST_CAMP,
 FOREST_SITE_CLEARINGS,forestDistance} from './whispering-forest.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
function hash(x,y){
 let n=Math.imul(x,374761393)^Math.imul(y,668265263);
 n=Math.imul(n^(n>>>13),1274126177);
 return ((n^(n>>>16))>>>0)/4294967295;
}
function noise(x,y){
 const i=Math.floor(x),j=Math.floor(y),a=smooth(0,1,x-i),b=smooth(0,1,y-j);
 return (hash(i,j)*(1-a)+hash(i+1,j)*a)*(1-b)+
  (hash(i,j+1)*(1-a)+hash(i+1,j+1)*a)*b;
}
export function forestGrassCarpetProfile(lon,lat){
 if(!Number.isFinite(lon)||!Number.isFinite(lat)||lon<.18||lon>1.5)
  return {density:0,paint:0,trailDistance:Infinity};
 const x=261*lon*Math.cos(lat),z=261*lat;
 const dist=Math.abs(lat-forestTrailLatitude(lon))*261;
 // A narrow clean road, grassy verges 7–23m out, fading to low groundcover
 // in the deep forest. A 7m wide band around the actual road stays open.
 const verge=smooth(4.6,7.3,dist)*(1-smooth(24,47,dist));
 const nearRoad=.28+.72*(1-smooth(18,44,dist));
 const broad=noise(x*.073+41,z*.073-29);
 const tufts=noise(x*.24-17,z*.24+53);
 const carpet=smooth(.23,.74,broad*.61+tufts*.39);
 const mood=smooth(.09,.32,forestMoodAt(lon,lat));
 let clearing=smooth(FOREST_CAMP.clearingRadius+2,FOREST_CAMP.clearingRadius+14,
  forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat));
 for(const site of FOREST_SITE_CLEARINGS)
  clearing=Math.min(clearing,smooth(site.radius+2,site.radius+11,
   forestDistance(lon,lat,site.lon,site.lat)));
 const cover=clamp(verge*nearRoad*carpet*mood*clearing);
 return {density:cover,paint:cover*(.56+.44*tufts),trailDistance:dist};
}
