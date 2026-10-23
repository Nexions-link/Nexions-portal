// P2.4.2 — artist-directed scenery for the standalone Stonewind Garden.
// Original forms, no imported WoW assets. Decorative meshes only, never gameplay.
import {ART_LAB,artLabWorldPoint,artLabNormal,artLabScenicRelief,
 artLabPathZ,artLabMaterialWeights,seededRandom} from './terrain-art-lab.js';
import {createDetailedCrownGeometry,createRidgedBarkSegment,
 createDetailedRockGeometry,createCutWoodTextures} from './terrain-art-asset-polish.js?v=1';
import {createForestBarkTextures} from './forest-bark-texture.js';

const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};

export const SHOWCASE_TIERS=Object.freeze({
 economy:Object.freeze({canopy:.38,fern:.24,grass:.19,forest:.48,flowers:.16,
  moss:.22,mushrooms:.18,glimmer:0,shafts:0,shadow:false}),
 balanced:Object.freeze({canopy:.74,fern:.62,grass:.55,forest:.80,flowers:.53,
  moss:.58,mushrooms:.63,glimmer:.35,shafts:.42,shadow:true}),
 high:Object.freeze({canopy:1,fern:1,grass:1,forest:1,flowers:1,
  moss:1,mushrooms:1,glimmer:1,shafts:1,shadow:true})
});
export const SHOWCASE_LANDMARKS=Object.freeze({
 fallenLog:Object.freeze({x:-7.8,z:-7.9,angle:-.52,length:8.7}),
 granite:Object.freeze({x:7.5,z:-6.4,height:3.9}),
 stump:Object.freeze({x:-5.4,z:5.9,height:2.0}),
 lightWell:Object.freeze({x:0.4,z:1.8}),
 hero:Object.freeze({x:ART_LAB.treeSites[0][0],z:ART_LAB.treeSites[0][1]})
});

