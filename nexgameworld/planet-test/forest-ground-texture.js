// Safe P2.3.8-B: baked sRGB texture for the existing sphere material.
// No WebGL shader overrides, extra meshes, height changes or colliders.
import {forestTrailLatitude} from './whispering-forest.js';
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
export function forestGroundPixel(lon,lat){
 const mask=forestTextureMask(lon,lat);
 if(mask<=.001)return [255,255,255,255];
 const x=261*lon*Math.cos(lat),z=261*lat;
 const broad=noise(x*.045,z*.045),patch=noise(x*.17+19,z*.17-17);
 const medium=noise(x*.41-32,z*.41+15);
 const wet=noise(x*.055+11,z*.055-27);
 const dry=smooth(.36,.72,broad*.62+(1-wet)*.38);
 const earth=smooth(.37,.69,broad*.46+patch*.36+medium*.18);
 const moss=smooth(.30,.73,wet*.63+(1-broad)*.37)*(1-earth*.56);
 const leaves=smooth(.37,.75,patch*.59+medium*.41);
 const dist=Math.abs(lat-forestTrailLatitude(lon))*261;
 const path=1-smooth(2.0,5.4,dist+(medium-.5)*1.6);
 // sRGB colours: grass, exposed moist earth, moss and dry leaf litter.
 let r=mix(99,118,.62*earth),g=mix(119,85,.62*earth),b=mix(68,55,.62*earth);
 const blendMoss=.64*moss;
 r=mix(r,66,blendMoss);g=mix(g,87,blendMoss);b=mix(b,56,blendMoss);
 const blendLeaf=.30*leaves*(1-moss*.52);
 r=mix(r,151,blendLeaf);g=mix(g,108,blendLeaf);b=mix(b,65,blendLeaf);
 // Existing road receives baked compacted dirt, no overlapping polygon.
 r=mix(r,145,path*.96);g=mix(g,117,path*.96);b=mix(b,82,path*.96);
 // Low-frequency canopy mottling, needle fall and grit break the smooth
 // colour blanket without touching terrain geometry or its opacity.
 const canopy=noise(x*.088-27,z*.088+49);
 const dapple=smooth(.39,.73,canopy)*(1-path)*.13*mask;
 const needles=(noise(x*.61+64,z*.61-23)-.5)*22*(1-path);
 const grain=(noise(x*1.34+4,z*1.34+15)-.5)*21+needles;
 const fleck=(noise(x*3.28+37,z*3.28-13)-.5)*9;
 r*=1-dapple;g*=1-dapple*.88;b*=1-dapple*.74;
 r=clamp((r+grain+fleck)/255)*255;
 g=clamp((g+grain*.86+fleck*.68)/255)*255;
 b=clamp((b+grain*.67+fleck*.47)/255)*255;
 return [
  Math.round(mix(255,r,mask)),
  Math.round(mix(255,g,mask)),
  Math.round(mix(255,b,mask)),255];
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
export function createForestGroundTexture(THREE,{width=1280,height=640,documentRef=globalThis.document}={}){
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
