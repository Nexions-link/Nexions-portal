// Six collision-safe spawn points shared by browser and authoritative server.
import {forestTrailLatitude,forestLocalPoint,blocksForestAtLocal,
 forestDistance,FOREST_CAMP,FOREST_SITE_CLEARINGS} from './whispering-forest.js';
export const FOREST_WOLF_LEVELS=Object.freeze([5,5,6,6,7,7]);
const locations=[];
for(let i=0;i<FOREST_WOLF_LEVELS.length;i++){
 const base=[.60,.71,.81,1.02,1.20,1.33][i],side=i%2?1:-1;
 let found=null;
 for(let k=0;k<180;k++){
  const lon=base+(k%15-7)*.009;
  const lat=forestTrailLatitude(lon)+side*(.18+Math.floor(k/15)*.009);
  if(lon<.52||lon>1.42)continue;
  const point=forestLocalPoint(lon,lat);
  if(blocksForestAtLocal(point.x,point.z,5.1))continue;
  if(forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat)<36)continue;
  if(FOREST_SITE_CLEARINGS.some(s=>forestDistance(lon,lat,s.lon,s.lat)<15))continue;
  if(locations.some(p=>Math.hypot(p.x-point.x,p.z-point.z)<18))continue;
  found=Object.freeze({...point,lon,lat,level:FOREST_WOLF_LEVELS[i]});break;
 }
 if(!found)throw Error('forest_wolf_spawn_blocked_'+i);
 locations.push(found);
}
export const FOREST_WOLF_SPAWNS=Object.freeze(locations);
