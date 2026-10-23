// NGW-ART-TREES-001 / T2.1 — shared hand-guided biological wood surfaces.
// Unlike cylinders or repeating strip meshes, cross sections accumulate unequal
// cambium growth; continuous transported frames preserve curved grain direction.
// Geometry is original, deterministic, reusable and purely decorative.
const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=x=>x*x*(3-2*x);
const fract=x=>x-Math.floor(x);
const hash=n=>fract(Math.sin(n*127.1+43.7)*43758.5453);
const gaussian=(x,width)=>Math.exp(-.5*(x/width)**2);
const wrapAngle=x=>Math.atan2(Math.sin(x),Math.cos(x));

// Root flares rise organically INTO the same trunk shell. Root anchor directions
// are exactly the directions used by the external root sculptures.
export function rootGrowthFlare(y,angle,{count=9,seed=17,reach=1,phase=.11,
 spread=.33,height=2.8}={}){
 let sum=0;
 for(let j=0;j<count;j++){
  const axis=j*TAU/count+seed*phase+(phase===.11?hash(j*13)*.20:0);
  const diff=wrapAngle(angle-axis-.13*Math.sin(y*.8+j));
  const width=spread*(1+.23*hash(j*13+seed));
  sum+=gaussian(diff,width)*(.65+.55*hash(j*31+seed));
 }
 return reach*Math.exp(-Math.max(0,y)/height)*sum;
}

// Knotted swells are displaced in the trunk silhouette itself. Side branches
// are embedded in these flowing collars rather than glued to a flat cylinder.
export function branchGrowthCollar(y,angle,attachments,{height=.34,strength=.20}={}){
 let growth=0;
 for(const {level,direction,weight=1} of attachments){
  const dy=y-level;
  if(Math.abs(dy)>height*3.1)continue;
  const da=wrapAngle(angle-direction-.085*dy);
  growth+=strength*weight*gaussian(dy,height)*gaussian(da,.25);
 }
 return Math.min(.48,growth);
}

// Unequal vascular ridges descend, split and cross; no repeated rectangular
// bands. The frequencies are intentionally incommensurate.
export function cambiumRadiusModifier(y,angle,seed=17,{grain=.12,grooves=9}={}){
 const turn=angle+.076*Math.sin(y*.32+seed*.21)+.038*Math.sin(y*.81);
 const long=.55*Math.sin(turn*grooves+1.3*Math.sin(y*.22+seed*.17))+
  .32*Math.sin(turn*(grooves*.61)+y*.53+seed*.11)+
  .18*Math.sin(turn*23-y*1.71+seed*.39);
 const pores=Math.sin(turn*39+y*7.31)*Math.sin(turn*31-y*5.81);
 return grain*(.74*long+.13*pores);
}

// Sweep a continuously curved centreline, not separate straight tapered tubes.
// Rings use a parallel-transport frame; no random 90° frame flips at bends.
// Each ring is a live eccentric radial outline, not a circular cross-section.
export function sculptedWoodPathGeometry(THREE,points,radii,{sides=18,
 seed=17,character=1,kind='branch',subdivisions=4}={}){
 if(!Array.isArray(points)||points.length<2||points.length!==radii?.length)
  throw new RangeError('Wood path requires matching positions/radii');
 const coords=points.map(p=>new THREE.Vector3(...p));
 if(coords.some(v=>!Number.isFinite(v.x+v.y+v.z))||
   radii.some(r=>!Number.isFinite(r)||r<0))throw new RangeError('Invalid wood path geometry');
 if(!Number.isInteger(sides)||sides<6||sides>64)throw new RangeError('Invalid ring count');
 const curve=new THREE.CatmullRomCurve3(coords,false,'centripetal');
 const rowCount=Math.max(12,(points.length-1)*subdivisions);
 const positions=[],uv=[],index=[],v0=new THREE.Vector3(),v1=new THREE.Vector3();
 let lastFrame=null,distance=0,lastPoint=null;
 for(let row=0;row<=rowCount;row++){
  const t=row/rowCount,p=curve.getPoint(t),axis=curve.getTangent(t).normalize();
  if(lastPoint)distance+=p.distanceTo(lastPoint);
  lastPoint=p;
  let right;
  if(lastFrame){
   right=lastFrame.clone().addScaledVector(axis,-lastFrame.dot(axis)).normalize();
   if(right.lengthSq()<.01)right=null;
  }
  if(!right){
   const up=Math.abs(axis.y)>.88?v0.set(1,0,0):v0.set(0,1,0);
   right=v1.crossVectors(axis,up).normalize().clone();
  }
  const front=new THREE.Vector3().crossVectors(right,axis).normalize();
  lastFrame=right;
  const segment=t*(radii.length-1),a=Math.min(radii.length-2,Math.floor(segment)),
   fraction=smooth(segment-a);
  const r=mix(radii[a],radii[a+1],fraction);
  // Buttresses flatten into ground; secondary boughs retain living cork ribs.
  const flare=kind==='root' ? 1+.25*Math.exp(-row/Math.max(1,rowCount*.18)) : 1;
  const twist=.21*Math.sin(t*5.7+seed*.031);
  const age=Math.exp(-t*7);
  for(let j=0;j<=sides;j++){
   const theta=j*TAU/sides;
   const g=theta+twist+.13*t*Math.sin(seed*.071);
   const ribs=.095*Math.sin(g*(kind==='root'?5:9)+t*11+seed*.11)+
    .052*Math.sin(g*17-t*17+seed*.23)+.035*Math.cos(g*27+t*24);
   const knot=.14*age*Math.exp(-.5*((g-.9*Math.sin(seed*.13))/.48)**2);
   const eccentric=1+character*ribs+knot;
   const radial=Math.max(.004,r*flare*eccentric),
    elliptical=kind==='root'?.61+.21*(1-t):.88+.08*Math.sin(t*3+seed);
   const point=p.clone().addScaledVector(right,radial*Math.cos(theta))
    .addScaledVector(front,radial*elliptical*Math.sin(theta));
   positions.push(point.x,point.y,point.z);
   uv.push(j/sides,distance/Math.max(.15,radii[0]*6));
   if(row<rowCount&&j<sides){
    const i=row*(sides+1)+j;
    index.push(i,i+sides+1,i+1,i+1,i+sides+1,i+sides+2);
   }
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setIndex(index);g.computeVertexNormals();g.computeBoundingSphere();
 g.userData={biologicalSculpture:true,kind,radialSides:sides,pathSamples:rowCount};
 return g;
}
