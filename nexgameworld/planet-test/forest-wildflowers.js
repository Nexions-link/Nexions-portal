// G-21: botanical wildflower islands in the existing forest grass clearings.
// One shared instanced draw call, fully decorative; no new collisions,
// textures, network state, shader overrides or animation-frame updates.
import {forestGroundLifeLayout} from './forest-ground-life.js?v=4';
import {forestGrassCarpetProfile} from './forest-grass-carpet.js?v=1';
import {forestCanopyShadeAt} from './forest-lighting.js';
import {forestTrailLatitude} from './whispering-forest.js';
const TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x));
export const FOREST_WILDFLOWER_CAP=640;
export const FOREST_WILDFLOWER_PALETTE=Object.freeze([
 '#f1eee3', // white
 '#f5deab', // pale cream
 '#f3d76b', // butter yellow
 '#9cbfe4'  // light blue
]);
export function forestWildflowerBudget(quality='balanced',preview=false){
 if(preview)return 0;
 return quality==='economy'?100:quality==='high'?FOREST_WILDFLOWER_CAP:420;
}
export function forestWildflowerLayout(grass=forestGroundLifeLayout().grass,seed=781231){
 let state=seed>>>0;
 const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const flowers=[];
 for(const p of grass){
  if(flowers.length>=FOREST_WILDFLOWER_CAP)break;
  const profile=forestGrassCarpetProfile(p.lon,p.lat);
  const shade=forestCanopyShadeAt(p.lon,p.lat);
  const side=p.lat>=forestTrailLatitude(p.lon)?1:-1;
  // A few broad, crooked flowering colonies rather than a perfectly
  // regular seed: the grass already avoids roads, trunks and quest areas.
  const colonies=.52+.30*Math.sin(p.lon*31.4+side*1.7)+
   .18*Math.sin(p.lon*71.2-side*2.4);
  const bloom=clamp(.22+.45*colonies+.28*profile.density-.20*shade);
  const pick=rand();
  const age=rand(),type=rand(),yaw=rand()*TAU;
  if(pick>bloom)continue;
  const species=type<.30?0:type<.53?1:type<.78?2:3;
  flowers.push(Object.freeze({
   lon:p.lon,lat:p.lat,shade,variation:age,yaw,species,
   scale:.67+.52*age,
   // Pale flowers pop in dappled shade but retain readable 3D foliage.
   brightness:clamp(1.04-.18*shade+.06*age)
  }));
 }
 return Object.freeze(flowers);
}
// Two petite flowering stems per instance. Each flower has five separate
// curved petals, a golden centre, two tapered leaves and a slender stalk.
// Exactly 30 triangles for BOTH heads; no expensive cylinder or sphere mesh.
export function forestWildflowerGeometryData(){
 const positions=[],colors=[];
 const tri=(a,b,c,ca,cb,cc)=>{
  positions.push(...a,...b,...c);
  colors.push(...ca,...cb,...cc);
 };
 const stem=[.19,.40,.18],leaf=[.28,.57,.24],
  leafTip=[.49,.69,.29],petalRoot=[.87,.89,.84],
  petalEdge=[1,.99,.95],petalTip=[.95,.98,1],
  gold=[1,.76,.31],pollen=[1,.88,.47];
 for(let head=0;head<2;head++){
  const cx=head===0?-.18:.20,cz=head===0?-.08:.10;
  const height=head===0?.56:.42,lean=head===0?-.09:.075;
  const ex=cx+lean,ez=cz+(head===0?.035:-.07);
  const width=.025;
  // Upright tapered stem (two triangles) catches raking sunlight.
  const a=[cx-width,.045,cz],b=[cx+width,.045,cz];
  const c=[ex+.018,height-.038,ez],d=[ex-.018,height-.038,ez];
  tri(a,b,c,stem,stem,leaf);
  tri(a,c,d,stem,leaf,stem);
  for(const side of [-1,1]){
   const y=.20+.08*(head===0?0:1),direction=side;
   const root=[cx,y,cz],base=[cx+direction*.11,y+.08,cz+.035];
   const tip=[cx+direction*.18,y+.055,cz+.08*side];
   tri(root,base,tip,stem,leafTip,leaf);
  }
  const radius=head===0?.148:.125;
  for(let i=0;i<5;i++){
   const angle=TAU*i/5+(head===0?.12:.39);
   const dx=Math.cos(angle),dz=Math.sin(angle);
   const tx=-dz,tz=dx;
   // Each petal is a rounded-feeling tapered 2-triangle blade with air
   // between neighbours, not a solid star or billboard disc.
   const tip=[ex+radius*dx,height+.035,ez+radius*dz];
   const root=[ex+dx*.028,height-.009,ez+dz*.028];
   const left=[ex+dx*radius*.65+tx*radius*.31,height+.026,
    ez+dz*radius*.65+tz*radius*.31];
   const right=[ex+dx*radius*.65-tx*radius*.31,height+.016,
    ez+dz*radius*.65-tz*radius*.31];
   tri(root,left,tip,petalRoot,petalEdge,petalTip);
   tri(root,tip,right,petalRoot,petalTip,petalEdge);
  }
  tri([ex-.045,height+.012,ez-.018],[ex+.045,height+.012,ez-.018],
    [ex,height+.025,ez+.045],gold,pollen,gold);
 }
 return {positions,colors,triangles:positions.length/9,heads:2,petals:10};
}
export function createForestWildflowers(THREE,{scene,radius,heightAt,grassLayout}){
 const layout=forestWildflowerLayout(grassLayout);
 const data=forestWildflowerGeometryData();
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));
 geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({
  color:'#ffffff',vertexColors:true,side:THREE.DoubleSide,
  roughness:1,metalness:0
 });
 const mesh=new THREE.InstancedMesh(geometry,material,layout.length);
 mesh.name='forest-wildflowers-no-collision';
 mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
 const normal=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
 const rotate=new THREE.Quaternion(),turn=new THREE.Quaternion();
 const dummy=new THREE.Object3D(),tint=new THREE.Color();
 for(let i=0;i<layout.length;i++){
  const p=layout[i];
  normal.set(Math.cos(p.lat)*Math.sin(p.lon),Math.sin(p.lat),
   Math.cos(p.lat)*Math.cos(p.lon));
  dummy.position.copy(normal).multiplyScalar(radius+heightAt(normal)+.04);
  dummy.quaternion.copy(rotate.setFromUnitVectors(up,normal))
   .multiply(turn.setFromAxisAngle(up,p.yaw));
  dummy.scale.setScalar(p.scale);dummy.updateMatrix();
  mesh.setMatrixAt(i,dummy.matrix);
  mesh.setColorAt(i,tint.set(FOREST_WILDFLOWER_PALETTE[p.species])
   .multiplyScalar(p.brightness));
 }
 mesh.instanceMatrix.needsUpdate=true;
 scene.add(mesh);
 function setQuality(quality='balanced',preview=false){
  mesh.count=Math.min(layout.length,forestWildflowerBudget(quality,preview));
  mesh.visible=mesh.count>0;
 }
 setQuality();
 return {setQuality,layout,drawCalls:1,decorativeOnly:true,mesh};
}
