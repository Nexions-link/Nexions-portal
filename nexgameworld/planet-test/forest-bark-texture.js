// Procedural tree-bark atlas, shared by every instanced forest trunk, high
// branch and fallen log. Uses stock Three.js materials, never a custom shader.
// UVs tile on the source CylinderGeometry, and zero new physics meshes are added.
const TAU=Math.PI*2;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=t=>{const x=clamp(t);return x*x*(3-2*x)};
const wrap=(n,p)=>((n%p)+p)%p;
const hash=(x,y)=>{
 let n=Math.imul(x,374761393)^Math.imul(y,668265263);
 n=Math.imul(n^(n>>>13),1274126177);
 return ((n^(n>>>16))>>>0)/4294967295;
};
function periodicNoise(x,y,periodX,periodY){
 const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy);
 const sample=(dx,dy)=>hash(wrap(ix+dx,periodX),wrap(iy+dy,periodY));
 return (sample(0,0)*(1-u)+sample(1,0)*u)*(1-v)+
  (sample(0,1)*(1-u)+sample(1,1)*u)*v;
}
export const FOREST_BARK_TEXTURE_SIZE=Object.freeze({width:256,height:512});
export function forestBarkPixel(u,v){
 if(!Number.isFinite(u)||!Number.isFinite(v))throw new RangeError('Invalid bark UV');
 u=wrap(u,1);v=wrap(v,1);
 // Three periodic octaves warp growth cracks in both directions, keeping the
 // tile seamless. Existing stock bump map supplies close-range depth.
 const coarse=periodicNoise(u*8,v*16,8,16);
 const medium=periodicNoise(u*24,v*48,24,48);
 const fine=periodicNoise(u*64,v*128,64,128);
 const warp=.11*(coarse-.5)+.034*(medium-.5);
 // Long, crooked old-growth fissures, broken by transverse plate ridges.
 const grain=11*u+warp+.068*Math.sin(TAU*(2*v+u));
 const longSplit=.5+.5*Math.cos(TAU*grain);
 const primaryCrack=Math.pow(longSplit,14);
 const secondaryCrack=Math.pow(.5+.5*Math.cos(
  TAU*(29*u+.08*Math.sin(TAU*(3*v+2*u))+warp*2)),22)*.38;
 const plate=.5+.5*Math.sin(TAU*(5*v+.12*Math.sin(TAU*4*u)+.09*medium));
 const raisedBark=smooth(.26+.40*coarse+.23*medium+.19*plate);
 const ridge=Math.pow(Math.max(0,1-primaryCrack),1.3);
 const knotX=Math.abs(wrap(u-.67+.5,1)-.5);
 const knotY=Math.abs(wrap(v-.36+.5,1)-.5);
 const knot=Math.exp(-Math.pow(knotX/.065,2)-Math.pow(knotY/.047,2));
 // Pale lichen islands in the recesses, not evenly painted green stripes.
 const lichen=smooth((coarse*.52+medium*.33+fine*.15-.68)*5.2)*
  (.42+.58*Math.max(0,.5+.5*Math.sin(TAU*(3*u-2*v))))*
  (1-primaryCrack);
 const splinters=(fine-.5)*.17+.065*Math.sin(TAU*(7*v+3*u))*raisedBark;
 const light=clamp(.59+.29*raisedBark+.13*ridge+
  .12*plate-.62*primaryCrack-.25*secondaryCrack-
  .17*knot+splinters,.18,1.09);
 // Neutral ochre/grey bark: instance colours still distinguish each tree.
 // Lichen changes hue locally, not the tree's entire material.
 const color=[
  Math.round(255*clamp(.89*light-.15*lichen)),
  Math.round(255*clamp(.85*light+.055*lichen)),
  Math.round(255*clamp(.77*light-.085*lichen)),255];
 const relief=Math.round(255*clamp(.33+.31*raisedBark+.18*plate+
  .11*(fine-.5)-.43*primaryCrack-.20*secondaryCrack-.12*knot,.035,.98));
 return {color,relief};
}
export function buildForestBarkPixels(width=256,height=512){
 if(!Number.isInteger(width)||!Number.isInteger(height)||
  width<16||height<16||width>1024||height>1024)throw new RangeError('Invalid bark map size');
 const color=new Uint8Array(width*height*4),bump=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const pixel=forestBarkPixel((x+.5)/width,(y+.5)/height);
  const i=(y*width+x)*4;
  color.set(pixel.color,i);
  bump[i]=bump[i+1]=bump[i+2]=pixel.relief;bump[i+3]=255;
 }
 return {color,bump,width,height};
}
export function forestBarkQuality(quality='balanced',preview=false){
 if(preview||quality==='economy')return {bump:false,bumpScale:0};
 return quality==='high'?{bump:true,bumpScale:.11}:
  {bump:true,bumpScale:.057};
}
export function createForestBarkTextures(THREE){
 if(typeof THREE?.DataTexture!=='function')return null;
 let map=null,bumpMap=null;
 try{
  const data=buildForestBarkPixels();
  const create=(bytes,srgb)=>{
   const t=new THREE.DataTexture(bytes,data.width,data.height,THREE.RGBAFormat);
   t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
   t.wrapS=t.wrapT=THREE.RepeatWrapping;
   t.repeat.set(2,5);
   t.generateMipmaps=true;
   t.minFilter=THREE.LinearMipmapLinearFilter;
   t.magFilter=THREE.LinearFilter;
   t.anisotropy=3;
   t.needsUpdate=true;
   return t;
  };
  map=create(data.color,true);bumpMap=create(data.bump,false);
  map.name='NexGameWorld procedural bark albedo';
  bumpMap.name='NexGameWorld procedural bark relief';
  return {map,bumpMap};
 }catch(error){
  map?.dispose?.();bumpMap?.dispose?.();
  console.warn('Bark textures unavailable, using solid opaque wood',error);
  return null;
 }
}
