// Safe P2.3.8-B: baked sRGB texture for the existing sphere material.
// No WebGL shader overrides, extra meshes, height changes or colliders.
import {forestTrailLatitude} from './whispering-forest.js?v=22';
import {WORLD_ART_PALETTE as ART} from './world-art-style.js?v=1';
const T=ART.terrain;
const PI=Math.PI,TAU=PI*2;
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*t;
function hash(x,z){
 let n=Math.imul(x,374761393)^Math.imul(z,668265263);
 n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;
}
function noise(x,z){
 const ix=Math.floor(x),iz=Math.floor(z),u=smooth(0,1,x-ix),v=smooth(0,1,z-iz);
 return mix(mix(hash(ix,iz),hash(ix+1,iz),u),mix(hash(ix,iz+1),hash(ix+1,iz+1),u),v);
}
export function forestTextureMask(lon,lat){
 return smooth(.14,.32,lon)*(1-smooth(1.40,1.55,lon))*
  (1-smooth(.31,.46,Math.abs(lat+.035)));
}
export function forestRoadProfile(lon,lat){
 if(!Number.isFinite(lon)||!Number.isFinite(lat))return {wear:0,ruts:0,edge:0,dist:Infinity};
 const x=261*lon*Math.cos(lat),z=261*lat;
 const dist=Math.abs(lat-forestTrailLatitude(lon))*261;
 const nibble=noise(x*.22+21,z*.22-44)-.5;
 const fine=noise(x*.69-8,z*.69+47)-.5;
 // Narrow compacted core, soft eroded shoulders and two uneven worn grooves.
 const rough=dist+nibble*1.34+fine*.39;
 const wear=1-smooth(1.36,5.50,rough);
 const ruts=Math.exp(-Math.pow((dist-1.02-nibble*.19)/.34,2))*
  (.4+.6*noise(x*.12,z*.12));
 const edge=smooth(2.0,3.4,rough)*(1-smooth(4.0,5.65,rough));
 return {wear,ruts,edge,dist};
}
export function forestGroundPixel(lon,lat){
 const mask=forestTextureMask(lon,lat);
 if(mask<=.001)return [255,255,255,255];
 const x=261*lon*Math.cos(lat),z=261*lat;
 const broad=noise(x*.045,z*.045),patch=noise(x*.17+19,z*.17-17);
 const medium=noise(x*.41-32,z*.41+15),wet=noise(x*.055+11,z*.055-27);
 const scratch=noise(x*1.23+17,z*1.23+4),grit=noise(x*3.27-6,z*3.27+18);
 const darkCanopy=noise(x*.083-27,z*.083+49);
 const mineral=noise(x*.31+37,z*.31-28);
 const dry=smooth(.34,.74,broad*.62+(1-wet)*.38);
 const earth=smooth(.35,.7,broad*.44+patch*.39+medium*.17);
 const moss=smooth(.30,.75,wet*.6+(1-broad)*.4)*(1-earth*.45);
 const leaves=smooth(.35,.77,patch*.54+medium*.30+(1-dry)*.16);
 const road=forestRoadProfile(lon,lat);
 // Deep leaf litter, exposed mineral soil, damp moss and patches of old grass.
 let r=mix(T.forestShade[0],T.forestSoil[0],.61*earth),g=mix(T.forestShade[1],T.forestSoil[1],.61*earth),b=mix(T.forestShade[2],T.forestSoil[2],.61*earth);
 const mossBlend=.68*moss;
 r=mix(r,T.forestMoss[0],mossBlend);g=mix(g,T.forestMoss[1],mossBlend);b=mix(b,T.forestMoss[2],mossBlend);
 const leafBlend=.49*leaves*(1-moss*.42);
 r=mix(r,T.forestLitter[0],leafBlend);g=mix(g,T.forestLitter[1],leafBlend);b=mix(b,T.forestLitter[2],leafBlend);
 const canopy=smooth(.37,.72,darkCanopy)*.20*(1-road.wear);
 r*=1-canopy;g*=1-canopy*.82;b*=1-canopy*.68;
 // A single continuous baked forest track; the former above-ground ribbon
 // is removed, so there is no double geometry, z-fighting or visible seam.
 const dusty=smooth(.30,.73,medium*.56+(1-wet)*.44);
 const roadGrain=(grit-.5)*22+(scratch-.5)*13;
 const trailR=T.forestTrailShade[0]+(T.forestTrailSun[0]-T.forestTrailShade[0])*dusty+roadGrain-road.ruts*16;
 const trailG=T.forestTrailShade[1]+(T.forestTrailSun[1]-T.forestTrailShade[1])*dusty+roadGrain*.76-road.ruts*14;
 const trailB=T.forestTrailShade[2]+(T.forestTrailSun[2]-T.forestTrailShade[2])*dusty+roadGrain*.58-road.ruts*12;
 r=mix(r,trailR,road.wear*.97);g=mix(g,trailG,road.wear*.97);
 b=mix(b,trailB,road.wear*.97);
 // Damp ruts and scattered gravel; irregular grassy shoulders.
 const mud=road.wear*road.ruts*.16*smooth(.38,.70,wet);
 r=mix(r,T.wetRuts[0],mud);g=mix(g,T.wetRuts[1],mud);b=mix(b,T.wetRuts[2],mud);
 const shoulder=road.edge*smooth(.34,.78,mineral)*.14;
 r=mix(r,T.vergeGrass[0],shoulder);g=mix(g,T.vergeGrass[1],shoulder);b=mix(b,T.vergeGrass[2],shoulder);
 const stone=road.wear*smooth(.94,.997,hash(Math.floor(x*3.3),Math.floor(z*3.3)));
 const leafFibers=(scratch-.5)*18+(grit-.5)*9;
 const surface=1+(.12*(darkCanopy-.5));
 r=r*surface+leafFibers*(1-road.wear)+stone*31;
 g=g*surface+leafFibers*.76*(1-road.wear)+stone*27;
 b=b*surface+leafFibers*.55*(1-road.wear)+stone*20;
 return [Math.round(mix(255,clamp(r/255)*255,mask)),
  Math.round(mix(255,clamp(g/255)*255,mask)),
  Math.round(mix(255,clamp(b/255)*255,mask)),255];
}
export function buildForestGroundPixels(width=1024,height=512){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<4||height<4||
  width>2048||height>1024)throw new RangeError('invalid texture dimensions');
 const bytes=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++){
  // Canvas top row is the north pole. SphereGeometry UV mapping is
  // lon = 2*pi*u - pi/2, lat = pi*(v-.5), with CanvasTexture flipY=true.
  const lat=PI*(.5-(y+.5)/height);
  for(let x=0;x<width;x++){
   let lon=TAU*(x+.5)/width-PI*.5;
   if(lon>PI)lon-=TAU;
   const i=(y*width+x)*4;
   if(lon<.14||lon>1.55||Math.abs(lat+.035)>.46){
    bytes[i]=bytes[i+1]=bytes[i+2]=bytes[i+3]=255;continue;
   }
   const pixel=forestGroundPixel(lon,lat);
   bytes.set(pixel,i);
  }
 }
 return bytes;
}
export function createForestGroundTexture(THREE,{width=2048,height=1024,documentRef=globalThis.document}={}){
 if(!documentRef?.createElement)return null;
 try{
  const canvas=documentRef.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  const image=ctx.createImageData(width,height);
  image.data.set(buildForestGroundPixels(width,height));
  ctx.putImageData(image,0,0);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.name='NexGameWorld organic forest ground, opaque';
  texture.generateMipmaps=true;
  return texture;
 }catch(error){
  // Keep original green vertex colours instead of ever making the globe vanish.
  console.warn('Forest texture unavailable; using opaque base sphere',error);
  return null;
 }
}
