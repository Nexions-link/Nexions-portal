// P2.3.9: asymmetrical deciduous canopies and layered conifer branches.
// Geometries are instanced in whispering-forest.js; no collision meshes,
// gameplay state, textures, downloads, custom shaders or per-tree materials.
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const FOREST_CROWN_GEOMETRY_BUDGET=Object.freeze({
 deciduousSegments:18,deciduousRings:10,
 deciduousLeafClusters:24,
 coniferWhorls:5,coniferBranches:12
});
function ensureFinite(values){
 if(values.some(n=>!Number.isFinite(n)))throw Error('Invalid forest crown geometry');
}
export function deciduousCrownData(variant=0){
 const {deciduousSegments:segments,deciduousRings:rings,
  deciduousLeafClusters:leafClusters}=FOREST_CROWN_GEOMETRY_BUDGET;
 const positions=[],colors=[],indices=[];
 const emit=(x,y,z,shade)=>{positions.push(x,y,z);colors.push(...shade);return positions.length/3-1};
 const sample=(a,theta)=>{
  const v=variant*.87,s=Math.sin(theta);
  // Distinct oak volumes: deep side clefts, drooping outer sprays,
  // and genuine darker pockets instead of a uniformly smooth ball.
  const large=.18*Math.cos(5*a+theta*.77+v)+.095*Math.cos(3*a-theta*1.5-v*.5);
  const fine=.047*Math.sin(9*a+theta*2.7+v)+.035*Math.sin(7*a-theta*5.2-v);
  const radial=s*clamp(1+large+fine,.72,1.25);
  const deep=clamp((.38-large)*.67,.05,.46);
  const drape=.063*s*s*(1+.6*Math.cos(a*5+theta*2+v));
  const y=.5*Math.cos(theta)+.062*s*Math.cos(4*a+v)
   -.048*s*s*Math.sin(3*a-theta*2+v)-drape;
  const illumination=clamp(.70+.21*(y+.5)+
   .13*Math.max(0,large)+.06*Math.cos(a*9+theta*4+v)-deep*.22,.46,1);
  const shade=[.70*illumination,.93*illumination,.63*illumination];
  return {x:radial*Math.cos(a),y,z:radial*Math.sin(a),shade};
 };
 for(let row=0;row<=rings;row++){
  const theta=Math.PI*row/rings;
  for(let j=0;j<=segments;j++){
   const a=TAU*j/segments,p=sample(a,theta);
   emit(p.x,p.y,p.z,p.shade);
   if(row<rings&&j<segments){
    const k=row*(segments+1)+j;
    indices.push(k,k+segments+1,k+1,k+1,k+segments+1,k+segments+2);
   }
  }
 }
 // Twenty-four original leaf clusters; 2 irregular leaflets per cluster.
 // One shared geometry is used by both lower and upper crown instancing.
 for(let i=0;i<leafClusters;i++){
  const a=TAU*(i+.22*Math.sin(i*2.71))/leafClusters+variant*.36;
  const theta=.39+(i%5)*.34;
  const point=sample(a,theta),tangent=[-Math.sin(a),0,Math.cos(a)];
  const lift=.032+.024*((i*7)%5)/4,width=.085+.024*(i%3);
  const base=[point.x*.89,point.y-.018,point.z*.89];
  const left=[point.x-tangent[0]*width,point.y+lift,point.z-tangent[2]*width];
  const right=[point.x+tangent[0]*width*.72,point.y-lift*.38,
   point.z+tangent[2]*width*.72];
  const tip=[point.x+Math.cos(a)*.04,
   point.y+.036*Math.sin(i*2.6),point.z+Math.sin(a)*.04];
  const green=i%4===0?[.31,.52,.25]:i%3===1?[.62,.83,.46]:[.44,.68,.35];
  const bright=green.map((v,j)=>Math.min(1,v*(j===1?1.16:1.08)));
  const dark=green.map(v=>v*.67);
  const idx=positions.length/3;
  emit(...base,dark);emit(...left,green);emit(...right,green);emit(...tip,bright);
  indices.push(idx,idx+1,idx+3,idx,idx+3,idx+2);
 }
 ensureFinite(positions);ensureFinite(colors);
 return {positions,colors,indices,kind:'deciduous'};
}
export function coniferCrownData(variant=0){
 const {coniferWhorls:whorls,coniferBranches:branches}=FOREST_CROWN_GEOMETRY_BUDGET;
 const positions=[],colors=[];
 function vertex(x,y,z,light){
  positions.push(x,y,z);colors.push(.77*light,.94*light,.83*light);
 }
 for(let level=0;level<whorls;level++){
  const vertical=-.40+level*.192;
  const radius=(.96-level*.168)*(level===0?1:.96);
  // Overlapping tapered branch fans, with ragged and drooping outer tips.
  for(let j=0;j<branches;j++){
   const a=TAU*(j+(level%2)*.5)/branches+variant*.31;
   const scallop=1+.076*Math.sin(j*2.91+level*1.77+variant*2.4)+
    .025*Math.sin(j*5.13+level*2.77);
   const r=radius*scallop;
   const age=.67+.33*(whorls-level)/whorls;
   const angleLeft=a-.22,angleRight=a+.19;
   const centerY=vertical+.095;
   const tipY=vertical-.14-.026*Math.sin(j*1.8+level)-.036*age;
   const left=[r*.59*Math.cos(angleLeft),vertical-.05,r*.59*Math.sin(angleLeft)];
   const right=[r*.65*Math.cos(angleRight),vertical-.055,r*.65*Math.sin(angleRight)];
   const tip=[r*Math.cos(a),tipY,r*Math.sin(a)];
   const root=[r*.13*Math.cos(a),centerY,r*.13*Math.sin(a)];
   // Two wedge triangles per bough, two-sided material, strong 3D contour.
   const warmth=.035*Math.sin(j*2.6+level*3+variant);
   for(const [p,light] of [[root,.76],[left,.92],[tip,.66],
    [root,.76],[tip,.66],[right,.86]])vertex(...p,light+warmth);
  }
 }
 ensureFinite(positions);ensureFinite(colors);
 return {positions,colors,indices:[],kind:'conifer'};
}
export function crownDataBounds(data){
 const p=data.positions;
 if(!p.length||p.length%3!==0)throw Error('Invalid crown vertices');
 const b={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity,
  radialMin:Infinity,radialMax:0};
 for(let i=0;i<p.length;i+=3){
  const x=p[i],y=p[i+1],z=p[i+2],r=Math.hypot(x,z);
  b.minX=Math.min(b.minX,x);b.maxX=Math.max(b.maxX,x);
  b.minY=Math.min(b.minY,y);b.maxY=Math.max(b.maxY,y);
  b.minZ=Math.min(b.minZ,z);b.maxZ=Math.max(b.maxZ,z);
  b.radialMin=Math.min(b.radialMin,r);b.radialMax=Math.max(b.radialMax,r);
 }
 return b;
}
export function crownLowestHeightFraction(kind){
 // Applied to forest-tree placement. Only canopies above 10m matter.
 if(kind==='conifer')return .69+.48*coniferCrownData().positions
  .filter((_,i)=>i%3===1).reduce((a,v)=>Math.min(a,v),Infinity);
 return .79+.21*deciduousCrownData().positions
  .filter((_,i)=>i%3===1).reduce((a,v)=>Math.min(a,v),Infinity);
}
export function makeForestCrownGeometry(THREE,kind,variant=0){
 const data=kind==='conifer'?coniferCrownData(variant):deciduousCrownData(variant);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));
 if(data.indices.length)geometry.setIndex(data.indices);
 geometry.computeVertexNormals();
 return geometry;
}
