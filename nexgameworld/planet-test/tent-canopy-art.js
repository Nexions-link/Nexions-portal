// Original camp hide craft. Geometry and canvas pigment are baked once at
// construction; the existing map/materials and animation loop are reused.
const TAU=Math.PI*2;
const wrap=value=>value-Math.floor(value);
const clamp01=value=>Math.max(0,Math.min(1,value));
const smooth=(a,b,value)=>{const t=clamp01((value-a)/(b-a));return t*t*(3-2*t);};
const periodicDistance=(u,centre)=>wrap(u-centre+.5)-.5;
const mix=(a,b,t)=>a.map((value,i)=>value+(b[i]-value)*clamp01(t));

export function tentHidePixel(u,v){
 if(!Number.isFinite(u)||!Number.isFinite(v))throw new TypeError('Finite tent coordinates required');
 u=wrap(u);v=clamp01(v);
 // Broad tension folds survive mipmapping. Finer fibres support those masses
 // rather than replacing them with the old independent random scratches.
 const flow=u+.018*Math.sin(TAU*v)+.008*Math.sin(TAU*(2*v+u));
 const fold=Math.cos(TAU*(3*flow))*.5+.5;
 const crease=Math.exp(-(((fold-.96)/.14)**2))*17;
 const lip=Math.exp(-(((Math.cos(TAU*(3*flow-.09))-.93)/.18)**2))*7;
 const age=Math.sin(TAU*(u+v))*.6+Math.cos(TAU*(2*u-2*v))*.4;
 const fibres=Math.sin(TAU*(19*u+2*v))*.7+Math.cos(TAU*(31*u-v))*.4;
 const shade=lip-crease+age*5+fibres-smooth(.87,1,v)*14;
 let rgb=[231+shade,208+shade,168+shade];
 const wear=.78+.16*Math.sin(TAU*(7*u+2*v))+.06*Math.cos(TAU*(13*u-v));
 const band=(lo,hi)=>smooth(lo-.008,lo+.008,v)*(1-smooth(hi-.008,hi+.008,v));
 // An original repeating paired-chevron ribbon and four inset lozenges.
 // Integer U frequencies and wrapped distances meet at the 3x map repeat.
 const zig=1-Math.abs(wrap(u*4)*2-1);
 const path=.405+zig*.064;
 rgb=mix(rgb,[105,66,40],(1-smooth(.019,.028,Math.abs(v-path)))*wear);
 rgb=mix(rgb,[176,87,51],(1-smooth(.009,.016,Math.abs(v-path)))*wear);
 rgb=mix(rgb,[160,76,46],band(.545,.582)*wear);
 rgb=mix(rgb,[49,105,100],band(.615,.648)*wear);
 let diamond=0;
 for(const centre of [.125,.375,.625,.875]){
  const d=Math.abs(periodicDistance(u,centre))/.075+Math.abs(v-.727)/.041;
  diamond=Math.max(diamond,1-smooth(.92,1.12,d));
 }
 rgb=mix(rgb,[57,110,103],diamond*wear);
 const inset=Math.abs(periodicDistance(u,.125+Math.floor(u*4)*.25))/.031+
  Math.abs(v-.727)/.017;
 rgb=mix(rgb,[239,216,170],(1-smooth(.85,1.08,inset))*wear);
 // Subtle panel joins and hand-sized stitch marks, not extra geometry.
 const join=Math.min(Math.abs(periodicDistance(u,0)),Math.abs(periodicDistance(u,.5)));
 const seam=(1-smooth(.002,.006,join))*band(.12,.91)*.28;
 rgb=mix(rgb,[94,68,43],seam);
 const stitch=(1-smooth(.010,.017,join))*(1-smooth(.07,.12,Math.abs(wrap(v*19)-.5)))*band(.12,.91);
 rgb=mix(rgb,[243,224,185],stitch*.7);
 return [...rgb.map(value=>Math.max(0,Math.min(255,Math.round(value)))),255];
}

export function paintTentHide(context,size=128){
 if(!Number.isInteger(size)||size<1)throw new RangeError('Invalid tent canvas size');
 const image=context.createImageData(size,size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)
  image.data.set(tentHidePixel((x+.5)/size,(y+.5)/size),(y*size+x)*4);
 context.putImageData(image,0,0);
}

export function createTentCanopyGeometry(THREE,radius){
 if(!Number.isFinite(radius)||radius<=0)throw new RangeError('Positive tent radius required');
 const height=radius*1.42;
 // Reallocate the old bottom-cap/apex-degenerate index budget to a genuine
 // middle cloth ring. The separate original closed rim is left untouched.
 const geometry=new THREE.ConeGeometry(radius,height,14,2,true);
 const position=geometry.attributes.position;
 for(let i=15;i<30;i++){
  const x=position.getX(i),z=position.getZ(i),r=Math.hypot(x,z);
  const angle=Math.atan2(x,z);
  const billow=radius*.0115*(.32+.68*(.5+.5*Math.cos(angle*5+.7)));
  position.setXYZ(i,x*(1+billow/r),position.getY(i),z*(1+billow/r));
 }
 const indices=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 for(let i=0;i<geometry.index.count;i+=3){
  const ia=geometry.index.getX(i),ib=geometry.index.getX(i+1),ic=geometry.index.getX(i+2);
  a.fromBufferAttribute(position,ia);b.fromBufferAttribute(position,ib);c.fromBufferAttribute(position,ic);
  if(b.sub(a).cross(c.sub(a)).lengthSq()>radius**4*1e-18)indices.push(ia,ib,ic);
 }
 geometry.setIndex(indices);geometry.clearGroups();geometry.computeVertexNormals();
 // Three duplicates the seam and every apex vertex. Give coincident points
 // one normal, including the unused apex duplicate after degenerate removal.
 const normal=geometry.attributes.normal;
 for(const group of [Array.from({length:15},(_,i)=>i),[15,29],[30,44]]){
  a.set(0,0,0);
  for(const i of group){b.fromBufferAttribute(normal,i);a.add(b);}
  a.normalize();
  for(const i of group)normal.setXYZ(i,a.x,a.y,a.z);
 }
 position.needsUpdate=true;normal.needsUpdate=true;
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return geometry;
}
