// NexGameWorld painterly scene pass: original 3D botanical shapes and soft
// canopy sun flecks spanning both biomes. Cosmetic instancing only; no physics,
// NPCs, account state, server messages or foreign image/texture assets.
import {pathWear,lakeRadius} from './start-zone.js?v=55';
import {forestTrailLatitude,forestDistance,FOREST_CAMP,FOREST_SITE_CLEARINGS,
 createForestLayout} from './whispering-forest.js?v=22';
import {WORLD_ART_PALETTE as ART} from './world-art-style.js?v=1';
import {botanicalUnderstoryData} from './botanical-understory.js?v=2';
const TAU=Math.PI*2,R=261;
const clamp=x=>Math.max(0,Math.min(1,x));
function rng(seed){let s=seed>>>0;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
const CAPS=Object.freeze({lawn:18000,groundcover:4300,ferns:1350,daisies:1650,bluebells:1200,mushrooms:420,sunflecks:120});
export const PAINTERLY_BIOME_CAPS=CAPS;
export function painterlyBiomeBudget(preset='balanced',preview=false){
 const factor=preview?0:preset==='economy'?.22:preset==='high'?1:.70;
 return Object.fromEntries(Object.entries(CAPS).map(([k,v])=>[k,Math.floor(v*factor)]));
}
export function painterlyBiomeLayout(seed=149023){
 const rand=rng(seed),trees=createForestLayout().trees;
 const groups=Object.fromEntries(Object.keys(CAPS).map(k=>[k,[]]));
 const touchesTree=(lon,lat,r)=>trees.some(t=>{
  const dx=(t.lon-lon)*R*Math.cos(lat),dz=(t.lat-lat)*R;
  return dx*dx+dz*dz<(t.radius*.8+r)**2;
 });
 function point(kind){
  const start=rand()<.42;
  if(start){
   const x=(rand()-.49)*142,z=(rand()-.50)*140,d=Math.hypot(x,z);
   if(d<18||d>73||lakeRadius(x,z)<1.28||
    Math.hypot(x+27,z+2)<16)return null;
   const worn=pathWear(x,z);
   if(kind!=='sunflecks'&&worn>.12)return null;
   return {zone:'start',x,z,yaw:rand()*TAU,
    size:.65+rand()*.8,variation:rand(),shade:.20+rand()*.3};
  }
  const lon=.19+rand()*1.26;
  const side=rand()<.5?-1:1;
  const away=(kind==='sunflecks'?1.2:3.8)+Math.pow(rand(),1.3)*24;
  const lat=forestTrailLatitude(lon)+side*away/R;
  if(forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat)<
     FOREST_CAMP.clearingRadius+5)return null;
  if(FOREST_SITE_CLEARINGS.some(p=>
     forestDistance(lon,lat,p.lon,p.lat)<p.radius+3))return null;
  if(kind!=='sunflecks'&&touchesTree(lon,lat,.45))return null;
  return {zone:'forest',lon,lat,yaw:rand()*TAU,
   size:.57+rand()*.94,variation:rand(),shade:.37+rand()*.55};
 }
 for(const kind of Object.keys(CAPS)){
  for(let i=0;i<CAPS[kind]*32&&groups[kind].length<CAPS[kind];i++){
   const p=point(kind);if(p)groups[kind].push(Object.freeze(p));
  }
 }
 return Object.freeze(Object.fromEntries(Object.entries(groups).map(([k,v])=>
  [k,Object.freeze(v)])));
}
function meshGeometry(THREE,positions,colors,rgba=false){
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,rgba?4:3));
 geo.computeVertexNormals();return geo;
}
export function painterlyPlantGeometryData(kind){
 if(['lawn','ferns','groundcover'].includes(kind))return botanicalUnderstoryData(kind);
 const p=[],c=[];
 const tri=(a,b,d,ca,cb=ca,cc=ca)=>{
  p.push(...a,...b,...d);c.push(...ca,...cb,...cc);
 };
 if(kind==='daisies'||kind==='bluebells'){
  const blue=kind==='bluebells';
  const petals=blue?[.44,.61,.96]:[.97,.97,.83];
  const edges=blue?[.24,.37,.75]:[.80,.85,.66];
  const yellow=[.91,.68,.27],stem=[.34,.53,.29];
  for(let stalk=0;stalk<2;stalk++){
   const phase=stalk*2.18,ox=stalk?.23:-.17,oz=stalk?-.14:.10;
   const height=stalk?.54:.70;
   const q=[ox,height,oz],low=[ox*.48,.05,oz*.48];
   tri([low[0]-.022,low[1],low[2]],q,[low[0]+.022,low[1],low[2]],stem);
   // Petal facets arch upward instead of opaque flat billboard flowers.
   for(let j=0;j<8;j++){
    const a=j*TAU/8+phase,dx=Math.cos(a),dz=Math.sin(a);
    const tang=[-dz,dz?dx:1],spread=blue?.18:.17;
    const tip=[ox+dx*spread,height+.06,oz+dz*spread];
    const l=[ox+dx*.11-dz*.064,height+.055,oz+dz*.11+dx*.064];
    const r=[ox+dx*.11+dz*.064,height+.050,oz+dz*.11-dx*.064];
    tri(q,l,tip,edges,petals,petals);
    tri(q,tip,r,edges,petals,edges);
   }
   for(let j=0;j<8;j++){
    const a=j*TAU/8,b=(j+1)*TAU/8;
    tri(q,[ox+Math.cos(a)*.054,height+.02,oz+Math.sin(a)*.054],
     [ox+Math.cos(b)*.054,height+.02,oz+Math.sin(b)*.054],
     yellow,yellow,yellow);
   }
  }
 }else if(kind==='mushrooms'){
  const wood=[.80,.70,.53],inner=[.55,.35,.21],top=[.82,.46,.22],rim=[.52,.24,.15];
  const count=10;
  for(let j=0;j<count;j++){
   const a=j*TAU/count,b=(j+1)*TAU/count;
   const x=Math.cos(a),z=Math.sin(a),x2=Math.cos(b),z2=Math.sin(b);
   const a0=[x*.065,.05,z*.065],b0=[x2*.065,.05,z2*.065];
   const a1=[x*.046,.48,z*.046],b1=[x2*.046,.48,z2*.046];
   tri(a0,b0,a1,wood,wood,wood);tri(b0,b1,a1,wood,wood,wood);
   const edge=[x*.35,.47,z*.35],edge2=[x2*.35,.47,z2*.35];
   const mid=[x*.23,.69,z*.23],mid2=[x2*.23,.69,z2*.23];
   tri(a1,edge,edge2,inner,rim,rim);
   tri(edge,mid,edge2,rim,top,rim);
   tri(edge2,mid,mid2,rim,top,top);
   tri(mid,[0,.78,0],mid2,top,top,top);
  }
 }else if(kind==='sunflecks'){
  const count=9;
  for(let patch=0;patch<6;patch++){
   const a=patch*2.399,dist=patch===0?0:.34+.10*(patch%4),
    cx=Math.cos(a)*dist,cz=Math.sin(a)*dist;
   const rx=.22+.07*(patch%3),rz=.14+.055*((patch+1)%3);
   for(let j=0;j<count;j++){
    const t=j*TAU/count,u=(j+1)*TAU/count;
    const edge=k=>[cx+Math.cos(k)*rx*(1+.13*Math.sin(k*3+patch)),.018,
      cz+Math.sin(k)*rz*(1+.17*Math.cos(k*4+patch))];
    tri([cx,.018,cz],edge(t),edge(u),
     [1,1,1,.22],[1,1,1,0],[1,1,1,0]);
   }
  }
 }else throw new RangeError('Unknown biome art '+kind);
 return {positions:p,colors:c,alpha:kind==='sunflecks'};
}
export function createPainterlyBiome(THREE,{scene,radius,heightAt}){
 const layout=painterlyBiomeLayout(),batches=[],up=new THREE.Vector3(0,1,0);
 const n=new THREE.Vector3(),align=new THREE.Quaternion(),rotation=new THREE.Quaternion();
 const obj=new THREE.Object3D(),color=new THREE.Color();
 const palette={
  lawn:ART.canopy.meadowGrass,
  groundcover:ART.canopy.meadowGrass,
  ferns:ART.canopy.fern,
  daisies:ART.flowers.white,
  bluebells:ART.flowers.blue,
  mushrooms:['#ffffff','#ead9bd','#bba58c','#d7bba0'],
  sunflecks:ART.light.sunflecks
 };
 for(const kind of Object.keys(CAPS)){
  const data=painterlyPlantGeometryData(kind);
  const geo=meshGeometry(THREE,data.positions,data.colors,data.alpha);
  if(kind==='ferns'||kind==='groundcover'){
   const distant=botanicalUnderstoryData(kind,'distant');
   geo.userData.ngwDistantGeometry=meshGeometry(THREE,distant.positions,distant.colors);
  }
  const material=kind==='sunflecks'?
   new THREE.MeshBasicMaterial({color:'#fce4ae',vertexColors:true,transparent:true,
    opacity:.68,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,
    polygonOffsetFactor:-1,polygonOffsetUnits:-1}):
   new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,
    roughness:1,metalness:0,side:THREE.DoubleSide});
  const rows=layout[kind],mesh=new THREE.InstancedMesh(geo,material,rows.length);
  mesh.name='painterly-'+kind+'-decorative-no-collision';
  mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=kind!=='sunflecks';
  for(let i=0;i<rows.length;i++){
   const row=rows[i];
   if(row.zone==='start'){
    const d=Math.hypot(row.x,row.z),theta=d/radius;
    const k=d?Math.sin(theta)/d:0;
    n.set(row.x*k,row.z*k,Math.cos(theta));
   }else n.set(Math.cos(row.lat)*Math.sin(row.lon),Math.sin(row.lat),
    Math.cos(row.lat)*Math.cos(row.lon));
   const offset=kind==='mushrooms'?.035:kind==='sunflecks'?.16:.04;
   obj.position.copy(n).multiplyScalar(radius+heightAt(n)+offset);
   obj.quaternion.copy(align.setFromUnitVectors(up,n))
    .multiply(rotation.setFromAxisAngle(up,row.yaw));
   const size=(kind==='sunflecks'?1.5:kind==='mushrooms'?.62:1)*row.size;
   obj.scale.set(size,size,size);obj.updateMatrix();
   mesh.setMatrixAt(i,obj.matrix);
   const plantTint=(kind==='daisies'||kind==='bluebells')?'#ffffff':
    palette[kind][Math.min(3,Math.floor(row.variation*4))];
   mesh.setColorAt(i,color.set(plantTint));
  }
  mesh.instanceMatrix.needsUpdate=true;
  if(kind==='sunflecks')mesh.renderOrder=1;
  scene.add(mesh);batches.push({kind,mesh});
 }
 function setQuality(preset='balanced',preview=false){
  const budget=painterlyBiomeBudget(preset,preview);
  for(const {kind,mesh} of batches){
   mesh.count=Math.min(mesh.instanceMatrix.count,budget[kind]);
   mesh.visible=mesh.count>0;
  }
 }
 setQuality();
 return {setQuality,layout,decorativeOnly:true,drawCalls:batches.length};
}
