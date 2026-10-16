import {ITEM_CATALOG,MERCHANT_STOCK,GEAR_LOOT,LOOT_CHANCES,rollEquipmentLoot,itemStackLimit,deriveStats,armorReduction} from './items.js?v=0.3.3';
// NexGame 3D · Alpha 0.3.3 — a small, procedural Mulgore-inspired starting zone.
const $=id=>document.getElementById(id);
let THREE;
try{THREE=await import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js')}
catch(error){$('loadText').textContent='Не удалось загрузить 3D-движок. Проверь соединение и обнови страницу.';throw error}
try{
const clamp=THREE.MathUtils.clamp,TAU=Math.PI*2;
const settingsKey='nexgame-settings-v1';
const graphicsPresets={
 economy:{pixelRatio:1,shadows:false,shadowSize:512,grass:.5},
 balanced:{pixelRatio:1.5,shadows:true,shadowSize:1024,grass:1},
 high:{pixelRatio:2,shadows:true,shadowSize:2048,grass:1}
};
const qualityDescriptions={
 economy:'Меньше нагрузки: ниже чёткость, меньше травы, только мягкие тени под персонажами.',
 balanced:'Баланс чёткости, динамических теней и нагрузки.',
 high:'Более чёткое изображение и детальные динамические тени. Нагрузка выше.'
};
const settings={quality:'balanced',showFps:false,cameraPitch:.29};
try{const saved=JSON.parse(localStorage.getItem(settingsKey));if(saved&&typeof saved==='object'){
 if(typeof saved.quality==='string'&&Object.hasOwn(graphicsPresets,saved.quality))settings.quality=saved.quality;
 if(typeof saved.showFps==='boolean')settings.showFps=saved.showFps;
 if(Number.isFinite(saved.cameraPitch))settings.cameraPitch=clamp(saved.cameraPitch,.1,1.05);
}}catch(e){}
const saveSettings=()=>{try{localStorage.setItem(settingsKey,JSON.stringify(settings))}catch(e){}};
const wrapYaw=yaw=>Math.atan2(Math.sin(yaw),Math.cos(yaw));
const scene=new THREE.Scene();scene.background=new THREE.Color(0xaac9cd);scene.fog=new THREE.Fog(0xc1cbb0,65,166);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.09,230);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'default'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,graphicsPresets[settings.quality].pixelRatio));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=graphicsPresets[settings.quality].shadows;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
$('scene').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe9ebc9,0x65502e,2.1));
const sun=new THREE.DirectionalLight(0xffe4ad,2.8);sun.position.set(-30,48,22);sun.castShadow=true;
sun.shadow.mapSize.setScalar(graphicsPresets[settings.quality].shadowSize);Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:110});sun.shadow.bias=-.0004;sun.shadow.normalBias=.045;
scene.add(sun,sun.target);
let seed=531;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
function heightAt(x,z){const flat=smooth(10,29,Math.hypot(x+5,z-4));return flat*(Math.sin(x*.055)*Math.cos(z*.067)*1.65+Math.sin(z*.13+x*.047)*.6)}
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:1,metalness:0,...extra});
function texture(draw,size=128){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const grain=texture((ctx,s)=>{ctx.fillStyle='#b2b993';ctx.fillRect(0,0,s,s);for(let i=0;i<2200;i++){ctx.fillStyle=rand()>.5?'#bfc69b55':'#62744130';ctx.fillRect(rand()*s,rand()*s,1+rand()*3,1+rand()*3)}});grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(58,58);
const hide=texture((c,s)=>{c.fillStyle='#dbc39a';c.fillRect(0,0,s,s);for(let i=0;i<900;i++){c.fillStyle=rand()>.5?'#fff0ca18':'#53392313';c.fillRect(rand()*s,rand()*s,rand()*12,1)}c.strokeStyle='#6d3d2b';c.lineWidth=9;c.beginPath();for(let x=0;x<=s;x+=16){c.lineTo(x,40+(x%32?13:-13))}c.stroke();c.fillStyle='#ac5938';c.fillRect(0,54,s,12);c.fillStyle='#346c66';c.fillRect(0,74,s,6);c.fillStyle='#795034';c.fillRect(0,s-7,s,7)});hide.wrapS=THREE.RepeatWrapping;hide.repeat.set(3,1);
const M={grass:material(0x90a357,{map:grain,vertexColors:true}),dirt:material(0xa08c51),wood:material(0x5b3d24),woodLight:material(0x916139),hide:material(0xe0c899,{map:hide,side:THREE.DoubleSide}),hideDark:material(0x9b7449),red:material(0x9a4931),teal:material(0x427b70),gold:material(0xd7ae5e),bone:material(0xe5d5aa),rock:material(0x8a7250),rockLight:material(0xaa926c),rockDark:material(0x6e593c),leaf:material(0x718746),leafLight:material(0x98a253),black:material(0x231f19),metal:material(0x9caaa2,{roughness:.65,metalness:.2}),water:material(0x547d77,{roughness:.38,transparent:true,opacity:.85})};
const G={sphere:new THREE.SphereGeometry(1,12,9),box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,10),cone:new THREE.ConeGeometry(1,1,9),rock:new THREE.DodecahedronGeometry(1,0)};
function group(parent,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g}
function mesh(parent,geometry,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1,cast=true){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m}
const ell=(p,m,x,y,z,sx,sy,sz,cast=true)=>mesh(p,G.sphere,m,x,y,z,sx,sy,sz,cast);
const box=(p,m,x,y,z,sx,sy,sz,cast=true)=>mesh(p,G.box,m,x,y,z,sx,sy,sz,cast);
function rod(p,m,a,b,r=.08,r2=r,segments=7){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const obj=mesh(p,new THREE.CylinderGeometry(r2,r,d.length(),segments),m,...av.clone().add(bv).multiplyScalar(.5).toArray());obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return obj}
// Bake rigid pieces into one draw per material. Joint groups remain separate and animated.
function fuse(root,all=false){root.updateMatrixWorld(true);const list=[];if(all)root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)list.push(o)});else{for(const child of [...root.children])if(child.isGroup)fuse(child);for(const child of root.children)if(child.isMesh)list.push(child)}
 const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),batches=new Map();
 for(const m of list){if(Array.isArray(m.material))continue;const key=m.material.uuid+'-'+m.castShadow;let b=batches.get(key);if(!b){b={mat:m.material,cast:m.castShadow,p:[],n:[],uv:[]};batches.set(key,b)}
 const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(all?new THREE.Matrix4().multiplyMatrices(inv,m.matrixWorld):m.matrix);
 const pos=geo.attributes.position,norm=geo.attributes.normal,uv=geo.attributes.uv;for(let i=0;i<pos.count;i++){b.p.push(pos.getX(i),pos.getY(i),pos.getZ(i));b.n.push(norm.getX(i),norm.getY(i),norm.getZ(i));b.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0)}geo.dispose();m.removeFromParent();
 }
 for(const b of batches.values()){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));mesh(root,geo,b.mat,0,0,0,1,1,1,b.cast)}
}
const world=group(scene),colliders=[],cameraBlockers=[],mapLandmarks=[];
function obstacle(x,z,r,height=5){colliders.push({x,z,r,height})}
function clearAt(x,z,r=.58){if(Math.abs(x)>69||Math.abs(z)>69)return false;for(const o of colliders)if((x-o.x)**2+(z-o.z)**2<(r+o.r)**2)return false;return true}
const terrainGeo=new THREE.PlaneGeometry(190,190,120,120);terrainGeo.rotateX(-Math.PI/2);
const tp=terrainGeo.attributes.position,colors=[];const ca=new THREE.Color(0x789044),cb=new THREE.Color(0xb1b76a),cc=new THREE.Color();
for(let i=0;i<tp.count;i++){const x=tp.getX(i),z=tp.getZ(i);tp.setY(i,heightAt(x,z));cc.copy(ca).lerp(cb,.5+.24*Math.sin(x*.075+z*.04)+.13*Math.sin(x*.38-z*.22));colors.push(cc.r,cc.g,cc.b)}terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrainGeo.computeVertexNormals();mesh(scene,terrainGeo,M.grass,0,0,0,1,1,1,false);
const routes=[[[0,9],[-2,0],[-5,-12],[-8,-26],[-18,-42]],[[0,3],[13,5],[25,2],[38,-9]],[[0,9],[1,24],[12,37],[32,43]]];
const SCOUT_X=12,SCOUT_Z=37,BOSS_X=39,BOSS_Z=47;
const bossWaypoints=[[0,9],[1,24],[12,37],[32,43],[BOSS_X,BOSS_Z]];
// Crimson dashes mark the final hunting route in both the 3D world and map.
const bossGuide=new THREE.InstancedMesh(new THREE.BoxGeometry(.3,.05,1.0),
 new THREE.MeshBasicMaterial({color:0xd43835,transparent:true,opacity:.92,depthWrite:false}),80);
