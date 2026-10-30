// Native NexGame meadow density and geometry, bent onto a spherical world.
// Instanced draw calls: grass, three blossom colors, shrubs and small stones.
import {scatterMeadow} from '../meadow.js?v=0.3.7.1';
import {createWeatheredStoneGeometry} from './stone-surface.js?v=1';
import {WORLD_ART_VERTEX as V} from './world-art-style.js?v=1';
export function meadowGrassBladeData(){
 const positions=[],colors=[],bladeCount=6;
 const emit=(v,c)=>{positions.push(...v);colors.push(...c)};
 const tri=(a,b,c,ca,cb,cc)=>{emit(a,ca);emit(b,cb);emit(c,cc)};
 for(let i=0;i<bladeCount;i++){
  const phase=i*Math.PI*2/bladeCount+.12;
  const dx=Math.cos(phase),dz=Math.sin(phase),tx=-dz,tz=dx;
  const height=.60+(i%3)*.13,spread=.11+(i%3)*.055;
  const w=.09+(i%2)*.017;
  const low=[dx*.10,0,dz*.10],
   left=[low[0]+tx*w,0,low[2]+tz*w],
   right=[low[0]-tx*w,0,low[2]-tz*w],
   shoulder=[dx*spread,height*.57,dz*spread],
   tip=[dx*(spread+.24),height,dz*(spread+.24)];
  const light=V.grassTip,dark=V.grassDark,mid=V.grassMid;
  const l=[shoulder[0]+tx*w*.56,shoulder[1],shoulder[2]+tz*w*.56];
  const r=[shoulder[0]-tx*w*.56,shoulder[1],shoulder[2]-tz*w*.56];
  tri(left,right,l,dark,dark,mid);
  tri(right,r,l,dark,mid,mid);
  tri(l,r,tip,mid,mid,light);
 }
 return {positions,colors,bladeCount};
}
function clumpGeometry(THREE){
 const data=meadowGrassBladeData(),geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));
 geometry.computeVertexNormals();return geometry;
}
export function meadowShrubLeafData(){
 const positions=[],colors=[];
 const put=(p,c)=>{positions.push(...p);colors.push(...c)};
 const face=(a,b,c,ca,cb=ca,cc=ca)=>{put(a,ca);put(b,cb);put(c,cc)};
 for(let i=0;i<11;i++){
  const angle=i*Math.PI*2/11,dx=Math.cos(angle),dz=Math.sin(angle),tx=-dz,tz=dx;
  const h=.64+(i%4)*.095,reach=.53+(i%3)*.075;
  const base=[dx*.13,.07,dz*.13];
  const m=[dx*reach*.53,h*.72,dz*reach*.53];
  const point=[dx*reach,h,dz*reach];
  const width=.15+(i%3)*.017;
  const left=[m[0]+tx*width,m[1],m[2]+tz*width];
  const right=[m[0]-tx*width,m[1],m[2]-tz*width];
  const dark=V.shrubDark,mid=V.shrubMid,tip=V.shrubTip;
  face(base,left,point,dark,mid,tip);
  face(base,point,right,dark,tip,mid);
  // A second bent leaf on every other branch fills the middle without
  // collapsing the entire shrub into a solid geometric green stone.
  if(i%2===0){
   const small=[dx*reach*.25+tx*.23,h*.82,dz*reach*.25+tz*.23];
   face(m,[m[0]+tx*.12,m[1]-.08,m[2]+tz*.12],small,mid,dark,tip);
  }
 }
 return {positions,colors};
}
function shrubGeometry(THREE){
 const data=meadowShrubLeafData(),geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));
 geo.computeVertexNormals();return geo;
}
function blossomGeometry(THREE,hex){
 const stem=new THREE.Color(0x6a8b48),leaf=new THREE.Color(0x93ae62);
 const petal=new THREE.Color(hex),core=new THREE.Color(0xffd37b);
 const positions=[],colors=[];
 const tri=(a,b,c,ca,cb,cc)=>{
  positions.push(...a,...b,...c);
  for(const color of [ca,cb,cc])colors.push(color.r,color.g,color.b);
 };
 for(const a of [0,Math.PI/2]){
  const x=Math.cos(a)*.045,z=Math.sin(a)*.045;
  tri([-x,0,-z],[x,0,z],[0,.57,0],stem,stem,leaf);
 }
 for(let i=0;i<5;i++){
  const a=i*Math.PI*2/5,cs=Math.cos(a),sn=Math.sin(a);
  const sideX=-sn*.12,sideZ=cs*.12;
  const tip=[cs*.26,.63,sn*.26];
  const left=[cs*.09+sideX,.57,sn*.09+sideZ];
  const right=[cs*.09-sideX,.57,sn*.09-sideZ];
  tri([0,.55,0],left,tip,core,petal,petal);
  tri([0,.55,0],tip,right,core,petal,petal);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeVertexNormals();return geometry;
}

export function createSphericalMeadow(THREE,{scene,getRadius,toNormal,heightAt,accept}){
 const UP=new THREE.Vector3(0,1,0),dummy=new THREE.Object3D();
 const upQuat=new THREE.Quaternion(),twist=new THREE.Quaternion();
 const layers=[];
 const allowed=(x,z)=>Math.hypot(x+5,z-4)>8&&accept(x,z);
 const grassPoints=scatterMeadow({count:2800,attempts:7800,seed:17031,extent:69,
  accept:(x,z)=>allowed(x,z)});
 const grass=new THREE.InstancedMesh(clumpGeometry(THREE),new THREE.MeshStandardMaterial({
  color:0xffffff,roughness:1,side:THREE.DoubleSide,vertexColors:true
 }),grassPoints.length);
 scene.add(grass);layers.push({mesh:grass,points:grassPoints,mode:'grass'});
 const flowerPoints=scatterMeadow({count:455,attempts:4100,seed:69241,extent:65,
  accept:(x,z)=>allowed(x,z)&&Math.hypot(x+5,z-4)>13&&
   Math.sin(x*.23+z*.075)*Math.cos(z*.21-x*.12)>.05});
 const flowers=[];
 for(let variant=0;variant<3;variant++){
  const rows=flowerPoints.filter((_,i)=>i%3===variant);
  const flower=new THREE.InstancedMesh(
   blossomGeometry(THREE,[0xf7d879,0xd5b2ee,0xf7eee0][variant]),
   new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}),rows.length);
  scene.add(flower);flowers.push(flower);layers.push({mesh:flower,points:rows,mode:'flower'});
 }
 const shrubPoints=scatterMeadow({count:160,attempts:1900,seed:83649,extent:66,
  accept:(x,z)=>allowed(x,z)&&Math.hypot(x+5,z-4)>19&&Math.sin(x*.17-z*.19)>.1});
 const shrubs=new THREE.InstancedMesh(shrubGeometry(THREE),
  new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,vertexColors:true,
   side:THREE.DoubleSide}),shrubPoints.length);
 scene.add(shrubs);layers.push({mesh:shrubs,points:shrubPoints,mode:'shrubs'});
 // Pebbles change the look, never the physics or interaction positions.
 const pebblePoints=scatterMeadow({count:210,attempts:2500,seed:28641,extent:66,
  accept:(x,z)=>allowed(x,z)&&Math.sin(x*.21+z*.34)>0});
 const pebbles=new THREE.InstancedMesh(createWeatheredStoneGeometry(THREE,'trail'),
  new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,vertexColors:true,flatShading:true}),pebblePoints.length);
 scene.add(pebbles);layers.push({mesh:pebbles,points:pebblePoints,mode:'pebbles'});
 function rebuild(){
  const radius=getRadius();
  for(const {mesh,points,mode} of layers){
   for(let i=0;i<points.length;i++){
    const p=points[i],normal=toNormal(p.x,p.z,radius);
    const elevation=heightAt(normal);
    const scale=mode==='grass'?.50+p.scale*.7:mode==='flower'?.7+p.scale*.5:p.scale;
    const localHeight=mode==='grass'?0:mode==='flower'?.012:mode==='pebbles'?.055*p.scale:.31*p.scale;
    dummy.position.copy(normal).multiplyScalar(radius+elevation+localHeight);
    upQuat.setFromUnitVectors(UP,normal);
    dummy.quaternion.copy(upQuat).multiply(twist.setFromAxisAngle(UP,p.angle));
    if(mode==='shrubs')dummy.scale.set(.54*scale,.34*scale,.48*scale);
    else if(mode==='pebbles')dummy.scale.set(.20*.85*scale,.20*.33*scale,.20*1.1*scale);
    else dummy.scale.setScalar(scale);
    dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    if(mode==='grass')mesh.setColorAt(i,new THREE.Color().setHSL(.18+p.variety*.065,.32+.07*p.variety,.36+p.variety*.15));
    if(mode==='shrubs')mesh.setColorAt(i,new THREE.Color().setHSL(.19+p.variety*.07,.28,.32+p.variety*.14));
    if(mode==='pebbles')mesh.setColorAt(i,new THREE.Color().setHSL(.09+p.variety*.03,.12,.43+p.variety*.13));
   }
   mesh.instanceMatrix.needsUpdate=true;
   mesh.frustumCulled=false;
   mesh.castShadow=false;mesh.receiveShadow=false;
   mesh.count=points.length;
  }
 }
 function applyDensity(preset){
  const fraction=key=>Math.max(0,Math.min(1,Number(preset[key])||0));
  for(const {mesh,points,mode} of layers)
   mesh.count=Math.floor(points.length*fraction(mode==='grass'?'grass':mode==='flower'?'flowers':mode==='pebbles'?'pebbles':'shrubs'));
 }
 rebuild();
 return {rebuild,applyDensity,counts:{grass:grassPoints.length,flowers:flowerPoints.length,shrubs:shrubPoints.length,pebbles:pebblePoints.length}};
}
