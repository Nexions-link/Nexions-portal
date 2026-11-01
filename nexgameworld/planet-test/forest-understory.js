// P2.3.11 - Old-growth understorey art direction: close-range silhouettes,
// climbing ivy, leaf fall and lichen-covered stones. Rendering only.
// No path blockers, network state, raycast targets, new lights or shader patches.
import {createForestLayout,forestDistance,forestTrailLatitude,forestMoodAt,
 FOREST_CAMP,FOREST_SITE_CLEARINGS} from './whispering-forest.js';
import {forestCanopyShadeAt} from './forest-lighting.js';
import {createWeatheredStoneGeometry} from './stone-surface.js?v=1';
import {forestFernData,forestFernAgeProfile} from './forest-botanical-geometry.js?v=2';

const TAU=Math.PI*2,R=261;
export const FOREST_UNDERSTORY_CAPS=Object.freeze({
 ferns:540,leaves:980,boulders:175,ivy:300
});
export function forestUnderstoryBudget(quality='balanced',preview=false){
 if(preview)return {ferns:0,leaves:0,boulders:0,ivy:0};
 if(quality==='economy')return {ferns:100,leaves:185,boulders:36,ivy:65};
 if(quality==='high')return {...FOREST_UNDERSTORY_CAPS};
 return {ferns:335,leaves:620,boulders:105,ivy:190};
}
const sCurve=t=>{const v=Math.max(0,Math.min(1,t));return v*v*(3-2*v)};
function seeded(seed){
 let state=seed>>>0;
 return ()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
}
export function forestUnderstoryLayout(seed=522817){
 const rand=seeded(seed),trees=createForestLayout().trees;
 const ferns=[],leaves=[],boulders=[];
 const ivy=trees.filter((t,i)=>i%4!==0).slice(0,FOREST_UNDERSTORY_CAPS.ivy)
  .map(t=>Object.freeze({...t}));
 const groups={ferns,leaves,boulders};
 const free=(lon,lat,radius)=>{
  const mood=forestMoodAt(lon,lat);
  if(mood<.24)return false;
  if(Math.abs(lat-forestTrailLatitude(lon))*R<4.7+radius)return false;
  if(forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat)<
     FOREST_CAMP.clearingRadius+radius+4)return false;
  if(FOREST_SITE_CLEARINGS.some(p=>
    forestDistance(lon,lat,p.lon,p.lat)<p.radius+radius+3))return false;
  // Small details sit in the gaps between trunks, not through visible bark.
  return !trees.some(t=>{
   const x=(t.lon-lon)*R*Math.cos(lat),z=(t.lat-lat)*R;
   const min=t.radius*.78+radius*.58+.22;
   return x*x+z*z<min*min;
  });
 };
 // Keep the old forest, quest and wildlife coordinates absolutely untouched.
 for(let attempt=0;attempt<14500&&Object.keys(groups).some(k=>
   groups[k].length<FOREST_UNDERSTORY_CAPS[k]);attempt++){
  const lon=.23+rand()*1.20;
  const offset=(rand()<.5?-1:1)*(5.2+Math.pow(rand(),1.27)*78);
  const lat=forestTrailLatitude(lon)+offset/R;
  const selector=rand(),kind=selector<.46?'leaves':
   selector<.82?'ferns':'boulders';
  if(groups[kind].length>=FOREST_UNDERSTORY_CAPS[kind])continue;
  const variation=rand(),size=kind==='boulders'?.42+rand()*1.14:
   kind==='ferns'?.57+rand()*1.35:.42+rand()*.96;
  if(!free(lon,lat,size))continue;
  const shade=forestCanopyShadeAt(lon,lat);
  // Leaf colour and fern density respond to canopy; openings stay readable.
  groups[kind].push(Object.freeze({lon,lat,size,
   yaw:rand()*TAU,variation,shade}));
 }
 return Object.freeze({
  ferns:Object.freeze(ferns),
  leaves:Object.freeze(leaves),
  boulders:Object.freeze(boulders),
  ivy:Object.freeze(ivy)
 });
}
function geometryData(kind){
 const positions=[],colors=[];
 const vertex=(p,color)=>{positions.push(...p);colors.push(...color)};
 const triangle=(a,b,c,ca,cb=ca,cc=ca)=>{
  vertex(a,ca);vertex(b,cb);vertex(c,cc);
 };
 if(kind==='ferns'){
  // Replaces the old flat fan with individual arched leaflets.
  // Still precisely 7 fronds x 6 stations x 2 triangles per station.
  const fern=forestFernData({fronds:7,segments:6});
  return {positions:fern.positions,colors:fern.colors,triangles:fern.triangles};
 }else if(kind==='leaves'){
  // Fallen oak leaf litter with independently curled lobes rather than
  // repeated sharp paper triangles; tiny height variations catch glancing light.
  for(let j=0;j<10;j++){
   const angle=j*2.39996,dx=Math.cos(angle),dz=Math.sin(angle);
   const tx=-dz,tz=dx,radial=.18+.066*(j%4);
   const start=[dx*radial,.014,dz*radial];
   const y=.045+(j%3)*.018,length=.29+.058*(j%3);
   const base=[dx*(radial+.09),.019,dz*(radial+.09)];
   const mid=[dx*(radial+length*.48),y,dz*(radial+length*.48)];
   const tip=[dx*(radial+length),.025,dz*(radial+length)];
   const w=.10+.022*(j%3);
   const a=[mid[0]+tx*w,mid[1],mid[2]+tz*w];
   const b=[mid[0]-tx*w,mid[1]-.018,mid[2]-tz*w];
   const l=[dx*(radial+length*.68)+tx*w*.81,.035,
    dz*(radial+length*.68)+tz*w*.81];
   const r=[dx*(radial+length*.68)-tx*w*.81,.017,
    dz*(radial+length*.68)-tz*w*.81];
   const dark=j%3===0?[.67,.43,.29]:j%3===1?[.55,.42,.30]:[.44,.38,.28];
   const edge=j%3===0?[.90,.68,.39]:j%3===1?[.79,.57,.34]:[.65,.56,.38];
   triangle(start,base,a,dark,dark,edge);
   triangle(start,a,mid,dark,edge,edge);
   triangle(start,mid,b,dark,edge,edge);
   triangle(start,b,base,dark,edge,dark);
   triangle(a,l,tip,edge,edge,dark);
   triangle(b,tip,r,edge,dark,edge);
  }
 }else if(kind==='ivy'){
  // Creeping stems climb the lower bark and turn around its circumference.
  // Entire vines are cosmetic; the original solid trunk collider is untouched.
  for(let strand=0;strand<4;strand++){
   const phase=strand*TAU/4;
   for(let j=0;j<8;j++){
    const y=.28+j*.55,angle=phase+j*.19+Math.sin(j*.61+strand)*.11;
    const rr=.788-.007*y;
    const radial=[Math.cos(angle),Math.sin(angle)];
    const tangent=[-radial[1],radial[0]];
    const a=[radial[0]*rr,y,radial[1]*rr];
    const b=[radial[0]*(rr+.04)+tangent[0]*.045,y+.26,
      radial[1]*(rr+.04)+tangent[1]*.045];
    const c=[radial[0]*(rr+.13)+tangent[0]*.18,y+.39,
      radial[1]*(rr+.13)+tangent[1]*.18];
    const d=[radial[0]*(rr+.17)-tangent[0]*.10,y+.47,
      radial[1]*(rr+.17)-tangent[1]*.10];
    const base=[.43,.64,.40],highlight=[.73,.85,.55];
    triangle(a,b,c,base,base,highlight);
    triangle(a,d,b,base,highlight,base);
   }
  }
 }else throw new RangeError('Unknown understory geometry '+kind);
 return {positions,colors,triangles:positions.length/9};
}
export function forestUnderstoryGeometryData(kind){
 return geometryData(kind);
}
export function createForestUnderstory(THREE,{scene,radius,heightAt}){
 const layout=forestUnderstoryLayout(),batches=[];
 const up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3();
 const tilt=new THREE.Quaternion(),turn=new THREE.Quaternion(),
  dummy=new THREE.Object3D(),tint=new THREE.Color();
 const palettes={
  ferns:['#527e4b','#31674d','#91a868','#497e54'],
  leaves:['#866547','#66533d','#ae8659','#857047'],
  boulders:['#6b7169','#6d7769','#5a6864','#787f74'],
  ivy:['#3c6846','#5b8653','#386149','#7b9962']
 };
 const deepFernTint=new THREE.Color('#37664b');
 const normalAt=p=>normal.set(Math.cos(p.lat)*Math.sin(p.lon),Math.sin(p.lat),
  Math.cos(p.lat)*Math.cos(p.lon));
 function createGeo(data){
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));
  geo.computeVertexNormals();return geo;
 }
 function add(kind,geo,lit=true){
  const rows=layout[kind],material=lit?
   new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,
    metalness:0,vertexColors:true,side:THREE.DoubleSide}):
   new THREE.MeshBasicMaterial({color:'#ffffff',vertexColors:true,side:THREE.DoubleSide});
  const mesh=new THREE.InstancedMesh(geo,material,rows.length);
  mesh.name='forest-cinematic-'+kind+'-no-collision';
  mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
  for(let i=0;i<rows.length;i++){
   const p=rows[i],n=normalAt(p);
   // G-20: age and canopy light vary each existing fern instance without
   // splitting the shared 84-triangle batch or moving a single plant.
   const fernGrowth=kind==='ferns'?forestFernAgeProfile(p.variation,p.shade):null;
   const h=kind==='ivy'?.02:kind==='boulders'?p.size*.25:.055;
   dummy.position.copy(n).multiplyScalar(radius+heightAt(n)+h);
   dummy.quaternion.copy(tilt.setFromUnitVectors(up,n))
    .multiply(turn.setFromAxisAngle(up,p.yaw));
   if(kind==='ivy'){
    dummy.scale.set(p.radius,1,p.radius);
   }else if(kind==='boulders'){
    dummy.scale.set(p.size*.78,p.size*.32,p.size*.66);
   }else if(kind==='ferns'){
    dummy.scale.set(p.size*1.10*fernGrowth.width,
     p.size*.98*fernGrowth.height,p.size*1.10*fernGrowth.width);
   }else dummy.scale.set(p.size,1,p.size);
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   const palette=palettes[kind][Math.floor((kind==='ivy'?p.tint:p.variation)*4)];
   tint.set(palette);
   if(fernGrowth)tint.lerp(deepFernTint,p.shade*.18)
    .multiplyScalar(fernGrowth.light);
   mesh.setColorAt(i,tint);
  }
  mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);
  batches.push({kind,mesh,count:rows.length});
 }
 add('ferns',createGeo(geometryData('ferns')));
 add('leaves',createGeo(geometryData('leaves')),false);
 add('boulders',createWeatheredStoneGeometry(THREE,'forest'));
 add('ivy',createGeo(geometryData('ivy')));
 function setQuality(quality='balanced',preview=false){
  const budget=forestUnderstoryBudget(quality,preview);
  for(const {kind,mesh,count} of batches){
   mesh.count=Math.min(count,budget[kind]);
   mesh.visible=mesh.count>0;
  }
 }
 setQuality();
 return {setQuality,layout,drawCalls:4,decorativeOnly:true};
}