bossGuide.castShadow=false;bossGuide.receiveShadow=false;bossGuide.frustumCulled=false;
const dashDummy=new THREE.Object3D();let guideCount=0;
for(let step=0;step<bossWaypoints.length-1;step++){
 const [ax,az]=bossWaypoints[step],[bx,bz]=bossWaypoints[step+1];
 const dx=bx-ax,dz=bz-az,dist=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);
 for(let d=.8;d<dist-.2;d+=2.15){
  const x=ax+dx*d/dist,z=az+dz*d/dist;
  dashDummy.position.set(x,heightAt(x,z)+.14,z);
  dashDummy.rotation.set(0,yaw,0);dashDummy.updateMatrix();
  bossGuide.setMatrixAt(guideCount++,dashDummy.matrix);
 }
}
bossGuide.count=guideCount;bossGuide.instanceMatrix.needsUpdate=true;
bossGuide.visible=false;scene.add(bossGuide);
const pathSegments=[];
function path(points,width){for(let k=0;k<points.length-1;k++){const [ax,az]=points[k],[bx,bz]=points[k+1];pathSegments.push({ax,az,bx,bz,width});const length=Math.hypot(bx-ax,bz-az),nx=-(bz-az)/length*width/2,nz=(bx-ax)/length*width/2,steps=Math.ceil(length),p=[],uv=[];for(let i=0;i<steps;i++){const coords=[];for(const t of [i/steps,(i+1)/steps])for(const side of [-1,1]){const x=ax+(bx-ax)*t+nx*side,z=az+(bz-az)*t+nz*side;coords.push([x,heightAt(x,z)+.032,z])}for(const id of [0,1,2,1,3,2]){p.push(...coords[id]);uv.push(0,0)}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();mesh(world,geo,M.dirt,0,0,0,1,1,1,false)}}
routes.forEach(r=>path(r,3.5));
function onPath(x,z){return pathSegments.some(s=>{const dx=s.bx-s.ax,dz=s.bz-s.az,t=clamp(((x-s.ax)*dx+(z-s.az)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-s.ax-dx*t,z-s.az-dz*t)<s.width*.6})}
// Sandstone mesas and a grassy upper rim enclose the playable valley.
for(let i=0;i<25;i++){const angle=i/25*TAU,rr=104+rand()*10,x=Math.sin(angle)*rr,z=Math.cos(angle)*rr,h=12+rand()*18,r=8+rand()*8,y=heightAt(x,z);const base=mesh(world,new THREE.CylinderGeometry(r*.8,r,h,8),i%3?M.rock:M.rockDark,x,y+h/2-2,z);base.rotation.y=rand();cameraBlockers.push(base);mesh(world,new THREE.CylinderGeometry(r*.82,r*.85,2.3,8),M.rockLight,x,y+h-2.8,z);mesh(world,new THREE.CylinderGeometry(r*.76,r*.82,1.3,8),M.leaf,x,y+h-1,z);}
function tent(x,z,r=4,rotation=0){const g=group(world,x,heightAt(x,z),z);g.rotation.y=rotation;const roof=mesh(g,new THREE.ConeGeometry(r,r*1.42,14,1,true),M.hide,0,r*.71,0);cameraBlockers.push(roof);mesh(g,new THREE.CylinderGeometry(r,r,.5,14,1,true),M.hideDark,0,.25,0);for(let i=0;i<9;i++){const a=i/9*TAU;rod(g,M.wood,[Math.sin(a)*r*.99,0,Math.cos(a)*r*.99],[Math.sin(a)*.25,r*1.64,Math.cos(a)*.25],.07,.055)}
 const door=mesh(g,new THREE.PlaneGeometry(r*.49,r*.65),M.black,0,r*.33,r*.72);door.rotation.x=-.53;box(g,M.red,0,r*.66,r*.55,r*.65,.12,.12);for(const s of [-1,1])rod(g,M.wood,[s*r*.29,.04,r*.98],[s*r*.2,r*.66,r*.55],.07);
 obstacle(x,z,r*.87,r*1.5);mapLandmarks.push({x,z,r,color:'#cbb17a'});return g}
tent(-12,-5,5,.5);tent(11,-7,4.2,-.5);tent(-15,12,3.8,2.2);tent(13,16,3.4,-1.7);tent(-23,-15,3,.5);
function totem(x,z,scale=1){const g=group(world,x,heightAt(x,z),z);g.scale.setScalar(scale);mesh(g,new THREE.CylinderGeometry(.48,.65,4.8,8),M.woodLight,0,2.4,0);for(let i=0;i<3;i++){const y=.9+i*1.25;mesh(g,new THREE.CylinderGeometry(.52,.53,.26,8),i%2?M.teal:M.red,0,y,0);box(g,M.bone,0,y+.43,.5,.67,.38,.13);for(const s of [-1,1])box(g,M.black,s*.2,y+.5,.58,.11,.09,.035);box(g,M.red,0,y+.28,.6,.14,.21,.15)}const wings=group(g,0,4.3,0);for(const s of [-1,1]){const w=box(wings,M.teal,s*1.15,0,0,2,.38,.3);w.rotation.z=s*.15;for(let i=0;i<4;i++){const f=box(wings,i%2?M.red:M.bone,s*(.65+i*.38),-.22,0,.18,.63,.16);f.rotation.z=s*.18}}ell(g,M.bone,0,5,0,.55,.43,.45);obstacle(x,z,.75*scale,5*scale);mapLandmarks.push({x,z,r:.8,color:'#73b9ae'});return g}
totem(-3,-5,1);totem(5,9,.75);totem(-5,25,.8);totem(35,-14,1.25);
function banner(x,z,angle){const g=group(world,x,heightAt(x,z),z);g.rotation.y=angle;rod(g,M.wood,[-1,0,0],[-1,4.6,0],.09);rod(g,M.wood,[1,0,0],[1,4.6,0],.09);rod(g,M.wood,[-1.25,4.3,0],[1.25,4.3,0],.09);mesh(g,new THREE.PlaneGeometry(1.85,2.1),M.hide,0,3.15,0);obstacle(x-1,z,.15);obstacle(x+1,z,.15)}
banner(-4,19,.2);banner(5,-14,-.1);
// Camp hearth. Only two flame meshes animate; there is no particle simulation.
const hearth=group(world,-6,heightAt(-6,7),7);for(let i=0;i<9;i++){const a=i/9*TAU;ell(hearth,M.rock,Math.sin(a)*1.15,.19,Math.cos(a)*1.15,.34,.23,.29)}for(let i=0;i<3;i++){const log=mesh(hearth,G.cylinder,M.wood,0,.25,0,.18,1.9,.18);log.rotation.z=Math.PI/2;log.rotation.y=i*Math.PI/3}obstacle(-6,7,1.05,1.3);
const fire=group(scene,-6,heightAt(-6,7)+.25,7);const flameM=new THREE.MeshBasicMaterial({color:0xf6a044,transparent:true,opacity:.85});mesh(fire,G.cone,flameM,0,.47,0,.55,1.3,.55,false);mesh(fire,G.cone,new THREE.MeshBasicMaterial({color:0xffda79}),0,.3,.04,.28,.85,.3,false);
for(let i=0;i<38;i++){const x=(rand()-.5)*136,z=(rand()-.5)*136;if(Math.hypot(x,z)<23||onPath(x,z)||!clearAt(x,z,3))continue;const size=.8+rand()*1.8;mesh(world,G.rock,i%2?M.rock:M.rockLight,x,heightAt(x,z)+size*.34,z,size,size*.7,size*.9);obstacle(x,z,size*.7,size)}
function tree(x,z,scale){const y=heightAt(x,z),g=group(world,x,y,z);g.scale.setScalar(scale);rod(g,M.wood,[0,0,0],[.2,4.2,0],.33,.15);for(const s of [-1,1])rod(g,M.wood,[0,2,0],[s*1.6,4.8,.2],.18,.07);ell(g,M.leaf,-1.4,4.8,0,2.4,.9,1.75);ell(g,M.leafLight,1.4,5,.2,2.1,.95,1.6);ell(g,M.leaf,0,5.65,0,2.5,.85,1.8);obstacle(x,z,.4*scale,5*scale)}
for(const [x,z,s] of [[-26,21,1.2],[25,22,1],[34,-26,.95],[-34,-30,1.15],[9,49,1.2],[-39,40,1.1],[46,31,1.3],[50,-8,.8],[-47,-7,1.1]])tree(x,z,s);
const pond=mesh(world,new THREE.CircleGeometry(6,36),M.water,26,heightAt(26,29)+.05,29,1,1,1,false);pond.rotation.x=-Math.PI/2;pond.scale.set(1.4,.72,1);
// Shallow water is traversable: actors follow the terrain beneath its surface.
// Sparse, instanced grass keeps the large meadow inexpensive on phones.
const grassGeo=new THREE.BufferGeometry();grassGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.18,0,0,.03,.7,.03,.16,0,0,0,0,-.17,.04,.52,0,0,0,.18],3));grassGeo.computeVertexNormals();
const grass=new THREE.InstancedMesh(grassGeo,material(0x718643,{side:THREE.DoubleSide}),1100),dummy=new THREE.Object3D();let grassCount=0;
for(let i=0;i<1900&&grassCount<1100;i++){const x=(rand()-.5)*139,z=(rand()-.5)*139;if(!clearAt(x,z,.15)||onPath(x,z)||Math.hypot(x+5,z-4)<8)continue;dummy.position.set(x,heightAt(x,z),z);dummy.rotation.y=rand()*TAU;dummy.scale.setScalar(.45+rand()*.75);dummy.updateMatrix();grass.setMatrixAt(grassCount,dummy.matrix);grass.setColorAt(grassCount,new THREE.Color().setHSL(.17+rand()*.055,.35,.31+rand()*.14));grassCount++}grass.count=grassCount;grass.instanceMatrix.needsUpdate=true;scene.add(grass);
fuse(world,true);
// Soft contact shadows stay directly on the terrain underneath each actor.
const shadowTexture=texture((c,s)=>{const grad=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);grad.addColorStop(0,'rgba(22,22,10,.48)');grad.addColorStop(.4,'rgba(22,22,10,.24)');grad.addColorStop(1,'rgba(22,22,10,0)');c.fillStyle=grad;c.fillRect(0,0,s,s)},64);
const shadowMat=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false});
function contactShadow(size){const m=mesh(scene,new THREE.PlaneGeometry(size,size),shadowMat,0,.04,0,1,1,1,false);m.rotation.x=-Math.PI/2;return m}
// Shared, small painted maps: every Tauren and the inspection view reuse them.
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
 const curve=new THREE.CatmullRomCurve3([[.43,.40,-.08],[.78,.43,-.18],[1.04,.63,-.22],[1.15,.97,-.13],[1.05,1.27,.04]].map(([x,y,z])=>new THREE.Vector3(x*sign,y,z)));
 const p=[],uv=[],ix=[],steps=15,sides=8,up=new THREE.Vector3(0,0,1);
 for(let i=0;i<=steps;i++){const t=i/steps,point=curve.getPoint(t),tangent=curve.getTangent(t),normal=new THREE.Vector3().crossVectors(tangent,up).normalize(),binormal=new THREE.Vector3().crossVectors(tangent,normal).normalize(),r=.205*(1-t)**.83+.003;
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
 if(weapon){
  const axe=group(arms[1].hand,0,-.13,.11);axe.name='gear-axe';axe.rotation.z=-.08;
  rod(axe,M.wood,[0,-.72,0],[0,.95,0],.068,.060);
  for(const y of [-.5,-.36,-.22,.76])mesh(axe,G.cylinder,T.hide,0,y,0,.077,.09,.077);
  const blade=new THREE.Shape();blade.moveTo(-.07,.84);blade.lineTo(.26,1.02);blade.quadraticCurveTo(.76,.98,.67,.49);blade.lineTo(.24,.35);blade.lineTo(.19,.54);blade.lineTo(-.07,.54);blade.closePath();
  mesh(axe,new THREE.ExtrudeGeometry(blade,{depth:.1,bevelEnabled:true,bevelSize:.022,bevelThickness:.014,bevelSegments:1,steps:1}),M.metal,0,0,-.05);
  rod(axe,T.ivory,[.65,.50,.01],[.65,.79,.01],.018,.018);ell(axe,M.gold,0,.69,0,.12,.15,.11);
  for(const kind of ['sword','dagger']){
   const g=group(arms[1].hand,0,-.12,.12);g.name='gear-'+kind;
   rod(g,M.wood,[0,-.23,0],[0,.21,0],.067);box(g,M.metal,0,.25,0,.43,.07,.12);
   const length=kind==='sword'?1.12:.62;box(g,M.metal,0,.29+length/2,0,.16,length,.065);
   const tip=mesh(g,G.cone,M.metal,0,.29+length+.09,0,.115,.22,.055);tip.rotation.y=Math.PI/4;g.visible=false;
  }
  const shield=group(arms[0].hand,-.12,-.02,.34);shield.name='gear-shield';
  const disk=mesh(shield,new THREE.CylinderGeometry(.56,.56,.11,12),M.woodLight);disk.rotation.x=Math.PI/2;
  mesh(shield,new THREE.TorusGeometry(.53,.04,5,16),M.metal,0,0,.075);
  ell(shield,M.metal,0,0,.09,.16,.16,.08);
  for(const x of [-.22,0,.22])box(shield,M.wood,x,0,.066,.018,.92,.013);
  shield.visible=false;
 }
 root.scale.setScalar(scale);fuse(root);const shadow=contactShadow(2.7*scale);
 return{root,body,chest,neck,head,arms,legs,tail,braids,shadow,phase:0,scale,walk:0};
}
const hero=makeTauren({weapon:true});
const mentor=makeTauren({fur:0x725438,cloth:M.teal,scale:.95});mentor.root.position.set(-1.5,heightAt(-1.5,-5),-5);mentor.root.rotation.y=.2;
const trader=makeTauren({fur:0x978064,cloth:M.hideDark,scale:.89});trader.root.position.set(8,heightAt(8,1),1);trader.root.rotation.y=-.7;
const armorer=makeTauren({fur:0x665043,cloth:M.woodLight,scale:.94});armorer.root.position.set(6,heightAt(6,11),11);armorer.root.rotation.y=-1.2;
const npcs=[{x:6,z:11,name:'Борун Крепкая Ладонь',actor:armorer,type:'armorer'},{x:-1.5,z:-5,name:'Наставник Каменный Рог',actor:mentor,type:'mentor'},{x:8,z:1,name:'Травница Тихая Заря',actor:trader,type:'trader'}];
// Friendly NPCs are interaction targets, not physical obstacles.
function spriteText(text,color='#f9df91',size=32){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+size+'px Georgia';ctx.lineWidth=5;ctx.strokeStyle='#302817';ctx.fillStyle=color;ctx.strokeText(text,256,48);ctx.fillText(text,256,48);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthWrite:false,transparent:true}));s.scale.set(4.3,.81,1);return s}
for(const n of npcs){const name=spriteText(n.name,'#d9e2a1',25);scene.add(name);name.position.set(n.x,heightAt(n.x,n.z)+4.45,n.z)}
const merchantLabel=spriteText('Оружие и доспехи', '#e5c574',23);merchantLabel.position.set(6,heightAt(6,11)+3.85,11);scene.add(merchantLabel);
const questMarker=spriteText('!','#ffe180',72);questMarker.scale.set(2.5,1.6,1);scene.add(questMarker);
const relic=group(scene,35,heightAt(35,-14)+1.7,-11.8);const featherMat=material(0x79c8ba,{emissive:0x2c5b45,emissiveIntensity:.5});ell(relic,featherMat,0,.15,0,.18,.48,.08);rod(relic,M.bone,[0,-.4,0],[0,.53,0],.025);const relicShadow=contactShadow(1);
// Lightweight wildlife: animated joint groups, no skinned meshes or animation files.
function makePlainstrider(x,z,index){const root=group(scene,x,heightAt(x,z),z),body=group(root,0,1.23,0),brown=material(index%2?0x826649:0x917044),plume=material(0xa77944),legs=[];ell(body,brown,0,.1,0,.58,.49,.8);ell(body,plume,0,.18,-.4,.53,.35,.47);rod(body,brown,[0,.25,.5],[0,.92,.82],.18,.13);ell(body,brown,0,.97,.85,.25,.29,.27);ell(body,M.gold,0,.89,1.12,.15,.1,.28);for(const s of [-1,1]){ell(body,M.black,s*.19,1.02,.99,.045,.045,.03);const wing=ell(body,plume,s*.46,.12,-.05,.14,.35,.6);wing.rotation.x=.2;const leg=group(root,s*.24,1.1,.06);rod(leg,M.hideDark,[0,0,0],[0,-.93,0],.055);box(leg,M.wood,0,-1,.14,.18,.12,.38);legs.push(leg)}for(let i=0;i<3;i++){const f=ell(body,plume,(i-1)*.16,.98,.63,.055,.42,.11);f.rotation.x=-.2}fuse(root);return{root,body,legs,shadow:contactShadow(1.7),spawnX:x,spawnZ:z,hp:54,maxHp:54,dead:0,corpseAge:0,loot:[],hit:0,aggro:false,stunned:0,attackCd:0,phase:index,roamTime:rand()*8,index}}
const enemies=[[-9,-23],[1,-28],[13,-22],[21,-33],[-22,-35],[-28,29],[15,36],[34,13]].map(([x,z],i)=>makePlainstrider(x,z,i));
for(const enemy of enemies){enemy.name='Равнинный долгоног';enemy.baseScale=1;enemy.boss=false}
const giant=makePlainstrider(BOSS_X,BOSS_Z,enemies.length);
giant.name='Грозоклюв — огромный долгоног';
giant.boss=true;giant.baseScale=1.8;giant.maxHp=giant.hp=108;
giant.root.scale.setScalar(giant.baseScale);
giant.shadow.scale.setScalar(1.7);
giant.nameTag=spriteText('Грозоклюв · Исполин','#f9bd91',27);
giant.nameTag.scale.set(4.7,.84,1);scene.add(giant.nameTag);
giant.nameTag.position.set(BOSS_X,heightAt(BOSS_X,BOSS_Z)+4.65,BOSS_Z);
enemies.push(giant);
const CORPSE_DURATION=65,CORPSE_FALL_TIME=.85,LOOT_INTERACT_RANGE=3.3;
const corpseLootTexture=texture((c,size)=>{
 c.clearRect(0,0,size,size);
 const glow=c.createRadialGradient(size/2,size/2,3,size/2,size/2,size*.46);
 glow.addColorStop(0,'#fff7ccee');glow.addColorStop(.46,'#e7c46caa');glow.addColorStop(1,'#b88a3600');
 c.fillStyle=glow;c.fillRect(0,0,size,size);
 c.fillStyle='#fff2bc';c.strokeStyle='#8b6226';c.lineWidth=2;
 c.beginPath();c.moveTo(size/2,size*.13);c.lineTo(size*.61,size*.4);
 c.lineTo(size*.87,size/2);c.lineTo(size*.61,size*.6);
 c.lineTo(size/2,size*.87);c.lineTo(size*.39,size*.6);
 c.lineTo(size*.13,size/2);c.lineTo(size*.39,size*.4);
 c.closePath();c.fill();c.stroke();
},128);
const corpseLootMaterial=new THREE.SpriteMaterial({map:corpseLootTexture,transparent:true,depthWrite:false,depthTest:true});
for(const e of enemies){
 e.corpseAge=0;e.loot=[];
 e.lootMarker=new THREE.Sprite(corpseLootMaterial);
 e.lootMarker.scale.set(.95,.95,1);
 e.lootMarker.visible=false;scene.add(e.lootMarker);
}
const selection=mesh(scene,new THREE.RingGeometry(.8,.88,40),new THREE.MeshBasicMaterial({color:0xf6d580,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false}),0,.07,0,1,1,1,false);selection.rotation.x=-Math.PI/2;selection.visible=false;
const stompRing=mesh(scene,new THREE.RingGeometry(.85,1,48),new THREE.MeshBasicMaterial({color:0xe9c66b,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}),0,.08,0,1,1,1,false);stompRing.rotation.x=-Math.PI/2;
function animateTauren(actor,time,dt,walk=0,attack=-1,stomp=-1,turn=0,gather=0){
 actor.walk=THREE.MathUtils.damp(actor.walk,walk,10,dt);const w=actor.walk,phase=actor.phase,breath=Math.sin(time*1.7),stride=Math.sin(phase*TAU),beat=Math.cos(phase*TAU*2);
 actor.body.position.set(stride*.035*w,1.4+.008*breath+.026*(1-beat)*w,0);actor.chest.rotation.set(.035*w,Math.sin(phase*TAU)*.065*w,-stride*.025*w);actor.chest.scale.y=1+breath*.005;
 actor.neck.rotation.set(-.018*breath-.025*beat*w,-actor.chest.rotation.y*.65,stride*.015*w);
 let swing=0,windup=0;
 if(attack>=0){const a=clamp(attack,0,1);windup=smooth(0,.32,a)*(1-smooth(.38,.65,a));swing=smooth(.32,.58,a)*(1-smooth(.64,1,a));actor.chest.rotation.y+=-.32*windup+.42*swing;actor.chest.rotation.x+=.12*swing}
 const crouch=stomp>=0?.14*Math.sin(Math.min(stomp/.55,1)*Math.PI):0;
 const bend=clamp(gather,0,1);
 actor.body.position.y-=crouch+.47*bend;
 actor.chest.rotation.x+=.20*bend;actor.neck.rotation.x+=.1*bend;
 for(let i=0;i<2;i++){const arm=actor.arms[i],sign=i?1:-1;arm.shoulder.rotation.x=sign*stride*.31*w-(i?1.85*windup-.48*swing:0);arm.shoulder.rotation.z=-sign*(.12+.025*breath+(stomp>=0?.17*Math.sin(stomp*Math.PI):0));arm.shoulder.rotation.x-=bend*(i?.95:1.12);arm.elbow.rotation.x=-.14-Math.abs(stride)*.11*w-(i?.6*windup:0)-.45*bend}
 const yaw=actor.root.rotation.y;
 for(let i=0;i<2;i++){const leg=actor.legs[i],p=(phase+i*.5)%1;let z=0,lift=0;if(p<.58)z=.775-1.55*p/.58;else{const t=(p-.58)/.42;z=-.775+1.55*smooth(0,1,t);lift=Math.sin(t*Math.PI)*.22}z*=w;lift*=w;
 if(stomp>=0&&i===1){lift+=.42*Math.sin(Math.min(stomp/.48,1)*Math.PI);z+=.17*Math.sin(stomp*Math.PI)}
 const footX=actor.root.position.x+(leg.sign*.43*Math.cos(yaw)+z*Math.sin(yaw))*actor.scale,footZ=actor.root.position.z+(-leg.sign*.43*Math.sin(yaw)+z*Math.cos(yaw))*actor.scale;
 leg.hip.position.y=actor.body.position.y;const y=(heightAt(footX,footZ)-actor.root.position.y)/actor.scale+.205+lift-leg.hip.position.y;
 const distance=clamp(Math.hypot(y,z),.15,1.397),knee=Math.acos(clamp((distance*distance-.72*.72-.68*.68)/(2*.72*.68),-1,1));
 leg.hip.rotation.x=Math.atan2(-z,-y)-Math.atan2(.68*Math.sin(knee),.72+.68*Math.cos(knee));leg.knee.rotation.x=knee;leg.foot.rotation.x=-leg.hip.rotation.x-knee;
 }
 actor.tail.rotation.x=.06+Math.sin(time*2)*.06+w*.08;actor.tail.rotation.z=Math.sin(time*1.6)*.09+stride*.11*w-clamp(turn,-.25,.25);
 actor.braids.forEach((b,i)=>{b.rotation.x=.035*Math.sin(time*2+i)+.07*stride*w;b.rotation.z=clamp(turn*.3,-.1,.1)});
 actor.shadow.position.set(actor.root.position.x,heightAt(actor.root.position.x,actor.root.position.z)+.055,actor.root.position.z);
}
const saveKey='nexgame-mulgore-alpha02',cameraStoreKey='nexgame-real3d-camera-distance';
// The starter backpack has 12 actual slots; four future bag sockets can add capacity.
const BASE_INVENTORY_SLOTS=12,EQUIPPED_BAG_SLOTS=4,MAX_ITEM_STACK=20;
const EQUIPMENT_SLOTS=[
 {id:'head',name:'Голова',hint:'Шлемы и головные уборы',path:'M10 29V19a14 14 0 0 1 28 0v10l-8 5v-9H18v9z M24 5v13 M18 21h12'},
 {id:'shoulders',name:'Плечи',hint:'Наплечники',path:'M5 17l11-7 8 7 8-7 11 7-3 15-12-4-4-7-4 7-12 4z M9 21l8-5 M31 16l8 5'},
 {id:'chest',name:'Туловище',hint:'Нагрудники и кожаные куртки',path:'M16 7l8 5 8-5 10 12-8 6-3-5v21H17V20l-3 5-8-6z M19 17h10 M19 24h10 M19 31h10'},
 {id:'wrists',name:'Запястья',hint:'Наручи',path:'M6 17l13-5 7 22-13 5z M24 13l13-5 7 22-13 5z M9 24l13-4 M27 20l13-4'},
 {id:'hands',name:'Перчатки',hint:'Боевые перчатки',path:'M14 40l-3-15-4-8 5-3 6 7V9h5v12V6h5v15V9h5v14l2-11 5 2-4 21-5 5z M15 33h19'},
 {id:'waist',name:'Пояс',hint:'Кожаные и металлические пояса',path:'M5 17h13v14H5z M30 17h13v14H30z M18 14h12v20H18z M22 20h5v8h-5z'},
 {id:'legs',name:'Штаны',hint:'Штаны и поножи',path:'M12 7h24l2 34H27l-3-23-3 23H10z M12 13h24 M14 33h7 M27 33h9'},
 {id:'feet',name:'Сапоги',hint:'Сапоги и защита копыт',path:'M7 7h13v23l5 5v6H5v-8l3-5z M28 7h13v23l4 5v6H26v-8l3-5z M8 16h12 M29 16h12 M6 35h16 M27 35h15'},
 {id:'weapon',name:'Оружие',hint:'Одноручные топоры, мечи и кинжалы',path:'M8 40L36 8l6-2-2 7L16 37z M10 26l12 12 M7 41l4-4'},
 {id:'shield',name:'Щит',hint:'Щиты для левой руки',path:'M8 10l16-5 16 5v14c0 10-16 20-16 20S8 34 8 24z M24 10v27 M14 16h20'}
];
function emptyEquipment(){return Object.fromEntries(EQUIPMENT_SLOTS.map(slot=>[slot.id,null]))}
function startingEquipment(){return {...emptyEquipment(),weapon:{id:'wornAxe',qty:1}}}
function normalizeEquipment(input){
 const normalized=emptyEquipment();
 if(!input||typeof input!=='object'||Array.isArray(input))return normalized;
 for(const slot of EQUIPMENT_SLOTS){const item=input[slot.id];if(item&&typeof item.id==='string'&&ITEM_CATALOG[item.id]?.slot===slot.id&&state.level>=(ITEM_CATALOG[item.id].requiredLevel||1))normalized[slot.id]={id:item.id,qty:1}}
 return normalized;
}

