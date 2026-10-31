// R3-02: sculpt and paint the SAME shared crown geometry before instancing.
// No new vertices, triangles, materials, trees, textures or runtime animation.
const TAU=Math.PI*2;
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));

export function deepenForestCanopy(data,kind,variant=0){
 if(!data||!Array.isArray(data.positions)||!Array.isArray(data.colors)||
   data.positions.length!==data.colors.length)throw new TypeError('Invalid forest canopy');
 const positions=[...data.positions],colors=[...data.colors];
 if(kind==='deciduous'){
  const segments=18,rings=10;
  if(positions.length!==(segments+1)*(rings+1)*3)
   throw new RangeError('Unexpected oak geometry');
  // Several opposing broad foliage masses replace a uniformly rounded
  // outline. The same ring topology bends inward at pockets between clusters.
  for(let row=1;row<rings;row++){
   const v=row/rings,s=Math.sin(Math.PI*v);
   for(let j=0;j<=segments;j++){
    const a=TAU*j/segments,i=3*(row*(segments+1)+j);
    const lobe=Math.sin(5*a+v*4.7+variant*.89);
    const rim=Math.cos(8*a-v*3.9+variant*.57);
    const pocket=Math.pow(Math.max(0,.5+.5*Math.cos(3*a-v*4.3+variant)),3);
    const span=clamp(1+.105*s*lobe+.045*s*rim-.085*pocket*s,.76,1.17);
    const r=Math.hypot(positions[i],positions[i+2]),cap=r>1e-8?
     Math.min(span,1.29/r):span;
    positions[i]*=cap;positions[i+2]*=cap;
    positions[i+1]+=s*(.036*lobe+.027*rim-.025*pocket);
    const light=clamp(.88+.26*v+.10*Math.max(0,lobe)-.24*pocket,.57,1.15);
    // Warm outer leaf groups, cool shadow volumes; no painted-on lights.
    colors[i]=clamp(colors[i]*light*(.91+.09*Math.max(0,lobe)));
    colors[i+1]=clamp(colors[i+1]*light*(.95+.07*v));
    colors[i+2]=clamp(colors[i+2]*light*(.91+.10*pocket));
   }
  }
 }else if(kind==='conifer'){
  const whorls=5,branches=12,group=6;
  if(positions.length!==whorls*branches*group*3)
   throw new RangeError('Unexpected pine geometry');
  for(let layer=0;layer<whorls;layer++)for(let b=0;b<branches;b++){
   const start=3*group*(layer*branches+b);
   const twist=Math.sin(b*2.41+layer*3.3+variant*.59);
   const fringe=Math.cos(b*1.93-layer*2.7+variant*.88);
   const reach=1+.10*twist+.045*fringe;
   for(let k=0;k<group;k++){
    const i=start+k*3,tip=k===2||k===4,side=k===1||k===5;
    if(tip){
     const r=Math.hypot(positions[i],positions[i+2]);
     const mul=Math.min(reach,r>1e-8?1.28/r:reach);
     positions[i]*=mul;positions[i+2]*=mul;
     positions[i+1]-=.025+.042*Math.max(0,fringe);
    }else if(side){
     // Outward opposing winglets create overlapping needle depths.
     const swell=1+.13*fringe;
     positions[i]*=swell;positions[i+2]*=swell;
     positions[i+1]+=.018*twist;
    }
    const sun=clamp((tip?.89:side?1.11:.73)+.09*twist+.055*layer/whorls,.55,1.2);
    colors[i]=clamp(colors[i]*sun*.94);
    colors[i+1]=clamp(colors[i+1]*sun*1.02);
    colors[i+2]=clamp(colors[i+2]*sun*.92);
   }
  }
 }else throw new RangeError('Unknown canopy species');
 if(!positions.every(Number.isFinite)||!colors.every(x=>Number.isFinite(x)&&x>=0&&x<=1))
  throw new Error('Invalid foliage sculpt');
 return {...data,positions,colors};
}
