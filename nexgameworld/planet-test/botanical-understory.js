// Original, opaque botanical geometry. Local Y is the spherical surface normal.
// No scene state, physics, random globals or external texture dependencies.
const TAU=Math.PI*2;
export function botanicalUnderstoryData(kind){
 const positions=[],colors=[];
 const tri=(a,b,c,shade)=>{
  positions.push(...a,...b,...c);
  for(const s of shade)colors.push(s[0],s[1],s[2]);
 };
 const dark=[.38,.53,.23],mid=[.68,.82,.43],tip=[.90,.96,.65];
 const leaf=(base,end,width)=>{
  const dx=end[0]-base[0],dz=end[2]-base[2],d=Math.hypot(dx,dz)||1;
  const tx=-dz/d,tz=dx/d;
  // A raised central vein and four tapered segments form a curved leaf.
  const sections=4;
  for(let j=0;j<sections;j++){
   const station=t=>{
    const w=Math.sin(Math.PI*t)*width;
    const centre=[base[0]+dx*t,base[1]+(end[1]-base[1])*t+
     Math.sin(Math.PI*t)*width*.48,base[2]+dz*t];
    return {c:centre,l:[centre[0]+tx*w,centre[1]-w*.16,centre[2]+tz*w],
     r:[centre[0]-tx*w,centre[1]-w*.23,centre[2]-tz*w]};
   };
   const a=station(j/sections),b=station((j+1)/sections);
   const low=j===0?dark:mid,hi=j===sections-1?tip:mid;
   // Avoid zero-area faces at the pointed base and tip.
   if(j>0){tri(a.l,a.c,b.c,[low,tip,hi]);tri(a.c,a.r,b.c,[tip,low,hi]);}
   if(j<sections-1){tri(a.l,b.c,b.l,[low,hi,mid]);tri(a.r,b.r,b.c,[low,mid,hi]);}
  }
 };
 if(kind==='ferns'){
  for(let frond=0;frond<9;frond++){
   const a=frond*TAU/9+.09*Math.sin(frond*3),dx=Math.cos(a),dz=Math.sin(a);
   const reach=.78+(frond%3)*.13,height=.55+(frond%4)*.09;
   const spine=t=>[dx*reach*t,.06+height*Math.sin(t*2.35),dz*reach*t];
   // Pinnate fronds: paired individual leaflets follow an arching rachis.
   for(let k=1;k<=8;k++){
    const t=k/10,base=spine(t),length=.24*Math.pow(Math.sin(Math.PI*t),.65);
    const next=spine(t+.09);
    tri([base[0]-.009,base[1],base[2]],next,
     [base[0]+.009,base[1],base[2]],[dark,mid,dark]);
    for(const side of [-1,1]){
     const ex=dx*.11-side*dz*length,ez=dz*.11+side*dx*length;
     leaf(base,[base[0]+ex,base[1]-.045+(1-t)*.07,base[2]+ez],
      .046*(1-t*.62));
    }
   }
   leaf(spine(.82),spine(1),.04);
  }
 }else if(kind==='groundcover'){
  for(let stem=0;stem<7;stem++){
   const a=stem*2.39996,dx=Math.cos(a),dz=Math.sin(a);
   const h=.24+(stem%3)*.12,r=.18+(stem%3)*.08;
   const top=[dx*r,h,dz*r];
   tri([dx*.04-.012,.015,dz*.04],top,[dx*.04+.012,.015,dz*.04],
    [dark,mid,dark]);
   for(let level=0;level<3;level++)for(const side of [-1,1]){
    const t=.36+level*.25,base=[top[0]*t,top[1]*t,top[2]*t];
    const angle=a+side*(.72+level*.13),reach=.18+(2-level)*.035;
    leaf(base,[base[0]+Math.cos(angle)*reach,base[1]+.07,
     base[2]+Math.sin(angle)*reach],.075);
   }
  }
 }else if(kind==='lawn'){
  for(let i=0;i<13;i++){
   const a=i*2.39996,dx=Math.cos(a),dz=Math.sin(a),tx=-dz,tz=dx;
   const root=[dx*(.08+(i%4)*.09),.01,dz*(.08+(i%4)*.09)];
   const height=.20+(i%5)*.035,w=.023+(i%3)*.007;
   const midPoint=[root[0]+dx*.09,height*.6,root[2]+dz*.09];
   const l=[midPoint[0]+tx*w*.6,midPoint[1],midPoint[2]+tz*w*.6];
   const r=[midPoint[0]-tx*w*.6,midPoint[1],midPoint[2]-tz*w*.6];
   const b=[root[0]+tx*w,.01,root[2]+tz*w];
   const c=[root[0]-tx*w,.01,root[2]-tz*w];
   tri(b,c,l,[dark,dark,mid]);tri(c,r,l,[dark,mid,mid]);
   tri(l,r,[root[0]+dx*.23,height,root[2]+dz*.23],[mid,mid,tip]);
  }
 }else throw new RangeError('Unknown understory '+kind);
 return {positions,colors,alpha:false};
}
