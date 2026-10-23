// NexGameWorld original experimental painterly PBR terrain atlases.
// Five hand-designed procedural material families, not World of Warcraft
// textures, models, silhouettes, brands or game resources.
import {ART_LAB,artLabMaterialWeights,seededRandom} from './terrain-art-lab.js';
export const ART_MATERIALS=Object.freeze([
 Object.freeze({id:'meadow',name:'Луговая почва',base:'#746f49',high:'#9a9759',dark:'#454633',roughness:.89}),
 Object.freeze({id:'loam',name:'Лесная почва',base:'#544639',high:'#78624b',dark:'#302d28',roughness:.96}),
 Object.freeze({id:'moss',name:'Живой мох',base:'#445e39',high:'#83a269',dark:'#263e35',roughness:.98}),
 Object.freeze({id:'litter',name:'Опавшая листва',base:'#604638',high:'#b18352',dark:'#39322d',roughness:.94}),
 Object.freeze({id:'trail',name:'Утоптанная тропа',base:'#78674e',high:'#c1a279',dark:'#4c4237',roughness:.86})
]);
const clamp=v=>Math.max(0,Math.min(1,v));
function tilePaint(kind,size,documentRef){
 const rand=seededRandom(7111+kind*541),style=ART_MATERIALS[kind];
 const canvas=documentRef.createElement('canvas');canvas.width=canvas.height=size;
 const g=canvas.getContext('2d',{willReadFrequently:true});
 if(!g)throw Error('Canvas 2D material painter unavailable');
 g.fillStyle=style.base;g.fillRect(0,0,size,size);
 function copies(x,y,fn){for(const i of [-1,0,1])for(const j of [-1,0,1]){
  g.save();g.translate(x+i*size,y+j*size);fn();g.restore();
 }}
 const variants=kind===0?['#aaa06a','#52683d','#6e6443','#84934f']:
  kind===1?['#88765a','#393932','#5d4a3b','#75634b']:
  kind===2?['#658255','#253e35','#819e63','#475d40']:
  kind===3?['#b18b57','#58402e','#8a6a46','#3e352d']:
  ['#ad916e','#c1a583','#58483b','#847666'];
 // A painted base of irregular mineral pigments, avoiding high-frequency
 // rainbow noise. Large islands run under small recognisable motifs.
 for(let i=0;i<1500;i++){
  const x=rand()*size,y=rand()*size,r=(.3+Math.pow(rand(),1.7)*7);
  g.globalAlpha=.075+.25*rand();g.fillStyle=variants[Math.floor(rand()*variants.length)];
  copies(x,y,()=>{g.beginPath();g.ellipse(0,0,r*(1+rand()*.8),r*.35,
   rand()*Math.PI,0,Math.PI*2);g.fill()});
 }
 g.globalAlpha=1;
 const count=[215,170,290,180,120][kind];
 for(let i=0;i<count;i++){
  const x=rand()*size,y=rand()*size,scale=.5+rand()*1.6,angle=rand()*Math.PI*2;
  copies(x,y,()=>{
   g.rotate(angle);
   if(kind===0){
    // Flat blades and seed heads: warm meadow with original broad grass.
    g.strokeStyle=rand()>.55?'#a6a66c':'#526c45';g.lineWidth=.6*scale;
    g.beginPath();g.moveTo(0,2*scale);g.quadraticCurveTo(-2*scale,-3*scale,
     .8*scale,-6*scale);g.stroke();
    g.beginPath();g.moveTo(0,1*scale);g.quadraticCurveTo(3*scale,-1*scale,
     4.2*scale,-3*scale);g.stroke();
    if(rand()>.85){g.fillStyle='#d4c393';g.fillRect(0,-6*scale,scale,scale)}
   }else if(kind===1){
    // Dark soil clods with fine split edges and thin root fibres.
    g.fillStyle=rand()>.4?'#392f29':'#897660';
    g.beginPath();g.ellipse(0,0,2.7*scale,1.1*scale,0,0,Math.PI*2);g.fill();
    g.strokeStyle='#a28d70';g.lineWidth=.32*scale;g.beginPath();
    g.moveTo(-1.8*scale,.1*scale);g.lineTo(.1*scale,-.5*scale);
    g.lineTo(2.3*scale,.4*scale);g.stroke();
   }else if(kind===2){
    // Three overlapping spongy pads, tiny darker gaps and fresh sprouts.
    for(let j=0;j<3;j++){
     g.fillStyle=j%2?'#54774c':'#789260';g.beginPath();
     g.ellipse((j-1)*2.5*scale,(j%2)*2*scale,
      2.1*scale,1.25*scale,.6*j,0,Math.PI*2);g.fill();
    }
    g.fillStyle='#2b4534';g.beginPath();g.arc(0,0,.7*scale,0,Math.PI*2);g.fill();
   }else if(kind===3){
    // Curled, multi-lobed fallen leaves — a self-contained original shape.
    g.fillStyle=['#ad8053','#846041','#bc965d','#654635'][Math.floor(rand()*4)];
    g.strokeStyle='#493a31';g.lineWidth=.34*scale;
    g.beginPath();g.moveTo(-4*scale,0);g.quadraticCurveTo(-2*scale,-3*scale,0,-2.5*scale);
    g.quadraticCurveTo(2*scale,-4.4*scale,3*scale,-1*scale);
    g.quadraticCurveTo(5*scale,1.5*scale,1*scale,2.1*scale);
    g.quadraticCurveTo(-1*scale,3.5*scale,-4*scale,0);g.closePath();g.fill();g.stroke();
    g.strokeStyle='#d1ad7c';g.lineWidth=.36*scale;g.beginPath();
    g.moveTo(-4*scale,0);g.quadraticCurveTo(0,.3*scale,3*scale,-1*scale);g.stroke();
   }else{
    // Fine embedded pebbles and shallow diagonal scuffs, no wheel tracks.
    g.fillStyle=rand()>.55?'#aa9781':'#52493f';g.beginPath();
    g.ellipse(0,0,1.8*scale,1.0*scale,0,0,Math.PI*2);g.fill();
    if(rand()>.5){
     g.strokeStyle='#d0b28c';g.lineWidth=.5*scale;g.beginPath();
     g.moveTo(-4*scale,3*scale);g.lineTo(2*scale,2.4*scale);g.stroke();
    }
   }
  });
 }
 // Fine silt specks, not a pseudo-photographic noisy raster.
 for(let i=0;i<620;i++){
  const x=rand()*size,y=rand()*size;
  g.fillStyle=rand()>.5?style.high:style.dark;g.globalAlpha=.18+rand()*.35;
  g.fillRect(x,y,.3+rand()*.95,.3+rand()*.95);
 }
 g.globalAlpha=1;
 return g.getImageData(0,0,size,size).data;
}
export function artLabTileLayout(){
 return ART_MATERIALS.map(m=>({id:m.id,name:m.name,roughness:m.roughness}));
}
export function createArtLabTextures(THREE,{size=768,documentRef=globalThis.document}={}){
 if(!documentRef?.createElement)throw Error('Canvas 2D is needed for art lab');
 if(![512,768,1024].includes(size))throw new RangeError('Unsupported atlas');
 const tileSize=256,tiles=ART_MATERIALS.map((_,i)=>tilePaint(i,tileSize,documentRef));
 const pixels=new Uint8Array(size*size*4),normals=new Uint8Array(pixels.length),
  rough=new Uint8Array(pixels.length),heights=new Uint8Array(size*size);
 const grid=128,weights=[];
 // Precompute blending masks on a sparse continuous grid. The 5 material
 // families are then mixed into ONE atlas: one terrain draw call, no sorting.
 for(let j=0;j<=grid;j++)for(let i=0;i<=grid;i++)
  weights.push(artLabMaterialWeights((i/grid*2-1)*ART_LAB.halfSize,
   (j/grid*2-1)*ART_LAB.halfSize));
 const mixWeight=(i,j,k,fx,fy)=>{
  const a=weights[j*(grid+1)+i][k],b=weights[j*(grid+1)+i+1][k],
   c=weights[(j+1)*(grid+1)+i][k],d=weights[(j+1)*(grid+1)+i+1][k];
  return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
 };
 for(let py=0;py<size;py++){
  const gy=(py+.5)/size*grid,j=Math.min(grid-1,Math.floor(gy)),fy=gy-j;
  for(let px=0;px<size;px++){
   const gx=(px+.5)/size*grid,i=Math.min(grid-1,Math.floor(gx)),fx=gx-i;
   const x=(px+.5)/size*2*ART_LAB.halfSize-ART_LAB.halfSize,
    z=(py+.5)/size*2*ART_LAB.halfSize-ART_LAB.halfSize;
   // The painted tiles repeat at just under 4m, with a world-space warp to
   // avoid obvious wallpaper while respecting neighbouring atlas pixels.
   const u=x*.265+.27*Math.sin(x*.079+z*.067),v=z*.265+
    .27*Math.cos(z*.064-x*.083);
   const tx=((Math.floor(u*tileSize)%tileSize)+tileSize)%tileSize,
    ty=((Math.floor(v*tileSize)%tileSize)+tileSize)%tileSize;
   const ti=(ty*tileSize+tx)*4,at=(py*size+px)*4;
   let rr=0,gg=0,bb=0,rgh=0;
   for(let k=0;k<5;k++){
    const w=mixWeight(i,j,k,fx,fy),rgb=tiles[k];
    rr+=rgb[ti]*w;gg+=rgb[ti+1]*w;bb+=rgb[ti+2]*w;
    rgh+=(ART_MATERIALS[k].roughness+.035*(rgb[ti]/255-.5))*w;
   }
   pixels[at]=Math.round(rr);pixels[at+1]=Math.round(gg);
   pixels[at+2]=Math.round(bb);pixels[at+3]=255;
   heights[py*size+px]=Math.round((rr*.31+gg*.49+bb*.2));
   const a=Math.max(0,Math.min(255,Math.round(rgh*255)));
   rough[at]=rough[at+1]=rough[at+2]=a;rough[at+3]=255;
  }
 }
 for(let py=0;py<size;py++)for(let px=0;px<size;px++){
  const ix=py*size+px,at=ix*4;
  const left=heights[py*size+Math.max(0,px-1)],
   right=heights[py*size+Math.min(size-1,px+1)];
  const down=heights[Math.max(0,py-1)*size+px],
   up=heights[Math.min(size-1,py+1)*size+px];
  const dx=(left-right)/255*.92,dy=(down-up)/255*.92;
  const d=Math.hypot(dx,dy,1);
  normals[at]=Math.round((dx/d*.5+.5)*255);
  normals[at+1]=Math.round((dy/d*.5+.5)*255);
  normals[at+2]=Math.round((1/d*.5+.5)*255);normals[at+3]=255;
 }
 const make=(bytes,srgb,name)=>{
  const tex=new THREE.DataTexture(bytes,size,size,THREE.RGBAFormat);
  tex.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
  tex.name='Original NexGameWorld '+name;
  tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;
  tex.generateMipmaps=true;tex.anisotropy=4;tex.needsUpdate=true;
  return tex;
 };
 const map=make(pixels,true,'five-way art surface colour'),
  normalMap=make(normals,false,'microrelief normals'),
  roughnessMap=make(rough,false,'variable soil roughness');
 return {map,normalMap,roughnessMap,atlasSize:size,materials:artLabTileLayout(),
  dispose(){map.dispose();normalMap.dispose();roughnessMap.dispose()}};
}
