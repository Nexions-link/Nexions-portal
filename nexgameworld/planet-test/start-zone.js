import {createLandscapeMap} from '../landscape.js?v=0.3.7.0';
import {createSphericalMeadow} from './sphere-meadow.js?v=2';
import {createVillageVisuals} from './village-visuals.js?v=2';
import {createTaurenVisualDetails} from './tauren-visual-details.js?v=3';
import {hornPathPoints,hornRadius} from './tauren-horn-profile.js?v=1';
import {canWalkCamp} from './sphere-physics.js?v=8';
import {LONGHOUSE,insideHouse,buildHearthHouse} from './hearth-house.js?v=4';
import {createHouseRat} from './house-rat.js?v=3';
import {VALLEY_MESAS,VALLEY_ROCKS} from './planet-landmarks.js?v=1';
import {createBanditCampVisuals} from './bandit-camp-visuals.js?v=3';
import {BANDIT_CAMP,BANDIT_CHIEF_PATH} from './bandit-camp-data.js?v=2';

// Spherical NexGame starting zone prototype.
// Layout, terrain, village and character geometry derived from the actual main-game
// start zone, copied into this isolated module. No main game imports or networking.
export const START_RADIUS=261;
const TAU=Math.PI*2;
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
export const LAKE={x:30,z:26,radiusX:17.2,radiusZ:12.5,maxDepth:10.5};
export const ROUTES=[[[0,9],[-2,0],[-5,-12],[-8,-26],[-18,-42]],[[0,3],[13,5],[25,2],[38,-9]],[[0,9],[1,24],[12,37],[32,43]],
 [[-34,-12],[-46,-10],[-57,-5],[BANDIT_CAMP.center.x,BANDIT_CAMP.center.z]],BANDIT_CHIEF_PATH];