export const showcaseTerrainRelief=artLabScenicRelief;
export function showcaseLayout(seed=53177){
 const rand=seededRandom(seed);
 const result={fern:[],grass:[],flowers:[],moss:[],mushrooms:[],glimmer:[],forest:[]};
 for(let i=0;i<3600;i++){
  const x=(rand()-.5)*30.5,z=(rand()-.5)*30.5;
  const w=artLabMaterialWeights(x,z),road=w[4],d=Math.hypot(x,z);
  if(d>15.45||road>.24)continue;
  if(ART_LAB.treeSites.some(([tx,tz])=>Math.hypot(x-tx,z-tz)<1.55))continue;
  const sample={x,z,angle:rand()*TAU,scale:.48+rand()*1.35,tint:rand()};
  const h=rand();
  if(h<.33&&(w[0]+w[2])>.26)result.grass.push(sample);
  else if(h<.55&&w[1]+w[3]+w[2]>.35)result.fern.push(sample);
  else if(h<.65&&(w[0]+w[2])>.35)result.flowers.push(sample);
  else if(h<.79&&(w[2]+w[1])>.24)result.moss.push(sample);
  else if(h<.88&&w[2]+w[3]>.28)result.mushrooms.push(sample);
  else if(h<.98)result.glimmer.push(sample);
 }
 for(let i=0;i<260;i++){
  const t=rand()*TAU,rad=21+rand()*43;
  const x=Math.cos(t)*rad,z=Math.sin(t)*rad;
  const angle=rand()*TAU,size=8+rand()*13;
  result.forest.push({x,z,angle,size,tint:rand()});
 }
 return result;
}
export function showcaseGeometryCounts(){
 const layout=showcaseLayout();
 return Object.fromEntries(Object.entries(layout).map(([k,v])=>[k,v.length]));
}
// Construct a single mesh per botanical class. Instance transforms follow the
// local spherical surface tangent, so there are no floating Cartesian planes.
export function createStonewindShowcase(THREE,{scene,worldPoint=artLabWorldPoint,
 worldNormal=artLabNormal,shadow=false}){
 const layout=showcaseLayout(),UP=new THREE.Vector3(0,1,0);
 const artRoot=new THREE.Group();
 artRoot.name='stonewind-original-showcase-decorative-no-collision';
 scene.add(artRoot);
 const batches=[],reusable=[],largeMeshes=[],materialCache=[];
 const geometry=(positions,colors)=>{
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.computeVertexNormals();reusable.push(geo);return geo;
 };
 const sculpt=(fn)=>{
  const pos=[],col=[];
  const tri=(a,b,c,rgb)=>{
   pos.push(...a,...b,...c);for(let j=0;j<3;j++)col.push(...rgb);
  };
  fn(tri);return geometry(pos,col);
 };
 const mat=(color='#ffffff',vertex=true,opts={})=>{
  const m=new THREE.MeshStandardMaterial({color,vertexColors:vertex,roughness:.97,
   metalness:0,side:THREE.DoubleSide,...opts});
  materialCache.push(m);return m;
 };
 // Upgrade the existing six instanced botanical groups in place. Each
 // individual original fern, grass, moss pad and flower gains distinct folds.
 const fern=sculpt(tri=>{
  for(let side of [-1,1])for(let i=0;i<13;i++){
   const t=i/13,z=t*1.12-.50,reach=(1-t*.83)*.50;
   const root=[0,.047+.23*Math.sin(t*Math.PI),z];
   const mid=[side*reach*.60,.078+.16*Math.sin(t*Math.PI),z+.085];
   const tip=[side*reach*1.15,.045+.07*Math.sin(t*TAU),z+.16];
   const edge=[side*reach*.78,.032+.12*Math.sin(t*Math.PI),z+.24];
   tri(root,mid,tip,side>0?[.40,.63,.36]:[.32,.54,.36]);
   tri(root,tip,edge,side>0?[.58,.73,.43]:[.46,.64,.39]);
  }
 });
 const grass=sculpt(tri=>{
  for(let i=0;i<12;i++){
   const a=i*2.39996,dx=Math.cos(a),dz=Math.sin(a);
   const height=.57+(i%4)*.20,width=.052+(i%3)*.008;
   const base=[-dz*width,0,dx*width],opposite=[dz*width,0,-dx*width];
   const bent=[dx*.11,height*.46,dz*.11],
    shoulder=[dx*.21,height*.77,dz*.21],
    end=[dx*(.30+(i%2)*.06),height,dz*(.30+(i%2)*.06)];
   const dark=i%3===0?[.39,.58,.33]:[.50,.65,.37],
    bright=i%3===2?[.72,.77,.43]:[.61,.70,.38];
   tri(base,bent,opposite,dark);
   tri(opposite,bent,shoulder,bright);tri(bent,end,shoulder,bright);
  }
 });
 const moss=sculpt(tri=>{
  for(let i=0;i<26;i++){
   const a=i*TAU/26,dx=Math.cos(a),dz=Math.sin(a);
   const dist=.24+.12*Math.sin(a*5),height=.09+.032*Math.cos(a*11);
   tri([0,.11,0],[dx*dist,.039,dz*dist],
    [Math.cos(a+.21)*dist,.049,Math.sin(a+.21)*dist],
    i%3===0?[.53,.72,.38]:i%3===1?[.31,.51,.29]:[.43,.62,.32]);
   if(i%3===0)tri([dx*dist*.47,.055,dz*dist*.47],
    [dx*dist*.69,height+.08,dz*dist*.69],
    [dx*dist*.88,.061,dz*dist*.88],[.65,.77,.44]);
  }
 });
 const mushroom=sculpt(tri=>{
  for(let i=0;i<18;i++){
   const a=i*TAU/18,b=(i+1)*TAU/18,r=.29;
   const rim=[Math.cos(a)*r,.30+.015*Math.sin(i*5),Math.sin(a)*r];
   const next=[Math.cos(b)*r,.30+.015*Math.sin((i+1)*5),Math.sin(b)*r];
   tri([0,.53,0],rim,next,i%3===0?[.80,.48,.31]:[.63,.38,.31]);
   tri([0,.28,0],next,rim,[.80,.71,.56]);
   tri([Math.cos(a)*.052,.27,Math.sin(a)*.052],
    [Math.cos(a)*.052,.04,Math.sin(a)*.052],
    [Math.cos(b)*.052,.04,Math.sin(b)*.052],[.85,.81,.67]);
  }
 });
 const blossom=sculpt(tri=>{
  for(let i=0;i<8;i++){
   const a=i*TAU/8,dx=Math.cos(a),dz=Math.sin(a);
   const stem=[dx*.04,.19,dz*.04];
   const petal=[dx*.17,.44,dz*.17],tip=[dx*.035,.56,dz*.035];
   tri(stem,petal,tip,i%2?[.74,.78,.91]:[.97,.80,.54]);
   tri(tip,petal,[Math.cos(a+.37)*.19,.43,Math.sin(a+.37)*.19],
    i%2?[.88,.84,.96]:[.99,.90,.62]);
  }
 });
 const glimmer=sculpt(tri=>{
  for(let i=0;i<4;i++){
   const a=i*TAU/4,dx=Math.cos(a),dz=Math.sin(a);
   tri([0,0,0],[dx*.06,.15,dz*.06],[0,.40,0],[.63,.75,.58]);
  }
 });
 function batch(key,geo,palette,baseHeight=.28){
  const pts=layout[key],obj=new THREE.Object3D(),n=new THREE.Vector3(),
   q=new THREE.Quaternion(),yaw=new THREE.Quaternion(),shade=new THREE.Color();
  const mesh=new THREE.InstancedMesh(geo,mat(),pts.length);
  mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
  mesh.name='stonewind-'+key+'-decorative-no-collision';
  for(let i=0;i<pts.length;i++){
   const p=pts[i],point=worldPoint(p.x,p.z,baseHeight),normal=worldNormal(p.x,p.z);
   n.fromArray(normal);
   obj.position.fromArray(point);
   obj.quaternion.copy(q.setFromUnitVectors(UP,n))
    .multiply(yaw.setFromAxisAngle(UP,p.angle));
   obj.scale.setScalar(p.scale*(key==='grass'?.80:key==='fern'?1.17:key==='moss'?.85:1));
   obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);
   const color=palette[Math.floor(p.tint*palette.length)%palette.length];
   mesh.setColorAt(i,shade.set(color));
  }
  mesh.instanceMatrix.needsUpdate=true;
  artRoot.add(mesh);batches.push({key,mesh,count:pts.length});
 }
 batch('fern',fern,['#61885a','#789b64','#648d72','#436a4d']);
 batch('grass',grass,['#a7a66f','#758b57','#71895f','#b9a978']);
 batch('moss',moss,['#537e53','#76985f','#69845b','#426749']);
 batch('mushrooms',mushroom,['#bd805c','#b99865','#8c6150']);
 batch('flowers',blossom,['#e4af7b','#b7b9c9','#c5b78a']);
 batch('glimmer',glimmer,['#bdd3b2','#e6e4aa','#a4be9e']);
 const trunkGeo=createRidgedBarkSegment(THREE,.40,.22,1.0,{radial:12,heightSegments:7});
 const crownGeo=createDetailedCrownGeometry(THREE,{far:true});
 reusable.push(trunkGeo,crownGeo);
 for(const [key,geo,palette,offset,size]of [
  ['forest-trunk',trunkGeo,['#655543','#76634d','#544e42'],.43,[1,1,1]],
  ['forest-crown',crownGeo,['#405a49','#506850','#627653','#3a564b'],.87,[1.8,1.36,1.70]]
 ]){
  const obj=new THREE.Object3D(),n=new THREE.Vector3(),q=new THREE.Quaternion(),
   spin=new THREE.Quaternion(),shade=new THREE.Color();
  const mesh=new THREE.InstancedMesh(geo,mat(key==='forest-trunk'?'#b8a18d':'#ffffff',true),
   layout.forest.length);
  for(let i=0;i<layout.forest.length;i++){
   const p=layout.forest[i],normal=worldNormal(p.x,p.z),high=p.size;
   n.fromArray(normal);
   obj.position.fromArray(worldPoint(p.x,p.z,high*offset));
   obj.quaternion.copy(q.setFromUnitVectors(UP,n))
    .multiply(spin.setFromAxisAngle(UP,p.angle));
   obj.scale.set(size[0]*(key==='forest-trunk'?high*.62:high*.21),
    size[1]*(key==='forest-trunk'?high:high*.26),
    size[2]*(key==='forest-trunk'?high*.62:high*.21));
   if(key==='forest-trunk')obj.scale.set(.5+(p.tint*.20),high,.5+p.tint*.20);
   if(key==='forest-crown')obj.position.fromArray(worldPoint(p.x,p.z,high*.83));
   obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);
   mesh.setColorAt(i,shade.set(palette[Math.floor(p.tint*palette.length)%palette.length]));
  }
  mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;
  mesh.castShadow=false;mesh.receiveShadow=false;
  mesh.name='stonewind-'+key+'-decorative-no-collision';
  artRoot.add(mesh);batches.push({key:'forest',mesh,count:layout.forest.length});
 }
 const barkAtlas=createForestBarkTextures(THREE),
  cutAtlas=createCutWoodTextures(THREE);
 if(barkAtlas?.map){
  barkAtlas.map.repeat.set(1,3);barkAtlas.bumpMap.repeat.set(1,3);
 }
 const rockMat=mat('#c2c1b5',true,{roughness:.96}),
  barkMat=mat('#b5a08a',false,{
   roughness:.96,map:barkAtlas?.map||null,bumpMap:barkAtlas?.bumpMap||null,
   bumpScale:.076}),
  stumpCut=mat('#ffffff',false,{map:cutAtlas,roughness:.90}),
  glowMat=new THREE.MeshBasicMaterial({
   color:'#edda9c',transparent:true,opacity:.047,depthWrite:false,
   side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
 materialCache.push(glowMat);
 const oAt=(group,x,z,h=0)=>{
  const n=new THREE.Vector3().fromArray(worldNormal(x,z));
  group.position.fromArray(worldPoint(x,z,h));
  group.quaternion.setFromUnitVectors(UP,n);artRoot.add(group);
  return group;
 };
 reusable.push(cutAtlas);
 if(barkAtlas?.map)reusable.push(barkAtlas.map,barkAtlas.bumpMap);
 const M=SHOWCASE_LANDMARKS;
 // The broken granite sentinel dominates the right side of the path.
 {
  const g=oAt(new THREE.Group(),M.granite.x,M.granite.z,.18);
  const upgradedRock=createDetailedRockGeometry(THREE,{large:true});
  reusable.push(upgradedRock);
  for(let j=0;j<6;j++){
   const r=.7+(j%3)*.34;
   const m=new THREE.Mesh(upgradedRock,rockMat);
   m.position.set(Math.sin(j*2.4)*(.45+j*.12),.7+(j%3)*.48,
    Math.cos(j*2.4)*(.4+j*.10));
   m.scale.set(r*(1.55-(j%2)*.4),r*(1.25+(j%3)*.27),r*1.3);
   m.rotation.y=j*.73;m.receiveShadow=true;
   g.add(m);largeMeshes.push(m);
  }
 }
 // Worn hollowed stump near the woodland path, three concentric age rings.
 {
  const g=oAt(new THREE.Group(),M.stump.x,M.stump.z,.20);
  // Same stump: denser curved bark silhouette, real endgrain texture on
  // the cylinder's existing top face rather than three flat extra rings.
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.93,1.32,1.9,32,5),
   [barkMat,stumpCut,stumpCut]);
  stem.position.y=.85;g.add(stem);largeMeshes.push(stem);
 }
 // Fallen ancient trunk creates a strong horizontal silhouette and shade.
 {
  const g=oAt(new THREE.Group(),M.fallenLog.x,M.fallenLog.z,.24);
  g.rotateY(M.fallenLog.angle);
  const root=new THREE.Mesh(new THREE.CylinderGeometry(.52,.78,
   M.fallenLog.length,28,10),[barkMat,stumpCut,stumpCut]);
  root.rotation.z=Math.PI/2;root.position.y=.53;g.add(root);largeMeshes.push(root);
  for(let j=0;j<5;j++){
   const lump=new THREE.Mesh(createDetailedCrownGeometry(THREE,{far:true}),
    mat(j%2?'#547256':'#496451',true));
   reusable.push(lump.geometry);
   lump.position.set((j-2)*1.44,.76+(j%2)*.18,Math.sin(j*2.7)*.38);
   lump.scale.set(1.1,.24,.49);g.add(lump);
  }
 }
 // Soft shafts connect canopy gaps to the ground, transparent visual only.
 const shafts=new THREE.Group();shafts.name='stonewind-canopy-light-shafts';
 for(let i=0;i<9;i++){
  const angle=(i*2.2),r=3.4+(i%3)*2.5;
  const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
  const g=oAt(new THREE.Group(),x,z,.3);
  // Move from the decorative root into a separately toggleable group.
  artRoot.remove(g);shafts.add(g);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.23,2.0,14,12,1,true),
   glowMat);
  beam.position.y=7.0;
  beam.rotation.x=.05;beam.rotation.z=.17;
  g.add(beam);
 }
 artRoot.add(shafts);
 // A warm radial light bed under leaf gaps, unlit and alpha blended.
 const haloGeo=new THREE.RingGeometry(.25,4.2,38),haloMat=
  new THREE.MeshBasicMaterial({color:'#d6c389',side:THREE.DoubleSide,
   transparent:true,opacity:.045,depthWrite:false});
 materialCache.push(haloMat);reusable.push(haloGeo);
 const halo=new THREE.Mesh(haloGeo,haloMat);
 halo.rotation.x=-Math.PI/2;
 const haloGroup=oAt(new THREE.Group(),M.lightWell.x,M.lightWell.z,.28);
 haloGroup.add(halo);halo.name='stonewind-meadow-warmth';
 function setQuality(level='balanced',enabled=true){
  const tier=SHOWCASE_TIERS[level]||SHOWCASE_TIERS.balanced;
  artRoot.visible=!!enabled;
  for(const {key,mesh,count}of batches){
   const fraction=tier[key]??.5;
   mesh.count=enabled?Math.floor(count*fraction):0;
  }
  shafts.visible=!!enabled&&tier.shafts>0;
  glowMat.opacity=.047*tier.shafts;
  haloMat.opacity=.045*(level==='high'?1:.58);
  for(const mesh of largeMeshes)mesh.castShadow=!!enabled&&tier.shadow&&level==='high';
 }
 setQuality();
 return {root:artRoot,layout,tiers:SHOWCASE_TIERS,drawCalls:8,
  setQuality,dispose(){
   scene.remove(artRoot);
   for(const geo of reusable)geo.dispose();
   for(const m of materialCache)m.dispose();
  }};
}
