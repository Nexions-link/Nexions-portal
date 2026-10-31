// NexGameWorld: deterministic baked meadow soil and organically feathered trails.
// All surface changes are visual only: no new geometry, height or collision.
import {r2MeadowGrade} from './planet-test/r2-materials.js?v=1';
import {paintVillageGround} from './planet-test/art-world-grade.js?v=1';
const clamp01=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const t=clamp01((v-a)/(b-a));return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*clamp01(t);
function hash(x,z){let n=Math.imul(x,374761393)^Math.imul(z,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295}
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z),u=smooth(0,1,x-ix),v=smooth(0,1,z-iz);return (hash(ix,iz)*(1-u)+hash(ix+1,iz)*u)*(1-v)+(hash(ix,iz+1)*(1-u)+hash(ix+1,iz+1)*u)*v}
export function prepareLandscapeRoutes(segments=[]){
 return segments.filter(s=>Number.isFinite(s.ax)&&Number.isFinite(s.az)&&
  Number.isFinite(s.bx)&&Number.isFinite(s.bz)).map(s=>({
  ...s,dx:s.bx-s.ax,dz:s.bz-s.az,length2:Math.max(.00001,
   (s.bx-s.ax)**2+(s.bz-s.az)**2),width:Math.max(.6,s.width||3.5),
  minX:Math.min(s.ax,s.bx)-6,maxX:Math.max(s.ax,s.bx)+6,
  minZ:Math.min(s.az,s.bz)-6,maxZ:Math.max(s.az,s.bz)+6
 }));
}
export function landscapeGroundPixel(x,z,preparedRoutes=[],{r2=false,art=false}={}){
 // World-space frequencies, so quality remains consistent when map resolution
 // changes and the old grass/earth colour bands never repeat like a tiled rug.
 const broad=noise(x*.057,z*.057),clump=noise(x*.18+31,z*.18-17);
 const mineral=noise(x*.38-19,z*.38+37),moisture=noise(x*.092+11,z*.092-27);
 const flecks=noise(x*1.45+17,z*1.45+7),grit=noise(x*4.15-12,z*4.15+35);
 const dry=smooth(.29,.77,broad*.58+clump*.42);
 const damp=smooth(.32,.74,moisture*.73+(1-mineral)*.27);
 const earth=smooth(.38,.69,clump*.47+mineral*.39+(1-broad)*.14);
 const moss=smooth(.38,.75,moisture*.45+broad*.32+(1-mineral)*.23);
 // Character-sized patches of living grass, decomposing leaf litter and
 // ochre mineral soil. Small colour variation is baked, never alpha-blended.
 let r=mix(93,127,dry),g=mix(112,123,dry),b=mix(61,66,dry);
 const soil=.16+.58*earth*(1-.22*moss);
 r=mix(r,132,soil);g=mix(g,94,soil);b=mix(b,65,soil);
 const wetMoss=.37*moss*(1-.42*earth);
 r=mix(r,74,wetMoss);g=mix(g,105,wetMoss);b=mix(b,61,wetMoss);
 const faded=(clump*.6+mineral*.4);
 const litter=smooth(.54,.8,faded)*(.16+.26*dry);
 r=mix(r,145,litter);g=mix(g,103,litter);b=mix(b,62,litter);
 // Tangled grass tips and rough soil micro-grain.
 const grain=(flecks-.5)*16+(grit-.5)*11;
 r+=grain;g+=grain*.83;b+=grain*.63;
 let worn=0,roadEdge=0;
 for(const seg of preparedRoutes){
  // Bounding-box rejection keeps startup cheap even with smoothed roads.
  if(x<seg.minX||x>seg.maxX||z<seg.minZ||z>seg.maxZ)continue;
  const t=clamp01(((x-seg.ax)*seg.dx+(z-seg.az)*seg.dz)/seg.length2);
  const d=Math.hypot(x-seg.ax-seg.dx*t,z-seg.az-seg.dz*t);
  // Eroded, scalloped verges replace the old uniform strip width.
  const edge=(clump-.5)*.95+(mineral-.5)*.42+
   (flecks-.5)*.17;
  const path=1-smooth(seg.width*.32,seg.width*.99,d+edge);
  if(path>worn){worn=path;roadEdge=d;}
 }
 if(worn>.001){
  const dusty=smooth(.30,.8,mineral*.51+(1-moisture)*.49);
  const mud=smooth(.57,.82,moisture*.55+clump*.45);
  const gravel=(grit-.5)*14+(flecks-.5)*10;
  // A walked-down middle, a pair of faint wheel/rain ruts, dry shoulders.
  const pairedRuts=Math.exp(-Math.pow((roadEdge-1.14)/.24,2))*.11;
  const midWear=(1-smooth(0,1.1,roadEdge))*.085;
  const roadDry=mix(129,159,dusty)+gravel-midWear*28-pairedRuts*32;
  const roadGreen=mix(106,132,dusty)+gravel*.76-midWear*19-pairedRuts*21;
  const roadBlue=mix(73,92,dusty)+gravel*.54-midWear*12-pairedRuts*14;
  const darkMud=worn*mud*.21;
  r=mix(r,roadDry,worn);g=mix(g,roadGreen,worn);b=mix(b,roadBlue,worn);
  r=mix(r,78,darkMud);g=mix(g,76,darkMud);b=mix(b,62,darkMud);
  const pebble=worn*smooth(.915,.992,hash(Math.floor(x*3.8),Math.floor(z*3.8)));
  r+=pebble*23;g+=pebble*23;b+=pebble*19;
 }
 const base=r2?r2MeadowGrade([r,g,b],{worn,earth,moss,dry,moisture,clump}):[r,g,b];
 const painted=art?paintVillageGround(base,{worn,earth,moss,dry,moisture,clump,
  mineral,flecks,grit,roadEdge}):null;
 const rgb=art?painted.map((v,i)=>v*.88+base[i]*.12):base;
 return [Math.round(Math.max(0,Math.min(255,rgb[0]))),
  Math.round(Math.max(0,Math.min(255,rgb[1]))),
  Math.round(Math.max(0,Math.min(255,rgb[2]))),255];
}
export function createLandscapeMap(THREE,segments,size=1024,{r2=false,art=false,edgePaint=null}={}){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const context=canvas.getContext('2d'),image=context.createImageData(size,size),pixels=image.data;
 const prepared=prepareLandscapeRoutes(segments);
 for(let py=0;py<size;py++)for(let px=0;px<size;px++){
  const x=(px+.5)/size*190-95,z=(py+.5)/size*190-95;
  const original=landscapeGroundPixel(x,z,prepared,{r2,art});
  // Only the narrow eastern edge of the existing starting terrain needs
  // cross-biome painting; 99% of the baked map follows the original path.
  const pixel=edgePaint&&x>49&&x*x+z*z>68*68
   ?edgePaint(x,z,original):original;
  pixels.set(pixel,(py*size+px)*4);
 }
 context.putImageData(image,0,0);
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
 map.name='NexGameWorld natural mineral meadow and continuous trails';
 map.generateMipmaps=true;return map;
}

export function createSkyMap(THREE){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
 const c=canvas.getContext('2d'),gradient=c.createLinearGradient(0,0,0,256);
 gradient.addColorStop(0,'#527eb0');gradient.addColorStop(.28,'#9ac0d0');
 gradient.addColorStop(.48,'#d2d9ce');gradient.addColorStop(.53,'#d2d9ce');gradient.addColorStop(1,'#9fa986');
 c.fillStyle=gradient;c.fillRect(0,0,512,256);
 // Small, soft cloud banks, baked into the sky rather than transparent meshes.
 for(let i=0;i<14;i++){
  const x=25+hash(i,7)*460,y=58+hash(i,13)*39,rx=15+hash(i,19)*26,ry=2+hash(i,23)*4;
  c.save();c.translate(x,y);c.scale(rx,ry);
  const cloud=c.createRadialGradient(0,0,0,0,0,1);cloud.addColorStop(0,'rgba(255,249,225,.24)');cloud.addColorStop(1,'rgba(255,249,225,0)');
  c.fillStyle=cloud;c.fillRect(-1,-1,2,2);c.restore();
 }
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.mapping=THREE.EquirectangularReflectionMapping;
 map.name='Painted daylight sky';return map;
}
