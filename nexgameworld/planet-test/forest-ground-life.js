// P2.3.8-C: tiny low-poly grass, saplings and twigs on the existing spherical
// ground. No colliders, raycast targets, loot, network events or extra terrain.
// Exactly three instanced draw calls across all plants at every quality level.
import {forestTrailLatitude,forestDistance,forestMoodAt,FOREST_CAMP,
 FOREST_SITE_CLEARINGS,createForestLayout} from './whispering-forest.js';
import {forestCanopyShadeAt} from './forest-lighting.js';
const TAU=Math.PI*2;
export const FOREST_GROUND_LIFE_CAPS=Object.freeze({
 grass:2100,saplings:360,deadwood:310
});
export function forestGroundLifeBudget(quality='balanced',preview=false){
 if(preview)return {grass:0,saplings:0,deadwood:0};
 if(quality==='economy')return {grass:430,saplings:55,deadwood:65};
 if(quality==='high')return {...FOREST_GROUND_LIFE_CAPS};
 return {grass:1210,saplings:195,deadwood:195};
}
export function forestGroundLifeLayout(seed=706419){
 let state=seed>>>0;
 const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const trees=createForestLayout().trees;
 const grass=[],saplings=[],deadwood=[];
 const places={grass,saplings,deadwood};
 function valid(lon,lat,size,clearTrail){
  if(forestMoodAt(lon,lat)<.13)return false;
  if(Math.abs(lat-forestTrailLatitude(lon))*261<clearTrail+size)return false;
  if(forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat)<
   FOREST_CAMP.clearingRadius+size+3)return false;
  if(FOREST_SITE_CLEARINGS.some(p=>forestDistance(lon,lat,p.lon,p.lat)<p.radius+size+2))return false;
  // Leave a little breathing room around the visible old-growth trunks.
  if(trees.some(t=>forestDistance(lon,lat,t.lon,t.lat)<t.radius*.8+size*.58))return false;
  return true;
 }
 for(let i=0;i<12000&&Object.keys(places).some(k=>places[k].length<FOREST_GROUND_LIFE_CAPS[k]);i++){
  const lon=.25+rand()*1.19;
  const lat=forestTrailLatitude(lon)+(rand()-.5)*.76;
  const kindRoll=rand(),kind=kindRoll<.73?'grass':kindRoll<.85?'saplings':'deadwood';
  if(places[kind].length>=FOREST_GROUND_LIFE_CAPS[kind])continue;
  const variation=rand(),size=kind==='grass'?.34+rand()*.62:
   kind==='saplings'?.65+rand()*1.25:.32+rand()*.95;
  if(!valid(lon,lat,size,kind==='deadwood'?6.3:kind==='saplings'?6.9:4.6))continue;
  const shade=forestCanopyShadeAt(lon,lat);
  // Drier sunbreaks carry straw; old damp canopy carries darker meadow grass.
  places[kind].push(Object.freeze({lon,lat,size,variation,
   yaw:rand()*TAU,shade}));
 }
 return Object.freeze(Object.fromEntries(Object.entries(places).map(([k,v])=>[k,Object.freeze(v)])));
}
function grassMeshGeometry(THREE){
 const verts=[],colours=[],blades=7;
 for(let i=0;i<blades;i++){
  const a=i*TAU/blades+.1,dx=Math.cos(a),dz=Math.sin(a);
  const px=-dz,pz=dx,extent=.25+(i%3)*.08,height=.64+(i%4)*.10,lean=.20;
  const tip=[dx*(extent+lean),height,dz*(extent+lean)];
  const mid=[dx*extent*.67,height*.58,dz*extent*.67];
  const w=.077;
  verts.push(0,0,0,mid[0]+px*w,mid[1],mid[2]+pz*w,...tip,
   0,0,0,...tip,mid[0]-px*w,mid[1],mid[2]-pz*w);
  for(let k=0;k<6;k++){
   const y=k===2||k===4?1:k===1||k===5?.57:0;
   colours.push(.56+.22*y,.66+.15*y,.45+.12*y);
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
 g.computeVertexNormals();
 return g;
}
function saplingGeometry(THREE){
 // A small branching crown, not another green rock/icosahedron.
 const verts=[],colors=[],branches=7;
 for(let j=0;j<branches;j++){
  const a=j*TAU/branches,c=Math.cos(a),s=Math.sin(a),pc=-s,ps=c;
  const h=.6+(j%3)*.17,len=.35+(j%2)*.22,width=.14;
  const base=[0,.09,0],mid=[c*len*.56,h*.75,s*len*.56];
  const tip=[c*len,h,s*len];
  verts.push(...base,mid[0]+pc*width,mid[1],mid[2]+ps*width,...tip,
   ...base,...tip,mid[0]-pc*width,mid[1],mid[2]-ps*width);
  for(let k=0;k<6;k++)colors.push(.75,.94,.69);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.computeVertexNormals();return g;
}
function twigGeometry(THREE){
 const vertices=[];
 for(let j=0;j<2;j++){
  const a=j*1.23,dx=Math.cos(a),dz=Math.sin(a),px=-dz,pz=dx;
  const r=j?.58:.82,w=.045;
  vertices.push(dx*(-r)+px*w,.08,dz*(-r)+pz*w,
   dx*r,.055,dz*r,
   dx*(-r)-px*w,.08,dz*(-r)-pz*w);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 g.computeVertexNormals();return g;
}
export function createForestGroundLife(THREE,{scene,radius,heightAt}){
 const layout=forestGroundLifeLayout(),items=[],up=new THREE.Vector3(0,1,0),
  n=new THREE.Vector3(),align=new THREE.Quaternion(),yaw=new THREE.Quaternion(),
  dummy=new THREE.Object3D(),tint=new THREE.Color();
 const tints={
  grass:['#64805a','#827c4d','#536e51','#8c875d'],
  saplings:['#456c4b','#5a7853','#799164','#365b44'],
  deadwood:['#66553f','#564c3d','#8a7551','#504734']
 };
 function add(kind,geometry){
  const rows=layout[kind],mesh=new THREE.InstancedMesh(geometry,
   new THREE.MeshStandardMaterial({color:'#ffffff',
    vertexColors:kind!=='deadwood',side:THREE.DoubleSide,roughness:1,
    metalness:0,flatShading:true}),rows.length);
  mesh.name='forest-'+kind+'-decorative-no-collision';
  mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
  for(let i=0;i<rows.length;i++){
   const p=rows[i];
   n.set(Math.cos(p.lat)*Math.sin(p.lon),Math.sin(p.lat),
    Math.cos(p.lat)*Math.cos(p.lon));
   const offset=kind==='grass'?.027:kind==='saplings'?.038:.075;
   dummy.position.copy(n).multiplyScalar(radius+heightAt(n)+offset);
   dummy.quaternion.copy(align.setFromUnitVectors(up,n))
    .multiply(yaw.setFromAxisAngle(up,p.yaw));
   const size=p.size;
   dummy.scale.set(size,kind==='deadwood'?1:size,size);
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   let palette=tints[kind][Math.min(3,Math.floor(p.variation*4))];
   if(kind==='grass'&&p.shade>.52)palette='#456947';
   mesh.setColorAt(i,tint.set(palette));
  }
  mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);
  items.push({kind,mesh,total:rows.length});
 }
 add('grass',grassMeshGeometry(THREE));
 add('saplings',saplingGeometry(THREE));
 add('deadwood',twigGeometry(THREE));
 function setQuality(quality='balanced',preview=false){
  const budget=forestGroundLifeBudget(quality,preview);
  for(const row of items){
   row.mesh.count=Math.min(row.total,budget[row.kind]);
   row.mesh.visible=row.mesh.count>0;
  }
 }
 setQuality();
 return {setQuality,layout,decorativeOnly:true,drawCalls:3};
}