function playerStats(equipment=state.equipment){return deriveStats(state.level,equipment)}
function syncEquipmentVisuals(){
 const weapon=ITEM_CATALOG[state.equipment.weapon?.id],shield=ITEM_CATALOG[state.equipment.shield?.id];
 for(const root of [hero.root,characterView?.actor.root].filter(Boolean)){
  for(const kind of ['axe','sword','dagger']){const model=root.getObjectByName('gear-'+kind);if(model)model.visible=weapon?.weaponKind===kind}
  const model=root.getObjectByName('gear-shield');if(model){model.visible=!!shield;model.scale.setScalar(shield?.sourceId===2210 ? .8 : 1)}
 }
 if(characterView)characterView.nextFrame=0;
}
function rollMeleeDamage(rng=Math.random){const stats=playerStats();return Math.round(stats.damageMin+rng()*(stats.damageMax-stats.damageMin))}
function incomingDamage(enemy,raw,rng=Math.random){
 const stats=playerStats(),dx=enemy.root.position.x-state.x,dz=enemy.root.position.z-state.z;
 const inFront=Math.sin(hero.root.rotation.y)*dx+Math.cos(hero.root.rotation.y)*dz>=0;
 const blocked=stats.blockChance>0&&inFront&&rng()<stats.blockChance;
 const damage=Math.max(blocked?0:1,Math.round(raw*(1-armorReduction(stats.armor,enemy.boss?5:1))-(blocked?stats.blockValue:0)));
 if(blocked)msg('Блок щитом! Поглощено до '+stats.blockValue+' урона',1100);
 return damage;
}
function finishEquipmentChange(){
 // Swapping stamina items never heals; removing stamina clamps current health to the new cap.
 state.hp=Math.min(state.hp,playerStats().maxHp);
 autoAttack=false;attackElapsed=-1;swingTarget=null;attackCooldown=0;
 syncEquipmentVisuals();save();updateHUD();
}
function equipInventorySlot(index,expected=state.inventory[index]){
 const item=state.inventory[index],def=ITEM_CATALOG[item?.id];
 if(!item||item!==expected||!def?.slot)return false;
 if(inCombat()){msg('Сначала выйди из боя, чтобы сменить экипировку');return false}
 if(state.level<(def.requiredLevel||1)){msg('Требуется уровень '+def.requiredLevel);return false}
 // Exchange within the same backpack cell, including when all 12 cells are occupied.
 const previous=state.equipment[def.slot];
 state.equipment[def.slot]={id:item.id,qty:1};
 state.inventory[index]=previous?{id:previous.id,qty:1}:null;
 finishEquipmentChange();msg('Надето: '+def.name);return true;
}
function unequipSlot(slot,expected=state.equipment[slot]){
 const item=state.equipment[slot];if(!item||item!==expected)return false;
 if(inCombat()){msg('Сначала выйди из боя, чтобы снять экипировку');return false}
 if(!storeItem({id:item.id,qty:1},false)){msg('Для снятой вещи нужно свободное место в рюкзаке');return false}
 state.equipment[slot]=null;finishEquipmentChange();msg('Снято: '+ITEM_CATALOG[item.id].name);return true;
}
function refreshCharacter(){modalKind=null;character()}
const coins=value=>value+' мон.';
function itemStatText(def){
 const parts=[];
 if(def.damageMin)parts.push(def.damageMin+'–'+def.damageMax+' урона',def.speed.toFixed(2).replace('.',',')+' сек.',((def.damageMin+def.damageMax)/2/def.speed).toFixed(1).replace('.',',')+' урона/сек.');
 if(def.armor)parts.push(def.armor+' брони');
 if(def.strength)parts.push('+'+def.strength+' к силе');
 if(def.stamina)parts.push('+'+def.stamina+' к выносливости');
 if(def.block)parts.push('Блок: '+def.block);
 return parts.join(' · ');
}
function showItemDetails(container,id,compare=false){
 const def=ITEM_CATALOG[id];container.replaceChildren();
 const card=document.createElement('div');card.className='item-tooltip';
 const name=document.createElement('strong');name.className='item-name';name.dataset.rarity=def.rarity;name.textContent=def.icon+' '+def.name;card.appendChild(name);
 for(const text of [def.quality+(def.slot?' · '+EQUIPMENT_SLOTS.find(s=>s.id===def.slot).name:''),itemStatText(def),def.description,'Продажа: '+coins(def.sell||0)]){
  if(!text)continue;const row=document.createElement('div');row.textContent=text;card.appendChild(row);
 }
 if(def.requiredLevel>1){const level=document.createElement('div');level.textContent='Требуется уровень '+def.requiredLevel;level.className=state.level<def.requiredLevel?'item-requirement':'';card.appendChild(level)}
 container.appendChild(card);
 if(compare&&def.slot){
  const before=playerStats(),after=playerStats({...state.equipment,[def.slot]:{id,qty:1}}),comparison=document.createElement('div');comparison.className='item-comparison';
  const heading=document.createElement('div'),current=ITEM_CATALOG[state.equipment[def.slot]?.id];heading.textContent='Сейчас: '+(current?current.name:'пусто');comparison.appendChild(heading);
  for(const [key,label] of [['maxHp','макс. здоровья'],['strength','силы'],['stamina','выносливости'],['armor','брони'],['dps','урона/сек.']]){
   const delta=after[key]-before[key];if(Math.abs(delta)<.01)continue;
   const row=document.createElement('div');row.className=delta>0?'stat-gain':'stat-loss';row.textContent=(delta>0?'+':'')+(key==='dps'?delta.toFixed(1):delta)+' '+label;comparison.appendChild(row);
  }
  container.appendChild(comparison);
 }
}
function canTrade(){return Math.hypot(state.x-6,state.z-11)<3.5&&modalKind==='merchant'}
function buyItem(id){
 const def=ITEM_CATALOG[id];if(!canTrade()||!MERCHANT_STOCK.includes(id)||!def?.buy)return false;
 if(state.gold<def.buy){msg('Недостаточно монет');return false}
 if(!canStoreItem({id,qty:1})){msg('Освободи место в рюкзаке');return false}
 storeItem({id,qty:1},false);state.gold-=def.buy;save();msg('Куплено: '+def.name);return true;
}
function sellItem(index,expected=state.inventory[index]){
 const item=state.inventory[index],def=ITEM_CATALOG[item?.id];
 if(!canTrade()||!item||item!==expected||!def?.sell)return false;
 const price=def.sell*item.qty;
 state.inventory[index]=null;state.gold+=price;
 state.buyback.unshift({id:item.id,qty:item.qty,price});state.buyback=state.buyback.slice(0,12);
 save();msg('Продано: '+def.name+' · +'+coins(price));return true;
}
function buyBackItem(index,expected=state.buyback[index]){
 const item=state.buyback[index];if(!canTrade()||!item||item!==expected)return false;
 if(state.gold<item.price){msg('Недостаточно монет');return false}
 if(!canStoreItem(item)){msg('Освободи место в рюкзаке');return false}
 storeItem({id:item.id,qty:item.qty},false);state.gold-=item.price;state.buyback.splice(index,1);save();msg('Предмет выкуплен обратно');return true;
}
function merchantTalk(){
 openDialog('Борун Крепкая Ладонь','ОРУЖИЕ И ДОСПЕХИ',[],'merchant');renderMerchant('buy');
}
function renderMerchant(tab='buy',filter='all'){
 const panel=$('panel'),scroll=panel.scrollTop,body=$('mbody');body.replaceChildren();$('choices').replaceChildren();
 const summary=document.createElement('div');summary.className='merchant-wallet';summary.textContent='В кошеле: '+coins(state.gold)+' · Рюкзак: '+itemOccupancy()+' / '+inventoryCapacity();body.appendChild(summary);
 const tabs=document.createElement('div');tabs.className='merchant-tabs';
 for(const [key,label] of [['buy','Купить'],['sell','Продать'],['buyback','Выкупить']]){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.className=tab===key?'active':'';button.setAttribute('aria-pressed',String(tab===key));button.addEventListener('click',()=>renderMerchant(key));tabs.appendChild(button);
 }body.appendChild(tabs);
 const help=document.createElement('p');help.className='merchant-help';help.textContent=tab==='buy'?'Серые доспехи дают броню, оружие — урон. Купленную вещь надень из рюкзака.':tab==='sell'?'Можно продать всю стопку. Последние 12 продаж доступны для выкупа.':'Выкуп по цене продажи. Здесь сохраняются последние 12 проданных вещей или стопок.';body.appendChild(help);
 if(tab==='buy'){
  const filters=document.createElement('div');filters.className='merchant-filters';
  for(const [key,label] of [['all','Всё'],['armor','Броня'],['weapon','Оружие'],['shield','Щиты']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.className=filter===key?'active':'';button.setAttribute('aria-pressed',String(filter===key));button.addEventListener('click',()=>renderMerchant(tab,key));filters.appendChild(button)}body.appendChild(filters);
 }
 const list=document.createElement('div');list.className='merchant-list';
 const rows=tab==='buy'?MERCHANT_STOCK.filter(id=>filter==='all'||(filter==='armor'?!['weapon','shield'].includes(ITEM_CATALOG[id].slot):ITEM_CATALOG[id].slot===filter)).map(id=>({id,qty:1})):tab==='sell'?state.inventory.map((item,index)=>item&&ITEM_CATALOG[item.id]?.sell?{...item,index,original:item}:null).filter(Boolean):state.buyback.map((item,index)=>({...item,index,original:item}));
 for(const item of rows){
  const def=ITEM_CATALOG[item.id],row=document.createElement('div');row.className='merchant-item';
  const info=document.createElement('div'),name=document.createElement('strong');name.className='item-name';name.dataset.rarity=def.rarity;name.textContent=def.icon+' '+def.name+(item.qty>1?' ×'+item.qty:'');info.appendChild(name);
  const stats=document.createElement('small');stats.textContent=itemStatText(def)||(def.description);info.appendChild(stats);
  if(def.requiredLevel>1){const level=document.createElement('small');level.className=state.level<def.requiredLevel?'item-requirement':'';level.textContent='Уровень '+def.requiredLevel;info.appendChild(level)}
  row.appendChild(info);
  const price=tab==='buy'?def.buy:tab==='buyback'?item.price:def.sell*item.qty,button=document.createElement('button');button.type='button';button.className='trade-button';button.textContent=(tab==='buy'?'Купить':tab==='sell'?'Продать':'Выкупить')+' · '+coins(price);
  button.setAttribute('aria-label',button.textContent+' — '+def.name);
  button.disabled=tab!=='sell'&&(state.gold<price||!canStoreItem({id:item.id,qty:item.qty}));
  button.addEventListener('click',()=>{const ok=tab==='buy'?buyItem(item.id):tab==='sell'?sellItem(item.index,item.original):buyBackItem(item.index,item.original);if(ok)renderMerchant(tab,filter)});row.appendChild(button);list.appendChild(row);
 }
 if(!rows.length){const empty=document.createElement('p');empty.textContent=tab==='sell'?'Рюкзак пуст. Экипировка на персонаже не продаётся.':'Пока нет проданных предметов.';list.appendChild(empty)}body.appendChild(list);
 choice('Открыть рюкзак',bag,'alt');choice('До встречи',closeDialog);panel.scrollTop=scroll;
}

// A lazily created inspection scene shares the hero's meshes and materials.
// It uses the existing WebGL renderer; opening the window never creates a second context.
let characterView=null;
function ensureCharacterView(){
 if(characterView)return characterView;
 const root=hero.root.clone(true),original=[],copies=[];hero.root.traverse(o=>original.push(o));root.traverse(o=>copies.push(o));
 const map=new Map(original.map((o,i)=>[o,copies[i]])),copy=o=>map.get(o);
 root.position.set(0,0,0);root.rotation.set(0,-.24,0);
 const actor={...hero,root,body:copy(hero.body),chest:copy(hero.chest),neck:copy(hero.neck),head:copy(hero.head),tail:copy(hero.tail),shadow:new THREE.Object3D(),braids:hero.braids.map(copy),arms:hero.arms.map(a=>({shoulder:copy(a.shoulder),elbow:copy(a.elbow),hand:copy(a.hand)})),legs:hero.legs.map(l=>({hip:copy(l.hip),knee:copy(l.knee),foot:copy(l.foot),sign:l.sign})),phase:0,walk:0};
 const stage=new THREE.Scene();stage.background=new THREE.Color(0x1b211d);stage.add(root);
 stage.add(new THREE.HemisphereLight(0xf1ddb9,0x454733,2.3));
 const key=new THREE.DirectionalLight(0xffddb0,3.3);key.position.set(-3,5,6);stage.add(key);
 const rim=new THREE.DirectionalLight(0x9dc6bf,2.0);rim.position.set(3,4,-4);stage.add(rim);
 const floor=mesh(stage,new THREE.CylinderGeometry(1.75,1.86,.10,40),material(0x454639),0,-.075,0,1,1,1,false);
 floor.receiveShadow=false;
 const shadow=mesh(stage,new THREE.PlaneGeometry(3.1,3.1),shadowMat,0,.009,0,1,1,1,false);shadow.rotation.x=-Math.PI/2;
 const cam=new THREE.PerspectiveCamera(35,1,.1,30);
 characterView={actor,scene:stage,camera:cam,yaw:-.24,time:0,nextFrame:0,canvas:null,context:null,drag:null};
 return characterView;
}
function slotIcon(slot){return '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="'+slot.path+'" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'}
function character(){
 if(modalKind==='character'){closeDialog();return}
 openDialog('Странник','ТАУРЕН · ВОИН · УРОВЕНЬ '+state.level,[],'character');
 const view=ensureCharacterView();view.nextFrame=0;view.drag=null;
 const body=$('mbody'),intro=document.createElement('div');intro.className='character-section-label';intro.textContent='ЭКИПИРОВКА';body.appendChild(intro);
 const layout=document.createElement('div');layout.className='character-layout';
 const left=document.createElement('div'),right=document.createElement('div');left.className=right.className='equipment-column';
 const detail=document.createElement('div');detail.className='equipment-detail';detail.setAttribute('role','status');detail.setAttribute('aria-live','polite');detail.textContent='Выбери вещь, чтобы посмотреть её свойства или снять. Новые вещи надеваются из рюкзака.';
 for(const [index,slot] of EQUIPMENT_SLOTS.entries()){
  const item=state.equipment[slot.id],def=item?ITEM_CATALOG[item.id]:null,button=document.createElement('button');button.type='button';button.className='equipment-slot'+(item?' equipped':'');button.dataset.slot=slot.id;if(def)button.dataset.rarity=def.rarity;
  button.setAttribute('aria-label',slot.name+': '+(def?def.name:'пусто'));button.setAttribute('aria-pressed','false');
  if(def){
   const icon=document.createElement('span');icon.className='equipment-item-icon';icon.textContent=def.icon;icon.dataset.item=item.id;icon.setAttribute('aria-hidden','true');button.appendChild(icon);
  }else button.innerHTML=slotIcon(slot);
  const label=document.createElement('span');label.textContent=slot.name;button.appendChild(label);
  const status=document.createElement('small');status.textContent=def?def.name:'Пусто';button.appendChild(status);
  button.addEventListener('click',()=>{
   for(const column of [left,right])for(const cell of column.children){cell.classList.remove('active');cell.setAttribute('aria-pressed','false')}
   button.classList.add('active');button.setAttribute('aria-pressed','true');
   if(def){
    showItemDetails(detail,item.id);
    const remove=document.createElement('button');remove.type='button';remove.className='choice alt';remove.textContent='Снять в рюкзак';remove.addEventListener('click',()=>{if(unequipSlot(slot.id,item))refreshCharacter()});detail.appendChild(remove);
   }else detail.textContent=slot.name+' · '+slot.hint+'. Ячейка свободна.';
  });
  (index<4||slot.id==='weapon'?left:right).appendChild(button);
 }
 const center=document.createElement('div');center.className='character-preview';
 const preview=document.createElement('canvas');preview.className='character-canvas';preview.width=300;preview.height=380;preview.tabIndex=0;
 preview.setAttribute('aria-label','3D-модель таурена. Поверни пальцем или клавишами влево и вправо.');preview.setAttribute('role','img');
 view.canvas=preview;view.context=preview.getContext('2d');center.appendChild(preview);
 preview.addEventListener('pointerdown',e=>{if(view.drag!==null||(e.button!==undefined&&e.button!==0))return;e.preventDefault();view.drag={id:e.pointerId,x:e.clientX};preview.setPointerCapture(e.pointerId)});
 preview.addEventListener('pointermove',e=>{if(view.drag?.id!==e.pointerId)return;view.yaw+=(e.clientX-view.drag.x)*.012;view.drag.x=e.clientX;view.nextFrame=0});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])preview.addEventListener(event,e=>{if(view.drag?.id===e.pointerId)view.drag=null});
 preview.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();view.yaw+=e.key==='ArrowLeft'?-.2:.2;view.nextFrame=0}});
 const controls=document.createElement('div');controls.className='character-rotate';
 for(const [label,title,action] of [['↶','Повернуть влево',()=>view.yaw-=.35],['Спереди','Вернуть вид спереди',()=>view.yaw=0],['↷','Повернуть вправо',()=>view.yaw+=.35]]){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-label',title);button.addEventListener('click',()=>{action();view.nextFrame=0});controls.appendChild(button);
 }
 center.appendChild(controls);
 const hint=document.createElement('span');hint.className='character-drag-hint';hint.textContent='Потяни, чтобы повернуть';center.appendChild(hint);
 layout.appendChild(left);layout.appendChild(center);layout.appendChild(right);body.appendChild(layout);body.appendChild(detail);
 const stats=document.createElement('dl');stats.className='character-stats';
 const attributes=playerStats();
 for(const [label,value] of [['Здоровье',Math.ceil(state.hp)+' / '+attributes.maxHp],['Сила',attributes.strength],['Выносливость',attributes.stamina],['Броня',attributes.armor],['Сила атаки',attributes.attackPower],['Урон удара',Math.round(attributes.damageMin)+'–'+Math.round(attributes.damageMax)],['Скорость атаки',attributes.speed.toFixed(2).replace('.',',')+' сек.'],['Урон / сек.',attributes.dps.toFixed(1).replace('.',',')],['Блок щитом',attributes.blockChance?'5% · '+attributes.blockValue:'Нет щита']]){
  const pair=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;pair.appendChild(dt);pair.appendChild(dd);stats.appendChild(pair);
 }
 body.appendChild(stats);
 const note=document.createElement('p');note.className='character-note';note.textContent='10 ячеек · '+Object.values(state.equipment).filter(Boolean).length+' занято. +1 выносливости = +10 HP; +1 силы = +2 силы атаки. Броня снижает физический урон, щит блокирует атаки спереди. Оружие и щит видны на модели.';body.appendChild(note);
 choice('Открыть рюкзак',bag,'alt');choice('Вернуться в мир',closeDialog);
 preview.focus({preventScroll:true});
}
function renderCharacterPreview(t,dt){
 const view=characterView;if(modalKind!=='character'||!view?.canvas||!view.context||t<view.nextFrame)return;
 view.nextFrame=t+1000/24;view.time+=Math.max(dt,1/24);
 const rect=view.canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
 const w=Math.max(1,Math.min(Math.round(rect.width),innerWidth)),h=Math.max(1,Math.min(Math.round(rect.height),innerHeight)),ratio=renderer.getPixelRatio(),pw=Math.floor(w*ratio),ph=Math.floor(h*ratio);
 if(view.canvas.width!==pw||view.canvas.height!==ph){view.canvas.width=pw;view.canvas.height=ph}
 const aspect=w/h;view.camera.aspect=aspect;
 // Fit both the horn tips and the broad arms on narrow phones.
 const distance=Math.max(7.35,2.08/(Math.tan(35*Math.PI/360)*aspect));
 view.camera.position.set(0,2.35,distance);view.camera.lookAt(0,1.92,0);view.camera.updateProjectionMatrix();
 view.actor.root.rotation.y=view.yaw;animateTauren(view.actor,view.time,1/24);
 const shadows=renderer.shadowMap.enabled;renderer.shadowMap.enabled=false;
 try{
  renderer.setViewport(0,0,w,h);renderer.setScissor(0,0,w,h);renderer.setScissorTest(true);renderer.render(view.scene,view.camera);
  // Copy synchronously before the world render, including on Safari with preserveDrawingBuffer=false.
  view.context.drawImage(renderer.domElement,0,renderer.domElement.height-ph,pw,ph,0,0,pw,ph);
 }finally{renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.shadowMap.enabled=shadows}
}

