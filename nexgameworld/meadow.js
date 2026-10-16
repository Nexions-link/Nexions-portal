// Low-draw-call decoration for NexGame's iPhone-first open world.
// Foliage is visual only and never modifies collisions or gameplay RNG.
export function scatterMeadow({count,seed=1,extent=69,attempts=count*4,accept=()=>true}={}){
 if(!Number.isInteger(count)||count<0||count>20000||
    !Number.isFinite(extent)||extent<=0||
    !Number.isInteger(attempts)||attempts<0||attempts>200000||
    typeof accept!=='function')throw new RangeError('Invalid meadow scatter settings');
 let state=seed>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const points=[];
 for(let i=0;i<attempts&&points.length<count;i++){
  const x=(random()*2-1)*extent,z=(random()*2-1)*extent;
  const angle=random()*Math.PI*2,scale=.55+random()*.85,variety=random();
  if(accept(x,z))points.push({x,z,angle,scale,variety});
 }
 return points;
}
function clumpGeometry(THREE){
 const positions=[],colors=[];
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2,cs=Math.cos(a),sn=Math.sin(a),h=.58+(i%2)*.19,w=.145;
  positions.push(-sn*w,0,cs*w,sn*w,0,-cs*w,cs*.12,h,sn*.12);
  colors.push(.55,.74,.43,.55,.74,.43,1,.98,.77);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeVertexNormals();return geometry;
}
function blossomGeometry(THREE,hex){
 const stem=new THREE.Color(0x6a8b48),leaf=new THREE.Color(0x93ae62);
 const petal=new THREE.Color(hex),core=new THREE.Color(0xffd37b);
 const positions=[],colors=[];
 const tri=(a,b,c,ca,cb,cc)=>{
  positions.push(...a,...b,...c);
  for(const color of [ca,cb,cc])colors.push(color.r,color.g,color.b);
 };
 for(const a of [0,Math.PI/2]){
  const x=Math.cos(a)*.045,z=Math.sin(a)*.045;
  tri([-x,0,-z],[x,0,z],[0,.57,0],stem,stem,leaf);
 }
 for(let i=0;i<5;i++){
  const a=i*Math.PI*2/5,cs=Math.cos(a),sn=Math.sin(a);
  const sideX=-sn*.12,sideZ=cs*.12;
  const tip=[cs*.26,.63,sn*.26];
  const left=[cs*.09+sideX,.57,sn*.09+sideZ];
  const right=[cs*.09-sideX,.57,sn*.09-sideZ];
  tri([0,.55,0],left,tip,core,petal,petal);
  tri([0,.55,0],tip,right,core,petal,petal);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeVertexNormals();return geometry;
}
export function createMeadowDecorations(THREE,{scene,heightAt,clearAt,onPath,interiorZones,isInsideRect,isNearLake=()=>false}){
 const allowed=(x,z,margin=.22,campRadius=10)=>clearAt(x,z,margin)&&!onPath(x,z)&&
  !interiorZones.some(zone=>isInsideRect(x,z,zone,2))&&
  Math.hypot(x+5,z-4)>campRadius&&!isNearLake(x,z);
 const dummy=new THREE.Object3D();
 const grassPoints=scatterMeadow({count:2100,attempts:6200,seed:17031,extent:69,
  accept:(x,z)=>allowed(x,z,.16,8)});
 const grass=new THREE.InstancedMesh(clumpGeometry(THREE),new THREE.MeshStandardMaterial({
  color:0xffffff,roughness:1,side:THREE.DoubleSide,vertexColors:true
 }),grassPoints.length);
 for(let i=0;i<grassPoints.length;i++){
  const p=grassPoints[i];
  dummy.position.set(p.x,heightAt(p.x,p.z),p.z);
  dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(.55+p.scale*.58);dummy.updateMatrix();
  grass.setMatrixAt(i,dummy.matrix);
  grass.setColorAt(i,new THREE.Color().setHSL(.19+p.variety*.055,.35,.43+p.variety*.14));
 }
 grass.count=grassPoints.length;grass.instanceMatrix.needsUpdate=true;
 grass.castShadow=false;grass.receiveShadow=false;scene.add(grass);
 const flowerPoints=scatterMeadow({count:330,attempts:3100,seed:69241,extent:65,
  accept:(x,z)=>allowed(x,z,.4,13)&&
   Math.sin(x*.23+z*.075)*Math.cos(z*.21-x*.12)>.05});
 const flowers=[];
 for(let variant=0;variant<3;variant++){
  const rows=flowerPoints.filter((_,i)=>i%3===variant);
  const flower=new THREE.InstancedMesh(blossomGeometry(THREE,[0xf7d879,0xd5b2ee,0xf7eee0][variant]),
   new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}),rows.length);
  for(let i=0;i<rows.length;i++){
   const p=rows[i];dummy.position.set(p.x,heightAt(p.x,p.z)+.012,p.z);
   dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(.7+p.scale*.5);
   dummy.updateMatrix();flower.setMatrixAt(i,dummy.matrix);
  }
  flower.count=rows.length;flower.instanceMatrix.needsUpdate=true;
  flower.castShadow=false;flower.receiveShadow=false;scene.add(flower);flowers.push(flower);
 }
 const shrubPoints=scatterMeadow({count:125,attempts:1600,seed:83649,extent:66,
  accept:(x,z)=>allowed(x,z,.8,19)&&Math.sin(x*.17-z*.19)>.1});
 const shrubs=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),
  new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,flatShading:true}),shrubPoints.length);
 for(let i=0;i<shrubPoints.length;i++){
  const p=shrubPoints[i];
  dummy.position.set(p.x,heightAt(p.x,p.z)+.31*p.scale,p.z);
  dummy.rotation.set(0,p.angle,0);dummy.scale.set(.54*p.scale,.34*p.scale,.48*p.scale);
  dummy.updateMatrix();shrubs.setMatrixAt(i,dummy.matrix);
  shrubs.setColorAt(i,new THREE.Color().setHSL(.21+p.variety*.055,.28,.33+p.variety*.1));
 }
 shrubs.count=shrubPoints.length;shrubs.instanceMatrix.needsUpdate=true;
 shrubs.castShadow=false;shrubs.receiveShadow=false;scene.add(shrubs);
 const applyDensity=preset=>{
  const fraction=(key)=>Math.max(0,Math.min(1,Number(preset[key])||0));
  grass.count=Math.floor(grassPoints.length*fraction('grass'));
  flowers.forEach(f=>f.count=Math.floor(f.instanceMatrix.count*fraction('flowers')));
  shrubs.count=Math.floor(shrubPoints.length*fraction('shrubs'));
 };
 return {grass,flowers,shrubs,applyDensity,counts:{grass:grassPoints.length,flowers:flowerPoints.length,shrubs:shrubPoints.length}};
}
