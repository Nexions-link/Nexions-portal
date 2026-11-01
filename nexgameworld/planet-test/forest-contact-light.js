// G-18: original, baked-only woodland ground lighting sampled from the
// CURRENT deterministic 400-tree forest layout. No meshes, decals, lighting
// passes, shader code, gameplay obstacles or per-frame evaluation.
import {createForestLayout,FOREST_CAMP,FOREST_SITE_CLEARINGS,
 forestDistance,forestTrailLatitude} from './whispering-forest.js';

const CELL=18;
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
const key=(x,z)=>x+','+z;
let grid=null;
function buildGrid(){
 const cells=new Map(),trees=createForestLayout().trees;
 for(const t of trees){
  const x=261*t.lon*Math.cos(t.lat),z=261*t.lat;
  // Project the upper canopy toward the afternoon sun, within a few metres.
  // The contact ring is rooted at the exact (unchanged) trunk coordinate.
  const crownX=x-2.5-t.height*.055,crownZ=z+1.3+t.height*.037;
  const reach=t.radius*(t.evergreen?3.25:3.85);
  const extent=reach+5.5;
  const leaf={x,z,crownX,crownZ,reach,t};
  const minX=Math.floor((Math.min(x,crownX)-extent)/CELL);
  const maxX=Math.floor((Math.max(x,crownX)+extent)/CELL);
  const minZ=Math.floor((Math.min(z,crownZ)-extent)/CELL);
  const maxZ=Math.floor((Math.max(z,crownZ)+extent)/CELL);
  for(let i=minX;i<=maxX;i++)for(let j=minZ;j<=maxZ;j++){
   const k=key(i,j);if(!cells.has(k))cells.set(k,[]);
   cells.get(k).push(leaf);
  }
 }
 return {cells,count:trees.length};
}
export function forestContactLightAt(lon,lat,{roadWear=0}={}){
 if(!Number.isFinite(lon)||!Number.isFinite(lat))return {contact:0,canopy:0,light:1};
 if(lon<.23||lon>1.52)return {contact:0,canopy:0,light:1};
 const x=261*lon*Math.cos(lat),z=261*lat;
 const entries=(grid??=buildGrid()).cells.get(key(Math.floor(x/CELL),Math.floor(z/CELL)));
 if(!entries)return {contact:0,canopy:0,light:1};
 let root=0,crown=0;
 for(const p of entries){
  const dx=x-p.x,dz=z-p.z,fromTrunk=Math.hypot(dx,dz);
  const ring=p.t.radius*1.65;
  const base=Math.exp(-Math.pow(fromTrunk/ring,2));
  root=Math.max(root,base*(.12+.025*p.t.tint));
  const ex=x-p.crownX,ez=z-p.crownZ;
  const anisotropy=1+.10*Math.sin(ex*.73+ez*.47+p.t.yaw);
  const distance=Math.hypot(ex,ez)*anisotropy;
  // Soft, broken penumbra. Mid-crown shade is stronger than the outer edge;
  // tree-to-tree overlap stays bounded and never turns the trail black.
  const span=p.reach*(.86+.16*p.t.tint);
  const skirt=1-smooth(span*.42,span*1.19,distance);
  const gaps=.78+.22*Math.sin(dx*.84+dz*.49+p.t.yaw*2.3);
  crown=Math.max(crown,skirt*(.078+.039*gaps));
 }
 // Quest hubs, camp, path and forest entrance all remain light and readable.
 const entrance=smooth(.27,.54,lon);
 const trailDistance=Math.abs(lat-forestTrailLatitude(lon))*261;
 const pathProtect=.58+.42*smooth(2.8,9.5,trailDistance);
 const campProtect=smooth(FOREST_CAMP.clearingRadius+1,
  FOREST_CAMP.clearingRadius+13,
  forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat));
 let clearing=campProtect;
 for(const site of FOREST_SITE_CLEARINGS)
  clearing=Math.min(clearing,smooth(site.radius+1,site.radius+10,
   forestDistance(lon,lat,site.lon,site.lat)));
 const strength=entrance*clearing*pathProtect*(1-.32*clamp(roadWear));
 return {contact:root*strength,canopy:crown*strength,
  light:1-clamp((root+crown)*strength)};
}
