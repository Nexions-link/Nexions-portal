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
export function forestMushroomCapData(){
 const positions=[],colors=[],sectors=9;
 const emit=(a,b,c,ca,cb,cc)=>{
  positions.push(...a,...b,...c);colors.push(...ca,...cb,...cc);
 };
 const top=[0,.48,0],bottom=[0,-.28,0];
 const topTint=[.81,.71,.53],light=[.99,.88,.69];
 const mid=[.75,.56,.40],edge=[.52,.34,.26];
 const gill=[.79,.72,.60],gillDark=[.47,.39,.34];
 const radial=(angle,rad,y)=>[Math.cos(angle)*rad,y,Math.sin(angle)*rad];
 // Three connected bands: luminous crown, steep scalloped rim, shaded gills.
 // 4 triangles per sector; still one InstancedMesh for all 145 mushrooms.
 for(let i=0;i<sectors;i++){
  const a=i*TAU/sectors,b=(i+1)*TAU/sectors;
  const r1=1+.065*Math.sin(i*2.4+.7),r2=1+.065*Math.sin((i+1)*2.4+.7);
  const shoulderA=radial(a,r1*.68,.24+.045*Math.sin(i*1.8));
  const shoulderB=radial(b,r2*.68,.24+.045*Math.sin((i+1)*1.8));
  const rimA=radial(a,r1,-.12-.045*Math.cos(i*2.2));
  const rimB=radial(b,r2,-.12-.045*Math.cos((i+1)*2.2));
  const highlight=i%4===0?light:topTint;
  emit(top,shoulderA,shoulderB,highlight,topTint,topTint);
  emit(shoulderA,rimA,rimB,mid,edge,edge);
  emit(shoulderA,rimB,shoulderB,mid,edge,topTint);
  // Distinct warm underside, so an upward camera view does not see a
  // flat uniformly brown base. Double sided opaque material needs no alpha.
  emit(rimA,bottom,rimB,gill,gillDark,gill);
 }
 return valid({positions,colors});
}
