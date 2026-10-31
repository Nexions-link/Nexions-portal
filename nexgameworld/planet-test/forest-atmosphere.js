// P2.3.6: mobile-first atmospheric forest overlay. Render-only, no gameplay
// meshes registered as obstacles. No render targets, textures fetched or lights.
import {FOREST_CAMP,FOREST_SITE_CLEARINGS,forestTrailLatitude,forestMoodAt,
 forestDistance,createForestLayout} from './whispering-forest.js';
import {forestSunbreakLayout} from './forest-lighting.js';
import {r2AtmosphereBudget} from './r2-lighting.js?v=1';

const TAU=Math.PI*2;
const smooth=(a,b,t)=>{const v=Math.max(0,Math.min(1,(t-a)/(b-a)));return v*v*(3-2*v)};
export const FOREST_ATMOSPHERE_LIMITS=Object.freeze({haze:72,beams:22,motes:264});

export function forestAtmosphereBudget(preset='balanced',preview=false){
 if(preview)return {haze:0,beams:0,motes:0};
 if(preset==='economy')return {haze:14,beams:0,motes:0};
 if(preset==='high')return {haze:72,beams:22,motes:264};
 return {haze:38,beams:10,motes:120};
}
export function forestHazeLayout(seed=76023){
 let s=seed>>>0;const rand=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);
 const patches=[],trees=createForestLayout().trees;
 for(let attempt=0;attempt<2400&&patches.length<FOREST_ATMOSPHERE_LIMITS.haze;attempt++){
  const lon=.29+rand()*1.04;
  const lat=forestTrailLatitude(lon)+(rand()<.5?-1:1)*(.019+rand()*.076);
  const size=3.4+rand()*3.5;
  if(forestMoodAt(lon,lat)<.31)continue;
  if(forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat)<FOREST_CAMP.clearingRadius+size+4)continue;
  if(FOREST_SITE_CLEARINGS.some(p=>forestDistance(lon,lat,p.lon,p.lat)<p.radius+size+1))continue;
  if(trees.some(t=>forestDistance(lon,lat,t.lon,t.lat)<t.radius*.65+1.2))continue;
  if(patches.some(p=>forestDistance(lon,lat,p.lon,p.lat)<(p.size+size)*.59))continue;
  patches.push(Object.freeze({lon,lat,size,yaw:rand()*TAU,opacity:.52+.48*rand()}));
 }
 return Object.freeze(patches);
}

