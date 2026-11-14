// Original painted surfaces for the articulated orc. No downloaded artwork.
// UVs remain neutral across the sculpted lofts: color belongs to each actor's
// material, while the small albedo/height/roughness atlases are shared.
const textureCache=new WeakMap();
const TAU=Math.PI*2;
const clamp=(x,min=0,max=1)=>Math.max(min,Math.min(max,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t)};
function random(seed){
 let state=seed>>>0;
 return ()=>((state=Math.imul(state,1664525)+1013904223|0)>>>0)/4294967296;
}
function noiseGrid(seed,width,height){
 const next=random(seed),values=Array.from({length:width*height},()=>next()*2-1);
 return (u,v)=>{
  const x=u*width,y=v*height,ix=Math.floor(x),iy=Math.floor(y);
  const a=smooth(x-ix),b=smooth(y-iy);
  const at=(px,py)=>values[((py%height+height)%height)*width+(px%width+width)%width];
  return (at(ix,iy)*(1-a)+at(ix+1,iy)*a)*(1-b)+
   (at(ix,iy+1)*(1-a)+at(ix+1,iy+1)*a)*b;
 };
}
function stroke(u,v,ax,ay,bx,by,width){
 const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
 const t=clamp(((u-ax)*dx+(v-ay)*dy)/length);
 const distance=Math.hypot(u-ax-dx*t,v-ay-dy*t);
 return (1-smooth(distance/width))*Math.sin(Math.PI*t);
}
function sampleSurface(kind){
 const broad=noiseGrid(373,5,7),grain=noiseGrid(197,23,27),fine=noiseGrid(719,89,83);
 const next=random(92),scuffs=Array.from({length:18},()=>{
  const x=.08+next()*.84,y=.08+next()*.84;
  return [x,y,x+.012+next()*.05,y+.006+next()*.08];
 });
 return (u,v,x,y)=>{
  const large=broad(u,v),small=grain(u,v),micro=fine(u,v);
  const edge=clamp(Math.pow(Math.abs(u*2-1),26)+Math.pow(Math.abs(v*2-1),26));
  let color,height=.5,roughness=.9;
  if(kind==='skin'){
   // Broad, warm painted planes carry the form. Pores remain low contrast;
   // a few fine healed marks never turn the skin into a noise-covered ball.
   const scar=stroke(u,v,.16,.31,.30,.40,.005)+
    stroke(u,v,.67,.63,.78,.68,.0035);
   const rim=stroke(u,v+.004,.16,.31,.30,.40,.006)+
    stroke(u,v+.003,.67,.63,.78,.68,.004);
   const planes=.047*large+.019*small+.004*micro;
   const tone=.94+planes-.065*scar+.035*rim;
   color=[231*tone+large*3,228*tone,205*tone-large*2];
   height=.51+.055*large+.027*small+.012*micro-.10*scar+.06*rim;
   roughness=.92+.025*small;
  }else if(kind==='leather'){
   const seam=Math.exp(-Math.pow((v-.065)/.011,2))+
    Math.exp(-Math.pow((v-.935)/.011,2));
   const row=(u/.065)%1;
   const stitch=(1-smooth(Math.abs(row-.5)/.22))*
    (Math.exp(-Math.pow((v-.045-(row-.5)*.012)/.0038,2))+
     Math.exp(-Math.pow((v-.955-(row-.5)*.012)/.0038,2)));
   const creases=Math.pow(clamp(-small-.19)*1.25,2);
   const worn=.075*edge+.028*large;
   const tone=.91+worn+.024*small+.008*micro-.045*creases-.095*seam;
   color=[225*tone+stitch*22,207*tone+stitch*25,178*tone+stitch*23];
   height=.52+.075*large+.038*small-.075*seam+.07*stitch;
   roughness=.91-.10*edge+.035*small;
  }else if(kind==='metal'){
   let scratch=0;
   for(const line of scuffs)scratch+=stroke(u,v,...line,.0023);
   const hammered=.035*large+.022*small;
   const brushed=Math.sin(TAU*(v*36+.055*Math.sin(u*TAU*3)))*.006;
   const tone=.91+hammered+brushed+.15*edge+.065*scratch;
   color=[195*tone,207*tone,216*tone];
   height=.5+.08*large+.035*small-.065*scratch;
   roughness=.61+.035*small-.18*edge-.11*scratch;
  }else if(kind==='bone'){
   const growth=Math.sin(TAU*(u*17+.14*Math.sin(v*TAU*2)));
   const tone=.95+.028*large+.012*small+growth*.011;
   color=[247*tone,233*tone,203*tone];
   height=.51+.021*large+.018*growth;
   roughness=.78+.025*small;
  }else if(kind==='hair'){
   const direction=u*32+Math.sin(v*TAU*3)*.10;
   const strands=Math.pow(.5+.5*Math.cos(direction*TAU),7);
   const tone=.76+.12*strands+.035*large+.015*small;
   color=[181*tone,167*tone,145*tone];
   height=.43+.16*strands+.025*large;
   roughness=.83-.11*strands;
  }else{
   // Large garment folds remain sculpted in the mesh. The atlas contributes
   // a restrained cross weave and worn stitched hems at the garment's ends.
   const weave=((x%4<2?1:-1)+(y%4<2?1:-1))*.008;
   const hem=Math.exp(-Math.pow((v-.045)/.006,2))+
    Math.exp(-Math.pow((v-.955)/.006,2));
   const stitches=hem*(Math.cos(u*TAU*42)>.2?1:0);
   const tone=.95+.035*large+.012*small+weave-.035*hem;
   color=[231*tone+stitches*13,214*tone+stitches*12,202*tone+stitches*9];
   height=.50+.025*large+weave*2+.055*stitches;
   roughness=.95+.018*small;
  }
  return {color,height:clamp(height),roughness:clamp(roughness)};
 };
}
function defaultCanvas(){
 if(typeof document!=='undefined'&&typeof document.createElement==='function')
  return document.createElement('canvas');
 return typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(1,1):null;
}
function buildSurface(THREE,kind,size,createCanvas){
 const albedo=createCanvas(),surface=createCanvas();
 if(!albedo||!surface)return null;
 albedo.width=albedo.height=surface.width=surface.height=size;
 const colorContext=albedo.getContext?.('2d'),surfaceContext=surface.getContext?.('2d');
 // Lightweight logic adapters have only text methods; defer shared-map
 // creation until a real canvas is available instead of caching a bad atlas.
 if(![colorContext,surfaceContext].every(context=>
  typeof context?.createImageData==='function'&&typeof context?.putImageData==='function'))return null;
 const pixels=colorContext.createImageData(size,size),packed=surfaceContext.createImageData(size,size);
 const sample=sampleSurface(kind);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const result=sample((x+.5)/size,(y+.5)/size,x,y),offset=(y*size+x)*4;
  for(let channel=0;channel<3;channel++)pixels.data[offset+channel]=Math.round(clamp(result.color[channel],0,255));
  pixels.data[offset+3]=packed.data[offset+3]=255;
  // Red is bump height; Three's roughnessMap reads green. These are data,
  // not colors, so this packed texture must stay out of the sRGB transform.
  packed.data[offset]=Math.round(result.height*255);
  packed.data[offset+1]=packed.data[offset+2]=Math.round(result.roughness*255);
 }
 colorContext.putImageData(pixels,0,0);surfaceContext.putImageData(packed,0,0);
 const map=new THREE.CanvasTexture(albedo),detail=new THREE.CanvasTexture(surface);
 map.name='orc-'+kind+'-paint';detail.name='orc-'+kind+'-surface';
 map.colorSpace=THREE.SRGBColorSpace;detail.colorSpace=THREE.NoColorSpace;
 for(const texture of [map,detail]){
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=2;
  texture.userData.actorShared=true;
 }
 return {map,detail};
}
function sharedTextures(THREE,createCanvas){
 if(textureCache.has(THREE))return textureCache.get(THREE);
 const surfaces={};
 for(const kind of ['skin','leather','metal','bone','hair','cloth']){
  const painted=buildSurface(THREE,kind,kind==='skin'||kind==='leather'?256:128,createCanvas);
  if(!painted){
   for(const previous of Object.values(surfaces)){
    previous.map.dispose();previous.detail.dispose();
   }
   return null;
  }
  surfaces[kind]=painted;
 }
 textureCache.set(THREE,surfaces);return surfaces;
}
export function createOrcMaterials(THREE,{createCanvas=defaultCanvas}={}){
 const textures=sharedTextures(THREE,createCanvas);
 const material=(name,color,kind,options={})=>{
  const surface=textures?.[kind];
  const value=new THREE.MeshStandardMaterial({color,roughness:1,vertexColors:true,
   ...(surface?{map:surface.map,bumpMap:surface.detail,roughnessMap:surface.detail,bumpScale:.012}:{}),
   ...options});
  value.name='orc-'+name;return value;
 };
 // Distinct material instances let tinting and preview teardown affect only
 // one avatar. Their texture maps deliberately remain shared and immutable.
 return {
  skin:material('skin',0x5d824c,'skin',{bumpScale:.014}),
  skinDark:material('skin-shadow',0x384b31,'skin',{bumpScale:.014}),
  skinLight:material('skin-ridge',0x89a264,'skin',{bumpScale:.014}),
  ivory:material('ivory',0xffedc9,'bone',{bumpScale:.008}),
  hair:material('hair',0x3d302a,'hair',{bumpScale:.026}),
  eye:material('eye',0xd29a49,null,{roughness:.36,emissive:0x5b310e,emissiveIntensity:.12}),
  black:material('black',0x151711,null,{roughness:.72}),
  metal:material('steel',0x89949a,'metal',{metalness:.67,bumpScale:.011}),
  metalDark:material('dark-steel',0x48525b,'metal',{metalness:.58,bumpScale:.011}),
  leather:material('leather',0x8d5d3d,'leather',{bumpScale:.017}),
  leatherDark:material('dark-leather',0x503b2e,'leather',{bumpScale:.017}),
  cloth:material('burgundy-cloth',0x922f37,'cloth',{bumpScale:.009}),
  trim:material('aged-brass',0xb48a52,'metal',{metalness:.53,bumpScale:.008})
 };
}
