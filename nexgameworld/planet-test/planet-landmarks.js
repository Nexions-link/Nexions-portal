// Deterministic original-valley stone landmarks, reusable by geometry
// instancing AND the spherical gameplay/camera collision engine.
const randomGenerator=seed=>{
 let state=seed>>>0;
 return ()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
};
const mesaRand=randomGenerator(53120),rockRand=randomGenerator(62914);
export const VALLEY_MESAS=Object.freeze(Array.from({length:25},(_,i)=>{
 const a=i/25*Math.PI*2,rr=104+mesaRand()*10;
 return Object.freeze({x:Math.sin(a)*rr,z:Math.cos(a)*rr,
  height:12+mesaRand()*18,radius:8+mesaRand()*8,spin:mesaRand()*Math.PI*2});
}));
const rocks=[];
for(let i=0;i<1400&&rocks.length<38;i++){
 const x=(rockRand()-.5)*136,z=(rockRand()-.5)*136;
 if(Math.hypot(x,z)<23)continue;
 // Match original no-rock lake, inner hearth house and main roads.
 const lr=Math.hypot((x-30)/17.2,(z-26)/12.5);
 if(lr<1.16||Math.abs(x+27)<14&&Math.abs(z+2)<14)continue;
 const roads=[[[0,9],[-2,0],[-5,-12],[-8,-26],[-18,-42]],
 [[0,3],[13,5],[25,2],[38,-9]],[[0,9],[1,24],[12,37],[32,43]]];
 const road=roads.some(points=>points.slice(1).some((to,j)=>{
  const from=points[j],dx=to[0]-from[0],dz=to[1]-from[1],
    f=Math.max(0,Math.min(1,((x-from[0])*dx+(z-from[1])*dz)/(dx*dx+dz*dz)));
  return Math.hypot(x-from[0]-f*dx,z-from[1]-f*dz)<3.4;
 }));
 if(road)continue;
 const size=.8+rockRand()*1.8;
 rocks.push(Object.freeze({x,z,radius:size*.7,height:size*.7,spin:rockRand()*Math.PI*2}));
}
export const VALLEY_ROCKS=Object.freeze(rocks);
export function blocksRockOrMesa(x,z,playerRadius=.42,height=0){
 for(const rock of VALLEY_ROCKS){
  if(height<=rock.height&&Math.hypot(x-rock.x,z-rock.z)<rock.radius+playerRadius)return true;
 }
 for(const mesa of VALLEY_MESAS){
  if(height<=mesa.height*.87&&Math.hypot(x-mesa.x,z-mesa.z)<mesa.radius*.85+playerRadius)return true;
 }
 return false;
}
