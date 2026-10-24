// P2.3.9: asymmetrical deciduous canopies and layered conifer branches.
// Geometries are instanced in whispering-forest.js; no collision meshes,
// gameplay state, textures, downloads, custom shaders or per-tree materials.
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const FOREST_CROWN_GEOMETRY_BUDGET=Object.freeze({
 deciduousSegments:18,deciduousRings:10,
 coniferWhorls:5,coniferBranches:12
});
function ensureFinite(values){
 if(values.some(n=>!Number.isFinite(n)))throw Error('Invalid forest crown geometry');
}
export function deciduousCrownData(variant=0){
 const {deciduousSegments:segments,deciduousRings:rings}=FOREST_CROWN_GEOMETRY_BUDGET;
 const positions=[],colors=[],indices=[];
 for(let row=0;row<=rings;row++){
  const theta=Math.PI*row/rings,s=Math.sin(theta),y=.5*Math.cos(theta);
  for(let j=0;j<=segments;j++){
   const a=TAU*j/segments,v=variant*.87;
   // Same angular/ring budget, but the older crown now grows in several
   // competing asymmetrical lobes with gravity on the rim, not a green ball.
   const growth=1+.092*Math.sin(a*5+theta*2.7+v)+
    .063*Math.cos(a*9-theta*3.1+v*.7)+
    .053*Math.sin(a*3+theta*5.3+v)+
    .039*Math.cos(a*2.1+theta*2.2-v);
   const r=s*clamp(growth,.75,1.23);
   const x=r*Math.cos(a),z=r*Math.sin(a);
   const drape=.056*s*s*(.4+.6*Math.sin(a*5+v+.3));
   const vertical=y+.068*s*Math.cos(a*4+v)*Math.sin(theta*2)-drape;
   positions.push(x,vertical,z);
   const veins=.07*Math.sin(a*8.3+theta*10.1+v);
   const light=clamp(.71+.20*(vertical+.5)+veins+
    .05*Math.cos(a*3.7-theta*4.4),.54,1);
   colors.push(.79*light,.94*light,.75*light);
   if(row<rings&&j<segments){
    const k=row*(segments+1)+j;
    indices.push(k,k+segments+1,k+1,k+1,k+segments+1,k+segments+2);
   }
  }
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
