// NGW-ART-REMASTER-001 / G-12 — original multi-scale ancient bark.
// One UV-continuous atlas for trunks, raised branches and fallen timber.
// No custom shaders, geometry, world state, physics, textures from other games.
import {WORLD_ART_PALETTE as ART} from './world-art-style.js?v=1';
const TAU=2*Math.PI;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=t=>{const x=clamp(t);return x*x*(3-2*x);};
const wrap=(v,p)=>((v%p)+p)%p;
const hash=(x,y)=>{
 let n=Math.imul(x,374761393)^Math.imul(y,668265263);
 n=Math.imul(n^(n>>>13),1274126177);
 return ((n^(n>>>16))>>>0)/4294967295;
};
function periodicNoise(x,y,periodX,periodY){
 const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy);
 const at=(dx,dy)=>hash(wrap(ix+dx,periodX),wrap(iy+dy,periodY));
 return (at(0,0)*(1-u)+at(1,0)*u)*(1-v)+
  (at(0,1)*(1-u)+at(1,1)*u)*v;
}
export const FOREST_BARK_G12_VERSION='R1-G12-1';
export const FOREST_BARK_TEXTURE_SIZE=Object.freeze({width:256,height:512});
// Four botanically informed wood tones are instance-color tints on the SAME
// texture and the SAME 400-trunk InstancedMesh; no extra materials/draw calls.
export function forestBarkSpeciesTint(tree,part='trunk'){
 if(!['trunk','branch','fallen'].includes(part))throw new RangeError('Unknown wood part');
 const variant=clamp(Number(tree?.tint)||0);
 if(part==='fallen')return variant>.55?'#766552':'#675441';
 if(tree?.evergreen){
  const set=part==='branch'?['#827260','#6c6156']:['#84735f','#766b5d'];
  return set[variant>.5?0:1];
 }
 const set=part==='branch'?['#99856d','#8a745e']:['#a18a72','#927963'];
 return set[variant>.5?0:1];
}
export function forestBarkPixel(u,v){
 if(!Number.isFinite(u)||!Number.isFinite(v))
  throw new RangeError('Invalid bark UV');
 u=wrap(u,1);v=wrap(v,1);
 const coarse=periodicNoise(u*8,v*12,8,12);
 const medium=periodicNoise(u*24,v*40,24,40);
 const fine=periodicNoise(u*64,v*128,64,128);
 // Long, crooked longitudinal fibers are continuous over each tile edge.
 const warp=.063*(coarse-.5)+.025*(medium-.5)+
  .015*Math.sin(TAU*(3*v+Math.sin(TAU*u)));
 const grainU=u+warp;
 const vein=.5+.5*Math.cos(TAU*(11*grainU+
  .054*Math.sin(TAU*(2*v+u))));
 const fissure=Math.pow(vein,11);
 const secondary=.5+.5*Math.cos(TAU*(23*grainU-.08*Math.sin(TAU*(5*v+u))));
 const split=Math.pow(secondary,17)*.50;
 // Brief bark cross-checks connect deep furrows, without painted stripes.
 const transverse=.5+.5*Math.cos(TAU*(7*v+.11*Math.sin(TAU*(3*u+2*v))));
 const fracture=Math.pow(transverse,18)*(.16+.48*fissure);
 const groove=clamp(fissure*.80+split*.24+fracture*.25);
 const fibers=.5+.5*Math.sin(TAU*(29*grainU+
  .075*Math.sin(TAU*(4*v+u))));
 const swell=.55+.45*coarse;
 const ridge=.59+.22*swell+.12*medium+.11*fibers+.09*(fine-.5);
 const moss=clamp((coarse*.48+medium*.35+fine*.17-.55)*2.9)*
  (.5+.5*Math.cos(TAU*(3*u+2*v)));
 const deep=clamp(groove*.75+.12*(1-medium));
 const light=clamp(ridge-.56*groove+.13*(1-groove)*fibers,.18,.99);
 // Raised warm fibers and olive moss in pockets. Albedo stays fully opaque.
 const warm=(1-groove)*(.3+.7*fibers);
 const rgb=ART.wood.albedo.map((component,i)=>{
  const warmth=[1.05,.99,.88][i],mossTone=[.50,.78,.48][i];
  const base=component*clamp(light*warmth+.045*warm,.10,1);
  return Math.round(clamp(base*(1-.44*moss)+component*mossTone*.44*moss,0,255));
 });
 // The R1 silhouette is preserved: deep cuts are shader relief, not invisible
 // solid blockers. Roughness is carried in G (Three MeshStandardMaterial).
 const relief=Math.round(255*clamp(.31+.41*ridge-.45*groove+.10*fibers,.035,.98));
 const roughness=Math.round(255*clamp(.72+.25*deep+.08*moss-.10*warm,.60,.99));
 return {color:[...rgb,255],relief,roughness,fissure:groove,moss};
}
export function buildForestBarkPixels(width=256,height=512){
 if(!Number.isInteger(width)||!Number.isInteger(height)||
  width<16||height<16||width>1024||height>1024)
  throw new RangeError('Invalid bark map size');
 const color=new Uint8Array(width*height*4),bump=new Uint8Array(color.length),
  roughness=new Uint8Array(color.length);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=forestBarkPixel((x+.5)/width,(y+.5)/height),i=(y*width+x)*4;
  color.set(p.color,i);
  bump[i]=bump[i+1]=bump[i+2]=p.relief;bump[i+3]=255;
  roughness[i]=roughness[i+1]=roughness[i+2]=p.roughness;roughness[i+3]=255;
 }
 return {color,bump,roughness,width,height};
}
export function forestBarkQuality(quality='balanced',preview=false){
 if(preview||quality==='economy')return {bump:false,bumpScale:0};
 return quality==='high'?{bump:true,bumpScale:.105}:
  {bump:true,bumpScale:.058};
}
export function forestBarkUseRoughness(quality='balanced',preview=false){
 return !preview&&quality==='high';
}
export function createForestBarkTextures(THREE){
 if(typeof THREE?.DataTexture!=='function')return null;
 let map=null,bumpMap=null,roughnessMap=null;
 try{
  const data=buildForestBarkPixels();
  const create=(pixels,srgb)=>{
   const texture=new THREE.DataTexture(pixels,data.width,data.height,THREE.RGBAFormat);
   texture.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
   texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
   // Old 2 x 7 repeat exposed the same knot every few meters. Reduce vertical
   // repetition while preserving cyclic borders, readable detail, and UVs.
   texture.repeat.set(2,4);
   texture.generateMipmaps=true;
   texture.minFilter=THREE.LinearMipmapLinearFilter;
   texture.magFilter=THREE.LinearFilter;
   texture.anisotropy=2;
   texture.needsUpdate=true;
   return texture;
  };
  map=create(data.color,true);
  bumpMap=create(data.bump,false);
  roughnessMap=create(data.roughness,false);
  map.name='NGW G-12 hand-authored procedural bark albedo';
  bumpMap.name='NGW G-12 deep fissure and cambium bump';
  roughnessMap.name='NGW G-12 weathered wood roughness';
  return {map,bumpMap,roughnessMap};
 }catch(error){
  map?.dispose?.();bumpMap?.dispose?.();roughnessMap?.dispose?.();
  console.warn('Bark textures unavailable, using solid opaque wood',error);
  return null;
 }
}
