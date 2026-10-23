// P2.3.14 — locally-tiled microtexture: the full 2048x1024 planet atlas
// cannot resolve individual soil grains at walking distance. Overlay two
// conforming, faint, fully decorative meshes with metre-scale UVs and reuse
// one 256x256 grain/needle tile for sharp albedo and normal relief.
// No shader replacement, external asset, interaction target or collider.
import {forestTrailLatitude,createForestLayout} from './whispering-forest.js';

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
export const SURFACE_DETAIL_TILE_SIZE=256;
export const SURFACE_DETAIL_METRES=3.5;
export function surfaceDetailPixel(u,v){
 u=wrap(u,1);v=wrap(v,1);
 const clump=noise(u,v,12),dirt=noise(u,v,32),grain=noise(u,v,72),
  silt=noise(u,v,120),damp=noise(u+.17,v+.49,8);
 const broken=smooth(.55,.76,grain*.47+dirt*.37+silt*.16);
 const glitter=smooth(.72,.88,grain*.35+silt*.65);
 const organics=smooth(.59,.79,clump*.42+dirt*.58);
 // Very small tangled stem fragments in each 1/24th tile sector.
 const fx=u*24,fy=v*24,i=Math.floor(fx),j=Math.floor(fy);
 const w=hash(i,j),orientation=hash(i+29,j+43)*TAU;
 const dx=(fx-i-.5)*Math.cos(orientation)+(fy-j-.5)*Math.sin(orientation);
 const dy=(fy-j-.5)*Math.cos(orientation)-(fx-i-.5)*Math.sin(orientation);
 const needles=w>.55?Math.exp(-Math.pow(dx/.036,2))*smooth(.19,.32,Math.abs(dy))*
  (1-smooth(.39,.49,Math.abs(dy))):0;
 const mineral=smooth(.72,.91,dirt*.44+grain*.56);
 const moss=smooth(.60,.82,damp*.6+clump*.4);
 const structure=broken*.42+glitter*.22+organics*.22+needles*.75+mineral*.42;
 // Alpha paints isolated flecks; it never covers the old colour zoning.
 const alpha=Math.round(clamp(.04+structure*.56)*190);
 const warm=organics*.60+needles*.44,wet=moss*.54;
 const r=Math.round(lerp(130,77,wet)+warm*19+glitter*31);
 const g=Math.round(lerp(117,108,wet)-warm*22+glitter*23);
 const b=Math.round(lerp(93,75,wet)-warm*12+glitter*20);
 // Bump is independent of alpha and has hard sub-metre grain for grazing light.
 const relief=Math.round(255*clamp(.33+.29*grain+.23*silt+.17*needles+
  .1*broken-.22*organics));
 return {rgba:[r,g,b,alpha],relief};
}
export function buildSurfaceDetailPixels(size=SURFACE_DETAIL_TILE_SIZE){
 if(!Number.isInteger(size)||size<32||size>512)throw new RangeError('invalid microdetail size');
 const diffuse=new Uint8Array(size*size*4),relief=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const p=surfaceDetailPixel((x+.5)/size,(y+.5)/size),i=(y*size+x)*4;
  diffuse.set(p.rgba,i);
  relief[i]=relief[i+1]=relief[i+2]=p.relief;relief[i+3]=255;
 }
 return {diffuse,relief,size};
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
  uv.push(s.x/SURFACE_DETAIL_METRES,s.z/SURFACE_DETAIL_METRES);
  colors.push(1,1,1,s.fade);
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
  reliefGlobe.repeat.set(460,230);
  const reliefVillage=textureFromData(THREE,data.relief,data.size,false);
  reliefVillage.repeat.set(54,54);
  textures.push(reliefGlobe,reliefVillage);
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
  return {setQuality,reliefGlobe,reliefVillage,decorativeOnly:true,
   drawCalls:3,materials:objects.map(o=>o.material),textures};
 }catch(error){
  for(const entry of objects){scene.remove(entry.mesh);entry.mesh.geometry.dispose();entry.material.dispose();}
  textures.forEach(t=>t.dispose?.());
  console.warn('Optional microdetail not supported, keeping original opaque ground',error);
  return null;
 }
}
