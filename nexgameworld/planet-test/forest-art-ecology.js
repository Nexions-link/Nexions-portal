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
export function forestShrubLeafData(){
 const positions=[],colors=[];
 function face(a,b,c,ca,cb,cc){
  positions.push(...a,...b,...c);
  colors.push(...ca,...cb,...cc);
 }
 // Nine individual upward-arching shoots, two leaf facets each. This is
 // precisely the previous 18 triangles/instance, not a new foliage batch.
 for(let i=0;i<9;i++){
  const az=i*TAU/9+.065*Math.sin(i*2.41),dx=Math.cos(az),dz=Math.sin(az);
  const tx=-dz,tz=dx,reach=.54+(i%3)*.115;
  const h=.62+(i%4)*.105,lean=.08*Math.sin(i*1.93);
  const base=[dx*.095,.075,dz*.095];
  const stalk=[dx*reach*.39,h*.37,dz*reach*.39];
  const spine=[dx*reach*.71+tx*lean,h*.78,dz*reach*.71+tz*lean];
  const tip=[dx*(reach+.11)+tx*lean*1.4,h*.92-.07*(i%3===0),
   dz*(reach+.11)+tz*lean*1.4];
  const width=.185+(i%3)*.029;
  const left=[spine[0]+tx*width,spine[1]-.027,spine[2]+tz*width];
  const right=[spine[0]-tx*width,spine[1]-.064,spine[2]-tz*width];
  const shadow=[.31,.49,.28],middle=[.54+.035*(i%3),.73,.42];
  const sun=[.77,.91,.57],cool=[.40,.65,.43];
  face(stalk,left,tip,shadow,sun,middle);
  face(stalk,tip,right,shadow,middle,cool);
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
