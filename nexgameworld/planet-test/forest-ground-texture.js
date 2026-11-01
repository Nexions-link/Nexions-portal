// Safe P2.3.8-B: baked sRGB texture for the existing sphere material.
// No WebGL shader overrides, extra meshes, height changes or colliders.
import {forestTrailLatitude} from './whispering-forest.js';
import {r2ForestGrade} from './r2-materials.js?v=1';
import {paintForestGround} from './art-world-grade.js?v=1';
import {landscapeGroundPixel} from '../landscape.js?v=0.6.45.68';
import {forestContactLightAt} from './forest-contact-light.js?v=1';
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
// A natural meadow-to-forest ecotone, with an irregular spatial border.
// The original meadow texture is kept at the entrance and slowly acquires
// darker damp soil and leaf litter deeper into the forest. Baked once.
export function forestEntranceBlend(lon,lat){
 if(!Number.isFinite(lon)||!Number.isFinite(lat))return 0;
 const x=261*lon*Math.cos(lat),z=261*lat;
 const wiggle=(noise(x*.033+42,z*.033-19)-.5)*.105+
  (noise(x*.087-12,z*.087+32)-.5)*.037;
 return smooth(.305,.645,lon+wiggle);
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
export function forestGroundPixel(lon,lat,{r2=false,art=false}={}){
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
 let r=mix(91,132,.61*earth),g=mix(111,87,.61*earth),b=mix(64,57,.61*earth);
 const mossBlend=.68*moss;
 r=mix(r,60,mossBlend);g=mix(g,85,mossBlend);b=mix(b,51,mossBlend);
 const leafBlend=.49*leaves*(1-moss*.42);
 r=mix(r,145,leafBlend);g=mix(g,99,leafBlend);b=mix(b,58,leafBlend);
 const canopy=smooth(.37,.72,darkCanopy)*.20*(1-road.wear);
 r*=1-canopy;g*=1-canopy*.82;b*=1-canopy*.68;
 // A single continuous baked forest track; the former above-ground ribbon
 // is removed, so there is no double geometry, z-fighting or visible seam.
 const dusty=smooth(.30,.73,medium*.56+(1-wet)*.44);
 const roadGrain=(grit-.5)*22+(scratch-.5)*13;
 const trailR=132+26*dusty+roadGrain-road.ruts*16;
 const trailG=105+23*dusty+roadGrain*.76-road.ruts*14;
 const trailB=68+19*dusty+roadGrain*.58-road.ruts*12;
 r=mix(r,trailR,road.wear*.97);g=mix(g,trailG,road.wear*.97);
 b=mix(b,trailB,road.wear*.97);
 // Damp ruts and scattered gravel; irregular grassy shoulders.
 const mud=road.wear*road.ruts*.16*smooth(.38,.70,wet);
 r=mix(r,67,mud);g=mix(g,67,mud);b=mix(b,54,mud);
 const shoulder=road.edge*smooth(.34,.78,mineral)*.14;
 r=mix(r,70,shoulder);g=mix(g,89,shoulder);b=mix(b,54,shoulder);
 const stone=road.wear*smooth(.94,.997,hash(Math.floor(x*3.3),Math.floor(z*3.3)));
 const leafFibers=(scratch-.5)*18+(grit-.5)*9;
 const surface=1+(.12*(darkCanopy-.5));
 r=r*surface+leafFibers*(1-road.wear)+stone*31;
 g=g*surface+leafFibers*.76*(1-road.wear)+stone*27;
 b=b*surface+leafFibers*.55*(1-road.wear)+stone*20;
 const base=r2?r2ForestGrade([r,g,b],{wear:road.wear,moss,leaves,wet,canopy}):[r,g,b];
 const painted=art?paintForestGround(base,{wear:road.wear,ruts:road.ruts,
  edge:road.edge,moss,leaves,wet,earth,canopy,broad,patch,grit,scratch}):null;
 const rgb=art?painted.map((v,i)=>v*.89+base[i]*.11):base;
 // The separate high-resolution village ground ends near the 84 m rim.
 // Sample its SAME painted meadow algorithm for the woodland apron instead
 // of allowing fully dark forest soil to appear immediately beyond the rim.
 // No new canvas, shader, mesh, alpha transparency or per-frame sampling.
 const forestBlend=forestEntranceBlend(lon,lat);
 let blendedSoil=rgb;
 if(forestBlend<.999){
  const meadow=landscapeGroundPixel(x,z,[],{r2,art});
  const worn=road.wear*.94;
  const meadowRoad=[157+12*dry,125+10*dry,79+8*dry];
  const entrance=meadow.slice(0,3).map((c,i)=>mix(c,meadowRoad[i],worn));
  blendedSoil=entrance.map((c,i)=>mix(c,rgb[i],forestBlend));
 }
 // G-18: subtle real-tree root contact and broken canopy penumbra painted
 // directly into the existing opaque globe pixels, once during texture bake.
 // Suppress this in the original start zone and on readable road surfaces.
 const light=art?forestContactLightAt(lon,lat,{roadWear:road.wear}):null;
 const shadow=light?.light??1;
 const litSoil=art?blendedSoil.map((c,i)=>c*shadow*(i===0?.995:i===1?1:1.012)):blendedSoil;
 return [Math.round(mix(255,clamp(litSoil[0]/255)*255,mask)),
  Math.round(mix(255,clamp(litSoil[1]/255)*255,mask)),
  Math.round(mix(255,clamp(litSoil[2]/255)*255,mask)),255];
}
// The tile has an irregular geometric edge. Feather its outermost
// existing texels to the EXACT neighbouring globe texture colour; the
// central village retains its unchanged material/palette and route marks.
export function forestEntranceTilePixel(x,z,villagePixel,{radius=261,r2=false,art=false}={}){
 if(!Number.isFinite(x)||!Number.isFinite(z)||!Array.isArray(villagePixel))
  throw new TypeError('Invalid village terrain sample');
 const distance=Math.hypot(x,z);
 if(distance<=68||x<=49)return villagePixel;
 const theta=distance/radius,projection=Math.sin(theta)/distance;
 const nx=x*projection,ny=z*projection,nz=Math.cos(theta);
 const lon=Math.atan2(nx,nz),lat=Math.asin(Math.max(-1,Math.min(1,ny)));
 // Keep the original texture everywhere outside the woodland entrance.
 const mask=forestTextureMask(lon,lat);
 const feather=smooth(68,81,distance)*smooth(.36,.985,mask);
 if(feather<=.0001)return villagePixel;
 const forestPixel=forestGroundPixel(lon,lat,{r2,art});
 return villagePixel.map((c,i)=>i===3?255:Math.round(mix(c,forestPixel[i],feather)));
}
export function buildForestGroundPixels(width=1024,height=512,{r2=false,art=false}={}){
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
   const pixel=forestGroundPixel(lon,lat,{r2,art});
   bytes.set(pixel,i);
  }
 }
 return bytes;
}
export function createForestGroundTexture(THREE,{width=2048,height=1024,documentRef=globalThis.document,r2=false,art=false}={}){
 if(!documentRef?.createElement)return null;
 try{
  const canvas=documentRef.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  const image=ctx.createImageData(width,height);
  image.data.set(buildForestGroundPixels(width,height,{r2,art}));
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
