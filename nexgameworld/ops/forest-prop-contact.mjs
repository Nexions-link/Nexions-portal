// G-29: OFFLINE ONLY. Baked contact depth for the props shared by balanced
// and high. No runtime module imports this file or builds this spatial grid.
import {forestEcologyLayout} from '../planet-test/forest-ecology.js';
import {forestShrubFamilyProfile,FOREST_SHRUB_FAMILIES} from '../planet-test/forest-art-ecology.js';
import {FOREST_CAMP,FOREST_SITE_CLEARINGS,forestDistance,forestTrailLatitude} from '../planet-test/whispering-forest.js';

const R=261,CELL=6,SHARED_RATIO=.65;
const clamp=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
const key=(x,z)=>x+','+z;

function anchorFor(p,kind,sourceIndex,family=null,width=1){
 const sinLon=Math.sin(p.lon),cosLon=Math.cos(p.lon),sinLat=Math.sin(p.lat),cosLat=Math.cos(p.lat);
 const shrubRadius=.62*p.size*width+.12;
 const rx=kind==='rock'?.90*p.size:shrubRadius;
 const rz=kind==='rock'?.72*p.size:shrubRadius;
 return Object.freeze({kind,sourceIndex,family,lon:p.lon,lat:p.lat,size:p.size,
  angle:p.angle,variation:p.variation,rx,rz,reach:Math.max(rx,rz)*1.25,
  ex:cosLon,ez:-sinLon,nx:-sinLat*sinLon,ny:cosLat,nz:-sinLat*cosLon,
  cos:Math.cos(p.angle),sin:Math.sin(p.angle)});
}

function kernel(p,dx,dz){
 const x=(dx*p.cos+dz*p.sin)/p.rx,z=(-dx*p.sin+dz*p.cos)/p.rz;
 const radius=Math.hypot(x,z);
 if(radius>=1.25)return 0;
 const angle=Math.atan2(z,x),phase=p.variation*Math.PI*2;
 // Broken footprints follow each fixed prop's rotation. They fade inward
 // from an irregular edge, rather than drawing a dark ring around the prop.
 const boundary=1+.10*Math.sin(angle*3+phase)+.06*Math.cos(angle*5-phase*.7);
 const d=radius/boundary;
 if(p.kind==='rock')return Math.min(.18,.14*(1-smooth(0,.62,d))+.04*(1-smooth(.18,1,d)));
 return .09*Math.pow(1-smooth(.08,1,d),1.35);
}

// Tangent chord projection, in real metres, at the SAME spherical anchors
// used by the meshes. Terrain height changes cannot stretch the footprint.
export function forestPropContactFootprint(p,lon,lat){
 if(!Number.isFinite(lon)||!Number.isFinite(lat))return 0;
 const cosLat=Math.cos(lat),x=Math.sin(lon)*cosLat,y=Math.sin(lat),z=Math.cos(lon)*cosLat;
 return kernel(p,R*(x*p.ex+z*p.ez),R*(x*p.nx+y*p.ny+z*p.nz));
}

export function createForestPropContactField(){
 const layout=forestEcologyLayout(),anchors=[];
 layout.rocks.slice(0,Math.floor(layout.rocks.length*SHARED_RATIO))
  .forEach((p,i)=>anchors.push(anchorFor(p,'rock',i)));
 const groups=Object.fromEntries(FOREST_SHRUB_FAMILIES.map(f=>[f,[]]));
 layout.shrubs.forEach((p,i)=>{
  const profile=forestShrubFamilyProfile(p.variation);
  groups[profile.family].push({p,i,width:profile.width});
 });
 for(const family of FOREST_SHRUB_FAMILIES){
  const group=groups[family];
  for(const {p,i,width} of group.slice(0,Math.floor(group.length*SHARED_RATIO)))
   anchors.push(anchorFor(p,'shrub',i,family,width));
 }
 const grid=new Map();
 for(const p of anchors){
  // Longitude cells use unscaled radians*R; bounds account for cos(latitude).
  const x=R*p.lon,z=R*p.lat,rx=p.reach/Math.cos(Math.abs(p.lat)+p.reach/R),rz=p.reach;
  for(let i=Math.floor((x-rx)/CELL);i<=Math.floor((x+rx)/CELL);i++)
   for(let j=Math.floor((z-rz)/CELL);j<=Math.floor((z+rz)/CELL);j++){
    const k=key(i,j);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(p);
   }
 }
 function sample(lon,lat,{roadWear=0}={}){
  if(!Number.isFinite(lon)||!Number.isFinite(lat))return 0;
  const rows=grid.get(key(Math.floor(R*lon/CELL),Math.floor(R*lat/CELL)));
  if(!rows)return 0;
  const cosLat=Math.cos(lat),x=Math.sin(lon)*cosLat,y=Math.sin(lat),z=Math.cos(lon)*cosLat;
  let depth=0;
  for(const p of rows)depth=Math.max(depth,kernel(p,R*(x*p.ex+z*p.ez),R*(x*p.nx+y*p.ny+z*p.nz)));
  if(depth===0)return 0;
  const trailDistance=Math.abs(lat-forestTrailLatitude(lon))*R;
  const roadProtect=smooth(5,7.2,trailDistance)*Math.pow(1-clamp(roadWear),2);
  let clearing=smooth(FOREST_CAMP.clearingRadius+1,FOREST_CAMP.clearingRadius+13,
   forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat));
  for(const site of FOREST_SITE_CLEARINGS)
   clearing=Math.min(clearing,smooth(site.radius+1,site.radius+10,forestDistance(lon,lat,site.lon,site.lat)));
  return depth*roadProtect*clearing*smooth(.31,.645,lon);
 }
 return {anchors:Object.freeze(anchors),sample};
}
