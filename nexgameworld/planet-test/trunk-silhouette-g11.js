// NGW-ART-REMASTER-001 G-11: organic trunk silhouettes.
// One reusable geometry per tree population: no extra instances or physics.
// The base of every existing forest trunk stays inside its unchanged
// authoritative 0.78 * tree.radius collision circle.
const TAU=Math.PI*2;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t)};
export const G11_TRUNK_VERSION='R1-G11-1';
export const G11_FOREST_BOUND=.78;
export const G11_AMBIENT_BOUND=.27;
const angular=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const bell=(x,mu,width)=>Math.exp(-Math.pow((x-mu)/width,2));

export function g11ForestSection(y,angle,originalOutline){
 if(!Number.isFinite(y)||!Number.isFinite(angle)||
  typeof originalOutline!=='function')throw new RangeError('Invalid forest trunk sample');
 const t=clamp(y+.5),old=originalOutline(y,angle);
 // Secondary irregular growth follows the grain up the bole. Knots and
 // old branch collars occupy local regions, not repeating horizontal rings.
 const grain=.012*Math.sin(3*angle-4.7*t)+.009*Math.sin(9*angle+9.1*t);
 const buttressBias=.022*Math.sin(angle+1.6)*bell(t,0,.15);
 const limbCollar=.038*bell(t,.41,.055)*bell(angular(angle,.94),0,.32)
  +.026*bell(t,.69,.038)*bell(angular(angle,3.92),0,.27);
 const oldScar=.019*bell(t,.53,.11)*bell(angular(angle,2.28),0,.18);
 const ageSwelling=.014*bell(t,.28,.18)*Math.sin(4*angle-1.9*t);
 const upperTaper=.045*smooth((t-.80)/.20);
 const growth=grain*(.55+.45*(1-smooth((t-.65)/.35)))+
  buttressBias+limbCollar-oldScar+ageSwelling-upperTaper;
 // A slow wind-shaped centreline and a finer upper bow. Ground anchor is
 // always exactly the existing collision centre, including at y=-.5.
 const curveX=old.curveX+t*t*.010*Math.sin(3.8*t+1.2);
 const curveZ=old.curveZ+t*t*.009*Math.cos(5.1*t+.35);
 const radialClearance=G11_FOREST_BOUND-.003-Math.hypot(curveX,curveZ);
 const radius=clamp(old.radius+growth,.125,radialClearance);
 return {radius,curveX,curveZ,
  shade:clamp(old.shade*(.98+.06*Math.sin(angle*5+3*t)),.30,1),
  moss:old.moss,scar:oldScar,collar:limbCollar};
}
export function g11AmbientSection(y,angle){
 if(!Number.isFinite(y)||!Number.isFinite(angle))
  throw new RangeError('Invalid small trunk sample');
 const t=clamp(y+.5);
 // Four irregular roots emerge from a smooth flared bole; a narrowing upper
 // spine carries a small amount of curvature, entirely within old footprint.
 const toes=Math.pow(.5+.5*Math.cos(4*angle+.2+1.2*t),3);
 const flare=bell(t,0,.135);
 const bole=.198-.049*smooth(t/.47)-.061*smooth((t-.42)/.58);
 const ridges=.059*toes*flare-.027*Math.pow(1-toes,5)*flare;
 const cambium=.008*Math.sin(5*angle+7.2*t)+.005*Math.cos(9*angle-3*t);
 const knot=.012*bell(t,.43,.075)*bell(angular(angle,1.8),0,.32);
 const curveX=t*t*.026*Math.sin(2.8*t+.62);
 const curveZ=t*t*.023*Math.sin(3.2*t+2.1);
 const radius=clamp(bole+ridges+cambium+knot,.065,
  G11_AMBIENT_BOUND-.003-Math.hypot(curveX,curveZ));
 const grain=.5+.5*Math.cos(4*angle-8*t);
 const shade=clamp(.82+.12*grain-.08*knot/.012-.10*flare,.52,1);
 return {radius,curveX,curveZ,shade,moss:.20*flare*(.4+.6*toes)};
}
function sculpt(THREE,base,sampler,kind,heightScale){
 const pos=base.getAttribute('position'),count=pos.count,colors=[];
 for(let i=0;i<count;i++){
  const x=pos.getX(i),z=pos.getZ(i),y=pos.getY(i);
  const angle=Math.atan2(z,x),out=sampler(y/heightScale,angle);
  // Cylinder cap centre vertices must remain on the bent centreline:
  // moving them onto the shell creates folded triangles/visible spikes.
  const centre=Math.hypot(x,z)<1e-8;
  pos.setXYZ(i,(centre?0:Math.cos(angle)*out.radius)+out.curveX*heightScale,
   y,(centre?0:Math.sin(angle)*out.radius)+out.curveZ*heightScale);
  const moss=out.moss;
  colors.push(clamp(out.shade*(1-.19*moss),0,1),
   clamp(out.shade*(.91+.12*moss),0,1),
   clamp(out.shade*(.83-.11*moss),0,1));
 }
 base.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 pos.needsUpdate=true;
 base.computeVertexNormals();base.computeBoundingSphere();
 base.userData.g11Trunk=true;
 base.userData.g11Kind=kind;
 base.userData.g11RadialBound=kind==='forest'?G11_FOREST_BOUND:G11_AMBIENT_BOUND;
 base.userData.instanced=true;
 return base;
}
export function createG11ForestTrunkGeometry(THREE,originalOutline){
 if(typeof originalOutline!=='function')throw new TypeError('Forest outline function required');
 // Same exact 20 x 18 vertex/index budget as G-09.
 const cylinder=new THREE.CylinderGeometry(.52,G11_FOREST_BOUND,1,20,18);
 return sculpt(THREE,cylinder,(y,a)=>g11ForestSection(y,a,originalOutline),'forest',1);
}
export function createG11AmbientTrunkGeometry(THREE){
 // Small background trees formerly had six flat sides and a sharp linear
 // taper. A shared 14 x 14 smooth sweep costs one instanced draw as before.
 const cylinder=new THREE.CylinderGeometry(.18,G11_AMBIENT_BOUND,1.55,14,14);
 return sculpt(THREE,cylinder,g11AmbientSection,'ambient',1.55);
}
