// R3-04 — original shrub and mushroom sculpture for EXISTING forest batches.
// Only static local geometry and vertex colours. All spawns remain untouched.
const TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x));
function valid(data){
 if(data.positions.length!==data.colors.length||
   data.positions.length%9!==0||
   !data.positions.every(Number.isFinite)||
   !data.colors.every(c=>Number.isFinite(c)&&c>=0&&c<=1))
  throw new Error('Invalid old-growth ornamental geometry');
 return {...data,triangles:data.positions.length/9};
}
// G-23: three original close-range shrub families. The same 18-triangle
// budget per plant is split into broad lobes, slender lanceolate leaves,
// or sharply toothed smaller leaf plates. Separate instanced geometries make
// each species genuinely distinct, without textures, shaders or collisions.
export const FOREST_SHRUB_FAMILIES=Object.freeze(['broad','lanceolate','toothed']);
export function forestShrubFamilyProfile(variation,shade=0){
 if(!Number.isFinite(variation)||!Number.isFinite(shade))
  throw new RangeError('Invalid shrub profile');
 const v=clamp(variation),s=clamp(shade);
 const family=v<.34?'broad':v<.69?'lanceolate':'toothed';
 const light=1.05-.20*s+.06*(v-.5);
 return {family,light,
  width:family==='broad'?.92+.16*v:family==='lanceolate'?.70+.13*v:.82+.13*v,
  height:family==='broad'?.87+.08*v:family==='lanceolate'?1.06+.12*v:.94+.08*v,
  shade:s};
}
export function forestShrubLeafData(family='broad'){
 if(!FOREST_SHRUB_FAMILIES.includes(family))
  throw new RangeError('Unsupported shrub family');
 const positions=[],colors=[];
 const face=(a,b,c,ca,cb,cc)=>{
  positions.push(...a,...b,...c);colors.push(...ca,...cb,...cc);
 };
 const count=family==='toothed'?6:9;
 for(let i=0;i<count;i++){
  const angle=i*TAU/count+.105*Math.sin(i*2.41);
  const dx=Math.cos(angle),dz=Math.sin(angle),tx=-dz,tz=dx;
  const vigor=.83+.09*(i%3)+.06*Math.sin(i*2.53);
  const lean=.075*Math.sin(i*1.93);
  const reach=(family==='broad'?.57:family==='lanceolate'?.77:.62)*vigor;
  const h=(family==='broad'?.71:family==='lanceolate'?.87:.72)*vigor;
  const start=[dx*.12,.085,dz*.12];
  const stem=[dx*reach*.36,h*.37,dz*reach*.36];
  const top=[dx*(reach+.11)+tx*lean*1.2,
    h+.065*(i%2),dz*(reach+.11)+tz*lean*1.2];
  const spine=[dx*reach*.72+tx*lean,h*.77,
    dz*reach*.72+tz*lean];
  const width=(family==='broad'?.24:family==='lanceolate'?.095:.18)*
    (1+.10*(i%3));
  const left=[spine[0]+tx*width,spine[1]+.026,
    spine[2]+tz*width];
  const right=[spine[0]-tx*width,spine[1]-.068,
    spine[2]-tz*width];
  const shaded=[.28+.026*(i%3),.45,.29],
    center=[.45+.041*(i%3),.65,.40],
    sun=[.72+.034*(i%3),.87,.55],
    underside=[.36,.56,.38];
  if(family==='broad'){
   // Broad, softly cupped oak-like leaf pairs.
   face(stem,left,top,shaded,sun,center);
   face(stem,top,right,shaded,center,underside);
  }else if(family==='lanceolate'){
   // Slender, upward arcing lanceolate blades expose different side light.
   const spike=[top[0]+dx*.07,top[1]+.055,top[2]+dz*.07];
   face(stem,left,spike,shaded,sun,center);
   face(stem,spike,right,shaded,center,underside);
  }else{
   // Sawtooth-side leaf plate with individually stepped outside edge.
   // Six leaves x three faces = the SAME original 18-triangle budget.
   const tooth=[spine[0]-tx*width*1.30+dx*.075,
    spine[1]+.010,spine[2]-tz*width*1.30+dz*.075];
   face(stem,left,top,shaded,sun,center);
   face(stem,top,tooth,shaded,center,underside);
   face(stem,tooth,right,shaded,sun,underside);
  }
 }
 return valid({positions,colors});
}
// G-22: three tiny caps in the EXISTING decorative mushroom batch.
// Mushroom centres use a local-to-world scale matched by the shared stem
// geometry in forest-ecology.js. None are collectible/click targets.
export const FOREST_FUNGUS_CENTRES=Object.freeze([
 Object.freeze({x:0,z:0,scale:.67,drop:0}),
 Object.freeze({x:.43,z:.42,scale:.44,drop:-.27}),
 Object.freeze({x:-.36,z:-.31,scale:.38,drop:-.35})
]);
export function forestMushroomCapData(){
 const positions=[],colors=[],sectors=9;
 const emit=(a,b,c,ca,cb,cc)=>{
  positions.push(...a,...b,...c);colors.push(...ca,...cb,...cc);
 };
 const radial=(cx,cz,a,r,y)=>[cx+Math.cos(a)*r,y,cz+Math.sin(a)*r];
 for(const [cluster,item] of FOREST_FUNGUS_CENTRES.entries()){
  const {x,z,scale,drop}=item;
  const top=[x,.48*scale+drop,z],bottom=[x,-.28*scale+drop,z];
  const warm=cluster===0?[.81,.71,.53]:cluster===1?[.78,.65,.48]:[.71,.62,.48];
  const light=cluster===0?[.99,.88,.69]:[.90,.81,.65];
  const middle=[.72,.54,.39],edge=[.48,.32,.25];
  const gill=[.76,.69,.57],gillDark=[.45,.37,.31];
  for(let i=0;i<sectors;i++){
   const a=i*TAU/sectors,b=(i+1)*TAU/sectors;
   const rippleA=1+.065*Math.sin(i*2.4+cluster*.8+.7);
   const rippleB=1+.065*Math.sin((i+1)*2.4+cluster*.8+.7);
   const shoulderA=radial(x,z,a,scale*rippleA*.68,drop+scale*(.24+.045*Math.sin(i*1.8)));
   const shoulderB=radial(x,z,b,scale*rippleB*.68,drop+scale*(.24+.045*Math.sin((i+1)*1.8)));
   const rimA=radial(x,z,a,scale*rippleA,drop+scale*(-.12-.045*Math.cos(i*2.2)));
   const rimB=radial(x,z,b,scale*rippleB,drop+scale*(-.12-.045*Math.cos((i+1)*2.2)));
   const highlight=i%4===0?light:warm;
   emit(top,shoulderA,shoulderB,highlight,warm,warm);
   emit(shoulderA,rimA,rimB,middle,edge,edge);
   emit(shoulderA,rimB,shoulderB,middle,edge,warm);
   emit(rimA,bottom,rimB,gill,gillDark,gill);
  }
 }
 return valid({positions,colors});
}