// Independent three-part gathering chain offered by the existing camp herbalist.
// Item counts come from the actual backpack; discarding a quest item removes progress.
const GATHER_QUESTS=[
 null,
 {title:'Цветы равнин',item:'meadowFlower',count:4,gold:12,xp:35,
  hint:'Соберите луговые цветы вокруг лагеря.',intro:'Собери четыре луговых цветка для моего целебного настоя.',
  locations:[[-12,10],[-2,17],[5,20],[12,16],[-17,19],[15,24],[-7,27]]},
 {title:'Солнечные корни',item:'sunRoot',count:3,gold:20,xp:55,
  hint:'Найдите солнечные корни на дальних пастбищах.',intro:'Теперь мне нужны три солнечных корня, которые растут за лагерем.',
  locations:[[6,29],[13,31],[21,25],[27,19],[-12,29],[0,36]]},
 {title:'Лунные грибы',item:'moonMushroom',count:2,gold:35,xp:90,
  hint:'Ищите лунные грибы у прохладных камней.',intro:'Последний ингредиент — два лунных гриба среди прохладных камней.',
  locations:[[16,-22],[25,-23],[32,-31],[26,-9],[38,-27]]}
];
const GATHER_INTERACT_RANGE=2.8,GATHER_CAST_SECONDS=1.5,GATHER_RESPAWN_SECONDS=32;
const gatherMat={
 flower:material(0xf4d873,{emissive:0x6b4c17,emissiveIntensity:.18}),
 petal:material(0xffeaaa),
 root:material(0xc4a063),
 cap:material(0x9990c5,{emissive:0x3a335e,emissiveIntensity:.3}),
 lightCap:material(0xd1c5e4)
};
const gatherSparkMaterials=[null,new THREE.MeshBasicMaterial({color:0xffeaa1}),new THREE.MeshBasicMaterial({color:0xb2f29c}),new THREE.MeshBasicMaterial({color:0xd6c2ff})];
const gatherNodes=[];
function placeGatherObject(stage,index,x,z){
 const offsets=[[0,0],[2,0],[-2,0],[0,2],[0,-2],[3,3],[-3,3],[3,-3],[-3,-3]];
 for(const [ox,oz] of offsets)if(clearAt(x+ox,z+oz,.68)){x+=ox;z+=oz;break}
 const root=group(scene,x,heightAt(x,z),z);
 if(stage===1){
  for(let petal=0;petal<5;petal++){
   const a=petal*TAU/5;
   ell(root,gatherMat.petal,Math.sin(a)*.27,.43,Math.cos(a)*.27,.16,.075,.13);
  }
  ell(root,gatherMat.flower,0,.44,0,.17,.12,.18);
  rod(root,M.leaf,[0,.05,0],[0,.43,0],.048,.03);
  ell(root,M.leaf,-.17,.15,0,.23,.08,.11);
 }else if(stage===2){
  for(const xz of [[-.16,-.1],[.12,.08]])ell(root,gatherMat.root,xz[0],.15,xz[1],.22,.19,.22);
  for(const angle of [-.65,0,.65]){
   const leaf=ell(root,M.leaf,Math.sin(angle)*.17,.42,Math.cos(angle)*.1,.12,.3,.07);
   leaf.rotation.z=angle;
  }
 }else{
  for(const [x1,z1,h,r] of [[-.15,-.1,.34,.30],[.27,.15,.23,.22]]){
   rod(root,M.bone,[x1,.05,z1],[x1,h,z1],.08,.065);
   const cap=mesh(root,G.cone,gatherMat.cap,x1,h+.08,z1,r,.22,r);
   cap.rotation.y=index*.45;
   ell(root,gatherMat.lightCap,x1,h+.16,z1,r*.4,.055,r*.4);
  }
 }
 const sparkle=mesh(root,G.sphere,gatherSparkMaterials[stage],0,.85,0,.115,.115,.115,false);
 const node={id:stage+'-'+index,stage,index,item:GATHER_QUESTS[stage].item,x,z,root,sparkle,readyAt:0,pending:false};
 root.userData.gatherNode=node.id;
 root.visible=false;gatherNodes.push(node);return node;
}
for(let stage=1;stage<=3;stage++)
 GATHER_QUESTS[stage].locations.forEach(([x,z],i)=>placeGatherObject(stage,i,x,z));
function gatherQuestCount(stage=state.gatherStage){
 const quest=GATHER_QUESTS[stage];if(!quest)return 0;
 return state.inventory.reduce((total,row)=>total+(row?.id===quest.item?row.qty:0),0);
}
function consumeGatherQuestItems(stage){
 const quest=GATHER_QUESTS[stage];if(!quest||gatherQuestCount(stage)<quest.count)return false;
 let left=quest.count;
 for(let i=0;i<state.inventory.length&&left>0;i++){
  const slot=state.inventory[i];if(!slot||slot.id!==quest.item)continue;
  const used=Math.min(left,slot.qty);slot.qty-=used;left-=used;
  if(slot.qty===0)state.inventory[i]=null;
 }
 save();return left===0;
}
function gatherNodeAvailable(node){
 const q=GATHER_QUESTS[state.gatherStage];
 // A harvested but uncollected resource remains accessible even when the
 // backpack already holds the required quest amount. Never lose a pending drop.
 return !!q&&node.stage===state.gatherStage&&
   (node.pending||(gatherQuestCount()<q.count&&clock>=node.readyAt));
}
function updateGatherVisibility(){
 for(const node of gatherNodes){
  node.root.visible=gatherNodeAvailable(node);
  if(node.root.visible){node.root.rotation.y=.09*Math.sin(clock*1.4+node.index);node.sparkle.position.y=.85+.1*Math.sin(clock*2.5+node.index)}
 }
}
const initial={x:0,z:10,yaw:Math.PI,hp:120,level:1,xp:0,gold:0,potions:2,quest:0,kills:0,relic:false,gatherStage:0,inventory:Array(BASE_INVENTORY_SLOTS).fill(null),bags:Array(EQUIPPED_BAG_SLOTS).fill(null),equipment:startingEquipment(),buyback:[]};
let state={...initial,inventory:[...initial.inventory],bags:[...initial.bags],equipment:startingEquipment(),buyback:[]};
function normalizeBags(input){
 return Array.from({length:EQUIPPED_BAG_SLOTS},(_,i)=>{
  const bag=Array.isArray(input)?input[i]:null;
  return bag&&typeof bag.id==='string'&&Number.isInteger(bag.slots)&&bag.slots>=1&&bag.slots<=24?{id:bag.id,slots:bag.slots}:null;
 });
}
function inventoryCapacity(){
 return BASE_INVENTORY_SLOTS+state.bags.reduce((total,bag)=>total+(bag?bag.slots:0),0);
}
function normalizeInventory(input){
 return Array.from({length:inventoryCapacity()},(_,i)=>{
  const item=Array.isArray(input)?input[i]:null;
  return item&&typeof item.id==='string'&&ITEM_CATALOG[item.id]&&Number.isFinite(item.qty)
   ?{id:item.id,qty:clamp(Math.floor(item.qty),1,itemStackLimit(item.id))}:null;
 });
}
function itemOccupancy(){return state.inventory.reduce((sum,item)=>sum+(item?1:0),0)}
function canStoreItem(item){
 if(!item||!ITEM_CATALOG[item.id]||!Number.isInteger(item.qty)||item.qty<=0)return false;
 let capacity=0;
 for(const slot of state.inventory){
  if(!slot)capacity+=itemStackLimit(item.id);
  else if(slot.id===item.id)capacity+=itemStackLimit(item.id)-slot.qty;
  if(capacity>=item.qty)return true;
 }
 return false;
}
function storeItem(item,persist=true){
 // Atomic insertion: never delete dropped loot unless every unit fits.
 if(!canStoreItem(item))return false;
 let remaining=item.qty;
 for(const slot of state.inventory){
  if(!slot||slot.id!==item.id||remaining===0)continue;
  const add=Math.min(itemStackLimit(item.id)-slot.qty,remaining);
  slot.qty+=add;remaining-=add;
 }
 for(let i=0;i<state.inventory.length&&remaining>0;i++)if(!state.inventory[i]){
  const add=Math.min(itemStackLimit(item.id),remaining);
  state.inventory[i]={id:item.id,qty:add};remaining-=add;
 }
 if(persist)save();return true;
}
// Equipment is independent of the common-material roll, never hidden behind its 72% gate.
function rollCorpseLoot(enemy=null){
 const equipment=rollEquipmentLoot(!!enemy?.boss),result=equipment?[equipment]:[];
 if(Math.random()>=.72)return result;
 const r=Math.random();
 const id=r<.42?'feather':r<.72?'beak':r<.94?'down':'charm';
 result.push({id,qty:id==='down'&&Math.random()<.38?2:1});
 if(Math.random()<.16)result.push({id:id==='feather'?'down':'feather',qty:1});
 return result;
}

