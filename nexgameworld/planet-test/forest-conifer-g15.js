// NGW-ART-REMASTER-001 / G-15: original layered conifer needle skirts.
// Single shared opaque geometry for each existing InstancedMesh, no colliders.
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const G15_CONIFER_BUDGET=Object.freeze({whorls:7,branches:11,sprays:3});
export function buildG15ConiferData(variant=0){
 if(!Number.isFinite(variant))throw new RangeError('Invalid conifer variant');
 const {whorls,branches,sprays}=G15_CONIFER_BUDGET;
 const positions=[],colors=[];
 const shade=(light,level,side)=>{
  const warmth=.04*Math.sin(level*3.41+side*1.73+variant*2.2);
  const sun=clamp(light+warmth,.31,1);
  return [.65*sun,.94*sun,.72*sun];
 };
 const vertex=(p,light,level,side)=>{
  positions.push(...p);colors.push(...shade(light,level,side));
 };
 const face=(a,b,c,la,lb,lc,level,side)=>{
  vertex(a,la,level,side);vertex(b,lb,level,side);
  vertex(c,lc,level,side);
 };
 const point=(r,a,y)=>[r*Math.cos(a),y,r*Math.sin(a)];
 for(let level=0;level<whorls;level++){
  // Full dark lower skirt, then progressively narrow and airy upper boughs.
  const vertical=-.344+level*.117;
  const collar=1.005-level*.122;
  for(let j=0;j<branches;j++){
   const phase=TAU*(j+(level%2)*.44)/branches+variant*.19;
   const angle=phase+.044*Math.sin(j*2.29+level*1.71+variant);
   const irregular=1+.064*Math.sin(j*2.91+level*2.17+variant*.9)+
    .027*Math.sin(j*5.73-level*1.31);
   const radius=collar*irregular;
   for(let spray=0;spray<sprays;spray++){
    // Three crossing needle fingers on every bough: separate drooping
    // silhouettes from all angles, not solid green cones or flat disks.
    const side=spray-1;
    const a=angle+side*.083+.028*Math.cos(level*2.5+j*1.8+spray);
    const inner=radius*(.095+.105*spray);
    const outer=radius*(.63+.172*spray)*
     (1+.038*Math.cos(j*1.9+spray*4.3+variant));
    const spread=.15-.012*spray+.015*Math.sin(j*3.4+spray);
    const shoulder=outer*(.56+.05*Math.sin(j+spray));
    const root=point(inner,a,vertical+.063-.018*spray);
    const left=point(shoulder,a-spread,vertical-.042-.013*spray);
    const right=point(shoulder*1.08,a+spread*.80,vertical-.064+.008*spray);
    const drop=.119+.018*spray+.026*(1-level/whorls)+
     .018*Math.sin(j*1.8+level*.7+spray);
    const tip=point(outer,a+.033*Math.sin(j+spray*2.3),vertical-drop);
    const under=.53+.08*Math.cos(j*.74+level);
    const edge=.81+.12*Math.cos(j*1.1+level*2.9+spray*1.3);
    const highlight=clamp(.81+.11*Math.cos(a*3+spray+level),.67,.96);
    face(root,left,tip,under,edge,highlight,level,spray);
    face(root,tip,right,under,highlight,edge-.08,level,spray);
   }
  }
 }
 if(positions.some(x=>!Number.isFinite(x))||colors.some(x=>!Number.isFinite(x)))
  throw new Error('Non-finite conifer geometry');
 return {positions,colors,indices:[],kind:'conifer'};
}
