// G-20: sculpted pinnate ferns, shared by the original three instanced
// woodland batches. No new triangles, colliders, textures or draw calls.
const TAU=Math.PI*2;
const clamp=x=>Math.min(1,Math.max(0,x));
const smooth=t=>{const x=clamp(t);return x*x*(3-2*x)};
export function forestFernAgeProfile(variation=0,shade=0){
 if(!Number.isFinite(variation)||!Number.isFinite(shade))
  throw new RangeError('Invalid fern age');
 const v=clamp(variation),s=clamp(shade);
 // A deterministic uneven botanical family, not independently random scales.
 // Deep shade favours younger thin specimens; the gaps carry old wide crowns.
 const maturity=clamp(.23+.77*v-.17*s);
 const age=maturity<.41?'young':maturity<.74?'mature':'old';
 return {
  age,
  width:age==='young'?.66+.13*v:age==='mature'?.88+.15*v:1.08+.11*v,
  height:age==='young'?.78+.18*v:age==='mature'?1.03+.17*v:.81+.17*v,
  light:Math.max(.77,Math.min(1.12,1.06-.13*s-.08*(age==='old')+.05*v)),
  // Kept independently for predictable instance positioning.
  shade:s
 };
}
export function forestFernData({fronds=7,segments=6,age='mature'}={}){
 if(!Number.isInteger(fronds)||fronds<3||fronds>12||
   !Number.isInteger(segments)||segments<1||segments>8||
   !['young','mature','old'].includes(age))
  throw new RangeError('Unsupported fern geometry budget');
 const positions=[],colors=[];
 const growth=age==='young'?.79:age==='old'?1.13:1;
 const arch=age==='young'?.81:age==='old'?.88:1;
 const vertex=(v,c)=>{positions.push(...v);colors.push(...c)};
 const tri=(a,b,c,ca,cb,cc)=>{vertex(a,ca);vertex(b,cb);vertex(c,cc)};
 for(let f=0;f<fronds;f++){
  const a=f*TAU/fronds+.14+(f%3)*.064;
  const dx=Math.cos(a),dz=Math.sin(a),tx=-dz,tz=dx;
  // Alternating short/long fronds create a nested botanical rosette.
  // Even at six fronds the species has visibly layered silhouette.
  const vigor=.83+.14*(f%3)+.05*Math.sin(f*2.23);
  const height=(.59+(f%3)*.105)*vigor*arch;
  const length=(.88+(f%4)*.065)*growth*vigor;
  const curl=(f%2?.12:-.085)*(age==='old'?1.35:1);
  const center=t=>{
   const u=clamp(t),s=Math.sin(Math.PI*Math.pow(u,.77));
   const radial=.075+length*u;
   const y=.055+height*s*(.92+.05*Math.cos(f*1.7))+
    .088*(1-u)-.028*u*u;
   return [dx*radial+tx*curl*u*u,
    Math.max(.023,y),dz*radial+tz*curl*u*u];
  };
  for(let j=0;j<segments;j++){
   const t=j/segments,q=(j+1)/segments;
   const base=center(t+.035/segments);
   const end=center(Math.min(1,q-.035/segments));
   const at=center(t+.49/segments);
   // Opposite separate pinnules, narrowing toward the apical tip.
   // Each curled leaflet stays a single triangle, already inside the
   // original 7x6x2 / 6x1x2 vertex and GPU budget.
   const fullness=(.58+.42*Math.sin(Math.PI*(t+.18)))*
    (1-.31*t)*(1+.12*Math.sin(f*2.9+j*1.17));
   const reach=(.215+.035*(f%2))*fullness*growth;
   const forward=.065*(1-t)+.015*Math.sin(f*.93+j*1.2);
   for(const side of [-1,1]){
    const torsion=side*(.055+.026*Math.sin(f*1.73+j*1.3))*
      (1-t*.55);
    const tip=[
     at[0]+tx*reach*side+dx*forward,
     at[1]-.078-.055*t+torsion,
     at[2]+tz*reach*side+dz*forward
    ];
    const canopy=.51+.49*smooth(1-t);
    const filtered=.13+.09*(1-canopy);
    const underside=[.23+.095*t,.43+.115*t,.22+.067*t];
    const margin=[.55+.16*(1-t),.75+.13*(1-t),.38+.12*(1-t)];
    const spine=[.32+.09*t,.53+.15*t,.25+.083*t];
    const shade=side<0?filtered*.92:filtered*.55;
    tri(base,tip,end,
     underside.map(c=>c*(1-shade*.5)),
     margin.map(c=>c*(1-shade*.18)),
     spine);
   }
  }
 }
 if(!positions.every(Number.isFinite)||!colors.every(v=>Number.isFinite(v)&&v>=0&&v<=1))
  throw Error('Invalid fern vertices');
 return {positions,colors,fronds,segments,triangles:fronds*segments*2};
}