const PATHS=[];
for(const [ri,route] of ROUTES.entries())for(let j=0;j<route.length-1;j++){const a=route[j],b=route[j+1];PATHS.push({ax:a[0],az:a[1],dx:b[0]-a[0],dz:b[1]-a[1],width:ri===4?1.85:2.55})}
const clamp01=x=>Math.max(0,Math.min(1,x));
const shoreVariation=a=>1+.041*Math.sin(3*a+.5)+.026*Math.cos(5*a-1.2)+.014*Math.sin(9*a+.3);
export function lakeRadius(x,z){const dx=(x-LAKE.x)/LAKE.radiusX,dz=(z-LAKE.z)/LAKE.radiusZ;return Math.hypot(dx,dz)/shoreVariation(Math.atan2(dz,dx))}
const natural=(x,z)=>smooth(10,29,Math.hypot(x+5,z-4))*(Math.sin(x*.055)*Math.cos(z*.067)*1.65+Math.sin(z*.13+x*.047)*.6);
export const LAKE_SURFACE=natural(LAKE.x,LAKE.z)+.22;
const hearthElevation=natural(-27,-2);
export function startHeightAt(x,z){
 const outside=Math.max(Math.abs(x+27)-10.4,Math.abs(z+2)-9.6);
 const original=natural(x,z);
 const native=outside>=3.6?original:original+(hearthElevation-original)*(1-smooth(-.6,3.6,outside));
 const r=lakeRadius(x,z);
 if(r>=1.24)return native;
 if(r<=1)return LAKE_SURFACE+.26-(LAKE.maxDepth+.26)*smooth(0,1,1-r);
 const bank=LAKE_SURFACE+.26+.17*Math.sin(Math.PI*(r-1)/.24);
 return bank+(native-bank)*smooth(1.025,1.24,r);
}
// Original lake physics: shallow water is traversable, deep lakebed is not.
export function canWadeAtLocal(x,z){
 return Math.max(0,LAKE_SURFACE-startHeightAt(x,z))<=1.12;
}
export function pathWear(x,z){
 let v=0;
 for(const p of PATHS){const d=p.dx*p.dx+p.dz*p.dz;const t=clamp01(((x-p.ax)*p.dx+(z-p.az)*p.dz)/d),dist=Math.hypot(x-p.ax-p.dx*t,z-p.az-p.dz*t);
 v=Math.max(v,1-smooth(.9,p.width,dist));}
 return v;
}
export function startColorAt(x,z){
 const near=lakeRadius(x,z),worn=pathWear(x,z);
 let c=[.37,.50,.28];const grain=.075*Math.sin(x*.37+z*.13)*Math.cos(z*.23-x*.17);
 c=c.map((v,i)=>v+grain*(i===1?.85:1));
 if(worn>.001)c=c.map((v,i)=>v+( [ .63,.49,.29][i]-v)*worn);
 if(near<1.24){const sand=1-smooth(1.02,1.24,near),silt=1-smooth(.65,.99,near);
   c=c.map((v,i)=>v+([.68,.62,.43][i]-v)*sand);
   c=c.map((v,i)=>v+([.20,.43,.47][i]-v)*silt*.82);
 }
 return c;
}
export function localToNormal(x,z,R){
 const d=Math.hypot(x,z);
 if(d<1e-7)return new THREE.Vector3(0,0,1);
 const theta=d/R,k=Math.sin(theta)/d;
 return new THREE.Vector3(x*k,z*k,Math.cos(theta));
}
export function normalToLocal(n,R){
 const theta=Math.acos(Math.max(-1,Math.min(1,n.z))),r=Math.hypot(n.x,n.y);
 if(r<1e-8)return {x:0,z:0,d:theta*R};
 const f=theta*R/r;return {x:n.x*f,z:n.y*f,d:theta*R};
}
// This constant THREE binding is filled by createStartZone before conversion is used.
// It avoids importing another library instance and shares the game's single renderer.
let THREE;
export function initStartZoneMath(THREELibrary){THREE=THREELibrary;}
export function createStartZone(three,scene,getRadius,heightAt){
 initStartZoneMath(three);
 const UP=new THREE.Vector3(0,1,0);
 let textureSeed=531;
 const rand=()=>((textureSeed=(Math.imul(textureSeed,1664525)+1013904223)>>>0)/4294967296);
 function texture(draw,size=128){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
 const hideTexture=texture((c,s)=>{c.fillStyle='#dbc39a';c.fillRect(0,0,s,s);for(let i=0;i<900;i++){c.fillStyle=rand()>.5?'#fff0ca18':'#53392313';c.fillRect(rand()*s,rand()*s,rand()*12,1)}c.strokeStyle='#6d3d2b';c.lineWidth=9;c.beginPath();for(let x=0;x<=s;x+=16){c.lineTo(x,40+(x%32?13:-13))}c.stroke();c.fillStyle='#ac5938';c.fillRect(0,54,s,12);c.fillStyle='#346c66';c.fillRect(0,74,s,6);c.fillStyle='#795034';c.fillRect(0,s-7,s,7)});
 hideTexture.wrapS=THREE.RepeatWrapping;
 hideTexture.repeat.set(3,1);
 const m=(c,extra={})=>new THREE.MeshStandardMaterial({color:c,roughness:1,flatShading:true,side:THREE.DoubleSide,...extra});
 const wood=m('#694528'),wood2=m('#987046'),hide=m('#e0c899',{map:hideTexture}),hideDark=m('#e0c899',{map:hideTexture}),red=m('#9d5236'),teal=m('#3c7a70'),bone=m('#ded0a5'),leaf=m('#6f8d4c'),leaf2=m('#93a75a'),rock=m('#8c785e'),rockLight=m('#aa926c'),rockDark=m('#6e593c');
 // Only offset thin fabric decorations, not the house's wall materials.
 const detailRed=m('#9d5236',{polygonOffset:true,polygonOffsetFactor:-1.5,polygonOffsetUnits:-1.5});
 const waterMat=new THREE.MeshPhongMaterial({color:'#64b1b6',vertexColors:true,transparent:true,opacity:.90,shininess:65,specular:0x9acbd0,depthWrite:false,side:THREE.DoubleSide});
 const waterTint=new THREE.Color('#64b1b6');
 const shoreMat=new THREE.MeshStandardMaterial({color:'#b4a179',roughness:1,side:THREE.DoubleSide});
 const objects=[],meshGroups=[],longhouseRoofs=[],shadowCasters=[];
 const villageVisuals=createVillageVisuals(THREE,{scene,getRadius,toNormal:localToNormal,heightAt});
 function box(p,mat,x,y,z,w,h,d){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);p.add(o);return o}
 function cyl(p,mat,x,y,z,a,b,h,seg=9){const o=new THREE.Mesh(new THREE.CylinderGeometry(a,b,h,seg),mat);o.position.set(x,y,z);p.add(o);return o}
 function ell(p,mat,x,y,z,a,b,c){const o=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),mat);o.position.set(x,y,z);o.scale.set(a,b,c);p.add(o);return o}
 function rod(p,mat,ax,ay,az,bx,by,bz,r){const av=new THREE.Vector3(ax,ay,az),bv=new THREE.Vector3(bx,by,bz),d=bv.clone().sub(av);const o=cyl(p,mat,(ax+bx)/2,(ay+by)/2,(az+bz)/2,r,r,d.length(),7);o.quaternion.setFromUnitVectors(UP,d.normalize());return o}
 function anchor(x,z,yaw=0){const g=new THREE.Group();scene.add(g);objects.push({g,x,z,yaw});return g}
 function refreshAnchors(){
  const q=new THREE.Quaternion(),twist=new THREE.Quaternion();
  for(const item of objects){
   const n=localToNormal(item.x,item.z,getRadius());
   item.g.position.copy(n).multiplyScalar(getRadius()+heightAt(n)+.06);
   q.setFromUnitVectors(UP,n);
   item.g.quaternion.copy(q).multiply(twist.setFromAxisAngle(UP,item.yaw));
  }
 }
 const banditCampVisuals=createBanditCampVisuals(THREE,{anchor,shadowCasters});
 // Rebuilt longhouse: matching opaque physics and exterior roof layers.
 const houseAnchor=anchor(LONGHOUSE.x,LONGHOUSE.z,LONGHOUSE.yaw);
 const longhouse=buildHearthHouse(THREE,{root:houseAnchor,villageVisuals});
 const houseRat=createHouseRat(THREE,houseAnchor);
 longhouseRoofs.push(...longhouse.roofPlanes);
 shadowCasters.push(...longhouse.roofPlanes);
 function tent(x,z,r,yaw){
  const g=anchor(x,z,yaw);
  const rim=cyl(g,hideDark,0,.24,0,r,r,.49,14);
  const cone=new THREE.Mesh(new THREE.ConeGeometry(r,r*1.42,14),hide);cone.position.y=r*.71;g.add(cone);shadowCasters.push(cone);
  villageVisuals.addTent(g,r);
  // Same red entrance fabric and timber structural poles as main NexGame.
  for(let i=0;i<9;i++){const a=i*TAU/9;rod(g,wood,Math.sin(a)*r,0,Math.cos(a)*r,0,r*1.58,0,.09)}
  box(g,red,0,r*.71,r*.71,r*.64,.18,.18);
  const doorway=box(g,new THREE.MeshStandardMaterial({color:'#1b1c17',side:THREE.DoubleSide}),0,r*.34,r*.73,r*.44,r*.69,.08);doorway.rotation.x=-.48;
 }
 tent(11,-7,4.2,-.5);tent(-15,12,3.8,2.2);tent(13,16,3.4,-1.7);tent(-23,-15,3,.5);
 function totem(x,z,scale,crownLift=0){
  const g=anchor(x,z);g.name=x===-3&&z===-5?'mentor-great-totem':'camp-totem';
  g.scale.setScalar(scale);cyl(g,wood2,0,2.4+crownLift/2,0,.48,.65,4.8+crownLift);
  for(let i=0;i<3;i++){const y=.9+i*1.25;cyl(g,i%2?teal:red,0,y,0,.53,.52,.26);box(g,bone,0,y+.43,.55,.66,.38,.13)}
  for(const sign of [-1,1]){const wing=box(g,teal,sign*1.1,4.3+crownLift,0,2,.35,.3);wing.rotation.z=sign*.15}
  ell(g,bone,0,5+crownLift,0,.55,.43,.45);
 }
 for(const [x,z,s] of [[-3,-5,1],[5,9,.75],[-5,25,.8],[35,-14,1.25]])totem(x,z,s,x===-3&&z===-5?2:0);
 function banner(x,z,angle){
  const g=anchor(x,z,angle);
  rod(g,wood,-1,0,0,-1,4.6,0,.11);rod(g,wood,1,0,0,1,4.6,0,.11);rod(g,wood,-1,4.3,0,1,4.3,0,.11);
  box(g,red,0,3.3,0,1.8,1.9,.1);box(g,teal,0,3.9,.08,1.4,.18,.07);
 }
 banner(-4,19,.2);banner(5,-14,-.1);
 const fire=anchor(-6,7),embers=[];
 for(let i=0;i<9;i++){const a=TAU*i/9;ell(fire,rock,Math.sin(a)*1.15,.2,Math.cos(a)*1.15,.35,.22,.30)}
 for(let i=0;i<3;i++){const log=cyl(fire,wood,0,.25,0,.18,.18,1.9);log.rotation.z=Math.PI/2;log.rotation.y=i*Math.PI/3}
 const flame=new THREE.Mesh(new THREE.ConeGeometry(.5,1.3,7),new THREE.MeshBasicMaterial({color:'#ffb253'}));flame.position.y=.7;fire.add(flame);embers.push(flame);
 // Sculpted sandstone mesas and isolated boulders in the original valley.
 // A single instanced batch for each material means four additional draw calls.
 const mesaBase=new THREE.InstancedMesh(new THREE.CylinderGeometry(.8,1,1,8),rockDark,VALLEY_MESAS.length);
 const mesaCap=new THREE.InstancedMesh(new THREE.CylinderGeometry(.82,.85,1,8),rockLight,VALLEY_MESAS.length);
 const mesaGrass=new THREE.InstancedMesh(new THREE.CylinderGeometry(.76,.82,1,8),leaf,VALLEY_MESAS.length);
 const boulders=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),rock,VALLEY_ROCKS.length);
 for(const obj of [mesaBase,mesaCap,mesaGrass,boulders]){obj.frustumCulled=false;scene.add(obj)}
 const stoneDummy=new THREE.Object3D(),stoneQ=new THREE.Quaternion(),stoneYaw=new THREE.Quaternion();
 function rebuildStones(){
  const radius=getRadius();
  function place(inst,i,x,z,offset,sx,sy,sz,spin){
   const n=localToNormal(x,z,radius);
   stoneDummy.position.copy(n).multiplyScalar(radius+heightAt(n)+offset);
   stoneQ.setFromUnitVectors(UP,n);
   stoneDummy.quaternion.copy(stoneQ).multiply(stoneYaw.setFromAxisAngle(UP,spin));
   stoneDummy.scale.set(sx,sy,sz);stoneDummy.updateMatrix();
   inst.setMatrixAt(i,stoneDummy.matrix);
  }
  for(let i=0;i<VALLEY_MESAS.length;i++){
   const v=VALLEY_MESAS[i];
   place(mesaBase,i,v.x,v.z,v.height/2-2,v.radius,v.height,v.radius,v.spin);
   place(mesaCap,i,v.x,v.z,v.height-2.8,v.radius*.85,2.3,v.radius*.85,v.spin);
   place(mesaGrass,i,v.x,v.z,v.height-1,v.radius*.76,1.3,v.radius*.76,v.spin);
  }
  for(let i=0;i<VALLEY_ROCKS.length;i++){
   const v=VALLEY_ROCKS[i],size=v.radius/.7;
   place(boulders,i,v.x,v.z,size*.34,size,size*.7,size*.9,v.spin);
  }
  for(const obj of [mesaBase,mesaCap,mesaGrass,boulders])obj.instanceMatrix.needsUpdate=true;
 }
 // Trees use the exact tree layout of the current NexGame zone.
 function tree(x,z,scale){
  const g=anchor(x,z);g.scale.setScalar(scale);
  villageVisuals.addTree(x,z,scale);
  rod(g,wood,0,0,0,.2,4.2,0,.33);for(const s of [-1,1])rod(g,wood,0,2,0,s*1.6,4.8,.2,.18);
  shadowCasters.push(ell(g,leaf,-1.4,4.8,0,2.4,.9,1.75));
  shadowCasters.push(ell(g,leaf2,1.4,5,.2,2.1,.95,1.6));
  shadowCasters.push(ell(g,leaf,0,5.65,0,2.5,.85,1.8));
 }
 for(const [x,z,s] of [[-26,21,1.2],[54,35,1],[34,-26,.95],[-34,-30,1.15],[9,49,1.2],[-39,40,1.1],[51,25,1.3],[50,-8,.8],[-47,-7,1.1]])tree(x,z,s);
 // Grass and rocks approximate the distribution; the main game uses instancing.
 let seed=179311;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const brush=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),leaf2,175);
 const dummy=new THREE.Object3D();const brushPoints=[];
 for(let i=0;i<900&&brushPoints.length<175;i++){
  const x=(rnd()-.5)*136,z=(rnd()-.5)*136;
  if(Math.hypot(x+5,z-4)<12||lakeRadius(x,z)<1.25||pathWear(x,z)>.2||Math.hypot(x+27,z+2)<18)continue;
  brushPoints.push({x,z,s:.36+rnd()*.56,yaw:rnd()*TAU});
 }
 // Replaced by the actual NexGame meadow (grass, three flower colors,
 // shrubs), so keep the original experimental brush instance hidden.
 brush.count=0;brush.frustumCulled=false;scene.add(brush);
 const meadow=createSphericalMeadow(THREE,{scene,getRadius,toNormal:localToNormal,heightAt,
  accept:(x,z)=>Math.hypot(x,z)<69&&lakeRadius(x,z)>1.18&&pathWear(x,z)<.18&&
   (Math.abs(x+27)>12.8||Math.abs(z+2)>12.5)&&
   canWalkCamp(x,z,.5)});

 function updateBrush(){
  for(let i=0;i<brushPoints.length;i++){
   const {x,z,s,yaw}=brushPoints[i],n=localToNormal(x,z,getRadius());
   dummy.position.copy(n).multiplyScalar(getRadius()+heightAt(n)+.23);
   dummy.quaternion.setFromUnitVectors(UP,n).multiply(new THREE.Quaternion().setFromAxisAngle(UP,yaw));
   dummy.scale.set(s,.42*s,s);dummy.updateMatrix();brush.setMatrixAt(i,dummy.matrix);
  }
  brush.instanceMatrix.needsUpdate=true;
 }
 const terrainGeo=new THREE.BufferGeometry();
 const extent=87, grid=124,step=extent*2/grid,points=[],cols=[],indices=[];
 for(let j=0;j<=grid;j++)for(let i=0;i<=grid;i++){
  const x=-extent+i*step,z=-extent+j*step;
  points.push(x,z);const c=startColorAt(x,z);cols.push(...c);
  if(i<grid&&j<grid){
   const cx=x+step*.5,cz=z+step*.5;
   if(Math.hypot(cx,cz)<84){
    const a=j*(grid+1)+i,b=a+grid+1;
    indices.push(a,a+1,b,b,a+1,b+1);
   }
  }
 }
 // The same procedural meadow and path map as the main NexGame.
 const routeSegments=ROUTES.flatMap((route,ri)=>route.slice(0,-1).map((a,i)=>({ax:a[0],az:a[1],bx:route[i+1][0],bz:route[i+1][1],width:ri===4?2.25:3.5})));
 const paintedMap=createLandscapeMap(THREE,routeSegments,1024);
 const tileUVs=[];
 for(let i=0;i<points.length;i+=2)tileUVs.push((points[i]+95)/190,1-(points[i+1]+95)/190);
 const verts=new Float32Array(points.length/2*3);
 terrainGeo.setIndex(indices);
 terrainGeo.setAttribute('position',new THREE.BufferAttribute(verts,3));
 terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
 terrainGeo.setAttribute('uv',new THREE.Float32BufferAttribute(tileUVs,2));
 const patch=new THREE.Mesh(terrainGeo,new THREE.MeshStandardMaterial({map:paintedMap,roughness:1,side:THREE.DoubleSide}));
 patch.frustumCulled=false;scene.add(patch);
 // Water and shore geometries remain real-world metre sizes when the radius changes.
 function radialGeometry(radiusInner,radiusOuter,steps,segments,offsetMode){
  const pos=[],uv=[],ix=[];
  for(let j=0;j<=steps;j++){
   const q=j/steps,r=radiusInner+(radiusOuter-radiusInner)*q;
   for(let i=0;i<=segments;i++){
    const a=i/segments*TAU,edge=shoreVariation(a),x=LAKE.x+Math.cos(a)*LAKE.radiusX*r*edge,z=LAKE.z+Math.sin(a)*LAKE.radiusZ*r*edge;
    pos.push(x,z);uv.push(r*Math.cos(a)*.5+.5,r*Math.sin(a)*.5+.5);
    if(i<segments&&j<steps){const t=j*(segments+1)+i,b=t+segments+1;ix.push(t,b,t+1,b,b+1,t+1)}
   }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setIndex(ix);geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(pos.length/2*3),3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.userData={planar:pos,offsetMode};
  if(offsetMode==='water'){
   // Radial depth tint avoids flat, uniformly colored water.
   const colors=[],deep=new THREE.Color('#6e9bb1'),shallow=new THREE.Color('#d9f0d6');
   for(let j=0;j<=steps;j++){
    const t=smooth(.12,.98,radiusInner+(radiusOuter-radiusInner)*j/steps);
    const shade=deep.clone().lerp(shallow,t);
    for(let i=0;i<=segments;i++)colors.push(shade.r,shade.g,shade.b);
   }
   geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  }
  geometry.computeBoundingSphere();
  return geometry;
 }
 const shore=radialGeometry(.97,1.22,5,90,'shore'),water=radialGeometry(0,.992,12,90,'water');
 // The native lake uses a scrolling glint texture. This overlay receives
 // its own radial geometry; a world-Y offset would clip into the globe.
 const rippleTexture=texture((c,size)=>{
  c.clearRect(0,0,size,size);
  for(let i=0;i<65;i++){
   const x=(i*83+27)%size,y=(i*137+43)%size;
   c.beginPath();c.ellipse(x,y,5+(i%7)*2,1.3+(i%3)*.3,-.13,.12*Math.PI,.85*Math.PI);
   c.strokeStyle=i%3===0?'rgba(255,255,228,.24)':'rgba(240,255,247,.16)';
   c.lineWidth=.7+(i%3)*.3;c.stroke();
  }
 },256);
 rippleTexture.wrapS=rippleTexture.wrapT=THREE.RepeatWrapping;
 rippleTexture.repeat.set(5,3);
 const shimmerGeometry=water.clone();shimmerGeometry.userData.offsetMode='shimmer';
 const shoreMesh=new THREE.Mesh(shore,shoreMat);shoreMesh.frustumCulled=false;scene.add(shoreMesh);
 const lakeMesh=new THREE.Mesh(water,waterMat);lakeMesh.frustumCulled=false;lakeMesh.renderOrder=3;scene.add(lakeMesh);
 const shimmer=new THREE.Mesh(shimmerGeometry,new THREE.MeshBasicMaterial({
  map:rippleTexture,color:0xffffff,transparent:true,opacity:.34,depthWrite:false,
  side:THREE.DoubleSide,blending:THREE.AdditiveBlending
 }));
 shimmer.frustumCulled=false;shimmer.renderOrder=4;scene.add(shimmer);
 // Lake edge reeds use ONE instanced batch, recreated on radius change.
 const reeds=new THREE.InstancedMesh(new THREE.CylinderGeometry(.027,.052,1,5),
  new THREE.MeshStandardMaterial({color:0x91ab70,roughness:1}),205);
 reeds.frustumCulled=false;scene.add(reeds);
 const reedPoints=[];
 for(let i=0;i<75;i++){
  const a=i/75*TAU,rad=1.035+.045*Math.sin(i*8.7);
  for(let j=0;j<3;j++){
   const angle=a+(j-1)*.005,rr=rad+(j-1)*.013;
   const x=LAKE.x+Math.cos(angle)*LAKE.radiusX*rr*shoreVariation(angle);
   const z=LAKE.z+Math.sin(angle)*LAKE.radiusZ*rr*shoreVariation(angle);
   if(reedPoints.length>=205||pathWear(x,z)>.2)continue;
   reedPoints.push({x,z,h:.7+((i*7+j*13)%9)*.11,spin:angle+(j-1)*.13});
  }
 }
 const reedDummy=new THREE.Object3D(),reedQ=new THREE.Quaternion(),reedSpin=new THREE.Quaternion();
 function rebuildReeds(){
  for(let i=0;i<reedPoints.length;i++){
   const reed=reedPoints[i],normal=localToNormal(reed.x,reed.z,getRadius());
   reedDummy.position.copy(normal).multiplyScalar(getRadius()+heightAt(normal)+reed.h/2);
   reedQ.setFromUnitVectors(UP,normal);
   reedDummy.quaternion.copy(reedQ).multiply(reedSpin.setFromAxisAngle(UP,reed.spin));
   reedDummy.scale.set(.8,reed.h,.8);reedDummy.updateMatrix();
   reeds.setMatrixAt(i,reedDummy.matrix);
  }
  reeds.count=reedPoints.length;reeds.instanceMatrix.needsUpdate=true;
 }
 function updateSurface(geometry){
  const {planar,offsetMode}=geometry.userData,p=geometry.attributes.position;
  for(let i=0;i<planar.length;i+=2){
   const x=planar[i],z=planar[i+1],n=localToNormal(x,z,getRadius());
   const altitude=offsetMode==='water'?LAKE_SURFACE+.11:offsetMode==='shimmer'?LAKE_SURFACE+.135:heightAt(n)+.21;
   const r=getRadius()+altitude;p.setXYZ(i/2,n.x*r,n.y*r,n.z*r);
  }
  p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
 }
 function rebuild(){
  const attr=terrainGeo.attributes.position;
  for(let i=0;i<points.length;i+=2){
   const x=points[i],z=points[i+1],n=localToNormal(x,z,getRadius());
   const r=getRadius()+heightAt(n)+.12;attr.setXYZ(i/2,n.x*r,n.y*r,n.z*r);
  }
  attr.needsUpdate=true;terrainGeo.computeVertexNormals();terrainGeo.computeBoundingSphere();
  updateSurface(shore);updateSurface(water);updateSurface(shimmerGeometry);refreshAnchors();updateBrush();rebuildReeds();meadow.rebuild();rebuildStones();villageVisuals.rebuild();
 }
 rebuild();
 let roofFaded=false,shadowsEnabled=false,shimmerStrength=.30;
 function setGraphics(preset={}){
  meadow.applyDensity(preset);
  villageVisuals.applyQuality(preset.detail);
  reeds.count=Math.floor(reedPoints.length*Math.max(0,Math.min(1,preset.reeds??1)));
  shimmerStrength=Math.max(0,Math.min(.45,preset.shimmer??.30));
  shimmer.material.opacity=shimmerStrength;
  shimmer.visible=shimmerStrength>0;
  if(Number.isInteger(preset.waterColor))waterTint.setHex(preset.waterColor);
  shadowsEnabled=!!preset.shadows;
  for(const caster of shadowCasters)caster.castShadow=shadowsEnabled&&(!roofFaded||!longhouseRoofs.includes(caster));
  patch.receiveShadow=shadowsEnabled;
 }
 function updateInteriorView(x,z){
  const inside=insideHouse(x,z);
  if(inside!==roofFaded){
   roofFaded=inside;
   // An entire solid roof is hidden indoors; no translucent wall sorting.
   longhouse.roof.visible=!inside;
   villageVisuals.setInterior(inside);
   for(const roof of longhouseRoofs)roof.castShadow=shadowsEnabled&&!inside;
  }
 }
 return {rebuild,updateInteriorView,setGraphics,meadow,
  animate(t){houseRat.animate(t);banditCampVisuals.animate(t);
   flame.scale.y=1+Math.sin(t*9)*.12;
   rippleTexture.offset.set(t*.006,t*.003);
   waterMat.color.copy(waterTint).multiplyScalar(1+.018*Math.sin(t*1.3));}};
}