try{const saved=JSON.parse(localStorage.getItem(saveKey));if(saved&&typeof saved==='object')for(const k of Object.keys(initial))if(typeof saved[k]===typeof initial[k]&&(typeof saved[k]!=='number'||Number.isFinite(saved[k])))state[k]=saved[k]}catch(e){}
state.level=clamp(Math.floor(state.level),1,60);state.quest=clamp(Math.floor(state.quest),0,12);state.gatherStage=clamp(Math.floor(state.gatherStage),0,4);state.kills=clamp(Math.floor(state.kills),0,3);state.potions=clamp(Math.floor(state.potions),0,99);state.gold=clamp(Math.floor(state.gold),0,99999);state.xp=Math.max(0,state.xp);if(!clearAt(state.x,state.z)){state.x=initial.x;state.z=initial.z}
state.bags=normalizeBags(state.bags);state.inventory=normalizeInventory(state.inventory);
const needsStarterWeapon=!state.equipment||!Object.hasOwn(state.equipment,'weapon');
state.equipment=normalizeEquipment(state.equipment);
if(needsStarterWeapon)state.equipment.weapon={id:'wornAxe',qty:1};
state.buyback=Array.isArray(state.buyback)?state.buyback.filter(row=>row&&ITEM_CATALOG[row.id]&&Number.isInteger(row.qty)&&row.qty>0&&row.qty<=itemStackLimit(row.id)&&row.price===ITEM_CATALOG[row.id].sell*row.qty).slice(0,12):[];
state.hp=clamp(state.hp,1,playerStats().maxHp);syncEquipmentVisuals();
hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);hero.root.rotation.y=state.yaw;
const save=()=>{try{localStorage.setItem(saveKey,JSON.stringify(state))}catch(e){}};
const keys=new Set(),joy={x:0,y:0,id:null},look={id:null,x:0,y:0,startX:0,startY:0,selectOnly:false},stick=$('stick'),nub=$('nub');
let gatherCast=null;
let modalKind=null,selected=null,autoAttack=false,swingTarget=null,attackElapsed=-1,attackCooldown=0,attackLanded=false,stompElapsed=-1,stompCooldown=0,stompLanded=false,shockAge=9,clock=0,saveClock=0,hudClock=0,velocityX=0,velocityZ=0,lastCombatAt=-100;
let cameraYaw=0,cameraPitch=settings.cameraPitch,cameraDistance=10.5,actualCameraDistance=10.5;
let cameraFollow=false,cameraFollowCooldown=0;
let fpsElapsed=0,fpsFrames=0;
const fpsCounter=$('fpsCounter');
function resetFps(){fpsElapsed=fpsFrames=0;if(fpsCounter.textContent!=='FPS —')fpsCounter.textContent='FPS —'}
function setShowFps(enabled,persist=true){
 settings.showFps=!!enabled;$('showFps').checked=settings.showFps;fpsCounter.hidden=!settings.showFps;resetFps();
 if(persist)saveSettings();
}
function applyGraphics(){
 const preset=graphicsPresets[settings.quality];
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,preset.pixelRatio));
 const shadowsChanged=renderer.shadowMap.enabled!==preset.shadows;
 renderer.shadowMap.enabled=preset.shadows;
 if(sun.shadow.mapSize.x!==preset.shadowSize){
  if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}
  sun.shadow.mapSize.setScalar(preset.shadowSize);
 }
 if(shadowsChanged){
  const materials=new Set();
  scene.traverse(o=>{if(o.material)for(const m of (Array.isArray(o.material)?o.material:[o.material]))materials.add(m)});
  for(const m of materials)m.needsUpdate=true;
 }
 renderer.shadowMap.needsUpdate=true;
 grass.count=Math.floor(grassCount*preset.grass);
 $('graphicsQuality').value=settings.quality;$('qualityHelp').textContent=qualityDescriptions[settings.quality];
 resetFps();
}
function setGraphicsQuality(quality){if(!Object.hasOwn(graphicsPresets,quality))return;settings.quality=quality;applyGraphics();saveSettings()}
$('graphicsQuality').addEventListener('change',e=>setGraphicsQuality(e.target.value));
$('showFps').addEventListener('change',e=>setShowFps(e.target.checked));
applyGraphics();setShowFps(settings.showFps,false);
function rememberCameraPitch(){if(settings.cameraPitch!==cameraPitch){settings.cameraPitch=cameraPitch;saveSettings()}}
const cameraFollowStoreKey='nexgame-real3d-camera-follow',cameraFollowSwitch=$('cameraFollow');
const cameraSlider=$('cameraDistance');
function setCameraDistance(value,persist=true){if(!Number.isFinite(value))return;cameraDistance=Math.round(clamp(value,4,22)*10)/10;cameraSlider.value=String(cameraDistance);const valueText=cameraDistance.toFixed(1).replace('.',',');$('cameraDistanceValue').textContent=valueText;cameraSlider.setAttribute('aria-valuetext',valueText);if(persist)try{localStorage.setItem(cameraStoreKey,String(cameraDistance))}catch(e){}}
try{const saved=JSON.parse(localStorage.getItem(cameraStoreKey));if(Number.isFinite(saved))setCameraDistance(saved,false)}catch(e){}setCameraDistance(cameraDistance,false);actualCameraDistance=cameraDistance;
cameraSlider.addEventListener('input',()=>setCameraDistance(Number(cameraSlider.value)));
function setCameraFollow(enabled,persist=true){
 cameraFollow=!!enabled;
 cameraFollowSwitch.checked=cameraFollow;
 cameraFollowSwitch.setAttribute('aria-checked',String(cameraFollow));
 cameraFollowCooldown=0;
 if(persist)try{localStorage.setItem(cameraFollowStoreKey,cameraFollow?'1':'0')}catch(e){}
}
try{setCameraFollow(localStorage.getItem(cameraFollowStoreKey)==='1',false)}catch(e){setCameraFollow(false,false)}
if(cameraFollow)cameraYaw=wrapYaw(hero.root.rotation.y+Math.PI);
cameraFollowSwitch.addEventListener('change',()=>setCameraFollow(cameraFollowSwitch.checked));
function resetStick(){const id=joy.id;joy.x=joy.y=0;joy.id=null;nub.style.transform='translate(0,0)';if(id!==null&&stick.hasPointerCapture(id))stick.releasePointerCapture(id)}
function finishLook(){
 const id=look.id;look.id=null;
 if(id!==null){cameraFollowCooldown=.85;rememberCameraPitch();if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id)}
}
function clearInput(){keys.clear();resetStick();finishLook();velocityX=velocityZ=0;if(characterView?.drag){const id=characterView.drag.id;characterView.drag=null;if(characterView.canvas?.hasPointerCapture(id))characterView.canvas.releasePointerCapture(id)}}
function stickMove(e){const r=stick.getBoundingClientRect(),radius=r.width*.3,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),s=len>radius?radius/len:1;joy.x=Math.abs(dx*s)<3?0:dx*s/radius;joy.y=Math.abs(dy*s)<3?0:dy*s/radius;nub.style.transform=`translate(${dx*s}px,${dy*s}px)`}
stick.addEventListener('pointerdown',e=>{if(modalKind||joy.id!==null)return;e.preventDefault();joy.id=e.pointerId;stick.setPointerCapture(e.pointerId);stickMove(e)});
stick.addEventListener('pointermove',e=>{if(e.pointerId===joy.id){e.preventDefault();stickMove(e)}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(joy.id===e.pointerId)resetStick()});
const canvas=renderer.domElement,pickRay=new THREE.Raycaster();canvas.style.touchAction='none';
canvas.addEventListener('pointerdown',e=>{if(modalKind||look.id!==null)return;look.id=e.pointerId;look.selectOnly=e.pointerType==='touch'&&e.clientX<innerWidth*.35;look.x=look.startX=e.clientX;look.y=look.startY=e.clientY;cameraFollowCooldown=.85;canvas.setPointerCapture(e.pointerId);if(document.activeElement===cameraSlider)cameraSlider.blur()});
canvas.addEventListener('pointermove',e=>{if(look.id!==e.pointerId)return;if(!look.selectOnly){cameraYaw=wrapYaw(cameraYaw-(e.clientX-look.x)*.007);cameraPitch=clamp(cameraPitch+(e.clientY-look.y)*.0045,.1,1.05)}look.x=e.clientX;look.y=e.clientY;cameraFollowCooldown=.85});
canvas.addEventListener('pointerup',e=>{
 if(look.id!==e.pointerId)return;
 if(Math.hypot(e.clientX-look.startX,e.clientY-look.startY)<7){
  pickRay.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);
  const visibleMobs=enemies.filter(enemy=>enemy.dead<=0||enemy.corpseAge>0);
  const hits=pickRay.intersectObjects(visibleMobs.map(enemy=>enemy.root),true);
  if(hits.length){
   let obj=hits[0].object;
   while(obj.parent&&obj.parent!==scene)obj=obj.parent;
   const enemy=visibleMobs.find(m=>m.root===obj);
   if(enemy){if(enemy.dead>0)showCorpseLoot(enemy);else setTarget(enemy)}
  }else{
   const nodes=gatherNodes.filter(node=>gatherNodeAvailable(node));
   const resources=pickRay.intersectObjects(nodes.map(node=>node.root),true);
   if(resources.length){
    let obj=resources[0].object;
    while(obj.parent&&obj.parent!==scene)obj=obj.parent;
    const node=nodes.find(n=>n.root===obj);
    if(node)startGather(node);
   }
  }
 }
 finishLook();
});
for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(look.id===e.pointerId)finishLook()});
canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{if(!modalKind)setCameraDistance(cameraDistance+Math.sign(e.deltaY)*.5)},{passive:true});
addEventListener('blur',clearInput);addEventListener('pagehide',()=>{clearInput();save()});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();save()}last=performance.now();resetFps()});
addEventListener('keydown',e=>{
 const k=e.code==='KeyC'?'c':e.key.toLowerCase();
 if(k==='c'&&modalKind==='character'){e.preventDefault();if(!e.repeat)closeDialog();return}
 if(k==='escape'){e.preventDefault();if(modalKind)closeDialog();else if(selected)clearTarget();else pause();return}
 if(modalKind||e.target===cameraSlider)return;
 if(e.target instanceof HTMLButtonElement&&(k===' '||k==='enter'))return;
 if(['arrowup','arrowdown','arrowleft','arrowright',' ','tab'].includes(k))e.preventDefault();
 if(['1',' ','2','3','e','i','c','tab'].includes(k)){
  if(e.repeat)return;if(k==='1'||k===' ')attack();if(k==='2')stomp();if(k==='3')heal();if(k==='e')interact();if(k==='i')bag();if(k==='c')character();if(k==='tab')cycleTarget(e.shiftKey?-1:1);return;
 }
 keys.add(k);
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
let toastTimer;
function msg(text,duration=2600){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),duration)}
let combatWarningTimer=0,lastCombatWarning='',lastCombatWarningAt=-99;
function hideCombatWarning(){clearTimeout(combatWarningTimer);$('combatError').classList.remove('show');lastCombatWarning=''}
function combatWarning(text,force=false){
 if(!force&&text===lastCombatWarning&&clock-lastCombatWarningAt<1.9)return;
 lastCombatWarning=text;lastCombatWarningAt=clock;
 const box=$('combatError');clearTimeout(combatWarningTimer);
 box.textContent=text;box.classList.add('show');
 combatWarningTimer=setTimeout(()=>box.classList.remove('show'),1550);
}
function openDialog(title,sub,lines,kind='dialog'){if(gatherCast&&kind!=='gatherLoot')cancelGather();clearInput();resetFps();modalKind=kind;$('panel').classList.toggle('inventory-modal',kind==='bag');$('panel').classList.toggle('character-modal',kind==='character');$('panel').classList.toggle('merchant-modal',kind==='merchant');$('modalClose').hidden=false;if(characterView){characterView.drag=null;if(kind!=='character'){characterView.canvas=null;characterView.context=null}}$('cameraControl').hidden=kind!=='settings';$('graphicsControl').hidden=kind!=='graphics';$('mtitle').textContent=title;$('msub').textContent=sub;$('mbody').replaceChildren();$('choices').replaceChildren();for(const line of lines){const p=document.createElement('p');p.textContent=line;$('mbody').appendChild(p)}$('modal').hidden=false;$('interact').hidden=true}
function choice(label,fn,type=''){
 // Every modal has a red X at the top. Do not add redundant bottom-row
 // close/continue buttons; keep real actions and navigation controls.
 if(fn===closeDialog)return;
 const button=document.createElement('button');button.className='choice '+type;button.textContent=label;button.addEventListener('click',fn);$('choices').appendChild(button)}
function closeDialog(){modalKind=null;$('modal').hidden=true;$('panel').classList.remove('inventory-modal','character-modal','merchant-modal');$('modalClose').hidden=true;if(characterView){characterView.drag=null;characterView.canvas=null;characterView.context=null}$('cameraControl').hidden=true;$('graphicsControl').hidden=true;clearInput();resetFps();document.activeElement?.blur();save();updateHUD()}
function pause(){
 if(modalKind==='pause'){closeDialog();return}
 openDialog('У костра','NEXGAME · МУЛГОР · ALPHA 0.3.3',
 ['Мир поставлен на паузу. Здесь можно осмотреть героя, настроить камеру, графику и отображение FPS.',
  'W/S — идти вперёд и назад; A/D — непрерывно поворачивать; Tab — цель; 1 — автоатака.',
  'Обыскивай тела и надевай добычу из рюкзака (I). Оружейник Борун стоит у входа в лагерь: жёлтый квадрат на мини-карте.'], 'pause');
 choice('▶ Продолжить путь',closeDialog);
 choice('♙ Персонаж и экипировка',character);
 choice('⚙ Настройки камеры',cameraSettings);
 choice('Графика и FPS',graphicsSettings);
 choice('Начать заново',()=>{
  openDialog('Начать новый путь?','СБРОС ПРОГРЕССА',['Будут сброшены задания, уровень, собранная добыча, инвентарь и предметы этой версии Мулгора. Настройки камеры и графики сохранятся.']);
  choice('Сбросить прогресс',resetWorld,'danger');choice('Вернуться',pause,'alt');
 },'alt');
}
function cameraSettings(){
 openDialog('Настройки камеры','ПОВОРОТ И РАССТОЯНИЕ',
 ['Следование плавно разворачивает камеру за спину, сохраняя наклон вверх или вниз. При вращении пальцем оно приостанавливается и возвращается после отпускания. Наклон и расстояние сохраняются после перезагрузки.'],'settings');
 choice('← Назад в меню',pause,'alt');
 choice('▶ Продолжить игру',closeDialog);
}
function graphicsSettings(){
 openDialog('Графика и FPS','ПРОИЗВОДИТЕЛЬНОСТЬ',
 ['Выбери качество для своего устройства. Настройки применяются сразу и сохраняются. FPS отображается в нижнем правом углу во время игры.'],'graphics');
 choice('← Назад в меню',pause,'alt');
 choice('▶ Продолжить игру',closeDialog);
}
function resetWorld(){
 cancelGather();
 for(const node of gatherNodes){node.pending=false;node.readyAt=0;node.root.visible=false}
 state={...initial,inventory:[...initial.inventory],bags:[...initial.bags],equipment:startingEquipment(),buyback:[]};
 for(const e of enemies){
  e.hp=e.maxHp;e.dead=0;e.corpseAge=0;e.loot=[];e.lootMarker.visible=false;
  e.hit=0;e.aggro=false;e.stunned=0;e.attackCd=0;
  e.root.visible=true;e.shadow.visible=true;
  e.root.rotation.z=0;e.root.scale.setScalar(e.baseScale||1);
  e.root.position.set(e.spawnX,heightAt(e.spawnX,e.spawnZ),e.spawnZ);
  e.shadow.position.set(e.spawnX,heightAt(e.spawnX,e.spawnZ)+.055,e.spawnZ);
 }hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);hero.root.rotation.y=state.yaw;hero.phase=hero.walk=0;syncEquipmentVisuals();attackElapsed=stompElapsed=-1;attackCooldown=stompCooldown=0;selected=null;autoAttack=false;swingTarget=null;lastCombatAt=-100;hideCombatWarning();shockAge=9;cameraYaw=0;cameraFollowCooldown=0;closeDialog();msg('Новый путь начинается в лагере Нараче')}
