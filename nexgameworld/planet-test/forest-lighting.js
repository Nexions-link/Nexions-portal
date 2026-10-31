// P2.3.5: forest microclimate and soft sunbreaks. Rendering only;
// no WebSocket, combat, navigation or authoritative physics mutations.
import {FOREST_CAMP,FOREST_SITE_CLEARINGS,createForestLayout,forestDistance,
 forestMoodAt,forestTrailLatitude} from './whispering-forest.js';
const TAU=Math.PI*2;
const clamp01=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const smooth=(a,b,v)=>{const u=clamp01((v-a)/(b-a));return u*u*(3-2*u)};

// Deep paths have reduced canopy illumination, while the scouts' fire and
// survey clearings remain legible. Pure function, deterministic on every client.
export function forestCanopyShadeAt(lon,lat){
 if(!Number.isFinite(lon)||!Number.isFinite(lat))return 0;
 const mood=forestMoodAt(lon,lat);
 if(mood<=0)return 0;
 const away=Math.abs(lat-forestTrailLatitude(lon))*261;
 const gaps=.5+.5*Math.sin(lon*17.3+Math.cos(lat*29)*1.6);
 const depth=(.26+.43*smooth(.38,1.22,lon)+.18*gaps)*
  (1-.22*smooth(35,105,away));
 const campLight=smooth(19,43,forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat));
 let sites=1;
 for(const site of FOREST_SITE_CLEARINGS)
  sites=Math.min(sites,smooth(site.radius+1,site.radius+13,
   forestDistance(lon,lat,site.lon,site.lat)));
 return clamp01(mood*depth*campLight*sites);
}

// Keep the player, combat tells and quest labels readable even at maximum
// shade; all changes interpolate between the existing daytime light values.
export function forestLightResponse(shade,exposure=1.14){
 const d=clamp01(shade),e=Number.isFinite(exposure)?exposure:1.14;
 return {
  hemi:1.95*(1-.32*d),
  sun:2.50*(1-.34*d),
  fill:.62*(1-.12*d),
  exposure:e*(1-.038*d)
 };
}

export function forestSunbreakLayout(seed=57021){
 let state=seed>>>0;
 const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const trees=createForestLayout().trees,spots=[];
 for(let tries=0;tries<250&&spots.length<22;tries++){
  const lon=.35+rand()*1.01;
  const side=rand()<.5?-1:1;
  const lat=forestTrailLatitude(lon)+side*(.6+rand()*2.6)/261;
  const radius=1.3+rand()*1.1;
  if(forestMoodAt(lon,lat)<.34)continue;
  if(forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat)<37)continue;
  if(FOREST_SITE_CLEARINGS.some(p=>forestDistance(lon,lat,p.lon,p.lat)<p.radius+9))continue;
  if(trees.some(t=>forestDistance(lon,lat,t.lon,t.lat)<t.radius*.78+radius+.45))continue;
  if(spots.some(p=>forestDistance(lon,lat,p.lon,p.lat)<p.radius+radius+5))continue;
  spots.push({lon,lat,radius,yaw:rand()*TAU,tint:rand()});
 }
 return spots;
}

// Four-channel vertex colours give each pool a soft fading rim without
// textures, costly additional point lights, or a shader compilation path.
function sunPoolGeometry(THREE){
 // Dappled canopy light. Each shared instance scatters nine soft leaf-shaped
 // islands, replacing an artificial perfect glowing disc. One draw call.
 const position=[],color=[],islands=9,facets=9;
 for(let leaf=0;leaf<islands;leaf++){
  const phase=leaf*2.399963229728653,radial=leaf===0?0:.24+.11*(leaf%4);
  const cx=radial*Math.cos(phase),cz=radial*Math.sin(phase);
  const width=.21+.075*(leaf%3),depth=.17+.06*((leaf+1)%3);
  for(let i=0;i<facets;i++){
   const make=(a,r,opacity)=>{
    const w=1+.14*Math.sin(a*3+leaf*.75);
    position.push(cx+Math.cos(a)*width*r*w,0,
     cz+Math.sin(a)*depth*r*w);
    color.push(1,1,1,opacity);
   };
   make(0,0,.18+.09*(leaf%3)/2);
   make(i*TAU/facets,1,0);
   make((i+1)*TAU/facets,1,0);
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(position,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(color,4));
 geo.computeVertexNormals();return geo;
}

export function createForestLightPools(THREE,{scene,radius,heightAt,r2Lighting=false}){
 const spots=forestSunbreakLayout();
 const material=new THREE.MeshBasicMaterial({
  color:r2Lighting?'#ffe5b1':'#f7dba1',vertexColors:true,transparent:true,opacity:r2Lighting?.96:.80,depthWrite:false,
  side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2
 });
 const pool=new THREE.InstancedMesh(sunPoolGeometry(THREE),material,spots.length);
 pool.name='forest-canopy-sunbreaks';pool.frustumCulled=false;
 const up=new THREE.Vector3(0,1,0),n=new THREE.Vector3();
 const align=new THREE.Quaternion(),turn=new THREE.Quaternion(),object=new THREE.Object3D();
 const tint=new THREE.Color();
 for(let i=0;i<spots.length;i++){
  const p=spots[i];
  n.set(Math.cos(p.lat)*Math.sin(p.lon),Math.sin(p.lat),Math.cos(p.lat)*Math.cos(p.lon));
  object.position.copy(n).multiplyScalar(radius+heightAt(n)+.13);
  object.quaternion.copy(align.setFromUnitVectors(up,n))
   .multiply(turn.setFromAxisAngle(up,p.yaw));
  object.scale.set(p.radius,1,p.radius*.72);object.updateMatrix();
  pool.setMatrixAt(i,object.matrix);
  pool.setColorAt(i,tint.set(r2Lighting?(p.tint>.5?'#f6dc9b':'#efcb83'):(p.tint>.5?'#f3dda9':'#e3c993')));
 }
 pool.instanceMatrix.needsUpdate=true;
 pool.renderOrder=1;
 scene.add(pool);
 function setQuality(preset='balanced',preview=false){
  pool.count=preview?0:preset==='economy'?5:preset==='high'?spots.length:13;
 }
 setQuality();
 return {setQuality,spotCount:spots.length,spots};
}
