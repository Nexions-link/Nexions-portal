// NGW R2-01. Original terrain palette and reusable 128px PBR relief.
// No world geometry, camera, collision, server or additional render passes.
const clamp=v=>Math.max(0,Math.min(1,v));
const mix=(a,b,t)=>a+(b-a)*clamp(t);
const color=v=>Math.round(Math.max(0,Math.min(255,v)));
export function r2MeadowGrade([r,g,b],{worn=0,earth=0,moss=0,dry=0,moisture=0,clump=0}={}){
 const living=(1-clamp(worn))*(.42+.27*clamp(moss));
 r=mix(r,65+29*dry+20*earth+8*(clump-.5),living);
 g=mix(g,127+20*(1-dry)+8*(moisture-.5),living);
 b=mix(b,43+19*moss+11*earth,living);
 const packed=clamp(worn)*.53;
 r=mix(r,182-19*moisture+10*dry,packed);
 g=mix(g,132-17*moisture+9*dry,packed);
 b=mix(b,78-12*moisture+7*dry,packed);
 return [color(r),color(g),color(b)];
}
export function r2ForestGrade([r,g,b],{wear=0,moss=0,leaves=0,wet=0,canopy=0}={}){
 const natural=1-clamp(wear),living=natural*(.26+.40*clamp(moss));
 r=mix(r,53+22*leaves,living);
 g=mix(g,90+26*moss-13*canopy,living);
 b=mix(b,43+15*wet+8*canopy,living);
 const cover=natural*.32*leaves;
 r=mix(r,135,cover);g=mix(g,91,cover);b=mix(b,55,cover);
 const trail=clamp(wear)*.61;
 r=mix(r,183-32*wet,trail);
 g=mix(g,131-24*wet,trail);
 b=mix(b,77-11*wet,trail);
 return [color(r),color(g),color(b)];
}
function hash(x,y,n){
 x=((x%n)+n)%n;y=((y%n)+n)%n;
 let k=Math.imul(x+17,374761393)^Math.imul(y+29,668265263);
 k=Math.imul(k^(k>>>13),1274126177);
 return ((k^(k>>>16))>>>0)/4294967295;
}
function noise(x,y,n){
 const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
 return mix(mix(hash(ix,iy,n),hash(ix+1,iy,n),sx),
  mix(hash(ix,iy+1,n),hash(ix+1,iy+1,n),sx),sy);
}
export function buildR2MaterialDetail(size=128){
 if(!Number.isInteger(size)||size<16||size>512||(size&(size-1)))throw RangeError('Invalid R2 tile size');
 const height=new Float32Array(size*size),normal=new Uint8Array(size*size*4),
  roughness=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size;
  height[y*size+x]=.50*noise(u*8,v*8,8)+.31*noise(u*32,v*32,32)+.19*noise(u*64,v*64,64);
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const at=(y*size+x)*4,left=height[y*size+(x+size-1)%size],
   right=height[y*size+(x+1)%size],up=height[((y+size-1)%size)*size+x],
   down=height[((y+1)%size)*size+x];
  const nx=(left-right)*1.1,ny=(up-down)*1.1,magnitude=Math.hypot(nx,ny,1);
  normal[at]=color((nx/magnitude*.5+.5)*255);
  normal[at+1]=color((ny/magnitude*.5+.5)*255);
  normal[at+2]=color((1/magnitude*.5+.5)*255);normal[at+3]=255;
  const r=color((.84+.13*height[y*size+x])*255);
  roughness[at]=roughness[at+1]=roughness[at+2]=r;roughness[at+3]=255;
 }
 return {normal,roughness,size};
}
export function createR2MaterialMaps(THREE,{size=128,repeatX=95,repeatY=95}={}){
 const pixels=buildR2MaterialDetail(size);
 const make=(data,name)=>{
  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
  texture.name='NGW R2 original '+name;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(repeatX,repeatY);
  texture.colorSpace=THREE.NoColorSpace;
  texture.generateMipmaps=true;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.magFilter=THREE.LinearFilter;
  texture.needsUpdate=true;
  return texture;
 };
 const normalMap=make(pixels.normal,'soil normal'),roughnessMap=make(pixels.roughness,'soil roughness');
 return {normalMap,roughnessMap,dispose(){normalMap.dispose();roughnessMap.dispose();}};
}
