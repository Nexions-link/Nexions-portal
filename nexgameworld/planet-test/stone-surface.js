// P2.3.13: faceted but organically weathered stones shared by all ground art.
// One static shared geometry per biome, vertex-color lichens, no textures,
// raycast targets, shadows, movement blockers or extra per-frame operations.
const clamp=(x)=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*clamp(t);
export function weatheredStoneVertex(x,y,z,kind='forest'){
 if(![x,y,z].every(Number.isFinite))throw new RangeError('invalid stone vertex');
 const n=Math.sin(x*8.3+y*4.7+z*6.2)*Math.cos(z*5.6-y*7.3);
 const cleft=Math.pow(Math.abs(Math.sin(x*11.7-z*5.4+y*2.8)),9);
 // Irregular cracked silhouette, mild enough for all instanced rock sizes.
 const radius=.91+.075*n+.052*Math.cos(x*4.3+z*8.6)-.061*cleft;
 const fleck=.5+.5*Math.sin(x*35.7+y*47.1-z*19.3);
 const dry=(kind==='trail'||kind==='meadow');
 const lichen=smooth(.01,.70,y+.21*Math.sin(x*7.3+z*8.4))*
  smooth(.24,.82,n*.4+.5)* (dry?.34:1);
 const crease=.22*cleft;
 const dark=.77+.12*fleck-.14*crease+.14*smooth(.2,.9,y);
 const base=dry?[.91,.87,.77]:[.78,.82,.80];
 const moss=dry?[.79,.76,.56]:[.47,.68,.50];
 const color=base.map((v,i)=>clamp(mix(v,moss[i],lichen*.53)*dark));
 return {radius,color,lichen,cleft};
}
export function createWeatheredStoneGeometry(THREE,kind='forest'){
 const geo=new THREE.IcosahedronGeometry(1,kind==='trail'?0:1);
 const pos=geo.getAttribute('position'),colors=[];
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
  const w=weatheredStoneVertex(x,y,z,kind);
  pos.setXYZ(i,x*w.radius,y*w.radius,z*w.radius);
  colors.push(...w.color);
 }
 pos.needsUpdate=true;
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geo.computeVertexNormals();
 geo.computeBoundingSphere();
 return geo;
}
