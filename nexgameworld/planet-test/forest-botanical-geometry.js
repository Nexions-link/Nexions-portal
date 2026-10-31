// R3-03: shared sculptural fern foliage for three EXISTING instanced batches.
// Pure deterministic geometry: no meshes, new instances, colliders or GPU passes.
// The same motif scales from a large close-up fern to little wild bracken.
const TAU=Math.PI*2;
const clamp=x=>Math.min(1,Math.max(0,x));
export function forestFernData({fronds=7,segments=6}={}){
 if(!Number.isInteger(fronds)||fronds<3||fronds>12||
   !Number.isInteger(segments)||segments<1||segments>8)
  throw new RangeError('Unsupported fern geometry budget');
 const positions=[],colors=[];
 const vertex=(v,c)=>{positions.push(...v);colors.push(...c)};
 const tri=(a,b,c,ca,cb,cc)=>{vertex(a,ca);vertex(b,cb);vertex(c,cc)};
 for(let f=0;f<fronds;f++){
  const angle=f*TAU/fronds+.14+(f%3)*.043;
  const dx=Math.cos(angle),dz=Math.sin(angle),tx=-dz,tz=dx;
  const height=.62+(f%3)*.105,length=.88+(f%4)*.065;
  const bend=(f%2?.07:-.05);
  // A distinct arched rachis; final leaflets fall back towards the soil.
  const center=t=>{
   const r=.09+length*t;
   const y=.075+height*Math.sin(Math.PI*Math.pow(t,.83))*.92+
    .07*(1-t);
   return [dx*r+tx*bend*t*t,y,dz*r+tz*bend*t*t];
  };
  for(let s=0;s<segments;s++){
   const p=s/segments,q=(s+1)/segments;
   // Two individual pointed leaflets per station rather than a flat
   // triangular sheet. The narrow spaces show sky/ground between leaves.
   const origin=center(p+.035/segments),end=center(Math.min(1,p+.88/segments));
   const t=p+.55/segments,axis=center(t);
   const spread=.16*(.55+.45*Math.sin(Math.PI*(p+.13)))*
    (1-.24*p)*(1+.1*Math.sin(f*2.3+s*.9));
   for(const side of [-1,1]){
    const twist=(side===1?.028:-.022)*(1-p);
    const tip=[axis[0]+tx*spread*side+dx*.045*(1-p),
     axis[1]-.08-.065*p+twist,
     axis[2]+tz*spread*side+dz*.045*(1-p)];
    const back=[.22+.14*(1-p),.43+.16*(1-p),.21+.11*(1-p)];
    const outer=[.48+.24*p,.67+.20*p,.36+.17*p];
    const front=[.36+.21*p,.58+.18*p,.30+.13*p];
    tri(origin,tip,end,back,outer,front);
   }
  }
 }
 if(!positions.every(Number.isFinite)||!colors.every(v=>Number.isFinite(v)&&v>=0&&v<=1))
  throw Error('Invalid fern vertices');
 return {positions,colors,fronds,segments,triangles:fronds*segments*2};
}