function cancelGather(message=''){
 if(!gatherCast)return false;
 gatherCast=null;$('gatherCast').hidden=true;
 $('gatherCastFill').style.width='0%';
 animateTauren(hero,clock,0);
 if(message)msg(message);
 return true;
}
function startGather(node){
 if(!node||modalKind||gatherCast||!gatherNodeAvailable(node))return false;
 if(Math.hypot(state.x-node.x,state.z-node.z)>GATHER_INTERACT_RANGE){
  combatWarning('Слишком далеко для сбора',true);return false;
 }
 if(inCombat()){combatWarning('Нельзя собирать во время боя',true);return false}
 if(node.pending){openGatherLoot(node);return true}
 clearInput();autoAttack=false;attackElapsed=-1;swingTarget=null;attackCooldown=0;
 const dx=node.x-state.x,dz=node.z-state.z;
 hero.root.rotation.y=Math.atan2(dx,dz);state.yaw=hero.root.rotation.y;
 gatherCast={node,elapsed:0,hp:state.hp};
 const quest=GATHER_QUESTS[node.stage];
 $('gatherCastLabel').textContent='Сбор: '+ITEM_CATALOG[quest.item].name;
 $('gatherCastTime').textContent=GATHER_CAST_SECONDS.toFixed(1).replace('.',',')+' с';
 $('gatherCastFill').style.width='0%';
 $('gatherCast').setAttribute('aria-valuenow','0');
 $('gatherCast').hidden=false;$('interact').hidden=true;
 return true;
}
function updateGatherCast(dt){
 if(!gatherCast)return;
 const cast=gatherCast,node=cast.node;
 if(!gatherNodeAvailable(node)||Math.hypot(state.x-node.x,state.z-node.z)>GATHER_INTERACT_RANGE||
    inCombat()||state.hp<cast.hp){
  cancelGather('Сбор прерван');return;
 }
 cast.elapsed=Math.min(GATHER_CAST_SECONDS,cast.elapsed+dt);
 const percentage=cast.elapsed/GATHER_CAST_SECONDS*100;
 $('gatherCastFill').style.width=percentage.toFixed(1)+'%';
 $('gatherCast').setAttribute('aria-valuenow',String(Math.round(percentage)));
 $('gatherCastTime').textContent=Math.max(0,GATHER_CAST_SECONDS-cast.elapsed).toFixed(1).replace('.',',')+' с';
 animateTauren(hero,clock,dt,0,-1,-1,0,Math.min(1,cast.elapsed/.28));
 if(cast.elapsed>=GATHER_CAST_SECONDS){
  gatherCast=null;$('gatherCast').hidden=true;
  node.pending=true;openGatherLoot(node);
 }
}
function openGatherLoot(node){
 if(!node?.pending||!gatherNodeAvailable(node))return false;
 if(Math.hypot(state.x-node.x,state.z-node.z)>GATHER_INTERACT_RANGE){
  combatWarning('Слишком далеко для сбора',true);return false;
 }
 const def=ITEM_CATALOG[node.item];
 openDialog('Собранный ресурс','ДОБЫЧА С ЗЕМЛИ',
  ['Ты аккуратно собрал '+def.name.toLowerCase()+'. Забери предмет в рюкзак. Если сейчас нет места, закрой окно крестиком, освободи рюкзак и вернись к этому растению.'],'gatherLoot');
 const box=document.createElement('div');box.className='loot-list';
 const row=document.createElement('div');row.className='loot-item';
 row.textContent=def.icon+'  '+def.name+' ×1';
 box.appendChild(row);$('mbody').appendChild(box);
 choice('Забрать в рюкзак',()=>{
  if(!node.pending||!gatherNodeAvailable(node))return;
  if(!storeItem({id:node.item,qty:1})){msg('Рюкзак заполнен — освободи место');return}
  node.pending=false;node.readyAt=clock+GATHER_RESPAWN_SECONDS;
  updateGatherVisibility();closeDialog();updateHUD();
  const quest=GATHER_QUESTS[state.gatherStage],count=quest?gatherQuestCount():0;
  msg('Получено: '+def.name+(quest&&count>=quest.count?' · Возвращайся к Тихой Заре!':''));
 });
 return true;
}
function isLootableCorpse(e){return !!e&&e.dead>0&&Array.isArray(e.loot)&&e.loot.length>0}
function nearTarget(){
 let closest=null,dist=3.5;
 for(const n of npcs){const d=Math.hypot(state.x-n.x,state.z-n.z);if(d<dist){dist=d;closest={kind:'npc',npc:n}}}
 for(const e of enemies)if(isLootableCorpse(e)){
  const d=Math.hypot(state.x-e.root.position.x,state.z-e.root.position.z);
  if(d<dist&&d<LOOT_INTERACT_RANGE){dist=d;closest={kind:'corpse',enemy:e}}
 }
 if(state.quest===4){
  const d=Math.hypot(state.x-35,state.z+11.8);
  if(d<dist&&d<3.1)closest={kind:'relic'};
 }
 for(const node of gatherNodes){
  if(!gatherNodeAvailable(node))continue;
  const d=Math.hypot(state.x-node.x,state.z-node.z);
  if(d<dist&&d<GATHER_INTERACT_RANGE){dist=d;closest={kind:'gather',node}}
 }
 return closest;
}
function interact(){
 if(modalKind||gatherCast)return;
 const target=nearTarget();
 if(!target){msg('Подойди к жителю или предмету ближе');return}
 if(target.kind==='gather'){startGather(target.node);return}
 if(target.kind==='corpse'){showCorpseLoot(target.enemy);return}
 if(target.kind==='relic'){state.quest=5;state.relic=true;save();updateHUD();msg('Получено перо предков');return}
 if(target.npc.type==='mentor')mentorTalk();else if(target.npc.type==='armorer')merchantTalk();else traderTalk();
}
function xpNeed(){return 100+(state.level-1)*50}
function experience(n){state.xp+=n;while(state.xp>=xpNeed()){state.xp-=xpNeed();state.level++;state.hp=playerStats().maxHp;msg('Новый уровень: '+state.level+'!')}}
function mentorTalk(){
 const q=state.quest;
 if(q===0){
  openDialog('Первые шаги','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Приветствую тебя, молодой воин. Это первое из пяти испытаний лагеря Нараче.',
    'Для начала победи трёх долгоногов за лагерем.']);
  choice('Принять: Обряд силы (2/5)',()=>{state.quest=1;state.kills=0;closeDialog();msg('Задание принято: Обряд силы')});
  choice('Позже',closeDialog,'alt');
 }else if(q===1){
  openDialog('Обряд силы','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Победи трёх обычных равнинных долгоногов на дороге. Прогресс: '+state.kills+' / 3.']);
  choice('Продолжить охоту',closeDialog);
 }else if(q===2){
  openDialog('Обряд силы завершён','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Ты доказал силу. Впереди испытание внимательности и уважения к предкам.']);
  choice('Награда: 25 монет и 80 опыта',()=>{state.quest=3;state.gold+=25;experience(80);closeDialog();msg('Обряд силы пройден — 2/5')});
 }else if(q===3){
  openDialog('Голос предков','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['На востоке стоит древний тотем с бирюзовыми крыльями. Подбери перо предков рядом с ним и принеси мне.',
    'Награда: 40 монет и 110 опыта.']);
  choice('Принять: Голос предков (3/5)',()=>{state.quest=4;closeDialog();msg('Найди перо у восточного тотема')});
  choice('Позже',closeDialog,'alt');
 }else if(q===4){
  openDialog('Голос предков','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Иди по восточной тропе к высокому тотему с бирюзовыми крыльями. Ищи сияющее перо на земле.']);
  choice('Я вернусь',closeDialog);
 }else if(q===5){
  openDialog('Земля помнит','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Ты сохранил память предков. Но на дальних пастбищах замечены огромные следы.']);
  choice('Отдать перо: 40 монет и 110 опыта',()=>{state.quest=6;state.relic=false;state.gold+=40;experience(110);closeDialog();msg('Голос предков завершён — 3/5')});
 }else if(q===6){
  openDialog('Следы исполина','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Охотники заметили следы громадной птицы. Пройди по юго-восточной тропе и разведай дальнее пастбище.',
    'Найди каменную развилку на дальнем участке дороги. Награда: 50 монет и 95 опыта.']);
  choice('Принять: Следы исполина (4/5)',()=>{state.quest=7;closeDialog();msg('Разведай дальнюю тропу на юго-востоке')});
  choice('Позже',closeDialog,'alt');
 }else if(q===7){
  openDialog('Следы исполина','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Следуй по юго-восточной дороге от лагеря к дальнему пастбищу. Осмотри местность и возвращайся.']);
  choice('Продолжить разведку',closeDialog);
 }else if(q===8){
  openDialog('Донесение разведчика','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Теперь мы знаем, где бродит исполин. Ты хорошо справился, но впереди настоящее испытание.']);
  choice('Завершить: 50 монет и 95 опыта',()=>{state.quest=9;state.gold+=50;experience(95);closeDialog();msg('Следы исполина завершены — 4/5')});
 }else if(q===9){
  openDialog('Грозоклюв: вожак стада','ПОСЛЕДНЕЕ ИСПЫТАНИЕ · 5/5',
   ['На дальнем пастбище появился Грозоклюв — огромный долгоног. Он вдвое выносливее обычных птиц.',
    'Победи его и возвращайся. Красный пунктир укажет путь в мире и на мини-карте.',
    'Награда: 90 монет и 190 опыта.']);
  choice('Принять: Победить Грозоклюва (5/5)',()=>{state.quest=10;closeDialog();msg('Следуй по красному пунктиру к Грозоклюву')});
  choice('Позже',closeDialog,'alt');
 }else if(q===10){
  openDialog('Грозоклюв: вожак стада','ПОСЛЕДНЕЕ ИСПЫТАНИЕ · 5/5',
   ['Иди по красному пунктиру по юго-восточной дороге к Грозоклюву.',
    'У него 108 здоровья. Его удары сильнее, чем у обычных долгоногов.']);
  choice('Продолжить охоту',closeDialog);
 }else if(q===11){
  openDialog('Испытания завершены','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Грозоклюв повержен. Ты прошёл все пять испытаний и защитил лагерь Нараче!']);
  choice('Награда: 90 монет и 190 опыта',()=>{state.quest=12;state.gold+=90;experience(190);closeDialog();msg('Все 5 заданий завершены!')});
 }else{
  openDialog('Хранитель Мулгора','НАСТАВНИК КАМЕННЫЙ РОГ',
   ['Все пять заданий пройдены. Ты стал защитником лагеря Нараче.',
    'Продолжай путешествовать и собирать добычу. Впереди новые приключения.']);
  choice('До встречи',closeDialog);
 }
}
function herbalistGatherTalk(){
 const stage=state.gatherStage;
 if(stage===0){
  openDialog('Дары Мулгора','ТРАВНИЦА ТИХАЯ ЗАРЯ · НОВАЯ ЦЕПОЧКА',
   ['Помоги собрать лекарства для лагеря. Впереди три поручения: цветы, корни и грибы.',
    'Подойди к растению и нажми «Собрать». Сбор займёт полторы секунды, затем забери находку из окна добычи.']);
  choice('Принять: Цветы равнин (1/3)',()=>{
   state.gatherStage=1;save();closeDialog();updateHUD();
   msg('Найди четыре луговых цветка');
  });
  return;
 }
 if(stage>=4){
  openDialog('Дары Мулгора','ТРАВНИЦА ТИХАЯ ЗАРЯ',
   ['Ты принёс все травы, корни и грибы. Лагерю хватит лекарств. Спасибо, странник!']);
  return;
 }
 const q=GATHER_QUESTS[stage],count=gatherQuestCount();
 openDialog(q.title,'СОБИРАТЕЛЬСТВО · '+stage+' / 3',
  [q.intro,'Собрано: '+count+' / '+q.count+'. '+q.hint,
   count>=q.count?'Все ингредиенты в рюкзаке. Можно сдать их травнице.':'Подойди к светящимся ресурсам на земле и нажми «Собрать».']);
 if(count>=q.count){
  choice('Сдать '+q.count+' шт. · +'+q.gold+' монет, +'+q.xp+' опыта',()=>{
   if(!consumeGatherQuestItems(stage)){msg('Недостаточно нужных предметов');herbalistGatherTalk();return}
   state.gold+=q.gold;experience(q.xp);state.gatherStage=stage+1;
   save();updateGatherVisibility();closeDialog();updateHUD();
   msg(stage===3?'Цепочка «Дары Мулгора» завершена!':'Сбор выполнен! У Тихой Зари есть новое поручение.');
  });
 }else choice('Открыть рюкзак',bag,'alt');
}
function traderTalk(){
 openDialog('Травница Тихая Заря','ПРИПАСЫ И СБОР РЕСУРСОВ',
  ['Настой луговых трав восстанавливает 55 здоровья. Цена — 10 монет.',
   'В твоём кошеле '+state.gold+' монет.']);
 if(state.gatherStage<4){
  const q=GATHER_QUESTS[state.gatherStage];
  choice(q?'🌿 Задание: '+q.title+' ('+gatherQuestCount()+'/'+q.count+')':'🌿 Новая цепочка: Дары Мулгора',herbalistGatherTalk);
 }else choice('✓ Дары Мулгора завершены',herbalistGatherTalk,'alt');
 choice('Купить настой — 10 монет',()=>{
  if(state.gold<10){msg('Недостаточно монет');return}
  state.gold-=10;state.potions++;closeDialog();msg('Лечебный настой добавлен в рюкзак');
 });
}
function bag(){
 if(modalKind==='bag'){closeDialog();return}
 openDialog('Рюкзак странника','ТАУРЕН · ВОИН · УРОВЕНЬ '+state.level,[],'bag');
 renderInventory();
 choice('🧪 Выпить лечебный настой ('+state.potions+')',()=>{if(heal(true))closeDialog()});
 choice('Персонаж и экипировка',character,'alt');
 if(Math.hypot(state.x-6,state.z-11)<3.5)choice('Вернуться к Боруну',merchantTalk,'alt');
 choice('Закрыть рюкзак',closeDialog,'alt');
}
function discardInventorySlot(index){
 if(!Number.isInteger(index)||index<0||index>=state.inventory.length||!state.inventory[index])return false;
 state.inventory[index]=null;save();return true;
}
function renderInventory(){
 const body=$('mbody');body.replaceChildren();
 const occupied=itemOccupancy(),capacity=inventoryCapacity();
 const summary=document.createElement('div');summary.className='inventory-summary';
 summary.textContent='Ячейки: '+occupied+' / '+capacity+' · Монеты: '+state.gold+' · Настои: '+state.potions;
 body.appendChild(summary);
 const grid=document.createElement('div');grid.className='inventory-grid';
 const detail=document.createElement('div');detail.className='inventory-detail';
 detail.textContent='Нажми на предмет, чтобы узнать о нём больше.';
 for(let i=0;i<capacity;i++){
  const item=state.inventory[i],cell=document.createElement('button');
  cell.type='button';cell.className='inventory-slot'+(item?' occupied':' empty');
  if(item)cell.dataset.rarity=ITEM_CATALOG[item.id].rarity;
  cell.setAttribute('aria-label',item?ITEM_CATALOG[item.id].name+', '+item.qty+' шт.':'Пустая ячейка '+(i+1));
  if(item){
   const icon=document.createElement('span');icon.className='slot-icon';icon.textContent=ITEM_CATALOG[item.id].icon;
   const count=document.createElement('span');count.className='slot-count';count.textContent=item.qty>1?String(item.qty):'';
   cell.appendChild(icon);cell.appendChild(count);
   const label=document.createElement('span');label.className='slot-item-name';label.textContent=ITEM_CATALOG[item.id].name;cell.appendChild(label);
   cell.addEventListener('click',()=>{
    const def=ITEM_CATALOG[item.id];
    for(const button of grid.children)button.classList.remove('active');
    cell.classList.add('active');
    showItemDetails(detail,item.id,true);
    if(def.slot){
     const equip=document.createElement('button');equip.className='choice equip-button';equip.type='button';equip.textContent=state.level<(def.requiredLevel||1)?'Нужен уровень '+def.requiredLevel:'Надеть · '+EQUIPMENT_SLOTS.find(slot=>slot.id===def.slot).name;
     equip.disabled=state.level<(def.requiredLevel||1);equip.addEventListener('click',()=>{if(equipInventorySlot(i,item))renderInventory()});detail.appendChild(equip);
    }
    const del=document.createElement('button');
    del.className='inventory-delete';del.type='button';del.textContent='🗑 Удалить предмет';
    detail.appendChild(del);
    del.addEventListener('click',()=>{
     detail.replaceChildren();
     const question=document.createElement('div');question.className='inventory-confirm';
     question.textContent='Удалить '+def.name+' ×'+item.qty+'? Это действие нельзя отменить.';
     const yes=document.createElement('button');yes.type='button';yes.className='choice danger';yes.textContent='Удалить безвозвратно';
     const no=document.createElement('button');no.type='button';no.className='choice alt';no.textContent='Отмена';
     yes.addEventListener('click',()=>{
      if(state.inventory[i]!==item||!discardInventorySlot(i)){msg('Не удалось удалить предмет');return}
      renderInventory();msg('Предмет удалён: '+def.name);
     });
     no.addEventListener('click',()=>{cell.click()});
     question.appendChild(yes);question.appendChild(no);detail.appendChild(question);
    });
   });
  }else{
   const number=document.createElement('span');number.className='slot-empty-mark';number.textContent='·';
   cell.appendChild(number);
  }
  grid.appendChild(cell);
 }
 body.appendChild(grid);body.appendChild(detail);
 const title=document.createElement('div');title.className='bag-sockets-title';title.textContent='Дополнительные сумки ('+state.bags.filter(Boolean).length+' / '+EQUIPPED_BAG_SLOTS+')';body.appendChild(title);
 const sockets=document.createElement('div');sockets.className='bag-sockets';
 for(let i=0;i<EQUIPPED_BAG_SLOTS;i++){
  const entry=state.bags[i],socket=document.createElement('div');
  socket.className='bag-socket'+(entry?' equipped':'');
  socket.setAttribute('aria-label',entry?'Сумка '+(i+1)+', '+entry.slots+' дополнительных мест':'Место для сумки '+(i+1)+', пока недоступно');
  const glyph=document.createElement('span');glyph.className='bag-socket-icon';glyph.textContent=entry?'🎒':'＋';
  const sub=document.createElement('span');sub.textContent=entry?'+'+entry.slots+' мест':'Сумка '+(i+1);
  socket.appendChild(glyph);socket.appendChild(sub);sockets.appendChild(socket);
 }
 body.appendChild(sockets);
 const note=document.createElement('p');note.className='bag-sockets-note';
 note.textContent='Четыре места под сумки подготовлены. Сами сумки и их добычу добавим в следующих обновлениях.';
 body.appendChild(note);
}
function finishLoot(e){
 e.loot=[];e.lootMarker.visible=false;
 closeDialog();msg('Тело обыскано');
}
function renderCorpseLoot(e){
 if(!isLootableCorpse(e)){finishLoot(e);return}
 const body=$('mbody');body.replaceChildren();$('choices').replaceChildren();
 const intro=document.createElement('p');intro.className='loot-description';
 intro.textContent='На теле равнинного долгонога найдена добыча. Нажми на предмет, чтобы положить его в рюкзак.';
 body.appendChild(intro);
 const list=document.createElement('div');list.className='loot-list';
 for(let i=0;i<e.loot.length;i++){
  const row=e.loot[i],def=ITEM_CATALOG[row.id],button=document.createElement('button');
  button.className='loot-item';button.type='button';button.dataset.rarity=def.rarity;
  button.textContent=def.icon+'  '+def.name+(row.qty>1?' ×'+row.qty:'')+(def.slot?' — '+itemStatText(def)+(def.requiredLevel>1?' · Ур. '+def.requiredLevel:''):'');
  button.setAttribute('aria-label','Взять '+def.name+', '+row.qty+' шт.');
  button.addEventListener('click',()=>{
   if(e.loot[i]!==row)return;
   if(!storeItem(row)){msg('В рюкзаке недостаточно места');return}
   e.loot.splice(i,1);
   if(e.loot.length)renderCorpseLoot(e);else finishLoot(e);
   msg('Получено: '+def.name+(row.qty>1?' ×'+row.qty:''));
  });
  list.appendChild(button);
 }
 body.appendChild(list);
 choice('Забрать всё',()=>{
  let grabbed=0;
  for(let i=e.loot.length-1;i>=0;i--)if(storeItem(e.loot[i])){e.loot.splice(i,1);grabbed++}
  if(!grabbed){msg('В рюкзаке недостаточно места');return}
  if(e.loot.length)renderCorpseLoot(e);else finishLoot(e);
  msg('Собрано предметов: '+grabbed);
 });
 choice('Закрыть',closeDialog,'alt');
}
function showCorpseLoot(e){
 if(!e||e.dead<=0){msg('Тело уже исчезло');return}
 if(Math.hypot(state.x-e.root.position.x,state.z-e.root.position.z)>LOOT_INTERACT_RANGE){
  combatWarning('Слишком далеко',true);return;
 }
 if(!isLootableCorpse(e)){msg('На теле ничего нет');return}
 openDialog((e.name||'Добыча с долгонога'),'ОБЫСК ТЕЛА',[],'loot');
 renderCorpseLoot(e);
}
function heal(fromBag=false){if(modalKind&&!fromBag)return false;if(state.potions<=0){msg('Лечебные настои закончились');return false}const max=playerStats().maxHp;if(state.hp>=max){msg('Здоровье уже полное');return false}state.hp=Math.min(max,state.hp+55);state.potions--;save();updateHUD();msg('Луговые травы восстановили здоровье');return true}
// Melee combat: select first, validate distance and facing, then animate.
const MELEE_RANGE=3.45,TARGET_RANGE=35;
function isAliveTarget(e){return !!e&&e.dead<=0&&e.hp>0&&enemies.includes(e)}
function targetDistance(e){return Math.hypot(state.x-e.root.position.x,state.z-e.root.position.z)}
function nearestEnemy(range=TARGET_RANGE){
 let best=null,dist=range;
 for(const e of enemies)if(isAliveTarget(e)){const d=targetDistance(e);if(d<dist){dist=d;best=e}}
 return best;
}
function meleeFailure(e){
 if(!isAliveTarget(e))return 'Нет цели';
 const d=targetDistance(e);
 if(d>MELEE_RANGE)return 'Цель слишком далеко';
 if(d>.001){
  const dx=e.root.position.x-state.x,dz=e.root.position.z-state.z;
  const facing=Math.sin(hero.root.rotation.y)*dx+Math.cos(hero.root.rotation.y)*dz;
  if(facing<d*.04)return 'Цель не перед вами';
 }
 return '';
}
function clearTarget(){
 selected=null;autoAttack=false;swingTarget=null;
 attackElapsed=-1;attackCooldown=0;
 hideCombatWarning();updateHUD();
}
function setTarget(e){
 if(!isAliveTarget(e)){clearTarget();return}
 selected=e;hideCombatWarning();updateHUD();
}
function cycleTarget(step=1){
 if(modalKind)return;
 const candidates=enemies.filter(e=>isAliveTarget(e)&&targetDistance(e)<=TARGET_RANGE)
   .sort((a,b)=>targetDistance(a)-targetDistance(b)||a.index-b.index);
 if(!candidates.length){combatWarning('Нет доступных целей',true);return}
 const current=candidates.indexOf(selected);
 const next=current<0?candidates[0]:candidates[(current+step+candidates.length)%candidates.length];
 setTarget(next);
}
function tryAutoSwing(){
 if(!autoAttack||modalKind||stompElapsed>=0||attackElapsed>=0||attackCooldown>0)return false;
 if(!isAliveTarget(selected)){autoAttack=false;selected=null;swingTarget=null;updateHUD();return false}
 const fail=meleeFailure(selected);
 if(fail){combatWarning(fail);return false}
 attackElapsed=0;attackCooldown=playerStats().speed;attackLanded=false;swingTarget=selected;
 hideCombatWarning();return true;
}
function attack(){
 if(modalKind||gatherCast)return;
 if(autoAttack){autoAttack=false;hideCombatWarning();updateHUD();return}
 if(!isAliveTarget(selected)){
  const e=nearestEnemy(TARGET_RANGE);
  if(!e){combatWarning('Нет цели',true);return}
  setTarget(e);
 }
 autoAttack=true;
 const fail=meleeFailure(selected);
 if(fail)combatWarning(fail,true);else tryAutoSwing();
 updateHUD();
}
function damageEnemy(e,amount){
 if(!isAliveTarget(e))return;
 lastCombatAt=clock;
 e.hp-=amount;e.aggro=true;e.hit=.22;
 if(e.hp<=0){
  e.hp=0;e.dead=CORPSE_DURATION;e.corpseAge=0;e.aggro=false;
  e.loot=e.boss?[{id:'giantFeather',qty:1},...rollCorpseLoot(e)]:rollCorpseLoot(e);
  e.root.visible=true;e.shadow.visible=true;
  e.lootMarker.visible=e.loot.length>0;
  e.lootMarker.position.set(e.root.position.x,heightAt(e.root.position.x,e.root.position.z)+1.35,e.root.position.z);
  state.gold+=e.boss?12:4;experience(e.boss?70:22);
  if(e.boss&&state.quest===10){
   state.quest=11;msg('Грозоклюв повержен! Вернись к наставнику.');
  }
  if(state.quest===1&&!e.boss){
   state.kills=Math.min(3,state.kills+1);
   if(state.kills===3){state.quest=2;msg('Обряд силы: вернись к наставнику')}
  }
  if(selected===e){
   selected=null;autoAttack=false;swingTarget=null;attackElapsed=-1;attackCooldown=0;hideCombatWarning();
  }
  save();
 }
 updateHUD();
}
function stomp(){if(modalKind||gatherCast||stompCooldown>0||attackElapsed>=0)return;stompElapsed=0;stompCooldown=8;stompLanded=false}
$('attack').addEventListener('pointerdown',e=>{e.preventDefault();attack()});$('stomp').addEventListener('pointerdown',e=>{e.preventDefault();stomp()});
// Native click covers keyboard activation without doubling pointer attacks.
for(const [id,fn] of [['attack',attack],['stomp',stomp]])$(id).addEventListener('click',e=>{if(e.detail===0)fn()});
// iPhone multi-touch: the target button must work while another pointer
// owns the movement joystick. Native click may be suppressed by Safari then.
function bindImmediateButton(id,action){
 const button=$(id);
 let lastPointerActivation=-1000;
 button.addEventListener('pointerdown',e=>{
  if(e.button!==undefined&&e.button!==0)return;
  e.preventDefault();e.stopPropagation();
  lastPointerActivation=performance.now();
  action();
 });
 // Some Safari builds synthesize detail=0 clicks after a touch. Ignore those
 // for a short grace period, but retain keyboard/accessibility activation.
 button.addEventListener('click',e=>{
  if(e.detail===0&&performance.now()-lastPointerActivation>450)action();
 });
}
bindImmediateButton('targetNext',()=>cycleTarget());
bindImmediateButton('targetClear',clearTarget);
// Gathering, looting and NPC interactions work with a second finger on iPhone.
bindImmediateButton('interact',interact);
$('heal').addEventListener('click',()=>heal());$('bag').addEventListener('click',bag);$('character').addEventListener('click',character);$('modalClose').addEventListener('click',closeDialog);$('pause').addEventListener('click',pause);
const questLines=[
 ['Первые шаги','Поговорите с наставником у большого тотема.'],
 ['Обряд силы','Победите обычных долгоногов: 0 / 3'],
 ['Обряд силы','Вернитесь к наставнику за наградой.'],
 ['Голос предков','Поговорите с наставником.'],
 ['Голос предков','Найдите перо возле восточного тотема.'],
 ['Голос предков','Отнесите перо наставнику.'],
 ['Следы исполина','Поговорите с наставником, чтобы начать разведку.'],
 ['Следы исполина','Разведайте дальнее пастбище по юго-восточной тропе.'],
 ['Следы исполина','Разведка завершена. Вернитесь к наставнику.'],
 ['Грозоклюв, вожак стада','Поговорите с наставником о финальной охоте.'],
 ['Грозоклюв, вожак стада','Следуйте по красному пунктиру и убейте Грозоклюва (0 / 1).'],
 ['Грозоклюв, вожак стада','Грозоклюв повержен! Вернитесь к наставнику.'],
 ['Все испытания пройдены','Вы завершили цепочку из пяти заданий.']
];
let lastMarker='';
function updateHUD(){const max=playerStats().maxHp;$('levelBadge').textContent=state.level;$('hpText').textContent=Math.ceil(state.hp)+' / '+max;$('hpFill').style.width=state.hp/max*100+'%';$('xpFill').style.width=Math.min(100,state.xp/xpNeed()*100)+'%';$('xpText').textContent='Опыт '+state.xp+' / '+xpNeed();$('potionCount').textContent='Настой · '+state.potions;$('rageText').textContent=inCombat()?'В бою':state.hp<max?(clock-lastCombatAt<HEALTH_REGEN_DELAY?'Отдых после боя':'Восстановление'):'Готов к бою';$('qtitle').textContent=questLines[state.quest][0];$('qtext').textContent=state.quest===1?'Равнинные долгоноги: '+state.kills+' / 3':questLines[state.quest][1];
 const camp=Math.hypot(state.x+3,state.z-3)<23;$('area').textContent=camp?'Лагерь Нараче':'Плато Красного Облака';$('mapLabel').textContent=camp?'Лагерь Нараче':'Мулгор';
 const questNumber=state.quest===0?1:state.quest<=2?2:state.quest<=5?3:state.quest<=8?4:5;
 $('quest-progress').textContent=state.quest===12?'Цепочка · 5 / 5 ✓':'Цепочка · '+questNumber+' / 5';
 const gatherPanel=$('gatherQuestTracker');gatherPanel.hidden=state.gatherStage===0;
 if(state.gatherStage>0){
  const stage=state.gatherStage;
  $('gatherQuestStage').textContent=stage===4?'Сбор · 3 / 3 ✓':'Сбор · '+stage+' / 3';
  const q=GATHER_QUESTS[stage],count=q?gatherQuestCount():0;
  $('gatherQuestTitle').textContent=q?q.title:'Дары Мулгора завершены';
  $('gatherQuestText').textContent=q?(count>=q.count?
   'Собрано '+count+'/'+q.count+' · Вернись к Тихой Заре.':
   'Собрано '+count+'/'+q.count+' · '+q.hint):
   'Все три поручения травницы выполнены.';
 }
 updateGatherVisibility();
 const guide=$('questGuidance');
 guide.hidden=state.quest!==7&&state.quest!==10;
 if(state.quest===7)guide.textContent='Разведка: идите на юго-восток по дороге.';
 if(state.quest===10)guide.textContent='Красный пунктир ведёт к Грозоклюву · 108 HP';
 bossGuide.visible=state.quest===10;
 const target=nearTarget();$('interact').hidden=Boolean(modalKind)||!!gatherCast||!target;
 if(target)$('interact').innerHTML=target.kind==='gather'?(target.node.pending?'Забрать <kbd>E</kbd>':'Собрать <kbd>E</kbd>'):
 target.kind==='corpse'?'Обыскать <kbd>E</kbd>':target.kind==='relic'?'Взять перо <kbd>E</kbd>':'Поговорить <kbd>E</kbd>';
 const valid=isAliveTarget(selected);
 $('targetFrame').hidden=!valid;$('zoneTitle').hidden=Boolean(valid);
 $('attack').classList.toggle('auto-attacking',autoAttack);
 $('attack').setAttribute('aria-pressed',String(autoAttack));
 $('attackLabel').textContent=autoAttack?'Стоп':'Автоатака';
 $('targetNext').classList.toggle('target-selected',valid);
 if(valid){
  const dist=targetDistance(selected),problem=meleeFailure(selected);
  $('targetName').textContent=selected.name+(selected.boss?' · 5 · Элитный':' · 1');
  $('targetFill').style.width=Math.max(0,selected.hp/selected.maxHp*100)+'%';
  $('targetHp').textContent=Math.ceil(selected.hp)+' / '+selected.maxHp;
  $('targetDistance').textContent='Дистанция: '+dist.toFixed(1).replace('.',',')+' м · удар до '+MELEE_RANGE.toFixed(1).replace('.',',')+' м';
  const status=autoAttack?(problem?'Автоатака: '+problem.toLowerCase():'Автоатака включена'):(problem||'В зоне удара');
  $('targetStatus').textContent=status;
  $('targetStatus').className=problem?(problem.includes('далеко')?'target-far':'target-back'):(autoAttack?'target-active':'target-ready');
 }
 const marker=[0,3,6,9].includes(state.quest)?'!':[2,5,8,11].includes(state.quest)?'?':'·';questMarker.visible=state.quest!==12;if(marker!==lastMarker){lastMarker=marker;const c=questMarker.material.map.image,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 72px Georgia';ctx.lineWidth=5;ctx.strokeStyle='#3a2c19';ctx.fillStyle=marker==='·'?'#b4b395':'#ffe180';ctx.strokeText(marker,256,48);ctx.fillText(marker,256,48);questMarker.material.map.needsUpdate=true}relic.visible=state.quest===4;relicShadow.visible=relic.visible;
}
const minimap=$('minimap'),mapCtx=minimap.getContext('2d');
function drawMap(){const c=mapCtx,s=240,k=4.1;c.clearRect(0,0,s,s);c.fillStyle='#788252';c.fillRect(0,0,s,s);c.save();c.translate(s/2,s/2);c.fillStyle='#6d774b';for(let i=0;i<8;i++){c.beginPath();c.ellipse(Math.sin(i*1.6)*90,Math.cos(i*1.6)*90,38,17,i,0,TAU);c.fill()}c.translate(-state.x*k,-state.z*k);c.strokeStyle='#c0ae71';c.lineWidth=7;c.lineCap='round';for(const route of routes){c.beginPath();route.forEach(([x,z],i)=>i?c.lineTo(x*k,z*k):c.moveTo(x*k,z*k));c.stroke()}
 if(state.quest===10){
  c.save();c.setLineDash([7,5]);c.lineWidth=3;c.strokeStyle='#e8443e';c.beginPath();
  bossWaypoints.forEach(([x,z],i)=>i?c.lineTo(x*k,z*k):c.moveTo(x*k,z*k));c.stroke();c.restore();
 }
 if(state.quest===7){
  c.fillStyle='#fff0a9';c.beginPath();c.arc(SCOUT_X*k,SCOUT_Z*k,5,0,TAU);c.fill();
 }
 for(const node of gatherNodes)if(gatherNodeAvailable(node)){
  c.fillStyle=node.stage===1?'#ffe78a':node.stage===2?'#bfec81':'#d6b8ff';
  c.beginPath();c.arc(node.x*k,node.z*k,3.2,0,TAU);c.fill();
 }
 c.fillStyle='#ffe397';c.fillRect(6*k-4,11*k-4,8,8);c.strokeStyle='#573c18';c.strokeRect(6*k-4,11*k-4,8,8);
 for(const p of mapLandmarks){c.fillStyle=p.color;c.beginPath();c.arc(p.x*k,p.z*k,Math.max(3,p.r*k),0,TAU);c.fill();c.strokeStyle='#4e4e30';c.lineWidth=1;c.stroke()}c.fillStyle='#4f8d85';c.beginPath();c.ellipse(26*k,29*k,6*k,3*k,0,0,TAU);c.fill();for(const e of enemies){if(e.dead<=0){
  c.fillStyle=e.boss?'#d33f39':e.aggro?'#b94f35':'#d8c073';
  c.beginPath();c.arc(e.root.position.x*k,e.root.position.z*k,e.boss?5:2.5,0,TAU);c.fill();
  if(e.boss&&state.quest===10){c.strokeStyle='#ffe4b5';c.lineWidth=1.5;c.stroke()}
 }else if(isLootableCorpse(e)){c.fillStyle='#ffe6a0';c.beginPath();c.arc(e.root.position.x*k,e.root.position.z*k,3.8,0,TAU);c.fill()}}if(state.quest<12){c.fillStyle='#fff397';c.font='bold 19px Georgia';c.textAlign='center';c.fillText([2,5,8,11].includes(state.quest)?'?':'!',-1.5*k,-5*k-5)}if(state.quest===4){c.fillStyle='#a6ffeb';c.beginPath();c.arc(35*k,-11.8*k,5,0,TAU);c.fill()}c.restore();c.save();c.translate(120,120);c.rotate(-hero.root.rotation.y);c.fillStyle='#fff1b5';c.strokeStyle='#463723';c.lineWidth=2;c.beginPath();c.moveTo(0,10);c.lineTo(-6,-7);c.lineTo(0,-3);c.lineTo(6,-7);c.closePath();c.fill();c.stroke();c.restore()}
function movement(dt){
 // Classic-style controls: vertical stick walks along the hero's own heading,
 // horizontal stick continuously ROTATES the hero while held.
 // Both axes can be used simultaneously for walking arcs.
 const ax=joy.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
 const az=joy.y+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
 const turnInput=clamp(ax,-1,1),forwardInput=clamp(-az,-1,1);
 const turnSpeed=2.45; // radians/second; not a target angle
 let turn=0;
 if(Math.abs(turnInput)>.04){
  turn=-turnInput*turnSpeed*dt;
  const nextYaw=hero.root.rotation.y+turn;
  hero.root.rotation.y=Math.atan2(Math.sin(nextYaw),Math.cos(nextYaw));
  state.yaw=hero.root.rotation.y;
 }
 const speed=stompElapsed>=0?0:4.05;
 const forwardSpeed=forwardInput*speed;
 const dx=Math.sin(hero.root.rotation.y)*forwardSpeed;
 const dz=Math.cos(hero.root.rotation.y)*forwardSpeed;
 if(Math.abs(forwardInput)<.04||speed===0){
  // No drift when rotating on the spot or after releasing the stick.
  velocityX=velocityZ=0;
 }else{
  velocityX=THREE.MathUtils.damp(velocityX,dx,10,dt);
  velocityZ=THREE.MathUtils.damp(velocityZ,dz,10,dt);
 }
 const prevX=state.x,prevZ=state.z,nx=state.x+velocityX*dt,nz=state.z+velocityZ*dt;
 if(clearAt(nx,nz)){state.x=nx;state.z=nz}
 else if(clearAt(nx,state.z)){state.x=nx;velocityZ=0}
 else if(clearAt(state.x,nz)){state.z=nz;velocityX=0}
 else velocityX=velocityZ=0;
 const travelled=Math.hypot(state.x-prevX,state.z-prevZ);
 if(travelled>.00005)hero.phase=(hero.phase+travelled/2.67)%1;
 hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);
 animateTauren(hero,clock,dt,clamp(travelled/(dt*4.05||1),0,1),attackElapsed>=0?attackElapsed/.8:-1,stompElapsed>=0?stompElapsed/.75:-1,turn);
}
function revive(){cancelGather();lastCombatAt=clock;state.hp=playerStats().maxHp;state.x=initial.x;state.z=initial.z;selected=null;autoAttack=false;swingTarget=null;hideCombatWarning();attackElapsed=stompElapsed=-1;attackCooldown=0;for(const e of enemies)e.aggro=false;clearInput();hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);save();msg('Духи вернули тебя к костру. Твой путь продолжается.',3600)}
function updateEnemy(e,dt){
 if(e.dead>0){
  if(e.boss&&e.nameTag)e.nameTag.visible=false;
  e.dead=Math.max(0,e.dead-dt);e.corpseAge+=dt;
  const fall=smooth(0,CORPSE_FALL_TIME,e.corpseAge);
  // Tilt the whole bird onto the ground instead of instantly hiding it.
  e.root.rotation.z=-1.34*fall;
  e.root.position.y=heightAt(e.root.position.x,e.root.position.z)+.13*fall;
  e.legs[0].rotation.x=-.55*fall;
  e.legs[1].rotation.x=.3*fall;
  if(e.lootMarker.visible){
   e.lootMarker.position.set(e.root.position.x,heightAt(e.root.position.x,e.root.position.z)+1.1+Math.sin(clock*3.6)*.13,e.root.position.z);
  }
  if(e.dead<=0){
   e.dead=0;e.corpseAge=0;e.hp=e.maxHp;e.loot=[];
   e.lootMarker.visible=false;e.root.visible=e.shadow.visible=true;if(e.boss&&e.nameTag)e.nameTag.visible=true;
   e.aggro=false;e.stunned=0;e.attackCd=0;e.hit=0;
   e.root.rotation.z=0;e.root.scale.setScalar(e.baseScale||1);
   e.legs[0].rotation.x=e.legs[1].rotation.x=0;
   e.root.position.set(e.spawnX,heightAt(e.spawnX,e.spawnZ),e.spawnZ);
   e.shadow.position.set(e.spawnX,heightAt(e.spawnX,e.spawnZ)+.055,e.spawnZ);
  }
  return;
 }
 e.hit=Math.max(0,e.hit-dt);e.stunned=Math.max(0,e.stunned-dt);e.attackCd=Math.max(0,e.attackCd-dt);e.roamTime+=dt;const p=e.root.position,dist=Math.hypot(state.x-p.x,state.z-p.z),home=Math.hypot(state.x-e.spawnX,state.z-e.spawnZ);
 if(e.aggro&&(home>19||dist>22)){e.aggro=false;e.hp=e.maxHp}
 let tx=e.spawnX+Math.sin(e.roamTime*.18+e.index)*2.2,tz=e.spawnZ+Math.cos(e.roamTime*.14+e.index)*2.2,speed=.42;
 if(e.aggro){tx=state.x;tz=state.z;speed=e.boss?1.75:2.1}
 const d=Math.hypot(tx-p.x,tz-p.z),oldX=p.x,oldZ=p.z;
 if(d>(e.aggro?(e.boss?2.75:1.75):.25)&&e.stunned===0){const dx=(tx-p.x)/d*speed*dt,dz=(tz-p.z)/d*speed*dt;if(clearAt(p.x+dx,p.z+dz,.36)){p.x+=dx;p.z+=dz}else if(clearAt(p.x+dx,p.z,.36))p.x+=dx;else if(clearAt(p.x,p.z+dz,.36))p.z+=dz;const goal=Math.atan2(dx,dz);e.root.rotation.y+=Math.atan2(Math.sin(goal-e.root.rotation.y),Math.cos(goal-e.root.rotation.y))*(1-Math.exp(-dt*6))}
 if(e.aggro&&dist<(e.boss?3:2.1)&&e.attackCd===0&&e.stunned===0){lastCombatAt=clock;state.hp-=incomingDamage(e,e.boss?14:9);e.attackCd=e.boss?1.8:1.5;if(state.hp<=0)revive()}
 if(e.boss&&e.nameTag){e.nameTag.visible=true;e.nameTag.position.set(p.x,heightAt(p.x,p.z)+4.65,p.z)}
  const moved=Math.hypot(p.x-oldX,p.z-oldZ);e.phase+=moved*4;p.y=heightAt(p.x,p.z);const stride=Math.sin(e.phase),power=Math.min(1,moved/(dt||1));e.legs[0].rotation.x=stride*.48*power;e.legs[1].rotation.x=-stride*.48*power;e.body.position.y=1.23+Math.abs(stride)*.025*power;e.body.rotation.x=e.attackCd>1.2?Math.sin((1.5-e.attackCd)/.3*Math.PI)*.2:0;e.body.rotation.z=e.stunned>0?Math.sin(clock*8)*.08:0;
 e.shadow.position.set(p.x,p.y+.055,p.z);
}
// After leaving combat, health gradually returns without consuming potions.
const HEALTH_REGEN_DELAY=5,HEALTH_REGEN_RATE=3;
function inCombat(){
 // Recent damage delays regeneration, but does not keep a finished fight active.
 // Otherwise opening a paused loot/backpack window can lock equipment indefinitely.
 const threat=enemies.some(e=>e.dead<=0&&e.hp>0&&e.aggro);
 const swinging=attackElapsed>=0&&isAliveTarget(swingTarget);
 const preparingStomp=stompElapsed>=0&&!stompLanded&&enemies.some(e=>isAliveTarget(e)&&targetDistance(e)<4.5);
 return threat||swinging||preparingStomp;
}
function updateHealthRegen(dt){
 if(inCombat()||clock-lastCombatAt<HEALTH_REGEN_DELAY||dt<=0)return;
 const max=playerStats().maxHp;
 if(state.hp<max)state.hp=Math.min(max,state.hp+HEALTH_REGEN_RATE*dt);
}
const camFocus=new THREE.Vector3(state.x,heightAt(state.x,state.z)+2.15,state.z),camTarget=new THREE.Vector3(),camDirection=new THREE.Vector3(),camRay=new THREE.Raycaster();
function animateCamera(dt){
 // Follow only the yaw behind the character. Manual orbit remains available.
 if(cameraFollow&&!modalKind){
  cameraFollowCooldown=Math.max(0,cameraFollowCooldown-dt);
  if(!modalKind&&look.id===null&&cameraFollowCooldown<=0){
   const behindYaw=hero.root.rotation.y+Math.PI;
   const yawDifference=Math.atan2(Math.sin(behindYaw-cameraYaw),Math.cos(behindYaw-cameraYaw));
   cameraYaw=wrapYaw(cameraYaw+yawDifference*(1-Math.exp(-dt*3.8)));
  }
 }
 camTarget.set(state.x,heightAt(state.x,state.z)+2.15,state.z);camFocus.lerp(camTarget,1-Math.exp(-dt*12));camDirection.set(Math.sin(cameraYaw)*Math.cos(cameraPitch),Math.sin(cameraPitch),Math.cos(cameraYaw)*Math.cos(cameraPitch));
 camRay.set(camFocus,camDirection);camRay.far=Math.max(cameraDistance,actualCameraDistance);let distance=camRay.far;const hits=camRay.intersectObjects(cameraBlockers,false);if(hits.length)distance=Math.min(distance,Math.max(1.15,hits[0].distance-.35));
 for(let d=1.1;d<distance;d+=.55){const x=camFocus.x+camDirection.x*d,z=camFocus.z+camDirection.z*d,y=camFocus.y+camDirection.y*d;if(y<heightAt(x,z)+.5){distance=Math.max(1.1,d-.55);break}}
 // Smooth user zoom; approaching an obstacle still retracts the camera immediately.
 actualCameraDistance=Math.min(distance,THREE.MathUtils.damp(actualCameraDistance,Math.min(cameraDistance,distance),8,dt));camera.position.copy(camFocus).addScaledVector(camDirection,actualCameraDistance);camera.position.y=Math.max(camera.position.y,heightAt(camera.position.x,camera.position.z)+.4);camera.lookAt(camFocus);
 sun.position.set(state.x-30,48,state.z+22);sun.target.position.set(state.x,0,state.z);sun.target.updateMatrixWorld();
}
const attackOverlay=$('attack').querySelector('.cooldown'),stompOverlay=$('stomp').querySelector('.cooldown');
function update(dt){clock+=dt;saveClock+=dt;hudClock+=dt;attackCooldown=Math.max(0,attackCooldown-dt);stompCooldown=Math.max(0,stompCooldown-dt);
 if(attackElapsed>=0){
  attackElapsed+=dt;
  if(attackElapsed>=.34&&!attackLanded){
   attackLanded=true;
   if(isAliveTarget(swingTarget)&&!meleeFailure(swingTarget))damageEnemy(swingTarget,rollMeleeDamage());
  }
  if(attackElapsed>=.8){attackElapsed=-1;swingTarget=null}
 }
 if(stompElapsed>=0){stompElapsed+=dt;if(stompElapsed>=.36&&!stompLanded){stompLanded=true;shockAge=0;stompRing.position.set(state.x,heightAt(state.x,state.z)+.08,state.z);for(const e of enemies)if(e.dead<=0&&Math.hypot(state.x-e.root.position.x,state.z-e.root.position.z)<4.5){e.stunned=2.5;damageEnemy(e,6)}}if(stompElapsed>=.75)stompElapsed=-1}
 if(gatherCast){
  velocityX=velocityZ=0;
  hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);
 }else movement(dt);
 if(state.quest===7&&Math.hypot(state.x-SCOUT_X,state.z-SCOUT_Z)<5.2){
  state.quest=8;save();msg('Следы исполина найдены! Вернись к наставнику.');
 }
 enemies.forEach(e=>updateEnemy(e,dt));if(gatherCast)updateGatherCast(dt);updateHealthRegen(dt);if(autoAttack&&!gatherCast)tryAutoSwing();animateTauren(mentor,clock+.7,dt);animateTauren(trader,clock+2.4,dt);animateTauren(armorer,clock+1.4,dt);
 fire.scale.set(1+Math.sin(clock*7)*.035,1+Math.sin(clock*9)*.1,1);questMarker.position.set(-1.5,heightAt(-1.5,-5)+5.18+Math.sin(clock*2)*.09,-5);relic.rotation.y=clock*.45;relic.position.y=heightAt(35,-11.8)+1.3+Math.sin(clock*2)*.1;relicShadow.position.set(35,heightAt(35,-11.8)+.06,-11.8);
 selection.visible=isAliveTarget(selected);
 if(selection.visible){
  selection.position.set(selected.root.position.x,heightAt(selected.root.position.x,selected.root.position.z)+.06,selected.root.position.z);
  selection.material.color.setHex(meleeFailure(selected)?0xd97456:0xe9db84);
  selection.material.opacity=autoAttack?.96:.79;selection.scale.setScalar(selected.boss?1.65:1);
 }
 shockAge+=dt;stompRing.visible=shockAge<.6;if(stompRing.visible){stompRing.scale.setScalar(1+shockAge*7);stompRing.material.opacity=(1-shockAge/.6)*.7}
 attackOverlay.style.transform='scaleY('+clamp(attackCooldown/playerStats().speed,0,1)+')';stompOverlay.style.transform='scaleY('+clamp(stompCooldown/8,0,1)+')';$('rageFill').style.width=(1-clamp(attackCooldown/playerStats().speed,0,1))*100+'%';
 if(hudClock>.12){hudClock=0;updateHUD();drawMap()}if(saveClock>6){saveClock=0;save()}
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio||1,graphicsPresets[settings.quality].pixelRatio));renderer.setSize(innerWidth,innerHeight);clearInput();resetFps()});
function sampleFps(milliseconds){
 if(!settings.showFps||modalKind||document.hidden||milliseconds<=0)return;
 // Use real frame time: the physics timestep is capped and would overstate low FPS.
 fpsElapsed+=milliseconds;fpsFrames++;
 if(fpsElapsed>=1000){fpsCounter.textContent='FPS '+Math.round(fpsFrames*1000/fpsElapsed);fpsElapsed=fpsFrames=0}
}
let last=performance.now();function frame(t){const milliseconds=Math.max(0,t-last),dt=Math.min(milliseconds/1000,.05);last=t;if(!document.hidden){if(!modalKind)update(dt);animateCamera(dt);renderCharacterPreview(t,dt);renderer.render(scene,camera);sampleFps(milliseconds)}requestAnimationFrame(frame)}
update(0);updateHUD();drawMap();animateCamera(1);renderer.render(scene,camera);requestAnimationFrame(frame);$('loader').remove();
if(state.quest===0)msg('Мулгор. Поговори с наставником у большого тотема.',4400);
}catch(error){const text=$('loadText');if(text)text.textContent='Ошибка запуска: '+String(error.message||error);throw error}

