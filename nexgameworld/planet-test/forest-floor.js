// P2.3.7: subtle coloured forest-floor geometry, never registered as physics.
// All vertices follow the spherical height sampler; no alpha-texture downloads.
import {forestDistance,forestMoodAt,forestTrailLatitude,FOREST_CAMP,
 FOREST_SITE_CLEARINGS,FOREST_TREE_CAP,forestColliders} from './whispering-forest.js';
import {forestCanopyShadeAt} from './forest-lighting.js';
const TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const a=clamp(x);return a*a*(3-2*a)};
export const FOREST_FLOOR_COUNTS=Object.freeze({moss:680,litter:920});
export function forestFloorBudget(quality='balanced',preview=false){
 if(preview)return {moss:0,litter:0};
 if(quality==='economy')return {moss:155,litter:210};
 if(quality==='high')return {...FOREST_FLOOR_COUNTS};
 return {moss:410,litter:565};
}
export function forestFloorColors(lon,lat,variation=0){
 const shade=forestCanopyShadeAt(lon,lat),mood=forestMoodAt(lon,lat);
 const blend=ease(shade*.78+mood*.20);
 const mix=(a,b,k)=>a.map((n,i)=>n+(b[i]-n)*k);
 const v=Math.max(-1,Math.min(1,Number.isFinite(variation)?variation:0));
 const wiggle=.93+.10*v;
 return {
  shade,blend,
  moss:mix([.38,.45,.27],[.18,.31,.22],blend).map(c=>c*wiggle),
  leaves:mix([.54,.37,.23],[.29,.29,.18],blend).map(c=>c*wiggle),
  twig:mix([.40,.30,.22],[.25,.23,.17],blend).map(c=>c*wiggle)
 };
}
export function forestFloorLayout(seed=768451){
 let v=seed>>>0;const rand=()=>((v=(Math.imul(v,1664525)+1013904223)>>>0)/4294967296);
 const moss=[],litter=[];
 const open=(lon,lat,r)=>{
  const distance=Math.abs(lat-forestTrailLatitude(lon))*261;
  return distance>=3.4+r&&
   forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>FOREST_CAMP.clearingRadius+r+2&&
   FOREST_SITE_CLEARINGS.every(site=>forestDistance(lon,lat,site.lon,site.lat)>site.radius+r+1);
 };
 // Distinct fixed seed keeps previous shrubs, trees, wildlife and quest areas unchanged.
 for(let i=0;i<9500&&(moss.length<FOREST_FLOOR_COUNTS.moss||litter.length<FOREST_FLOOR_COUNTS.litter);i++){
  const lon=.185+rand()*1.27;
  const lat=forestTrailLatitude(lon)+(rand()-.5)*.77;
  const mood=forestMoodAt(lon,lat),size=.36+rand()*1.35;
  const type=rand(),variation=rand(),angle=rand()*TAU;
  const finalSize=type<.51?size*(.8+variation*.75):.15+size*.31;
  if(mood<=0.035||!open(lon,lat,finalSize))continue;
  // More vegetation in the shaded interior but leave illuminated breaks visible.
  const shade=forestCanopyShadeAt(lon,lat);
  if(type<.51&&moss.length<FOREST_FLOOR_COUNTS.moss){
   if(rand()>.25+.67*mood*.7+.20*shade)continue;
   moss.push(Object.freeze({lon,lat,size:finalSize,
    variation,angle,kind:'moss'}));
  }else if(litter.length<FOREST_FLOOR_COUNTS.litter){
   if(rand()>.37+.48*mood)continue;
   litter.push(Object.freeze({lon,lat,size:finalSize,
    variation,angle,kind:variation>.82?'twig':'leaf'}));
  }
 }
 return Object.freeze({moss:Object.freeze(moss),litter:Object.freeze(litter)});
}
// G-24. Six draped facets per old litter position: separate paired leaves,
// one seed wing and one slender pine needle. No new mesh or collider.
export const FOREST_LITTER_TRIANGLES=6;
export function forestLitterPatchData(item){
 if(!item||![item.lon,item.lat,item.size,item.angle].every(Number.isFinite)||
  item.size<=0||!['leaf','twig'].includes(item.kind))
  throw new TypeError('Invalid forest litter point');
 const triangles=[],spread=item.size*(item.kind==='twig'?.82:1);
 const turn=(x,z)=>[x*Math.cos(item.angle)-z*Math.sin(item.angle),
  x*Math.sin(item.angle)+z*Math.cos(item.angle)];
 const point=(x,z,h)=>[...turn(x,z),h];
 const phase=(Number.isFinite(item.variation)?item.variation:.5)*9.13+item.angle;
 for(let k=0;k<2;k++){
  const a=k*2.39996323+.48*Math.sin(phase+k*1.71);
  const dx=Math.cos(a),dz=Math.sin(a),tx=-dz,tz=dx;
  const cx=(k===0?-.22:.28)*spread,cz=(k===0?.13:-.12)*spread;
  const len=spread*(.39+.13*k),width=spread*(.095+.025*(k%2));
  const root=point(cx-dx*len*.45,cz-dz*len*.45,.115);
  const tip=point(cx+dx*len*.75,cz+dz*len*.75,.127+.008*k);
  const left=point(cx+tx*width,cz+tz*width,.122);
  const right=point(cx-tx*width,cz-tz*width,.116);
  triangles.push({corners:[root,left,tip],kind:'leaf',shade:.84+.07*k});
  triangles.push({corners:[root,tip,right],kind:'leaf',shade:.76+.09*k});
 }
 const wx=spread*.11,wz=spread*.30;
 triangles.push({kind:'seed',shade:.92,corners:[
  point(wx-.06*spread,wz,.114),
  point(wx+.095*spread,wz+.045*spread,.119),
  point(wx+.17*spread,wz+.18*spread,.121)
 ]});
 const angle=phase+1.75,dx=Math.cos(angle),dz=Math.sin(angle),tx=-dz,tz=dx;
 const x=-.17*spread,z=-.31*spread,w=.015*spread;
 triangles.push({kind:'twig',shade:.85,corners:[
  point(x+tx*w,z+tz*w,.111),point(x-tx*w,z-tz*w,.112),
  point(x+dx*.43*spread,z+dz*.43*spread,.117)
 ]});
 return triangles;
}
export function createForestFloor(THREE,{scene,radius,heightAt}){
 const layout=forestFloorLayout();
 const objects=[],material=new THREE.MeshBasicMaterial({
  vertexColors:true,transparent:true,opacity:.90,depthWrite:false,
  side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2
 });
 const leafMaterial=new THREE.MeshBasicMaterial({
  vertexColors:true,side:THREE.DoubleSide,roughness:1,
  polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2
 });
 const normal=new THREE.Vector3();
 function point(lon,lat,offset){
  const clamped=Math.max(-1.53,Math.min(1.53,lat));
  normal.set(Math.cos(clamped)*Math.sin(lon),Math.sin(clamped),
   Math.cos(clamped)*Math.cos(lon));
  const h=radius+heightAt(normal)+offset;
  return [normal.x*h,normal.y*h,normal.z*h];
 }
 function buildMoss(){
  const vertices=[],colors=[],facets=9;
  for(const item of layout.moss){
   const color=forestFloorColors(item.lon,item.lat,item.variation*2-1).moss;
   const center=point(item.lon,item.lat,.095),c=item.size;
   // Preserve the original 9-facet baked spherical moss decal, but turn
   // its plain circular fade into scalloped, mottled cushions. No new mesh,
   // transparent layer or additional GPU draw call.
   const palette=(factor,greenBoost=0)=>[
    Math.min(1,color[0]*factor),
    Math.min(1,color[1]*factor+greenBoost),
    Math.min(1,color[2]*factor)
   ];
   for(let i=0;i<facets;i++){
    const angle1=i*TAU/facets+item.angle,angle2=(i+1)*TAU/facets+item.angle;
    function edge(a,index){
     const lobes=.80+.18*Math.sin(index*2.31+item.variation*13)+
      .065*Math.cos(index*4.21-item.variation*7);
     const jitter=Math.max(.62,Math.min(1.10,lobes));
     return point(item.lon+Math.cos(a)*c*jitter/(radius*Math.cos(item.lat)),
      item.lat+Math.sin(a)*c*jitter/radius,.098);
    }
    const dapple=.84+.18*Math.sin(i*2.77+item.variation*11);
    const middle=palette(dapple, .015*(1+Math.sin(i*1.93)));
    const edgeTint=palette(.73+.12*Math.cos(i*2.53+item.angle));
    vertices.push(...center,...edge(angle1,i),...edge(angle2,i+1));
    colors.push(...middle,.70,...edgeTint,.015,...edgeTint,.015);
   }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
  const mesh=new THREE.Mesh(geometry,material);mesh.name='forest-floor-moss-no-collision';
  mesh.frustumCulled=false;scene.add(mesh);objects.push({mesh,verticesPerItem:facets*3,count:layout.moss.length,key:'moss'});
 }
 function buildLitter(){
  const vertices=[],colors=[];
  for(const item of layout.litter){
   const tones=forestFloorColors(item.lon,item.lat,item.variation*2-1);
   const pigments={leaf:tones.leaves,twig:tones.twig,
    seed:[.72,.60,.37].map((c,i)=>c*(.81+.19*tones.leaves[i]))};
   for(const part of forestLitterPatchData(item)){
    const color=pigments[part.kind];
    for(const [x,z,off] of part.corners){
     // Each microvertex follows globe curvature and actual height, instead
     // of hovering in a flat polygon above a spherical terrain facet.
     vertices.push(...point(item.lon+x/(radius*Math.cos(item.lat)),
      item.lat+z/radius,off));
     colors.push(...color.map(v=>Math.min(1,v*part.shade)));
    }
   }
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geom.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const mesh=new THREE.Mesh(geom,leafMaterial);
  mesh.name='forest-floor-leaves-and-twigs-no-collision';
  mesh.frustumCulled=false;scene.add(mesh);
  objects.push({mesh,verticesPerItem:FOREST_LITTER_TRIANGLES*3,
   count:layout.litter.length,key:'litter'});
 }
 buildMoss();buildLitter();
 function setQuality(quality='balanced',preview=false){
  const budget=forestFloorBudget(quality,preview);
  for(const item of objects){
   const size=Math.min(item.count,budget[item.key]);
   item.mesh.geometry.setDrawRange(0,size*item.verticesPerItem);
   item.mesh.visible=size>0;
  }
 }
 setQuality();
 return {setQuality,layout,decorativeOnly:true,drawCalls:objects.length};
}
