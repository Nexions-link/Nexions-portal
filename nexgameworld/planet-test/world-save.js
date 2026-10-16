// Offline-only Planet Test view persistence. Independent of the RPG save
// and of the production NexGame account/settings.
export const PLANET_VIEW_KEY='nexgame-planet-test-world-view-v1';
const finite=(value,min,max,fallback)=>typeof value==='number'&&Number.isFinite(value)?
 Math.max(min,Math.min(max,value)):fallback;
export function validatePlanetView(raw,allowedRadii=[87,174,261]){
 if(!raw||typeof raw!=='object'||raw.schema!==1)return null;
 const radius=allowedRadii.includes(raw.radius)?raw.radius:null;
 const n=raw.normal;
 if(radius===null||!Array.isArray(n)||n.length!==3||n.some(x=>typeof x!=='number'||!Number.isFinite(x)))return null;
 const d=Math.hypot(...n);
 if(d<.95||d>1.05)return null;
 return {
  radius,normal:n.map(x=>x/d),
  heading:finite(raw.heading,-Math.PI*4,Math.PI*4,0),
  cameraHeading:finite(raw.cameraHeading,-Math.PI*4,Math.PI*4,0),
  cameraPitch:finite(raw.cameraPitch,-.15,1.22,.36),
  zoom:finite(raw.zoom,6,44,13),
  orbit:raw.orbit===true,
  cameraFollow:raw.cameraFollow===true,
  orbitAngle:finite(raw.orbitAngle,-1000,1000,.45),
  orbitElevation:finite(raw.orbitElevation,-1.12,1.12,.34),
  orbitDistance:finite(raw.orbitDistance,1.6,5.5,3.22),
  lonUnwrapped:finite(raw.lonUnwrapped,-1e8,1e8,0),
  meters:finite(raw.meters,0,1e9,0)
 };
}
export function readPlanetView(storage,allowedRadii=[87,174,261]){
 try{return validatePlanetView(JSON.parse(storage.getItem(PLANET_VIEW_KEY)),allowedRadii);}
 catch{return null;}
}
export function writePlanetView(storage,state,radius){
 try{
  const data={
   schema:1,radius,normal:[state.normal.x,state.normal.y,state.normal.z],
   heading:state.heading,cameraHeading:state.cameraHeading,
   cameraPitch:state.cameraPitch,zoom:state.zoom,
   orbit:state.orbit,cameraFollow:state.cameraFollow===true,orbitAngle:state.orbitAngle,
   orbitElevation:state.orbitElevation,orbitDistance:state.orbitDistance,
   lonUnwrapped:state.lonUnwrapped,meters:state.meters
  };
  if(!validatePlanetView(data,[radius]))return false;
  storage.setItem(PLANET_VIEW_KEY,JSON.stringify(data));
  return true;
 }catch{return false;}
}
