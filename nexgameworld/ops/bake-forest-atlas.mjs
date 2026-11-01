// Reproducible original asset. No third-party art or runtime canvas bake.
import {createCanvas} from '@napi-rs/canvas';
import {writeFileSync} from 'node:fs';
import {FOREST_ATLAS as b} from '../planet-test/forest-terrain-atlas.js';
import {forestGroundPixel,buildForestGroundPixels,forestRoadProfile} from '../planet-test/forest-ground-texture.js';
const W=2048,H=1024,global=buildForestGroundPixels(W,H,{art:true,r2:true});
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,z,x)=>{const t=clamp((x-a)/(z-a));return t*t*(3-2*t)};
function oldPixel(lon,lat,c){
 const x=(lon+Math.PI/2)/(Math.PI*2)*W-.5,y=(.5-lat/Math.PI)*H-.5;
 const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy;
 const at=(dx,dy)=>global[((iy+dy)*W+ix+dx)*4+c];
 return (at(0,0)*(1-u)+at(1,0)*u)*(1-v)+(at(0,1)*(1-u)+at(1,1)*u)*v;
}
function hash(x,y){let h=Math.imul(x,374761393)^Math.imul(y,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
function detailedSoil(rgb,lon,lat){
 const x=261*lon*Math.cos(lat),z=261*lat,road=forestRoadProfile(lon,lat);
 // Sparse embedded gravel and flattened leaf flakes, at actual metre scale.
 // Individual flecks span several atlas texels rather than unstable single-pixel noise.
 const cx=Math.floor(x/.92),cy=Math.floor(z/.92),seed=hash(cx,cy);
 const dx=x/.92-cx-(.2+.6*hash(cx+7,cy)),dy=z/.92-cy-(.2+.6*hash(cx,cy+9));
 const angle=hash(cx+2,cy+3)*Math.PI*2;
 const a=dx*Math.cos(angle)+dy*Math.sin(angle),c=dy*Math.cos(angle)-dx*Math.sin(angle);
 const chip=(1-smooth(.12,.25,Math.hypot(a,c*1.7)))*(seed>.72?1:0);
 const pore=(1-smooth(.08,.19,Math.hypot(dx,dy)))*(seed<.15?1:0);
 const leaf=(1-smooth(.14,.29,Math.hypot(a,c*2.2)))*(seed>.42&&seed<.59?1:0)*(1-road.wear);
 const grain=(hash(Math.floor(x*6),Math.floor(z*6))-.5)*5;
 const strength=smooth(.36,.55,lon);
 return rgb.map((v,i)=>i===3?255:Math.max(0,Math.min(255,v+strength*(
  chip*[28,25,19][i]*(.4+.6*road.wear)-pore*13+leaf*[22,8,-5][i]+grain))));
}
const canvas=createCanvas(b.width,b.height),ctx=canvas.getContext('2d');
const image=ctx.createImageData(b.width,b.height);
for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++){
 const lon=b.west+(x+.5)/b.width*(b.east-b.west);
 const lat=b.north-(y+.5)/b.height*(b.north-b.south);
 const rgb=detailedSoil(forestGroundPixel(lon,lat,{art:true,r2:true}),lon,lat);
 // Two complete globe cells at the perimeter match the old filtered atlas.
 const edge=Math.min(lon-b.west,b.east-lon,lat-b.south,b.north-lat);
 const blend=smooth(.035,.075,edge);
 const i=(y*b.width+x)*4;
 for(let c=0;c<3;c++)image.data[i+c]=Math.round(oldPixel(lon,lat,c)*(1-blend)+rgb[c]*blend);
 image.data[i+3]=255;
}
ctx.putImageData(image,0,0);
const out=new URL('../planet-test/assets/terrain/forest-ground-v78.webp',import.meta.url);
writeFileSync(out,canvas.toBuffer('image/webp',92));
console.log('Baked local forest atlas',b.width,b.height);
