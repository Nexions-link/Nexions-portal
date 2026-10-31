// Original small, shared cloth/leather atlases for every villager and avatar.
const cache=new WeakMap();
export function paintActorOutfit(ctx,size,{leather=false}={}){
 const pixels=ctx.createImageData(size,size),data=pixels.data;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const wave=Math.sin(x*.31)*Math.sin(y*.27);
  const grain=Math.sin(x*12.9898+y*78.233)*43758.5453;
  const noise=(grain-Math.floor(grain))-.5;
  const weave=((x%4<2?1:-1)+(y%4<2?1:-1))*.022;
  const tone=leather?.83+wave*.035+noise*.09:.90+weave+noise*.018;
  const offset=(y*size+x)*4;
  data[offset]=Math.round(255*tone);data[offset+1]=Math.round(249*tone);
  data[offset+2]=Math.round(237*tone);data[offset+3]=255;
 }
 ctx.putImageData(pixels,0,0);
 // Subtle stitched hems belong to the existing garment UV, no extra meshes.
 if(!leather){
  ctx.strokeStyle='#e6d7b3';ctx.lineWidth=.65;
  for(const y of [5,size-6])for(let x=3;x<size;x+=6){
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+3,y);ctx.stroke();
  }
 }
}
export function getActorOutfitMaps(THREE,{createCanvas=()=>document.createElement('canvas')}={}){
 if(cache.has(THREE))return cache.get(THREE);
 const make=leather=>{
  const canvas=createCanvas();canvas.width=canvas.height=128;
  paintActorOutfit(canvas.getContext('2d'),128,{leather});
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.userData.actorShared=true;return texture;
 };
 const maps={cloth:make(false),leather:make(true)};
 cache.set(THREE,maps);return maps;
}
