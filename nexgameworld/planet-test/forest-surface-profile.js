// Coverage of the detailed forest terrain. Pure visual coordinates only.
import {forestTrailLatitude} from './whispering-forest.js?v=28';
export const FOREST_SURFACE=Object.freeze({
 lonMin:.22,lonMax:1.51,halfWidth:.40,columns:256,rows:152,
 textureWidth:2048,textureHeight:1024,recess:1.6
});
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
export function forestSurfacePoint(u,v){
 const p=FOREST_SURFACE,lon=p.lonMin+(p.lonMax-p.lonMin)*u;
 return {lon,lat:forestTrailLatitude(lon)+(v*2-1)*p.halfWidth};
}
export function forestSurfaceCoverage(lon,lat,radius=261){
 if(!Number.isFinite(lon)||!Number.isFinite(lat)||!Number.isFinite(radius)||radius<=0)return 0;
 const p=FOREST_SURFACE;
 const d=Math.acos(Math.max(-1,Math.min(1,Math.cos(lat)*Math.cos(lon))))*radius;
 const side=Math.abs(lat-forestTrailLatitude(lon));
 return smooth(p.lonMin,p.lonMin+.045,lon)*(1-smooth(p.lonMax-.045,p.lonMax,lon))*
  (1-smooth(p.halfWidth-.045,p.halfWidth,side))*smooth(90,101,d);
}

export function forestSurfaceRecess(lon,lat,radius=261){
 // Recess only underneath the almost-opaque core. Feathered edges remain
 // close to the physics surface so plants never float over a sunken seam.
 return FOREST_SURFACE.recess*smooth(.90,1,forestSurfaceCoverage(lon,lat,radius));
}
