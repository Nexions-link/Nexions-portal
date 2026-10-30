// P2.3.14 — locally-tiled microtexture: the full 2048x1024 planet atlas
// cannot resolve individual soil grains at walking distance. Overlay two
// conforming, faint, fully decorative meshes with metre-scale UVs and reuse
// one 256x256 grain/needle tile for sharp albedo and normal relief.
// No shader replacement, external asset, interaction target or collider.
import {forestTrailLatitude,createForestLayout} from './whispering-forest.js';
import {pathWear} from './start-zone.js?v=50';

const PI=Math.PI,TAU=2*PI,R=261;
const clamp=(x)=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
const lerp=(a,b,t)=>a+(b-a)*t;
const wrap=(n,p)=>((n%p)+p)%p;
function hash(x,y){
 let n=Math.imul(x,374761393)^Math.imul(y,668265263);
 n=Math.imul(n^(n>>>13),1274126177);
 return ((n^(n>>>16))>>>0)/4294967295;
}
function noise(u,v,cells){
 const x=u*cells,y=v*cells,i=Math.floor(x),j=Math.floor(y);
 const sx=smooth(0,1,x-i),sy=smooth(0,1,y-j);
 const p=(a,b)=>hash(wrap(i+a,cells),wrap(j+b,cells));
 return lerp(lerp(p(0,0),p(1,0),sx),lerp(p(0,1),p(1,1),sx),sy);
}
export const SURFACE_DETAIL_TILE_SIZE=512;
export const SURFACE_DETAIL_METRES=4.0;
export function surfaceDetailPixel(u,v){
 u=wrap(u,1);v=wrap(v,1);
 const clump=noise(u,v,12),soil=noise(u,v,32),grain=noise(u,v,72),
  silt=noise(u,v,120),moist=noise(u+.17,v+.49,8);
 // Readable real material cues: scattered sand grains, split needle fibres,
 // decomposing leaf flakes, soil pores and soft tiny moss nodules.
 const fx=u*27,fy=v*27,i=Math.floor(fx),j=Math.floor(fy);
 const seed=hash(i,j),direction=hash(i+29,j+43)*TAU;
 const px=fx-i-.5,py=fy-j-.5;
 const longitudinal=px*Math.cos(direction)+py*Math.sin(direction);
 const transverse=py*Math.cos(direction)-px*Math.sin(direction);
 const taper=1-smooth(.27,.41,Math.abs(longitudinal));
 const pine=seed>.49?Math.exp(-Math.pow(transverse/.027,2))*taper:0;
 const leaf=seed<.16?(1-smooth(.28,.37,Math.hypot(px,py*.72))):0;
 const chip=leaf*smooth(.05,.19,Math.abs(longitudinal));
 const kx=u*94,ky=v*94,ki=Math.floor(kx),kj=Math.floor(ky);
 const h=hash(ki+7,kj-23);
 const ax=kx-ki-(.20+.6*hash(ki,kj)),ay=ky-kj-(.20+.6*hash(ki+13,kj+5));
 const mineral=h>.84?1-smooth(.04,.33,Math.hypot(ax,ay)):0;
 const blackPore=h<.12?1-smooth(.03,.27,Math.hypot(ax,ay)):0;
 const moss=smooth(.47,.69,moist*.64+clump*.36);
 const mossSpeck=smooth(.61,.86,grain*.46+silt*.54)*moss;
 const humus=smooth(.48,.72,clump*.49+soil*.51);
 // Local fragments preserve the large warm/cool colour zoning underneath.
 const bright=mineral*.80+pine*.09+mossSpeck*.23;
 const dark=blackPore*.74+chip*.37+humus*.12;
 const alpha=Math.round(Math.min(242,10+mineral*164+pine*135+
  chip*113+blackPore*119+mossSpeck*57+humus*26));
 const r=Math.round(Math.min(255,Math.max(0,143+bright*74-dark*93)));
 const g=Math.round(Math.min(255,Math.max(0,130+bright*63-dark*91+mossSpeck*18)));
 const b=Math.round(Math.min(255,Math.max(0,101+bright*47-dark*77)));
 const relief=Math.round(255*clamp(.32+.16*soil+.15*grain+.09*silt+
  .27*mineral+.15*pine-.21*blackPore-.10*chip+.04*moss));
 // Original, matte physical variation: saturated moss versus mineral grit.
 const roughness=Math.round(255*clamp(.93+.055*moss+.02*pine-
  .065*mineral-.048*blackPore+.028*humus));
 return {rgba:[r,g,b,alpha],relief,roughness};
}
export function surfaceDetailWarp(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))throw new RangeError('Invalid ground position');
 // Low-frequency domain warp eliminates exact wallpaper repetition without
 // changing the local texture density or breaking vertices at patch borders.
 const sx=x/11.7,sz=z/13.9;
 const dx=.81*Math.sin(sx+Math.cos(sz*.79)*1.18)+.34*Math.sin(sz*.37+sx*.87);
 const dz=.73*Math.cos(sz+Math.sin(sx*.84)*1.01)+.39*Math.cos(sx*.53-sz*.64);
 return {u:(x+dx)/SURFACE_DETAIL_METRES,v:(z+dz)/SURFACE_DETAIL_METRES};
}
export function surfaceDetailTint(kind,sample){
 // No pine-litter decal over compacted roads: blend granular road texture
 // gradually into moss/leaf fragments on both village and forest paths.
 const road=kind==='forest'?1-smooth(2.0,5.4,
   Math.abs(sample.lat-forestTrailLatitude(sample.lon))*261):
  pathWear(sample.x,sample.z);
 const moisture=.5+.5*Math.sin(sample.x*.071+Math.cos(sample.z*.084))*
  Math.cos(sample.z*.063-sample.x*.033);
 const moss=kind==='forest'?.35+.25*moisture:.15+.15*moisture;
 const warmth=.10*road+ (kind==='forest'?.025:.10)*(1-road);
 return {r:Math.min(1,.72+warmth+.09*(1-moisture)),
  g:Math.min(1,.76+.05*moisture+.06*moss),
  b:Math.min(1,.67+.10*moisture+.13*moss),
  alpha:sample.fade*(1-.59*road)};
}
export function buildSurfaceDetailPixels(size=SURFACE_DETAIL_TILE_SIZE){
 if(!Number.isInteger(size)||size<32||size>512)throw new RangeError('invalid microdetail size');
 const diffuse=new Uint8Array(size*size*4),relief=new Uint8Array(size*size*4),
  normals=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const p=surfaceDetailPixel((x+.5)/size,(y+.5)/size),i=(y*size+x)*4;
  diffuse.set(p.rgba,i);
  relief[i]=relief[i+1]=relief[i+2]=p.relief;relief[i+3]=255;
  // The standard Three.js roughnessMap samples its GREEN channel.
  roughness[i]=roughness[i+1]=roughness[i+2]=p.roughness;
  roughness[i+3]=255;
 }
 const h=(x,y)=>relief[(((y+size)%size)*size+(x+size)%size)*4]/255;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(h(x-1,y)-h(x+1,y))*.62;
  const dy=(h(x,y-1)-h(x,y+1))*.62;
  const norm=Math.hypot(dx,dy,1),i=(y*size+x)*4;
  normals[i]=Math.round(255*(.5+.5*dx/norm));
  normals[i+1]=Math.round(255*(.5+.5*dy/norm));
  normals[i+2]=Math.round(255*(.5+.5/norm));
  normals[i+3]=255;
 }
 return {diffuse,relief,normals,roughness,size};
}
export function surfaceDetailQuality(quality='balanced',preview=false){
 if(preview||quality==='economy')return {visible:false,opacity:0,bump:false};
 if(quality==='high')return {visible:true,opacity:.76,bump:true,bumpScale:.074};
 return {visible:true,opacity:.50,bump:true,bumpScale:.043};
}
export function surfacePatchSample(kind,u,v,radius=R){
 if(!Number.isFinite(radius)||radius<=0)throw new RangeError('invalid radius');
 let lon,lat,x,z,fade;
 if(kind==='start'){
  x=(u*2-1)*78;z=(v*2-1)*78;
  const d=Math.hypot(x,z),angle=d/radius,f=d<1e-9?1:Math.sin(angle)/d;
  lon=Math.atan2(x*f,Math.cos(angle));
  lat=Math.asin(clamp((z*f+1)/2)*2-1);
  fade=1-smooth(69,79,d);
  // The lake has its own water/shore materials; never put grain over water.
  const water=Math.hypot((x-30)/17.2,(z-26)/12.5);
  fade*=smooth(1.18,1.36,water);
 }else if(kind==='forest'){
  lon=.35+u*1.10;
  const center=forestTrailLatitude(lon);
  lat=center+(v*2-1)*.315;
  x=radius*lon*Math.cos(lat);z=radius*lat;
  fade=smooth(.35,.43,lon)*(1-smooth(1.35,1.45,lon))*
   (1-smooth(.273,.315,Math.abs(lat-center)));
 }else throw new RangeError('invalid terrain patch');
 return {lon,lat,x,z,fade:clamp(fade)};
}
function textureFromData(THREE,bytes,size,srgb){
 const tex=new THREE.DataTexture(bytes,size,size,THREE.RGBAFormat);
 tex.name=srgb?'NGW detailed loam / moss / pine-needle flecks':
  'NGW sub-metre mineral-soil microrelief';
 tex.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
 tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
 tex.magFilter=THREE.LinearFilter;
 tex.minFilter=THREE.LinearMipmapLinearFilter;
 tex.generateMipmaps=true;
 tex.anisotropy=4;
 tex.needsUpdate=true;
 return tex;
}
function terrainGeometry(THREE,kind,radius,heightAt){
 const countX=kind==='start'?78:146,countY=kind==='start'?78:56;
 const xyz=[],uv=[],colors=[],indices=[];
 const n=new THREE.Vector3();
 for(let j=0;j<=countY;j++)for(let i=0;i<=countX;i++){
  const s=surfacePatchSample(kind,i/countX,j/countY,radius);
  const cosine=Math.cos(s.lat);
  n.set(cosine*Math.sin(s.lon),Math.sin(s.lat),cosine*Math.cos(s.lon));
  // +.155: above the spherical village's +.12m native terrain tile;
  // +.046: under the existing forest-floor leaf/fern artwork.
  const h=radius+heightAt(n)+(kind==='start'?.153:.046);
  xyz.push(n.x*h,n.y*h,n.z*h);
  const warp=surfaceDetailWarp(s.x,s.z),tint=surfaceDetailTint(kind,s);
  uv.push(warp.u,warp.v);
  colors.push(tint.r,tint.g,tint.b,tint.alpha);
 }
 for(let j=0;j<countY;j++)for(let i=0;i<countX;i++){
  const a=j*(countX+1)+i,b=a+countX+1;
  // Empty start-zone outskirts lie under the native 84m tile boundary.
  // Omit triangles in the lake / at distant cut edges, not just by alpha.
  const corner=[a,a+1,b,b+1];
  if(kind==='start'&&corner.every(k=>colors[k*4+3]<=.0001))continue;
  indices.push(a,a+1,b,b,a+1,b+1);
 }
 const geo=new THREE.BufferGeometry();
 geo.setIndex(indices);
 geo.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
 geo.computeVertexNormals();
 geo.computeBoundingSphere();
 return geo;
}
function contactTexture(THREE){
 const size=64,bytes=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const d=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2));
  const a=Math.pow(1-smooth(.08,.98,d),1.5);
  const i=(y*size+x)*4;bytes[i]=39;bytes[i+1]=39;bytes[i+2]=33;
  bytes[i+3]=Math.round(170*a);
 }
 const texture=new THREE.DataTexture(bytes,size,size,THREE.RGBAFormat);
 texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
 texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
 return texture;
}
function contacts(THREE,scene,radius,heightAt){
 const trees=createForestLayout().trees,up=new THREE.Vector3(0,1,0),
  n=new THREE.Vector3(),obj=new THREE.Object3D(),tilt=new THREE.Quaternion(),
  yaw=new THREE.Quaternion(),tex=contactTexture(THREE);
 const geometry=new THREE.PlaneGeometry(2,2);
 geometry.rotateX(-PI/2);
 const material=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,
  opacity:.4,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
 const mesh=new THREE.InstancedMesh(geometry,material,trees.length);
 mesh.name='forest-trunk-contact-shade-decorative-no-collision';
 mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
 for(let i=0;i<trees.length;i++){
  const tree=trees[i],c=Math.cos(tree.lat);
  n.set(c*Math.sin(tree.lon),Math.sin(tree.lat),c*Math.cos(tree.lon));
  obj.position.copy(n).multiplyScalar(radius+heightAt(n)+.059);
  obj.quaternion.copy(tilt.setFromUnitVectors(up,n))
   .multiply(yaw.setFromAxisAngle(up,tree.yaw));
  const scale=tree.radius*(1.60+.18*tree.tint);
  obj.scale.set(scale,1,scale);obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);
 }
 mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);
 return {mesh,material};
}
export function createSurfaceMicrodetail(THREE,{scene,radius,heightAt}){
 const objects=[],textures=[];
 try{
  const data=buildSurfaceDetailPixels();
  const albedo=textureFromData(THREE,data.diffuse,data.size,true);
  textures.push(albedo);
  // Two instances share the same bytes but use independent UV repeat rates.
  // On the globe UVs cover ~1640m by ~820m, vs the 190m village atlas.
  const reliefGlobe=textureFromData(THREE,data.relief,data.size,false);
  reliefGlobe.repeat.set(409,205);
  const reliefVillage=textureFromData(THREE,data.relief,data.size,false);
  reliefVillage.repeat.set(48,48);
  textures.push(reliefGlobe,reliefVillage);
  const normalGlobe=textureFromData(THREE,data.normals,data.size,false);
  normalGlobe.name='NGW G-07 tangent-space globe micro-normal';
  normalGlobe.repeat.set(409,205);
  const normalVillage=textureFromData(THREE,data.normals,data.size,false);
  normalVillage.name='NGW G-07 tangent-space village micro-normal';
  normalVillage.repeat.set(48,48);
  const roughnessGlobe=textureFromData(THREE,data.roughness,data.size,false);
  roughnessGlobe.name='NGW G-07 globe mineral/moss roughness';
  roughnessGlobe.repeat.set(409,205);
  const roughnessVillage=textureFromData(THREE,data.roughness,data.size,false);
  roughnessVillage.name='NGW G-07 village mineral/moss roughness';
  roughnessVillage.repeat.set(48,48);
  textures.push(normalGlobe,normalVillage,roughnessGlobe,roughnessVillage);
  for(const kind of ['start','forest']){
   const geometry=terrainGeometry(THREE,kind,radius,heightAt);
   const material=new THREE.MeshBasicMaterial({
    map:albedo,color:'#ffffff',vertexColors:true,transparent:true,depthWrite:false,
    opacity:.5,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,
    polygonOffsetUnits:-1
   });
   const mesh=new THREE.Mesh(geometry,material);
   mesh.name='surface-microdetail-'+kind+'-decorative-no-collision';
   mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
   scene.add(mesh);objects.push({mesh,material});
  }
  const contact=contacts(THREE,scene,radius,heightAt);
  function setQuality(quality='balanced',preview=false){
   const q=surfaceDetailQuality(quality,preview);
   for(const {mesh,material} of objects){
    mesh.visible=q.visible;material.opacity=q.opacity;
   }
   contact.mesh.visible=q.visible;
   contact.mesh.count=quality==='high'?400:quality==='balanced'?270:0;
  }
  setQuality();
  return {setQuality,reliefGlobe,reliefVillage,normalGlobe,normalVillage,
   roughnessGlobe,roughnessVillage,decorativeOnly:true,
   drawCalls:3,materials:objects.map(o=>o.material),textures};
 }catch(error){
  for(const entry of objects){scene.remove(entry.mesh);entry.mesh.geometry.dispose();entry.material.dispose();}
  textures.forEach(t=>t.dispose?.());
  console.warn('Optional microdetail not supported, keeping original opaque ground',error);
  return null;
 }
}
