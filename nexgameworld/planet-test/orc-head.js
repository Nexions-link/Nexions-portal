// Original NGW orc sculpture. Head-local coordinates preserve the native neck
// joint: +Z is the face, crown <= .85, chin >= -.45. No external artwork.
import {createSmoothActorForm} from './smooth-actor-geometry.js';

const caches=new WeakMap();
const gaussian=(value,center,width)=>Math.exp(-(((value-center)/width)**2));

function geometryCache(THREE){
 if(caches.has(THREE))return caches.get(THREE);
 const geometries=new Map();
 const shared=(name,geometry)=>{
  geometry.name='NGW original orc '+name;
  // Actor materials enable vertex colour for sculpted body shading. Explicit
  // white colours keep the standalone head correct before rigid mesh batching.
  if(!geometry.attributes.color)geometry.setAttribute('color',new THREE.Float32BufferAttribute(
   new Float32Array(geometry.attributes.position.count*3).fill(1),3));
  geometry.computeBoundingSphere();geometry.userData.actorShared=true;
  geometries.set(name,geometry);return geometry;
 };
 const form=(name,rows,power=.72,segments=28)=>
  shared(name,createSmoothActorForm(THREE,rows,{power,segments}));
 // The entire skull, cheek planes and projecting lower jaw are one surface.
 // The front hemisphere is sculpted in-place; the back stays smoothly rounded.
 const skullRows=[
  [-.405,.19,.18,.17],[-.36,.33,.315,.165],[-.25,.42,.38,.16],
  [-.18,.44,.405,.145],[-.13,.445,.40,.14],[-.07,.43,.40,.115],
  [-.015,.41,.395,.09],[.055,.39,.39,.055],[.12,.40,.38,.03],
  [.18,.415,.375,.015],[.25,.43,.355,.005],[.30,.435,.35,.005],
  [.35,.435,.35,.01],[.405,.435,.35,.015],[.46,.425,.33,.015],
  [.51,.405,.31,.015],[.565,.38,.285,.01],[.61,.345,.255,.005],
  [.65,.30,.22,0],[.695,.22,.16,-.005],
  [.725,.035,.035,-.015]
 ];
 const skull=form('head-shell',skullRows,.74,80).clone();
 const positions=skull.attributes.position,faceColors=[];
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
  const front=Math.max(0,Math.min(1,(z+.025)/.35));
  const sockets=gaussian(Math.abs(x),.205,.105)*gaussian(y,.285,.064);
  const cheek=gaussian(Math.abs(x),.31,.105)*gaussian(y,.135,.068);
  const hollow=gaussian(Math.abs(x),.335,.075)*gaussian(y,-.005,.09);
  const browY=.355+.16*Math.abs(x);
  const brow=gaussian(Math.abs(x),.205,.205)*gaussian(y,browY,.064);
  const glabella=gaussian(x,0,.075)*gaussian(y,.37,.11);
  const chin=gaussian(x,0,.27)*gaussian(y,-.285,.11);
  const muzzle=gaussian(x,0,.27)*gaussian(y,-.075,.075);
  const lip=gaussian(x,0,.25)*gaussian(y,-.145,.033);
  const naso=gaussian(Math.abs(x),.158+Math.max(0,.095-y)*.45,.019)*gaussian(y,-.015,.115);
  const frownX=.038+Math.max(0,y-.38)*.22;
  const frown=gaussian(Math.abs(x),frownX,.011)*gaussian(y,.475,.10);
  const forehead=gaussian(y,.515+.10*(x/.35)**2,.009)*gaussian(x,0,.25)+
   .65*gaussian(y,.58+.08*(x/.35)**2,.010)*gaussian(x,0,.23);
  const chinFold=gaussian(y,-.272-.025*(x/.24)**2,.012)*gaussian(x,0,.24);
  positions.setZ(i,z+front*(-.088*sockets+.090*cheek-.035*hollow+.155*brow+
   .045*glabella+.043*chin+.072*muzzle+.037*lip-.023*naso-.014*frown-
   .009*forehead-.010*chinFold));
  // Sculpture already shades the overhanging brow. Keep painted orbit colour
  // local to each eye: a broad extra shadow would join into a dark face mask.
  const paintedOrbit=gaussian(Math.abs(x),.205,.070)*gaussian(y,.285,.047);
  const tone=Math.max(.76,Math.min(1,.99+front*(.025*cheek+.012*brow-
   .065*paintedOrbit-.040*hollow-.11*naso-.10*frown-.085*forehead-.075*chinFold)));
  faceColors.push(tone,Math.min(1,tone*1.012),tone*.987);
 }
 skull.setAttribute('color',new THREE.Float32BufferAttribute(faceColors,3));
 skull.computeVertexNormals();
 // Average the UV seam normals after sculpture so the nose has no lighting cut.
 const normals=skull.attributes.normal,seamRows=(skullRows.length-1)*3+1,stride=81;
 for(let row=0;row<seamRows;row++){
  const a=row*stride,b=a+stride-1;
  const normal=new THREE.Vector3().fromBufferAttribute(normals,a)
   .add(new THREE.Vector3().fromBufferAttribute(normals,b)).normalize();
  normals.setXYZ(a,normal.x,normal.y,normal.z);normals.setXYZ(b,normal.x,normal.y,normal.z);
 }
 shared('head-shell',skull);
 form('flat-nose',[
  [-.02,.085,.045,.515],[.025,.17,.085,.515],[.075,.165,.072,.515],
  [.125,.115,.055,.475],[.195,.08,.050,.425],[.28,.072,.045,.38],
  [.345,.065,.035,.36]
 ],.63,32);
 for(const sign of [-1,1])form('nose-wing-'+(sign<0?'left':'right'),[
  [-.012,.023,.024,.560,sign*.125],[.012,.046,.040,.560,sign*.13],
  [.047,.050,.043,.544,sign*.13],[.085,.024,.023,.517,sign*.12]
 ],.70,20);

 // A tapered sweep, with a stable frame, serves carved brows and curved tusks.
 const sweep=(name,path,radii,{steps=24,sides=10,depth=1}={})=>{
  const curve=new THREE.CatmullRomCurve3(path.map(p=>new THREE.Vector3(...p)));
  const vertices=[],uv=[],indices=[],normal=new THREE.Vector3(),binormal=new THREE.Vector3();
  for(let row=0;row<=steps;row++){
   const t=row/steps,point=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
   const reference=Math.abs(tangent.z)>.95?new THREE.Vector3(1,0,0):new THREE.Vector3(0,0,1);
   normal.crossVectors(reference,tangent).normalize();binormal.crossVectors(tangent,normal).normalize();
   const at=t*(radii.length-1),j=Math.min(radii.length-2,Math.floor(at));
   const radius=radii[j]+(radii[j+1]-radii[j])*(at-j);
   for(let side=0;side<=sides;side++){
    const angle=side/sides*Math.PI*2;
    const vertex=point.clone().addScaledVector(normal,Math.cos(angle)*radius)
     .addScaledVector(binormal,Math.sin(angle)*radius*depth);
    vertices.push(vertex.x,vertex.y,vertex.z);uv.push(side/sides,t);
   }
  }
  for(let row=0;row<steps;row++)for(let side=0;side<sides;side++){
   const a=row*(sides+1)+side,b=a+sides+1;
   indices.push(a,a+1,b,b,a+1,b+1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  geometry.computeVertexNormals();return shared(name,geometry);
 };
 const almond=(name,width,height,depth=.006)=>{
  const vertices=[0,0,depth],uv=[.5,.5],indices=[],segments=24;
  for(let i=0;i<=segments;i++){
   const angle=i/segments*Math.PI*2,x=Math.cos(angle),y=Math.sin(angle);
   vertices.push(x*width,y*height*(.65+.35*Math.abs(y)),0);
   uv.push(.5+x*.5,.5+y*.5);
   if(i<segments)indices.push(0,i+1,i+2);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  geometry.computeVertexNormals();return shared(name,geometry);
 };
 almond('eye-socket',.093,.032,.011);almond('eye-white',.074,.018,.007);
 almond('eye-iris',.023,.018,.004);almond('eye-pupil',.011,.012,.003);
 // Desaturated sclera sit inside the dark orbit instead of reading as bright
 // painted eyeballs. Their iris and round pupil remain clearly humanoid.
 const eyeColors=geometries.get('eye-white').attributes.color;
 for(let i=0;i<eyeColors.count;i++)eyeColors.setXYZ(i,.72,.74,.65);
 sweep('upper-eyelid',[[-.081,0,0],[-.043,.019,.005],[.018,.021,.006],[.081,.001,0]],
  [.001,.008,.009,.001],{steps:16,sides:6,depth:1.25});
 sweep('lower-eyelid',[[-.079,-.001,0],[-.035,-.019,.005],[.028,-.018,.005],[.079,0,0]],
  [.001,.005,.005,.001],{steps:16,sides:6});
 almond('nostril',.030,.019,.004);
 const lipVolume=(name,upper)=>{
  const vertices=[],uv=[],colors=[],indices=[],centers=[],steps=32,sides=14;
  for(let row=0;row<=steps;row++){
   const t=row/steps*2-1,full=Math.sqrt(Math.max(0,1-t*t));
   const mouthY=-.159-.041*Math.abs(t)**1.5;
   const center=[t*.29,mouthY+(upper?.014:-.027)*full,
    .607-.13*Math.abs(t)**1.5];centers.push(center);
   for(let side=0;side<=sides;side++){
    const angle=side/sides*Math.PI*2;
    const ry=Math.max(.001,(upper?.017:.032)*full),rz=Math.max(.001,(upper?.032:.047)*full);
    vertices.push(center[0],center[1]+Math.cos(angle)*ry,center[2]+Math.sin(angle)*rz);
    uv.push(row/steps,side/sides);
    const tone=.86+.09*Math.max(0,Math.sin(angle));
    colors.push(tone,tone*.98,tone*.91);
   }
  }
  for(let row=0;row<steps;row++)for(let side=0;side<sides;side++){
   const a=row*(sides+1)+side,b=a+sides+1;indices.push(a,a+1,b,b,a+1,b+1);
  }
  for(const [row,reverse] of [[0,true],[steps,false]]){
   const center=vertices.length/3;vertices.push(...centers[row]);uv.push(row/steps,.5);colors.push(.85,.83,.77);
   for(let side=0;side<sides;side++){
    const a=row*(sides+1)+side,b=a+1;indices.push(...(reverse?[center,b,a]:[center,a,b]));
   }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);
  geometry.computeVertexNormals();return shared(name,geometry);
 };
 lipVolume('upper-lip',true);lipVolume('lower-lip',false);
 const ear=(name,sign,inset=false)=>{
  const points=[[.39,.365,-.045],[.465,.385,-.02],[.55,.465,-.115],
   [.525,.205,-.08],[.415,.095,-.035]];
  const center=[.465,.285,.015];
  const vertices=[],uv=[],indices=[];
  const write=(p,back=false)=>{
   const q=inset?p.map((n,i)=>center[i]+(n-center[i])*.70):p;
   vertices.push(sign*q[0],q[1],q[2]+(inset?.012:back?-.075:0));
   uv.push((q[0]-.35)/.4,(q[1]-.08)/.42);
  };
  write(center);points.forEach(p=>write(p));
  for(let i=0;i<points.length;i++){
   const a=i+1,b=(i+1)%points.length+1;
   indices.push(...(sign>0?[0,b,a]:[0,a,b]));
  }
  if(!inset){
   write(center,true);points.forEach(p=>write(p,true));
   const offset=points.length+1;
   for(let i=0;i<points.length;i++){
    const a=i+1,b=(i+1)%points.length+1;
    indices.push(...(sign>0?[offset,offset+a,offset+b,a,b,offset+a,b,offset+b,offset+a]:
     [offset,offset+b,offset+a,a,offset+a,b,b,offset+a,offset+b]));
   }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  geometry.computeVertexNormals();return shared(name,geometry);
 };
 for(const sign of [-1,1]){
  const side=sign<0?'left':'right';
  ear('ear-'+side,sign);ear('inner-ear-'+side,sign,true);
  sweep('tusk-'+side,[[sign*.235,-.209,.552],[sign*.265,-.105,.625],
   [sign*.285,.05,.646],[sign*.26,.175,.600]],[.053,.046,.024,.001],{steps:25,sides:10});
  form('tusk-gum-'+side,[[-.255,.035,.030,.523,sign*.235],
   [-.225,.057,.044,.540,sign*.235],[-.190,.050,.040,.555,sign*.24],
   [-.167,.023,.023,.566,sign*.245]],.75,18);
  const braidPoints=[[sign*.405,.36,-.15],[sign*.45,.12,-.16],
   [sign*.44,-.10,-.10],[sign*.39,-.32,-.015]];
  // Three helical strands form a single solid braid; no bead/ball silhouette.
  const braidCurve=new THREE.CatmullRomCurve3(braidPoints.map(p=>new THREE.Vector3(...p)));
  for(let strand=0;strand<3;strand++){
   const path=Array.from({length:19},(_,i)=>{
    const t=i/18,point=braidCurve.getPoint(t),angle=t*Math.PI*7+strand*Math.PI*2/3;
    return [point.x+Math.cos(angle)*.027,point.y,point.z+Math.sin(angle)*.027];
   });
   sweep('braid-'+side+'-'+strand,path,[.027,.026,.021,.006],{steps:36,sides:6});
  }
 }
 sweep('mouth-seam',[[-.29,-.20,.479],[-.16,-.175,.592],[0,-.159,.638],
  [.16,-.175,.592],[.29,-.20,.479]],[.002,.008,.009,.008,.002],{steps:30,sides:6,depth:.6});
 sweep('temple-scar',[[-.30,.238,.417],[-.32,.183,.438],[-.337,.125,.43]],
  [.002,.009,.002],{steps:20,sides:6,depth:.4});

 // A single closed, ridged crest gives shaved temples and a strong side view.
 const crestRows=[[-.375,.30,.44,.055],[-.29,.49,.67,.083],[-.16,.63,.80,.105],
  [0,.705,.85,.12],[.16,.66,.805,.125],[.285,.56,.65,.075]];
 const crestVertices=[],crestUv=[],crestIndices=[];
 for(let row=0;row<crestRows.length;row++){
  const [z,bottom,top,width]=crestRows[row];
  for(const [x,y] of [[-width,bottom],[-width*.73,top-.025],[0,top],[width*.73,top-.025],[width,bottom]]){
   crestVertices.push(x,y,z);crestUv.push((x/width+1)*.5,row/(crestRows.length-1));
  }
 }
 for(let row=0;row<crestRows.length-1;row++)for(let side=0;side<5;side++){
  const a=row*5+side,b=row*5+(side+1)%5,c=a+5,d=b+5;
  crestIndices.push(a,c,b,b,c,d);
 }
 for(const [row,reverse] of [[0,false],[crestRows.length-1,true]])for(let i=1;i<4;i++){
  const a=row*5,b=a+i,c=b+1;crestIndices.push(...(reverse?[a,c,b]:[a,b,c]));
 }
 const crest=new THREE.BufferGeometry();
 crest.setAttribute('position',new THREE.Float32BufferAttribute(crestVertices,3));
 crest.setAttribute('uv',new THREE.Float32BufferAttribute(crestUv,2));crest.setIndex(crestIndices);
 crest.computeVertexNormals();shared('mohawk',crest);
 shared('braid-cuff',new THREE.CylinderGeometry(.066,.061,.046,10));
 caches.set(THREE,geometries);return geometries;
}

/**
 * Build a head in the existing orc neck's local frame. Materials are supplied
 * by the actor: {skin,skinDark,skinLight,ivory,hair,eye,black,metal,leather}.
 * Optional skinMap is accepted for API compatibility; assign maps on skin
 * materials before calling. This module never clones or mutates materials.
 * All cached geometry is immutable and marked userData.actorShared.
 */
export function createOrcHead(THREE,{skin,skinDark,skinLight,ivory,hair,eye,black,metal,leather,skinMap}={}){
 const geometries=geometryCache(THREE),head=new THREE.Group();head.name='orc-sculpted-head';
 const add=(name,geometry,material,position=null)=>{
  const mesh=new THREE.Mesh(geometries.get(geometry),material);
  mesh.name='orc-'+name;mesh.castShadow=true;mesh.receiveShadow=true;
  if(position)mesh.position.set(...position);head.add(mesh);return mesh;
 };
 add('face-shell','head-shell',skin);add('flat-nose','flat-nose',skin);
 add('mohawk','mohawk',hair);add('mouth-seam','mouth-seam',skinDark||black);
 add('upper-lip','upper-lip',skin);add('lower-lip','lower-lip',skin);
 add('old-temple-scar','temple-scar',skinLight||skin);
 for(const sign of [-1,1]){
  const side=sign<0?'left':'right';
  add('ear-'+side,'ear-'+side,skin);add('inner-ear-'+side,'inner-ear-'+side,skinDark||skin);
  add('nose-wing-'+side,'nose-wing-'+side,skin);add('tusk-'+side,'tusk-'+side,ivory);
  add('tusk-gum-'+side,'tusk-gum-'+side,skin);
  const socket=new THREE.Group();socket.name='orc-eye-'+side;socket.position.set(sign*.21,.303,.315);
  socket.rotation.y=sign*.30;socket.rotation.z=sign*.15;head.add(socket);
  for(const [name,geometry,material,z] of [['socket','eye-socket',skinDark||black,0],
   ['sclera','eye-white',ivory,.010],['iris','eye-iris',eye,.019],['pupil','eye-pupil',black,.025]]){
   const mesh=new THREE.Mesh(geometries.get(geometry),material);
   mesh.name='orc-eye-'+side+'-'+name;mesh.position.z=z;socket.add(mesh);
  }
  for(const [name,material] of [['upper-eyelid',skinLight||skin],['lower-eyelid',skin]]){
   const lid=new THREE.Mesh(geometries.get(name),material);
   lid.name='orc-eye-'+side+'-'+name;lid.position.z=.020;socket.add(lid);
  }
  const nostril=add('nostril-'+side,'nostril',skinDark||black,[sign*.132,.015,.598]);
  nostril.rotation.z=sign*.22;nostril.rotation.x=-.22;nostril.castShadow=false;
  for(let strand=0;strand<3;strand++)add('side-braid-'+side+'-'+strand,'braid-'+side+'-'+strand,hair);
  add('braid-cuff-'+side,'braid-cuff',metal||leather,[sign*.397,-.285,-.035]);
 }
 head.userData.originalSculpture=true;
 return head;
}
