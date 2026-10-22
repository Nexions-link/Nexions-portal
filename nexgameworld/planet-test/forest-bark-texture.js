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
 // Two cyclic noise octaves warp vertical grain without creating tile seams.
 const coarse=periodicNoise(u*8,v*16,8,16);
 const medium=periodicNoise(u*24,v*48,24,48);
 const fine=periodicNoise(u*64,v*128,64,128);
 const warp=.095*(coarse-.5)+.025*(medium-.5);
 const split=.5+.5*Math.cos(TAU*(11*u+warp+.045*Math.sin(TAU*(2*v+u))));
 const fissure=Math.pow(split,12);
 const fibers=.5+.5*Math.sin(TAU*(29*u+.14*Math.sin(TAU*3*v)+warp*2));
 const ridge=.72+.20*coarse+.14*medium+.10*(fibers-.5)-.52*fissure;
 const knotX=Math.abs(wrap(u-.67+.5,1)-.5);
 const knotY=Math.abs(wrap(v-.36+.5,1)-.5);
 const knot=Math.exp(-Math.pow(knotX/.07,2)-Math.pow(knotY/.058,2));
 const curved=.5+.5*Math.cos(TAU*(u*7+v*2.0));
 const fleck=(fine-.5)*.19;
 const light=clamp(ridge-.13*knot+.08*knot*curved+fleck,.23,1);
 // A neutral-grey / cool brown albedo multiplies each tree's individual tint.
 // All alpha values are 255: close-up bark cannot make the tree transparent.
 const color=[Math.round(229*light),Math.round(217*light),Math.round(199*light),255];
 // Independent monochrome relief for high-quality built-in bump mapping.
 const relief=Math.round(255*clamp(.42+.28*medium+.20*fibers-.36*fissure-.12*knot,.05,.95));
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
 return quality==='high'?{bump:true,bumpScale:.09}:
  {bump:true,bumpScale:.043};
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
   t.repeat.set(2,7);
   t.generateMipmaps=true;
   t.minFilter=THREE.LinearMipmapLinearFilter;
   t.magFilter=THREE.LinearFilter;
   t.anisotropy=2;
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
