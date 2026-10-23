// P2.3.15: close-range soil scatter. Material clues rather than noise:
// irregular pebble chips, dry needles and leaf ribs. Exactly two instanced
// draw calls, no terrain deformation, raycast targets or collision changes.
import {lakeRadius} from './start-zone.js?v=50';
import {forestTrailLatitude,forestDistance,FOREST_CAMP,FOREST_SITE_CLEARINGS}
 from './whispering-forest.js';
const TAU=2*Math.PI,R=261;
export const SOIL_SCATTER_CAPS=Object.freeze({chips:1650,needles:2100});
export function soilScatterBudget(quality='balanced',preview=false){
 if(preview||quality==='economy')return {chips:0,needles:0};
 if(quality==='high')return {...SOIL_SCATTER_CAPS};
 return {chips:920,needles:1130};
}
const seeded=(seed)=>{
 let state=seed>>>0;
 return ()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
};
export function soilScatterLayout(seed=841736){
 const rand=seeded(seed),chips=[],needles=[];
 const pick=(kind,point)=>{
  const palette=rand(),yaw=rand()*TAU,
   size=(kind==='chips'?.08:.12)+rand()*(kind==='chips'?.16:.21);
  (kind==='chips'?chips:needles).push(Object.freeze({...point,size,
   palette,yaw}));
 };
 for(let i=0;i<5000&&(chips.length<500||needles.length<620);i++){
  const x=(rand()-.5)*139,z=(rand()-.5)*139;
  const d=Math.hypot(x,z);
  if(d>67||Math.hypot(x,z-9)<12)continue;
  // Avoid camp hearth, original lake, shoreline, buildings and tight paths.
  if(Math.hypot(x+27,z+2)<19)continue;
  if(lakeRadius(x,z)<1.42)continue;
  const kind=rand()<.47?'chips':'needles';
  if((kind==='chips'?chips:needles).length>= (kind==='chips'?500:620))continue;
  pick(kind,{coord:'start',x,z});
 }
 for(let i=0;i<15000&&(chips.length<SOIL_SCATTER_CAPS.chips||
   needles.length<SOIL_SCATTER_CAPS.needles);i++){
  const lon=.32+rand()*1.11,side=rand()<.5?-1:1;
  const lat=forestTrailLatitude(lon)+side*(3.7+rand()*50)/R;
  if(forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat)<
    FOREST_CAMP.clearingRadius+7)continue;
  if(FOREST_SITE_CLEARINGS.some(p=>
    forestDistance(lon,lat,p.lon,p.lat)<p.radius+3.6))continue;
  const kind=rand()<.44?'chips':'needles';
  if((kind==='chips'?chips:needles).length>=SOIL_SCATTER_CAPS[kind])continue;
  pick(kind,{coord:'forest',lon,lat});
 }
 return Object.freeze({chips:Object.freeze(chips),needles:Object.freeze(needles)});
}
export function soilNeedleGeometryData(){
 const pos=[],colors=[],tri=(a,b,c,color)=>{
  pos.push(...a,...b,...c);
  for(let i=0;i<3;i++)colors.push(...color);
 };
 for(let j=0;j<9;j++){
  const angle=j*2.39996,dx=Math.cos(angle),dz=Math.sin(angle),tx=-dz,tz=dx;
  const d=.12+.026*(j%4),len=.23+.07*(j%3),w=.012+.003*(j%3);
  const a=[dx*d+tx*w,.006,dz*d+tz*w];
  const b=[dx*(d+len),.023+(j%2)*.012,dz*(d+len)];
  const c=[dx*d-tx*w,.004,dz*d-tz*w];
  tri(a,b,c,j%3===0?[.89,.76,.53]:j%3===1?[.70,.57,.39]:[.56,.53,.41]);
 }
 return {positions:pos,colors};
}
function needleGeometry(THREE){
 const data=soilNeedleGeometryData(),geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));
 geo.computeVertexNormals();return geo;
}
export function createSoilScatter(THREE,{scene,radius,heightAt}){
 const layout=soilScatterLayout(),up=new THREE.Vector3(0,1,0),
  n=new THREE.Vector3(),align=new THREE.Quaternion(),turn=new THREE.Quaternion(),
  obj=new THREE.Object3D(),tint=new THREE.Color(),groups=[];
 function scatter(kind,geometry){
  const points=layout[kind],isChip=kind==='chips';
  const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({
   color:'#ffffff',vertexColors:!isChip,side:THREE.DoubleSide,
   roughness:1,flatShading:isChip
  }),points.length);
  mesh.name='ground-natural-'+kind+'-decorative-no-collision';
  mesh.frustumCulled=false;mesh.receiveShadow=false;mesh.castShadow=false;
  for(let i=0;i<points.length;i++){
   const p=points[i];
   if(p.coord==='start'){
    const d=Math.hypot(p.x,p.z),theta=d/radius,scale=d<1e-7?1:Math.sin(theta)/d;
    n.set(p.x*scale,p.z*scale,Math.cos(theta));
   }else{
    const c=Math.cos(p.lat);n.set(c*Math.sin(p.lon),Math.sin(p.lat),c*Math.cos(p.lon));
   }
   const elevation=p.coord==='start'?(isChip?.175:.19):(isChip?.078:.095);
   obj.position.copy(n).multiplyScalar(radius+heightAt(n)+elevation);
   obj.quaternion.copy(align.setFromUnitVectors(up,n)).multiply(turn.setFromAxisAngle(up,p.yaw));
   obj.scale.set(p.size,isChip?p.size*.29:p.size,p.size);
   obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);
   const palette=isChip?['#8b8472','#827c6b','#98886d','#727667']:
    ['#ab926a','#8e7858','#b8a075','#897657'];
   tint.set(palette[Math.min(3,Math.floor(p.palette*4))]);mesh.setColorAt(i,tint);
  }
  mesh.instanceMatrix.needsUpdate=true;
  scene.add(mesh);groups.push({kind,mesh,total:points.length});
 }
 scatter('chips',new THREE.IcosahedronGeometry(1,0));
 scatter('needles',needleGeometry(THREE));
 function setQuality(quality='balanced',preview=false){
  const budgets=soilScatterBudget(quality,preview);
  for(const item of groups){
   item.mesh.count=Math.min(item.total,budgets[item.kind]);
   item.mesh.visible=item.mesh.count>0;
  }
 }
 setQuality();
 return {setQuality,layout,decorativeOnly:true,drawCalls:2};
}
