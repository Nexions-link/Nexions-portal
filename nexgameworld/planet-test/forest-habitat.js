// G-25: deterministic botanical niches sampled only during static art build.
// Continuous 24-43m humidity, clearing and canopy fields; no gameplay effects.
import {forestTrailLatitude,forestMoodAt,forestDistance,FOREST_CAMP,
 FOREST_SITE_CLEARINGS} from './whispering-forest.js';
import {forestCanopyShadeAt} from './forest-lighting.js';
const R=261,clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
function hash(x,y){
 let n=Math.imul(x,374761393)^Math.imul(y,668265263);
 n=Math.imul(n^(n>>>13),1274126177);
 return ((n^(n>>>16))>>>0)/4294967295;
}
function field(x,z){
 const i=Math.floor(x),j=Math.floor(z),u=smooth(0,1,x-i),v=smooth(0,1,z-j);
 return (hash(i,j)*(1-u)+hash(i+1,j)*u)*(1-v)+
  (hash(i,j+1)*(1-u)+hash(i+1,j+1)*u)*v;
}
export function forestHabitatAt(lon,lat){
 if(!Number.isFinite(lon)||!Number.isFinite(lat))throw new RangeError('Invalid forest habitat');
 const mood=clamp(forestMoodAt(lon,lat)),shade=clamp(forestCanopyShadeAt(lon,lat));
 const x=R*lon*Math.cos(lat),z=R*lat;
 const water=field(x/24+13,z/24-7),drain=field(x/43-19,z/43+31);
 const moisture=clamp(.14+.43*shade+.32*water+.23*drain-.14*(1-mood));
 const opening=clamp(1-.88*shade+.18*(water-.5));
 const trailDistance=Math.abs(lat-forestTrailLatitude(lon))*R;
 let clearing=smooth(5.5,12,trailDistance);
 clearing*=smooth(FOREST_CAMP.clearingRadius+3,FOREST_CAMP.clearingRadius+15,
  forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat));
 for(const s of FOREST_SITE_CLEARINGS)clearing*=smooth(s.radius+2,s.radius+12,
  forestDistance(lon,lat,s.lon,s.lat));
 const living=clamp(mood*clearing);
 return Object.freeze({shade,moisture,opening,trailDistance,clearing,
  grass:clamp(living*(.35+.65*opening)*(1-.35*moisture)),
  moss:clamp(living*(.16+.84*moisture)*(.25+.75*shade)),
  fern:clamp(living*(.22+.78*moisture)*(.28+.72*shade)),
  mushroom:clamp(living*(.26+.74*moisture)*(.32+.68*shade)),
  shrub:clamp(living*(.40+.60*(1-.5*shade))*(.68+.32*moisture))
 });
}
