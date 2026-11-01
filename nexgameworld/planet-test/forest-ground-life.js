// P2.3.8-C: tiny low-poly grass, saplings and twigs on the existing spherical
// ground. No colliders, raycast targets, loot, network events or extra terrain.
// Exactly three instanced draw calls across all plants at every quality level.
import {forestTrailLatitude,forestDistance,forestMoodAt,FOREST_CAMP,
 FOREST_SITE_CLEARINGS,createForestLayout} from './whispering-forest.js';
import {forestCanopyShadeAt} from './forest-lighting.js';
import {forestGrassCarpetProfile} from './forest-grass-carpet.js?v=1';
const TAU=Math.PI*2;
export const FOREST_GROUND_LIFE_CAPS=Object.freeze({
 grass:2100,saplings:360,deadwood:310
});
export function forestGroundLifeBudget(quality='balanced',preview=false){
 if(preview)return {grass:0,saplings:0,deadwood:0};
 if(quality==='economy')return {grass:430,saplings:55,deadwood:65};
 if(quality==='high')return {...FOREST_GROUND_LIFE_CAPS};
 // A small increase uses the SAME grass instanced draw batch;
 // coarse grass terrain is drawn less often than 3D silhouettes.
 return {grass:1450,saplings:195,deadwood:195};
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
  const kindRoll=rand(),kind=kindRoll<.73?'grass':kindRoll<.85?'saplings':'deadwood';
  // Put living grass in coherent road-facing carpets rather than thinning
  // it over the full 200m forest width. All legacy tree/quest spaces remain.
  const spread=kind==='grass'?(rand()<.83?.205:.52):.76;
  const lat=forestTrailLatitude(lon)+(rand()-.5)*spread;
  if(places[kind].length>=FOREST_GROUND_LIFE_CAPS[kind])continue;
  const variation=rand(),size=kind==='grass'?.61+rand()*.63:
   kind==='saplings'?.65+rand()*1.25:.32+rand()*.95;
  if(!valid(lon,lat,size,kind==='deadwood'?6.3:kind==='saplings'?6.9:4.6))continue;
  const carpet=kind==='grass'?forestGrassCarpetProfile(lon,lat):null;
  if(carpet&&rand()>.51+.48*carpet.density)continue;
  const shade=forestCanopyShadeAt(lon,lat);
  // Drier sunbreaks carry straw; old damp canopy carries darker meadow grass.
  places[kind].push(Object.freeze({lon,lat,size,variation,
   yaw:rand()*TAU,shade}));
 }
 return Object.freeze(Object.fromEntries(Object.entries(places).map(([k,v])=>[k,Object.freeze(v)])));
}
export function forestCurvedGrassData(){
 const verts=[],colours=[],blades=7;
 const append=(v,c)=>{verts.push(...v);colours.push(...c)};
 const tri=(a,b,c,ca,cb,cc)=>{append(a,ca);append(b,cb);append(c,cc)};
 // Three miniature meadow islands in each existing grass instance (3+2+2
 // blades). There are STILL only 21 triangles and no extra draw batches.
 // The mixed heights, curved shoulders and crossing azimuths replace the
 // seven tall, evenly radial flat fans.
 const islands=[[-.36,-.21,3],[.35,-.13,2],[-.02,.34,2]];
 let blade=0;
 for(const [cx,cz,count] of islands)for(let j=0;j<count;j++){
  const i=blade++,a=i*2.399963229728653+j*.17;
  const dx=Math.cos(a),dz=Math.sin(a),tx=-dz,tz=dx;
  const height=.35+(i%4)*.115+(j%2)*.035;
  const reach=.10+(i%3)*.063,lean=.13+(i%3)*.075;
  const width=.068+(i%3)*.015;
  const root=[cx+dx*.035,.024,cz+dz*.035];
  const lowLeft=[root[0]+tx*width,.022,root[2]+tz*width];
  const lowRight=[root[0]-tx*width,.022,root[2]-tz*width];
  const shoulder=[root[0]+dx*reach,height*.55,root[2]+dz*reach];
  const left=[shoulder[0]+tx*width*.65,shoulder[1],shoulder[2]+tz*width*.65];
  const right=[shoulder[0]-tx*width*.65,shoulder[1],shoulder[2]-tz*width*.65];
  const tip=[root[0]+dx*(reach+lean),height,
   root[2]+dz*(reach+lean)];
  const shade=i%3;
  const dark=[.29+.035*shade,.46+.055*shade,.23+.026*shade];
  const mid=[.47+.055*shade,.66+.05*shade,.34+.042*shade];
  const light=[.69+.036*shade,.83+.024*shade,.43+.038*shade];
  tri(lowLeft,lowRight,left,dark,dark,mid);
  tri(lowRight,right,left,dark,mid,mid);
  tri(left,right,tip,mid,mid,light);
 }
 return {positions:verts,colors:colours,bladeCount:blades};
}
function grassMeshGeometry(THREE){
 const data=forestCurvedGrassData(),g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));
 g.computeVertexNormals();return g;
}
export function forestSaplingLeafData(){
 // Seven actual bifurcated leafy shoots replace homogeneous sharp fans.
 // Same seven times two triangles; each has an arched stem and two leaf
 // planes with different highlight/pocket colours.
 const positions=[],colors=[],branches=7;
 const tri=(vertices,shade)=>{
  positions.push(...vertices);
  for(const col of shade)colors.push(...col);
 };
 for(let j=0;j<branches;j++){
  const a=j*TAU/branches+.12,dx=Math.cos(a),dz=Math.sin(a);
  const tx=-dz,tz=dx,reach=.44+(j%3)*.11;
  const h=.55+(j%4)*.11,wide=.16+(j%2)*.035;
  const base=[dx*.06,.07,dz*.06],stem=[dx*reach*.42,h*.55,dz*reach*.42];
  const crown=[dx*reach*.8,h*.87,dz*reach*.8];
  const tip=[dx*(reach+.14),h*.90-.045*(j%2),dz*(reach+.14)];
  const left=[crown[0]+tx*wide,crown[1]-.03,crown[2]+tz*wide];
  const right=[crown[0]-tx*wide,crown[1]-.055,crown[2]-tz*wide];
  const shadow=[.34,.57,.34],lit=[.74,.88,.53],middle=[.51,.74,.44];
  tri([...stem,...left,...tip],[shadow,lit,middle]);
  tri([...stem,...tip,...right],[shadow,middle,lit]);
 }
 return {positions,colors,triangles:branches*2};
}
function saplingGeometry(THREE){
 const data=forestSaplingLeafData(),g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));
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
  grass:['#5f8a4f','#888a50','#48784c','#9a9462'],
  saplings:['#3c7847','#6c8a59','#94a56c','#396c50'],
  deadwood:['#66553f','#564c3d','#8a7551','#504734']
 };
 function add(kind,geometry){
  const rows=layout[kind],mesh=new THREE.InstancedMesh(geometry,
   new THREE.MeshStandardMaterial({color:'#ffffff',
    vertexColors:kind!=='deadwood',side:THREE.DoubleSide,roughness:1,
    metalness:0,flatShading:kind!=='grass'}),rows.length);
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
   if(kind==='grass'&&p.shade>.52)palette='#3e704a';
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
