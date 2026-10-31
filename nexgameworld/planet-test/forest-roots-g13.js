// NGW-ART-REMASTER-001 / G-13: roots that grow into the forest soil.
// Pure render geometry, shared by 400 existing trees. No gameplay/colliders.
// Every root and contact accent remains inside the authoritative 0.78 radius.
const TAU=2*Math.PI;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const G13_ROOT_VERSION='R1-G13-1';
export const G13_ROOT_BOUND=.78;
export const G13_ROOT_COUNT=5;
export const G13_ROOT_STATIONS=Object.freeze([
 Object.freeze({r:.39,y:.76,width:.125,thick:.14}),
 Object.freeze({r:.51,y:.48,width:.12,thick:.115}),
 Object.freeze({r:.61,y:.27,width:.095,thick:.078}),
 Object.freeze({r:.69,y:.115,width:.065,thick:.045}),
 Object.freeze({r:.745,y:.035,width:.036,thick:.021}),
 Object.freeze({r:.765,y:-.052,width:.001,thick:.003})
]);
const pt=(a,r,y)=>[Math.cos(a)*r,y,Math.sin(a)*r];
function out(){
 return {positions:[],colors:[],uv:[]};
}
function tri(data,a,b,c,ca,cb,cc,ua,ub,uc){
 data.positions.push(...a,...b,...c);
 data.colors.push(...ca,...cb,...cc);
 data.uv.push(...ua,...ub,...uc);
}
const rootColor=(i,k,phi)=>{
 const warmth=.78+.13*Math.sin(i*1.9+k*.61)+.07*Math.cos(phi*2);
 const shadow=.91-.17*Math.max(0,-Math.sin(phi));
 return [clamp(warmth*shadow),clamp(warmth*.91*shadow),clamp(warmth*.81*shadow)];
};
function rootCrossSection(root,station,index,j){
 const a=root*TAU/G13_ROOT_COUNT+.07*Math.sin(index*.83+root*1.1);
 const theta=j*TAU/6;
 const radial=station.r;
 const sideways=station.width*Math.cos(theta);
 const radius=Math.hypot(radial,sideways);
 if(radius>G13_ROOT_BOUND)throw Error('G-13 root exceeds collision circle');
 const along=a+.13*Math.sin(index*.42+root*.7);
 const center=pt(along,radial,station.y);
 const x=center[0]-Math.sin(along)*sideways;
 const z=center[2]+Math.cos(along)*sideways;
 const y=center[1]+Math.sin(theta)*station.thick;
 return [x,y,z];
}
export function g13RootGeometryData(){
 const data=out();
 for(let root=0;root<G13_ROOT_COUNT;root++){
  for(let i=0;i<G13_ROOT_STATIONS.length-1;i++)for(let side=0;side<6;side++){
   const next=(side+1)%6;
   const a=rootCrossSection(root,G13_ROOT_STATIONS[i],i,side);
   const b=rootCrossSection(root,G13_ROOT_STATIONS[i],i,next);
   const c=rootCrossSection(root,G13_ROOT_STATIONS[i+1],i+1,side);
   const d=rootCrossSection(root,G13_ROOT_STATIONS[i+1],i+1,next);
   const u=side/6,v=i/(G13_ROOT_STATIONS.length-1);
   tri(data,a,b,c,rootColor(root,i,side),rootColor(root,i,next),
    rootColor(root,i+1,side),[u,v],[u+1/6,v],[u,v+.20]);
   tri(data,b,d,c,rootColor(root,i,next),rootColor(root,i+1,next),
    rootColor(root,i+1,side),[u+1/6,v],[u+1/6,v+.20],[u,v+.20]);
  }
 }
 return data;
}
export function g13RootMossLitterData(){
 const data=out();
 // Three slightly raised, non-circular moss hummocks between the old buttresses.
 // Low triangles have darker bases and fresher, warm-green raised centers.
 for(let patch=0;patch<9;patch++){
  const a=patch*TAU/9+.16*Math.sin(patch*1.73);
  const r=.56+.07*Math.sin(patch*2.39),spread=.07+.038*(.5+.5*Math.cos(patch*2.1));
  const top=pt(a,r,.096+.012*Math.sin(patch*2.3));
  const left=pt(a-spread,r-.095,.045),right=pt(a+spread,r+.08,.046);
  const tip=pt(a+.022,r+.09,.058);
  const variation=.78+.16*(.5+.5*Math.sin(patch*3.4));
  const moss=[.35*variation,.56*variation,.29*variation];
  const mossLight=[.51*variation,.68*variation,.37*variation];
  tri(data,left,right,top,moss,moss,mossLight,[0,0],[1,0],[.47,1]);
  tri(data,right,tip,top,moss,mossLight,mossLight,[1,0],[1,1],[.47,1]);
 }
 // Individual fallen leaves and pine needles. Never a solid disk over roots.
 for(let leaf=0;leaf<14;leaf++){
  const a=leaf*TAU/14+.17*Math.sin(leaf*4.7),r=.59+.11*Math.cos(leaf*2.41);
  const size=.025+.013*((leaf%3)/2),p=pt(a,r,.063);
  const t=[-Math.sin(a),0,Math.cos(a)],n=[Math.cos(a),0,Math.sin(a)];
  const left=p.map((x,i)=>x+t[i]*size-n[i]*size*.42);
  const right=p.map((x,i)=>x-t[i]*size-n[i]*size*.42);
  const point=p.map((x,i)=>x+n[i]*size*1.3);
  const brown=leaf%3===0?[.60,.45,.28]:leaf%3===1?[.48,.43,.30]:[.61,.52,.34];
  tri(data,left,right,point,brown,brown.map(x=>x*.84),brown.map(x=>Math.min(1,x*1.12)),
   [0,0],[1,0],[.5,1]);
 }
 return data;
}
export function g13RootContactShadowData(){
 const data=out();
 // A short scalloped, translucent grounding shadow. Geometry never extends
 // beyond the existing trunk radius and is only +.006m above baked forest soil.
 const center=[0,0,0],dark=[.13,.16,.10];
 for(let i=0;i<24;i++){
  const a=i*TAU/24,b=(i+1)*TAU/24;
  const radial=x=>.73+.022*Math.sin(5*x+.3)+.014*Math.sin(9*x);
  const pa=pt(a,radial(a),0),pb=pt(b,radial(b),0);
  tri(data,center,pa,pb,dark,dark,dark,[.5,.5],
   [.5+.5*Math.cos(a),.5+.5*Math.sin(a)],
   [.5+.5*Math.cos(b),.5+.5*Math.sin(b)]);
 }
 return data;
}
function createGeometry(THREE,data,name){
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));
 geo.computeVertexNormals();geo.computeBoundingSphere();
 geo.name='G13-'+name;
 geo.userData.g13Decorative=true;
 geo.userData.g13Bound=G13_ROOT_BOUND;
 return geo;
}
export function createG13RootGeometry(THREE){
 return createGeometry(THREE,g13RootGeometryData(),'woven roots');
}
export function createG13MossLitterGeometry(THREE){
 return createGeometry(THREE,g13RootMossLitterData(),'moss and litter');
}
export function createG13ContactShadowGeometry(THREE){
 return createGeometry(THREE,g13RootContactShadowData(),'forest contact shade');
}
