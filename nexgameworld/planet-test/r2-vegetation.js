// NGW R2-02: sculpt the EXISTING shared forest and meadow meshes in place.
// It changes vertex position and colour ONLY. It never adds vertices, indices,
// draw calls, instances, textures, colliders, gameplay rules or GPU passes.
const TAU=Math.PI*2;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const checksum=a=>a.reduce((sum,n)=>sum+n,0);
export function sculptForestCrown(data,kind,variant=0){
 if(!data||!Array.isArray(data.positions)||data.positions.length!==data.colors.length)
  throw new TypeError('Invalid shared canopy geometry');
 const positions=[...data.positions],colors=[...data.colors];
 if(kind==='deciduous'){
  const segments=18,rings=10,expected=(segments+1)*(rings+1)*3;
  if(positions.length!==expected)throw new RangeError('Unexpected deciduous vertex budget');
  for(let row=1;row<rings;row++){
   const elevation=row/rings,s=Math.sin(Math.PI*elevation);
   for(let j=0;j<=segments;j++){
    const a=TAU*j/segments,idx=(row*(segments+1)+j)*3;
    const x=positions[idx],z=positions[idx+2],r=Math.hypot(x,z);
    // Nine distinct shade-lit foliage lobes with open scalloped margins:
    // lower silhouette is irregular, upper crown narrows into tiers.
    const leaflets=Math.sin(7*a+1.7*elevation+variant*.85);
    const cleft=Math.max(0,Math.cos(5*a-3.8*elevation+variant*.7));
    const ridge=Math.sin(3*a+elevation*6+variant*.91);
    const fullness=1+.115*leaflets*s-.085*cleft*s+.045*ridge;
    const radius=clamp(r*fullness,0,1.26);
    const spread=r>1e-8?radius/r:1;
    positions[idx]=x*spread;positions[idx+2]=z*spread;
    positions[idx+1]+=s*(.042*ridge-.027*cleft)+(elevation>.61?.016:0);
    const topLight=clamp(.77+.27*(1-elevation),.62,1.05);
    const pocket=clamp(1-.29*cleft-.10*Math.max(0,-leaflets),.60,1);
    colors[idx]=clamp(colors[idx]*topLight*pocket*.99,0,1);
    colors[idx+1]=clamp(colors[idx+1]*(1.02+.07*Math.max(0,ridge))*topLight*pocket,0,1);
    colors[idx+2]=clamp(colors[idx+2]*topLight*pocket*.95,0,1);
   }
  }
 }else if(kind==='conifer'){
  // Existing two bough triangles, six unindexed vertices per branch.
  const whorls=5,branches=12,group=6;
  if(positions.length!==whorls*branches*group*3)
   throw new RangeError('Unexpected conifer vertex budget');
  for(let level=0;level<whorls;level++)for(let b=0;b<branches;b++){
   const leaf=level*branches+b,start=leaf*group*3;
   const swing=Math.sin(b*2.23+level*3.48+variant*.93);
   const taper=Math.cos(b*1.37-level*2.6+variant*.6);
   const growth=clamp(1+.075*swing-.035*Math.max(0,-taper),.90,1.09);
   for(let k=0;k<group;k++){
    const i=start+k*3,isTip=k===2||k===4,isWing=k===1||k===5;
    if(isTip){
     positions[i]*=growth;positions[i+2]*=growth;
     positions[i+1]=Math.max(-.57,positions[i+1]-.018-.012*Math.max(0,swing));
    }else if(isWing){
     positions[i]*=1+.09*taper;positions[i+2]*=1+.09*taper;
    }
    // Cool inner needles, warm illuminated tips; no extra material.
    const shade=clamp((isTip?.85:isWing?1.10:.74)+.08*taper+.035*(level/whorls),.58,1.20);
    colors[i]=clamp(colors[i]*shade*.95,0,1);
    colors[i+1]=clamp(colors[i+1]*shade,0,1);
    colors[i+2]=clamp(colors[i+2]*shade*.94,0,1);
   }
  }
 }else throw new RangeError('Unknown crown kind');
 if(!positions.every(Number.isFinite)||!colors.every(Number.isFinite))
  throw Error('Non-finite shared crown');
 return {...data,positions,colors};
}
export function sculptMeadowGrass(data){
 if(!data||data.bladeCount!==6||data.positions.length!==data.colors.length)
  throw new TypeError('Invalid native meadow grass');
 const positions=[...data.positions],colors=[...data.colors];
 // Keep the 18 triangles of the 6 original blades. Low fan-like turf
 // rather than six upright tall pointed shrubs. Broader stems fill ground gaps.
 for(let blade=0;blade<6;blade++){
  const start=blade*9*3,phase=blade*TAU/6,drift=.06*Math.sin(phase*3.2+blade*.75);
  const h=blade%3,scaleY=[.65,.71,.60][h],spread=[1.35,1.17,1.43][h];
  for(let vertex=0;vertex<9;vertex++){
   const idx=start+vertex*3,x=positions[idx],y=positions[idx+1],z=positions[idx+2];
   positions[idx]=x*spread+Math.cos(phase)*(y*y*.16+drift*y);
   positions[idx+1]=y*scaleY;
   positions[idx+2]=z*spread+Math.sin(phase)*(y*y*.16+drift*y);
   const dark=clamp(.85+.18*(1-y)+.1*Math.sin(phase*2.5+vertex),.65,1.1);
   colors[idx]=clamp(colors[idx]*dark*.91,0,1);
   colors[idx+1]=clamp(colors[idx+1]*dark*1.07,0,1);
   colors[idx+2]=clamp(colors[idx+2]*dark*.83,0,1);
  }
 }
 return {...data,positions,colors};
}
export function vegetationGeometryBudget(baseline,enhanced){
 if(!baseline||!enhanced)return false;
 return baseline.positions.length===enhanced.positions.length&&
  baseline.colors.length===enhanced.colors.length&&
  (baseline.indices?.length??0)===(enhanced.indices?.length??0)&&
  baseline.positions.every(Number.isFinite)&&enhanced.positions.every(Number.isFinite);
}