function discGeometry(THREE,facets=12){
 const vertices=[],colors=[];
 for(let i=0;i<facets;i++){
  const a=i*TAU/facets,b=(i+1)*TAU/facets;
  vertices.push(0,0,0,Math.cos(a),0,Math.sin(a),Math.cos(b),0,Math.sin(b));
  colors.push(1,1,1,.17,1,1,1,0,1,1,1,0);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
 geo.computeVertexNormals();return geo;
}
function sunShaftGeometry(THREE,faces=10){
 // Hollow curved column with top/bottom fading; soft, not a physical light.
 const positions=[],colors=[];
 const rings=[
  {y:0,r:.92,alpha:0},
  {y:.27,r:1,alpha:.085},
  {y:.70,r:.86,alpha:.065},
  {y:1,r:.69,alpha:0}
 ];
 for(let row=0;row<rings.length-1;row++){
  for(let i=0;i<faces;i++){
   const a=i*TAU/faces,b=(i+1)*TAU/faces;
   const v=(ring,angle)=>{
    const lean=ring.y*-.70;
    return [Math.cos(angle)*ring.r+lean,ring.y,Math.sin(angle)*ring.r];
   };
   for(const [r,angle] of [[rings[row],a],[rings[row+1],a],
    [rings[row+1],b],[rings[row],a],[rings[row+1],b],[rings[row],b]]){
    positions.push(...v(r,angle));
    colors.push(1,1,1,r.alpha);
   }
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
 geo.computeVertexNormals();return geo;
}
function glowTexture(THREE){
 // One 16x16 procedurally generated alpha mask shared by all dust motes.
 const size=16,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const d=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2));
  const k=(y*size+x)*4;
  data[k]=255;data[k+1]=231;data[k+2]=181;
  data[k+3]=Math.round(255*Math.pow(Math.max(0,1-d),1.7));
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 texture.needsUpdate=true;texture.generateMipmaps=false;
 texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;
 return texture;
}
export function createForestAtmosphere(THREE,{scene,radius,heightAt,r2Lighting=false}){
 const hazeLayout=forestHazeLayout(),shaftLayout=forestSunbreakLayout();
 const up=new THREE.Vector3(0,1,0),n=new THREE.Vector3(),align=new THREE.Quaternion();
 const rotation=new THREE.Quaternion(),object=new THREE.Object3D();
 const normalAt=(lon,lat)=>n.set(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon));
 function place(instanced,items,measure){
  items.forEach((p,i)=>{
   const normal=normalAt(p.lon,p.lat),size=measure(p);
   object.position.copy(normal).multiplyScalar(radius+heightAt(normal)+size.offset);
   object.quaternion.copy(align.setFromUnitVectors(up,normal))
    .multiply(rotation.setFromAxisAngle(up,p.yaw));
   object.scale.set(size.x,size.y,size.z);object.updateMatrix();
   instanced.setMatrixAt(i,object.matrix);
  });
  instanced.instanceMatrix.needsUpdate=true;
  instanced.frustumCulled=false;scene.add(instanced);
 }
 const hazeMaterial=new THREE.MeshBasicMaterial({
  color:r2Lighting?'#a5bdb4':'#b0c5bc',vertexColors:true,transparent:true,opacity:r2Lighting?.38:.56,
  side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,
  polygonOffsetFactor:-1,polygonOffsetUnits:-1
 });
 const haze=new THREE.InstancedMesh(discGeometry(THREE),hazeMaterial,hazeLayout.length);
 haze.name='forest-ground-mist-no-collision';
 place(haze,hazeLayout,p=>({offset:.23,x:p.size,y:1,z:p.size*.75}));
 const rays=new THREE.InstancedMesh(sunShaftGeometry(THREE),new THREE.MeshBasicMaterial({
  color:r2Lighting?'#ffdfad':'#fbe8c0',vertexColors:true,transparent:true,opacity:r2Lighting?.53:.45,
  blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false
 }),shaftLayout.length);
 rays.name='forest-filtered-sunlight-no-collision';
 place(rays,shaftLayout,p=>({offset:.22,x:p.radius*.94,y:19+3.5*p.tint,z:p.radius*.94}));
 const dustCount=FOREST_ATMOSPHERE_LIMITS.motes;
 const positions=new Float32Array(dustCount*3),base=new Float32Array(dustCount*3);
 const direction=new Float32Array(dustCount*3),phase=new Float32Array(dustCount);
 let seed=87611;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<dustCount;i++){
  const patch=shaftLayout[Math.floor(i/12)%shaftLayout.length];
  const lon=patch.lon+(rand()-.5)*4.8/(radius*Math.cos(patch.lat));
  const lat=patch.lat+(rand()-.5)*4.8/radius;
  const altitude=1.2+rand()*11.4,normal=normalAt(lon,lat);
  const height=radius+heightAt(normal)+altitude;
  base[i*3]=normal.x*height;base[i*3+1]=normal.y*height;base[i*3+2]=normal.z*height;
  positions.set(base.subarray(i*3,i*3+3),i*3);
  direction[i*3]=normal.x;direction[i*3+1]=normal.y;direction[i*3+2]=normal.z;
  phase[i]=rand()*TAU;
 }
 const dustGeometry=new THREE.BufferGeometry();
 const positionAttribute=new THREE.BufferAttribute(positions,3);
 positionAttribute.setUsage(THREE.DynamicDrawUsage);
 dustGeometry.setAttribute('position',positionAttribute);
 const sprite=glowTexture(THREE);
 const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({
  color:r2Lighting?'#ffedc9':'#ffead0',map:sprite,transparent:true,opacity:r2Lighting?.54:.65,size:.55,
  sizeAttenuation:true,depthWrite:false,blending:THREE.AdditiveBlending
 }));
 dust.name='forest-floating-motes-no-collision';
 dust.frustumCulled=false;scene.add(dust);
 let current={haze:0,beams:0,motes:0},animationTick=0;
 function setQuality(preset='balanced',preview=false){
  current=r2Lighting?r2AtmosphereBudget(preset,preview):forestAtmosphereBudget(preset,preview);
  haze.count=Math.min(hazeLayout.length,current.haze);
  rays.count=Math.min(shaftLayout.length,current.beams);
  dustGeometry.setDrawRange(0,current.motes);
  haze.visible=haze.count>0;rays.visible=rays.count>0;dust.visible=current.motes>0;
 }
 function animate(time,mood=1){
  const strength=Math.max(0,Math.min(1,Number.isFinite(mood)?mood:0));
  haze.visible=current.haze>0&&strength>.13;
  rays.visible=current.beams>0&&strength>.23;
  dust.visible=current.motes>0&&strength>.31;
  if(!strength)return;
  hazeMaterial.opacity=r2Lighting?.35+.05*Math.sin(time*.2):.47+.08*Math.sin(time*.2);
  rays.material.opacity=r2Lighting?.46+.04*Math.sin(time*.19):.35+.06*Math.sin(time*.19);
  if(!dust.visible||++animationTick%3!==0)return;
  for(let i=0;i<current.motes;i++){
   const w=time*.49+phase[i];
   const ripple=.13*Math.sin(w),rise=.17*Math.cos(w*.72);
   positions[3*i]=base[3*i]+rise*direction[3*i]+ripple;
   positions[3*i+1]=base[3*i+1]+rise*direction[3*i+1]+.14*Math.sin(w*1.3);
   positions[3*i+2]=base[3*i+2]+rise*direction[3*i+2]+.12*Math.cos(w*1.2);
  }
  positionAttribute.needsUpdate=true;
 }
 setQuality();
 return {setQuality,animate,hazeCount:hazeLayout.length,shaftCount:shaftLayout.length,
  moteCount:dustCount,decorativeOnly:true};
}