// Original Tauren procedural mesh as it exists in NexGame's game.js,
// with networking, equipment and inventory intentionally not copied.
export function createTauren(THREE,scene,{fur=0x836144,clothColor=null,player=false}={}){
 const TAU=Math.PI*2;
 let seed=531;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
 const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:1,metalness:0,...extra});
 function texture(draw,size=128){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
 const M={red:material(0x9a4931),teal:material(0x427b70),gold:material(0xd7ae5e),bone:material(0xe5d5aa),black:material(0x231f19),wood:material(0x5b3d24)};
 const G={sphere:new THREE.SphereGeometry(1,12,9),box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,10),cone:new THREE.ConeGeometry(1,1,9)};
 function group(parent,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g}
 function mesh(parent,geometry,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1,cast=true){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m}
 const ell=(p,m,x,y,z,sx,sy,sz,cast=true)=>mesh(p,G.sphere,m,x,y,z,sx,sy,sz,cast);
 const box=(p,m,x,y,z,sx,sy,sz,cast=true)=>mesh(p,G.box,m,x,y,z,sx,sy,sz,cast);
 function rod(p,m,a,b,r=.08,r2=r,segments=7){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const obj=mesh(p,new THREE.CylinderGeometry(r2,r,d.length(),segments),m,...av.clone().add(bv).multiplyScalar(.5).toArray());obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return obj}
