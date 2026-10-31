// Original procedural fur for NexGameWorld's spherical player model.
// Neutral hand-painted albedo preserves per-player fur tint; all CanvasTextures
// are shared per Three.js module to avoid one new GPU texture per online avatar.
// No canvas is created in a frame loop and no visual map affects picking/IK.
const caches=new WeakMap();
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function rng(seed){
 let state=seed>>>0;
 return ()=>((state=Math.imul(state,1664525)+1013904223|0)>>>0)/4294967296;
}
function gridNoise(seed,w,h){
 const rand=rng(seed),v=new Float32Array(w*h);
 for(let i=0;i<v.length;i++)v[i]=rand()*2-1;
 return {w,h,v};
}
function noise(g,x,y){
 const fx=x*g.w,fy=y*g.h;
 const i=Math.floor(fx),j=Math.floor(fy),sx=fx-i,sy=fy-j;
 const u=sx*sx*(3-2*sx),v=sy*sy*(3-2*sy);
 const pick=(px,py)=>g.v[((py%g.h+g.h)%g.h)*g.w+((px%g.w+g.w)%g.w)];
 const a=pick(i,j)*(1-u)+pick(i+1,j)*u;
 const b=pick(i,j+1)*(1-u)+pick(i+1,j+1)*u;
 return a*(1-v)+b*v;
}
export const TAUREN_FUR_ATLAS_SIZE=256;
export const TAUREN_MUZZLE_ATLAS_SIZE=128;
export function paintTaurenFur(ctx,size,{short=false}={}){
 if(!ctx||typeof ctx.createImageData!=='function')throw Error('Fur painting requires a 2D canvas');
 const s=Math.max(16,Math.trunc(size));
 const pixels=ctx.createImageData(s,s),d=pixels.data;
 const broad=gridNoise(short?19:17,7,7);
 const mid=gridNoise(short?73:71,33,31);
 const fine=gridNoise(short?139:137,91,87);
 for(let y=0;y<s;y++)for(let x=0;x<s;x++){
  const u=x/s,v=y/s;
  const shading=noise(broad,u,v)*.105+noise(mid,u,v)*.057+noise(fine,u,v)*.022;
  // Irregular tonal grain follows the same neutral palette across all fur tints.
  // Avoid UV stripes and a global vertical gradient: the texture repeats around
  // shoulders, muzzle, hind legs and tail in several orientations.
  const tone=clamp(.855+shading+(short?.026:0),.62,1);
  const offset=(y*s+x)*4;
  d[offset]=Math.round(251*tone);
  d[offset+1]=Math.round(244*tone);
  d[offset+2]=Math.round(231*tone);
  d[offset+3]=255;
 }
 ctx.putImageData(pixels,0,0);
 const rand=rng(short?0x9e82:0xb4a9);
 const strands=short?540:2150;
 for(let i=0;i<strands;i++){
  const x=rand()*s,y=rand()*s,len=(short?2.2:4.7)+rand()*(short?4:11);
  const curl=(rand()-.5)*(short?1.8:4.4);
  const dark=rand()>.5;
  const alpha=(.06+rand()*.12).toFixed(3);
  ctx.strokeStyle=dark?'rgba(53,37,27,'+alpha+')':'rgba(255,246,223,'+alpha+')';
  ctx.lineWidth=short?.5:.5+rand()*.55;
  ctx.beginPath();
  ctx.moveTo(x,y);
  ctx.quadraticCurveTo(x+curl*.45,y+len*.42,x+curl,y+len);
  ctx.stroke();
 }
 return {width:s,height:s,short,strands};
}
function paintHorn(ctx,s){
 const gradient=ctx.createLinearGradient(0,s,0,0);
 for(const [t,c] of [[0,'#6c5036'],[.2,'#bfa780'],[.4,'#f2dfb5'],
  [.72,'#dfcaa0'],[.9,'#786046'],[1,'#352b23']])gradient.addColorStop(t,c);
 ctx.fillStyle=gradient;ctx.fillRect(0,0,s,s);
 for(let i=0;i<25;i++){ctx.fillStyle='#47301c12';ctx.fillRect(0,i*s/25,s,1)}
}
function buildTexture(THREE,createCanvas,size,paint){
 const canvas=createCanvas();canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Fur canvas context unavailable');
 paint(ctx,size);
 const tex=new THREE.CanvasTexture(canvas);
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.anisotropy=2;
 tex.wrapS=THREE.RepeatWrapping;
 tex.wrapT=THREE.RepeatWrapping;
 return tex;
}
export function getTaurenSurfaceMaps(THREE,{createCanvas=()=>document.createElement('canvas')}={}){
 if(caches.has(THREE))return caches.get(THREE);
 const maps={
  pelt:buildTexture(THREE,createCanvas,TAUREN_FUR_ATLAS_SIZE,(ctx,s)=>paintTaurenFur(ctx,s)),
  muzzle:buildTexture(THREE,createCanvas,TAUREN_MUZZLE_ATLAS_SIZE,(ctx,s)=>paintTaurenFur(ctx,s,{short:true})),
  horn:buildTexture(THREE,createCanvas,128,paintHorn)
 };
 // These maps are intentionally shared; material instances carry unique player
 // tint and equipment color. Never dispose a shared map with one remote avatar.
 for(const texture of Object.values(maps))texture.userData.actorShared=true;
 caches.set(THREE,maps);
 return maps;
}
