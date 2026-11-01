// R3-02: sculpt and paint the SAME shared crown geometry before instancing.
// No new vertices, triangles, materials, trees, textures or runtime animation.
const TAU=Math.PI*2;
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const angularWindow=(angle,centre,width)=>{
 const delta=Math.atan2(Math.sin(angle-centre),Math.cos(angle-centre));
 return Math.exp(-Math.pow(delta/width,2));
};

// G-18: sunlight reaches outer and upper leaves, while sheltered interior
// foliage is cooler and darker. All values are baked into the SAME RGB
// vertex colors, so mobile GPUs render the identical indexed geometry.
export function forestLeafLightTints(height,angle,{cavity=0,kind='deciduous'}={}){
 if(!Number.isFinite(height)||!Number.isFinite(angle))throw new RangeError('Invalid leaf light');
 const top=clamp(height),sheltered=1-top;
 const sun=.5+.5*Math.cos(angle-.84);
 const bounce=.5+.5*Math.sin(angle*3.7+top*5.1);
 const inside=clamp(.47*sheltered+.37*cavity+.16*(1-sun));
 const gain=clamp(.77+.29*top+.15*sun-.18*inside+.04*bounce,.62,1.22);
 const warm=clamp(top*.65+sun*.35,.0,1);
 if(kind==='conifer')return [gain*(.95+.09*warm),gain*(.98+.055*top),gain*(1-.085*warm)];
 return [gain*(.97+.13*warm),gain*(.98+.065*top),gain*(1-.11*warm)];
}
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
    // G-16: sculpt three irregular sky windows in the existing shared mesh.
    const opening=Math.min(1,Math.pow(s,1.15)*(
     .80*angularWindow(a,.72+variant*.42+v*.52,.29)+
     .68*angularWindow(a,3.06+variant*.19-v*.26,.34)+
     .48*angularWindow(a,5.23-variant*.31+v*.16,.27)));
    const span=clamp(1+.105*s*lobe+.045*s*rim-.085*pocket*s-.255*opening,.64,1.17);
    const r=Math.hypot(positions[i],positions[i+2]),cap=r>1e-8?
     Math.min(span,1.29/r):span;
    positions[i]*=cap;positions[i+2]*=cap;
    positions[i+1]+=s*(.036*lobe+.027*rim-.025*pocket-.038*opening);
    const light=clamp(.88+.26*v+.10*Math.max(0,lobe)-.24*pocket-.20*opening,.50,1.15);
    // Warm outer leaf groups, cool shadow volumes; no painted-on lights.
    const tint=forestLeafLightTints(1-v,a,{cavity:pocket*.7+opening*.3});
    colors[i]=clamp(colors[i]*light*(.91+.09*Math.max(0,lobe))*tint[0]);
    colors[i+1]=clamp(colors[i+1]*light*(.95+.07*v)*tint[1]);
    colors[i+2]=clamp(colors[i+2]*light*(.91+.10*pocket)*tint[2]);
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
   // Open alternating gaps between existing needle whorls (zero new triangles).
   const gapIndex=(b+2*layer+Math.floor(variant))%7;
   const opening=(gapIndex===0?1:gapIndex===1?.32:0)*(.75+.25*(4-layer)/4);
   const reach=1+.10*twist+.045*fringe-.23*opening;
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
    const sun=clamp((tip?.89:side?1.11:.73)+.09*twist+.055*layer/whorls-.16*opening,.48,1.2);
    const needleLight=forestLeafLightTints((layer+.7)/5,
     TAU*b/branches,{kind:'conifer',cavity:tip?.13:side?.25:.76});
    colors[i]=clamp(colors[i]*sun*.94*needleLight[0]);
    colors[i+1]=clamp(colors[i+1]*sun*1.02*needleLight[1]);
    colors[i+2]=clamp(colors[i+2]*sun*.92*needleLight[2]);
   }
  }
 }else throw new RangeError('Unknown canopy species');
 if(!positions.every(Number.isFinite)||!colors.every(x=>Number.isFinite(x)&&x>=0&&x<=1))
  throw new Error('Invalid foliage sculpt');
 return {...data,positions,colors};
}