const taurenFurMap=texture((c,s)=>{
 const g=c.createLinearGradient(0,0,0,s);g.addColorStop(0,'#97816a');g.addColorStop(.32,'#e0c49b');g.addColorStop(.7,'#d0ad7d');g.addColorStop(1,'#8e7154');c.fillStyle=g;c.fillRect(0,0,s,s);
 for(let i=0;i<1050;i++){const x=((i*73)%257)/257*s,y=((i*139)%263)/263*s;c.strokeStyle=i%3?'#3c28151c':'#fff0c621';c.lineWidth=.8;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-2,y+3,x+(i%3)-1,y+6+(i%7));c.stroke()}
},256);
const hornMap=texture((c,s)=>{
 const g=c.createLinearGradient(0,s,0,0);g.addColorStop(0,'#6c5036');g.addColorStop(.2,'#bfa780');g.addColorStop(.4,'#f2dfb5');g.addColorStop(.72,'#dfcaa0');g.addColorStop(.9,'#786046');g.addColorStop(1,'#352b23');c.fillStyle=g;c.fillRect(0,0,s,s);
 for(let i=0;i<25;i++){c.fillStyle='#47301c12';c.fillRect(0,i*s/25,s,1)}
});
const taurenMaterials={mane:material(0x36261d,{map:taurenFurMap}),muzzle:material(0xc5a47b,{map:taurenFurMap}),nose:material(0x503b30),hoof:material(0x382e25),horn:material(0xffffff,{map:hornMap}),eye:material(0xc4944e),hide:material(0x68442c,{map:taurenFurMap}),trim:material(0x9a7450),ivory:material(0xc7b28a)};
// Ring profiles form continuous tapered muscle volumes, instead of stacked balls.
function taurenForm(parent,mat,rings,segments=14,power=1){
 const positions=[],uv=[],indices=[];
 for(let j=0;j<rings.length;j++){
  const [y,rx,rz,cz=0,cx=0]=rings[j];
  for(let i=0;i<=segments;i++){const a=i/segments*TAU,s=Math.sin(a),c=Math.cos(a);positions.push(cx+rx*Math.sign(s)*Math.abs(s)**power,y,cz+rz*Math.sign(c)*Math.abs(c)**power);uv.push(i/segments,j/(rings.length-1))}
 }
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1)}
 // End caps keep limbs solid when the camera rotates below them.
 for(const [j,reverse] of [[0,false],[rings.length-1,true]]){
  const [y,,,cz=0,cx=0]=rings[j],center=positions.length/3;positions.push(cx,y,cz);uv.push(.5,j?1:0);
  for(let i=0;i<segments;i++){const a=j*(segments+1)+i;indices.push(center,reverse?a:a+1,reverse?a+1:a)}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return mesh(parent,g,mat);
}
function taurenHorn(parent,sign){
 const curve=new THREE.CatmullRomCurve3(hornPathPoints(THREE,sign));
 const p=[],uv=[],ix=[],steps=15,sides=8,up=new THREE.Vector3(0,0,1);
 for(let i=0;i<=steps;i++){const t=i/steps,point=curve.getPoint(t),tangent=curve.getTangent(t),normal=new THREE.Vector3().crossVectors(tangent,up).normalize(),binormal=new THREE.Vector3().crossVectors(tangent,normal).normalize(),r=hornRadius(t);
  for(let j=0;j<=sides;j++){const a=j/sides*TAU,v=point.clone().addScaledVector(normal,Math.cos(a)*r).addScaledVector(binormal,Math.sin(a)*r);p.push(v.x,v.y,v.z);uv.push(j/sides,t)}
 }
 for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;ix.push(a,a+1,b,b,a+1,b+1)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();mesh(parent,g,taurenMaterials.horn);
}
function makeTauren({fur=0x836144,cloth=M.red,weapon=false,scale=1}={}){
 const T=taurenMaterials,pelt=material(fur,{map:taurenFurMap}),root=group(scene),body=group(root,0,1.4,0),chest=group(body),neck=group(chest,0,1.02,.48),head=group(neck);
 // The shoulder hump rises above the low, forward-set bovine head.
 taurenForm(chest,pelt,[[-.17,.47,.34,.03],[.15,.62,.43,.02],[.53,.89,.55,-.02],[.95,1.02,.6,-.12],[1.26,.87,.54,-.22],[1.49,.56,.39,-.28],[1.58,.2,.14,-.26]]);
 ell(chest,T.mane,0,.99,-.41,.72,.81,.40);
 // Pointed overlapping locks define the mane in profile and from behind.
 for(let row=0;row<4;row++)for(let col=-2;col<=2;col++){const y=.35+row*.28,width=.22+row*.1,x=col*width*.42;const tuft=mesh(chest,G.cone,T.mane,x,y-.07*Math.abs(col),-.69-.08*Math.sin(row*.6),.14+row*.017,.40,.12);tuft.rotation.x=-.15;tuft.rotation.z=Math.PI-col*.10}
 for(const s of [-1,1]){
  ell(chest,pelt,s*.44,.86,.33,.53,.41,.28).rotation.z=-s*.16;
  rod(chest,T.hide,[s*.62,.95,.51],[s*.44,.12,.41],.053,.052);
  for(let i=0;i<3;i++)ell(chest,T.ivory,s*(.6-i*.035),.77-i*.14,.57,.055,.064,.038);
 }
 // Broad brow, sloping forehead, cheekbones and a long square muzzle.
 taurenForm(head,pelt,[[-.44,.27,.23,.20],[-.29,.43,.33,.21],[.03,.5,.39,.1],[.31,.47,.36,.01],[.53,.36,.28,-.06],[.62,.15,.13,-.09]],16,.83);
 ell(head,T.muzzle,0,-.37,.55,.45,.24,.43);
 ell(head,T.muzzle,0,-.16,.64,.48,.24,.42);
 ell(head,T.nose,0,-.11,.94,.40,.135,.15);
 // A fine mouth line and separate lower lip keep the snout readable at play distance.
 rod(head,T.nose,[-.32,-.40,.9],[.32,-.40,.9],.012,.012,6);
 for(const s of [-1,1]){
  ell(head,pelt,s*.39,-.12,.29,.19,.3,.23).rotation.z=-s*.2;
  const ear=group(head,s*.49,.27,-.12);ear.rotation.z=s*.18;
  ell(ear,pelt,s*.23,0,0,.37,.14,.17);ell(ear,T.muzzle,s*.25,.02,.117,.24,.074,.022);
  ell(head,T.mane,s*.25,.16,.388,.178,.103,.049).rotation.z=s*.18;
  ell(head,T.ivory,s*.251,.135,.424,.087,.032,.028);
  ell(head,T.eye,s*.25,.134,.446,.041,.036,.016);ell(head,M.black,s*.247,.134,.459,.016,.03,.01);
  const brow=ell(head,pelt,s*.27,.22,.42,.232,.086,.114);brow.rotation.z=s*.23;
  ell(head,M.black,s*.245,-.095,1.06,.092,.046,.024).rotation.z=-s*.27;
  taurenHorn(head,s);
  // Cheek locks fall into two bead-bound braids, animated independently below.
  for(let i=0;i<3;i++){const lock=mesh(head,G.cone,T.mane,s*(.42-i*.035),-.20-i*.14,.17,.17,.42,.16);lock.rotation.z=Math.PI+s*.2}
 }
 const fringe=mesh(head,G.cone,T.mane,0,.40,.15,.30,.40,.18);fringe.rotation.z=Math.PI;
 const noseRing=mesh(head,new THREE.TorusGeometry(.115,.026,6,14),M.gold,0,-.28,1.067);noseRing.rotation.x=.1;
 const beard=mesh(head,G.cone,T.mane,0,-.65,.44,.24,.58,.23);beard.rotation.z=Math.PI;
 const braids=[];
 for(const s of [-1,1]){const b=group(head,s*.39,-.35,.25);taurenForm(b,T.mane,[[-.55,.065,.067],[-.40,.095,.09],[-.1,.12,.11],[.04,.12,.10]],8);for(let i=0;i<3;i++)ell(b,T.mane,s*(i%2?.025:-.025),-.13-i*.12,0,.12,.095,.1);mesh(b,G.cylinder,M.teal,0,-.43,0,.10,.13,.10);mesh(b,G.cylinder,M.gold,0,-.49,0,.103,.025,.103);braids.push(b)}
 // The plain travelling wraps are the base appearance, not equipped armor.
 mesh(body,G.cylinder,T.hide,0,-.055,.015,.64,.24,.46);box(body,M.gold,0,-.05,.48,.31,.24,.07);box(body,T.hide,0,-.05,.525,.17,.13,.035);
 for(const z of [-.4,.43]){const panel=group(body,0,0,z);panel.rotation.x=z>0?-.07:.07;taurenForm(panel,cloth,[[-.69,.37,.054],[-.53,.42,.055],[-.14,.50,.06]],10,.25);box(panel,T.trim,0,-.24,z>0?.069:-.069,.70,.08,.025);box(panel,T.ivory,0,-.44,z>0?.072:-.072,.065,.37,.025)}
 const arms=[];
 for(const s of [-1,1]){
  const shoulder=group(chest,s*.99,.96,-.035),elbow=group(shoulder,s*.13,-.69,.015),hand=group(elbow,s*.025,-.69,.035);
  ell(shoulder,pelt,s*.10,-.05,0,.48,.46,.47);
  taurenForm(shoulder,pelt,[[-.74,.235,.24,.02,s*.13],[-.53,.33,.33,0,s*.13],[-.29,.39,.37,-.01,s*.06],[.04,.35,.34,0]],12);
  taurenForm(elbow,pelt,[[-.68,.25,.24,.035,s*.025],[-.44,.33,.30,.025],[-.17,.35,.32,.01],[.04,.24,.25]],12);
  mesh(elbow,G.cylinder,T.hide,s*.02,-.56,.03,.28,.23,.265);
  for(const y of [-.66,-.47])mesh(elbow,G.cylinder,T.trim,s*.02,y,.03,.283,.033,.268);
  ell(hand,pelt,0,-.1,.015,.29,.27,.25);
  // Three heavy fingers and an opposed thumb give the hands a recognisable shape.
  for(let i=0;i<3;i++){const x=(i-1)*.15;ell(hand,pelt,x,-.265,.08,.085,.17,.14);ell(hand,T.hoof,x,-.33,.18,.059,.073,.032)}
  ell(hand,pelt,-s*.26,-.085,.18,.13,.18,.13).rotation.z=-s*.35;
  arms.push({shoulder,elbow,hand});
 }
 const legs=[];
 for(const s of [-1,1]){
  const hip=group(root,s*.43,1.4,0),knee=group(hip,0,-.72,0),foot=group(knee,0,-.68,0);
  taurenForm(hip,pelt,[[-.76,.21,.23],[-.48,.32,.32,-.05],[-.13,.38,.36,-.05],[.1,.30,.29]],12);
  taurenForm(knee,pelt,[[-.66,.19,.21,-.01],[-.49,.205,.23,-.075],[-.21,.27,.28,-.09],[.04,.235,.24]],12);
  // Cloven hooves have a real gap and a bevelled toe, with the old IK contact height.
  for(const dx of [-.125,.125]){const toe=taurenForm(foot,T.hoof,[[-.205,.115,.255,.10,dx],[-.17,.12,.28,.105,dx],[.03,.106,.25,.09,dx],[.16,.086,.18,.035,dx]],8,.38);toe.castShadow=true}
  for(let i=0;i<3;i++){const lock=mesh(knee,G.cone,pelt,(i-1)*.12,-.47,.035,.105,.30,.14);lock.rotation.z=Math.PI}
  legs.push({hip,knee,foot,sign:s});
 }
 const tail=group(body,0,.01,-.4);rod(tail,pelt,[0,0,0],[0,-.52,-.32],.085,.055);rod(tail,pelt,[0,-.52,-.32],[0,-.98,-.43],.055,.045);ell(tail,T.mane,0,-1.04,-.43,.15,.28,.15);
  return {root,body,chest,neck,tail,braids,arms,legs,head};
}

  const actor=makeTauren({weapon:false,fur,cloth:clothColor===null?M.red:material(clothColor)});
  // Cosmetic layer follows the old animated joints; NPCs remain lightweight.
  const visualDetails=player?createTaurenVisualDetails(THREE,actor):null;
  return {root:actor.root,body:actor.body,chest:actor.chest,neck:actor.neck,tail:actor.tail,braids:actor.braids,arms:actor.arms,legs:actor.legs,head:actor.head,visualDetails};
}
