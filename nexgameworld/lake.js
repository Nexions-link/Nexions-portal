// NexGame lake terrain + rendering. The layout and fishing hooks are intentionally
// independent from movement/renderer, so a later swimming skill can reuse them.
const clamp01=v=>Math.max(0,Math.min(1,v));
const smooth01=v=>{const t=clamp01(v);return t*t*(3-2*t)};
export const LAKE_BLUEPRINT=Object.freeze({
 id:'stillwater-lake',name:'Озеро Тихих Вод',type:'fishableWater',
 x:30,z:26,radiusX:17.2,radiusZ:12.5,maxDepth:10.5,
 maxWadeDepth:1.12,fishable:true,swimmingEnabled:false,
 fishing:Object.freeze({minBankRadius:.89,maxBankRadius:1.19,minCastDepth:1.5,maxCastDistance:12})
});
export function createLake(naturalCentreY,blueprint=LAKE_BLUEPRINT){
 if(!Number.isFinite(naturalCentreY))throw new TypeError('Lake elevation must be finite');
 return Object.freeze({...blueprint,surfaceY:naturalCentreY+.22});
}
export function shoreVariation(angle){
 return 1+.041*Math.sin(3*angle+.5)+.026*Math.cos(5*angle-1.2)+.014*Math.sin(9*angle+.3);
}
export function normalizedLakeRadius(x,z,lake){
 const dx=(x-lake.x)/lake.radiusX,dz=(z-lake.z)/lake.radiusZ;
 return Math.hypot(dx,dz)/shoreVariation(Math.atan2(dz,dx));
}
export function lakePointAt(angle,radius,lake){
 const stretch=shoreVariation(angle)*radius;
 return {x:lake.x+Math.cos(angle)*lake.radiusX*stretch,
  z:lake.z+Math.sin(angle)*lake.radiusZ*stretch};
}
export function lakeTerrainHeight(x,z,natural,lake){
 const r=normalizedLakeRadius(x,z,lake);
 if(r>=1.24)return natural;
 if(r<=1){
  // Walkable sand lip at r=1; several Tauren-heights of depth at the centre.
  return lake.surfaceY+.26-(lake.maxDepth+.26)*smooth01(1-r);
 }
 const bank=lake.surfaceY+.26+.17*Math.sin(Math.PI*(r-1)/.24);
 return bank+(natural-bank)*smooth01((r-1.025)/.215);
}
export function lakeWaterDepth(x,z,lake){
 if(normalizedLakeRadius(x,z,lake)>=1)return 0;
 return Math.max(0,lake.surfaceY-lakeTerrainHeight(x,z,lake.surfaceY,lake));
}
export function canWadeAt(x,z,lake){
 return lakeWaterDepth(x,z,lake)<=lake.maxWadeDepth;
}
export function lakeDryShorePoint(x,z,lake,radial=1.15){
 const angle=Math.atan2((z-lake.z)/lake.radiusZ,(x-lake.x)/lake.radiusX);
 return lakePointAt(angle,radial,lake);
}
// Pure data hook for future Fishing spellbook ability; no bite/loot yet.
export function fishingCastPoint(x,z,lake){
 const r=normalizedLakeRadius(x,z,lake),rules=lake.fishing;
 if(!lake.fishable||r<rules.minBankRadius||r>rules.maxBankRadius||!canWadeAt(x,z,lake))return null;
 const angle=Math.atan2((z-lake.z)/lake.radiusZ,(x-lake.x)/lake.radiusX);
 for(const castRadius of [.68,.59,.49]){
  const p=lakePointAt(angle,castRadius,lake);
  if(Math.hypot(p.x-x,p.z-z)<=rules.maxCastDistance&&lakeWaterDepth(p.x,p.z,lake)>=rules.minCastDepth)
   return {x:p.x,y:lake.surfaceY,z:p.z,waterId:lake.id};
 }
 return null;
}
function meshRing(THREE,lake,{inner,outer,segments=96,steps=7,heightAt,vertexColor}){
 const positions=[],colors=[],indices=[],uvs=[];
 for(let ring=0;ring<=steps;ring++){
  const r=inner+(outer-inner)*ring/steps;
  for(let i=0;i<=segments;i++){
   const angle=i/segments*Math.PI*2,p=lakePointAt(angle,r,lake);
   positions.push(p.x,heightAt(p.x,p.z,r,angle),p.z);
   const color=new THREE.Color(vertexColor(r,angle));
   colors.push(color.r,color.g,color.b);
   uvs.push((p.x-lake.x)/lake.radiusX*.5+.5,(p.z-lake.z)/lake.radiusZ*.5+.5);
  }
 }
 for(let j=0;j<steps;j++)for(let i=0;i<segments;i++){
  const a=j*(segments+1)+i,b=a+segments+1;
  indices.push(a,b,a+1,b,b+1,a+1);
 }
 const geo=new THREE.BufferGeometry();
 geo.setIndex(indices);
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geo.computeVertexNormals();
 return geo;
}
function glintTexture(THREE){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const c=canvas.getContext('2d');
 c.clearRect(0,0,256,256);
 // Sparse, hand-painted arc highlights; tiny tiled map scrolls instead of
 // expensive fluid simulation or water reflection render targets.
 for(let i=0;i<65;i++){
  const x=(i*83+27)%256,y=(i*137+43)%256;
  c.beginPath();c.ellipse(x,y,5+(i%7)*2,1.3+(i%3)*.3,-.13,Math.PI*.12,Math.PI*.85);
  c.strokeStyle=i%3===0?'rgba(255,255,228,.24)':'rgba(240,255,247,.16)';
  c.lineWidth=.7+(i%3)*.3;c.stroke();
 }
 const tex=new THREE.CanvasTexture(canvas);
 tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(5,3);
 tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
export function createLakeVisuals(THREE,{scene,lake,heightAt,onPath}){
 // Contoured sand/gravel banks are geometry that follows the carved terrain.
 const shore=meshRing(THREE,lake,{
  inner:.91,outer:1.20,steps:5,heightAt:(x,z)=>heightAt(x,z)+.045,
  vertexColor:r=>r<.96?0xa39b76:r<1.04?0xb6ad83:r<1.13?0xb4a77b:0x898e6c
 });
 const shoreMesh=new THREE.Mesh(shore,new THREE.MeshStandardMaterial({
  color:0xffffff,vertexColors:true,roughness:1,side:THREE.DoubleSide
 }));
 shoreMesh.castShadow=false;shoreMesh.receiveShadow=true;scene.add(shoreMesh);
 const surface=meshRing(THREE,lake,{
  inner:0,outer:.99,steps:12,heightAt:()=>lake.surfaceY+.018,
  vertexColor:r=>r<.45?0x397b90:r<.78?0x52949c:0x7bb8ae
 });
 const water=new THREE.Mesh(surface,new THREE.MeshPhongMaterial({
  color:0xffffff,vertexColors:true,specular:0xaac8c7,
  shininess:64,transparent:true,opacity:.84,depthWrite:false,
  side:THREE.DoubleSide
 }));
 water.castShadow=false;water.receiveShadow=false;water.renderOrder=2;scene.add(water);
 const rippleTexture=glintTexture(THREE);
 const shimmer=new THREE.Mesh(surface,new THREE.MeshBasicMaterial({
  map:rippleTexture,transparent:true,opacity:.34,depthWrite:false,
  side:THREE.DoubleSide,blending:THREE.AdditiveBlending
 }));
 shimmer.position.y=.035;shimmer.renderOrder=3;scene.add(shimmer);
 // One draw call for clustered reeds around the shoreline.
 const reeds=new THREE.InstancedMesh(new THREE.CylinderGeometry(.026,.052,1,5),
  new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}),210);
 const dummy=new THREE.Object3D();let n=0;
 for(let i=0;i<70;i++){
  const angle=i/70*Math.PI*2,r=1.035+.05*Math.sin(i*8.7);
  const p=lakePointAt(angle,r,lake);
  if(onPath(p.x,p.z))continue;
  for(let j=0;j<3;j++){
   const q=lakePointAt(angle+(j-1)*.004,r+(j-1)*.012,lake),h=.8+((i*7+j*13)%9)*.11;
   dummy.position.set(q.x,heightAt(q.x,q.z)+h/2,q.z);
   dummy.rotation.set((j-1)*.12,angle+(j-1)*.13,0);
   dummy.scale.set(.7+(j%2)*.25,h,.7);dummy.updateMatrix();
   reeds.setMatrixAt(n,dummy.matrix);
   reeds.setColorAt(n,new THREE.Color().setHSL(.18+(i%7)*.009,.32,.3+(j%3)*.07));
   n++;
  }
 }
 reeds.count=n;reeds.instanceMatrix.needsUpdate=true;
 reeds.castShadow=false;reeds.receiveShadow=false;scene.add(reeds);
 return {
  lake,water,shore:shoreMesh,shimmer,reeds,
  update:(seconds)=>{rippleTexture.offset.set(seconds*.006,seconds*.003)}
 };
}
