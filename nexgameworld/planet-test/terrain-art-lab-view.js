import * as THREE from 'three';
import {ART_LAB,artLabNormal,artLabWorldPoint,artLabBiomeHeight,
 artLabGroundDetails,artLabSurfaceQuality,artLabHeight} from './terrain-art-lab.js';
import {createArtLabTextures} from './terrain-art-materials.js';
import {createForestBarkTextures} from './forest-bark-texture.js';
import {createAncientPine} from './tree-library-ancient-pine.js?v=2';
import {TREE_LIBRARY,TREE_GALLERY_SITES,createForestLibraryTree}
 from './tree-library-forest-types.js?v=1';
import {createWeatheredStoneGeometry} from './stone-surface.js';
import {createStonewindShowcase} from './terrain-art-showcase.js?v=2';
import {createDetailedCrownGeometry,createRidgedBarkSegment,mergeBarkParts,
 createDetailedRockGeometry} from './terrain-art-asset-polish.js?v=1';

const R=ART_LAB.radius,PI=Math.PI,TAU=PI*2;
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const scene=new THREE.Scene();scene.background=new THREE.Color('#9aaea5');
scene.fog=new THREE.Fog('#a3b7a3',38,175);
const camera=new THREE.PerspectiveCamera(63,1,.18,1000);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'default'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.09;
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$('labViewport').appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label','Сферический художественный полигон NexGameWorld');
const UP=new THREE.Vector3(0,1,0),normal=new THREE.Vector3();
const sun=new THREE.DirectionalLight('#ffe1a8',2.85),hemi=new THREE.HemisphereLight('#d7e4c9','#364d48',1.19),
 fill=new THREE.DirectionalLight('#b7d4c6',.63);
sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-24;sun.shadow.camera.right=24;
sun.shadow.camera.top=24;sun.shadow.camera.bottom=-24;
sun.shadow.camera.near=1;sun.shadow.camera.far=105;
sun.shadow.bias=-.00035;sun.shadow.normalBias=.05;
scene.add(sun,sun.target,hemi,fill);
function at(x,z,offset=0){
 return new THREE.Vector3(...artLabWorldPoint(x,z,offset));
}
function nAt(x,z){
 return new THREE.Vector3(...artLabNormal(x,z));
}
function orient(group,x,z,h=0){
 const n=nAt(x,z);group.position.copy(at(x,z,h));
 group.quaternion.setFromUnitVectors(UP,n);return group;
}
const skyGeometry=new THREE.SphereGeometry(R,112,70);
const geoPos=skyGeometry.getAttribute('position'),broadColors=[];
const earth=new THREE.Color('#8b8862'),highland=new THREE.Color('#5c725e');
for(let i=0;i<geoPos.count;i++){
 normal.fromBufferAttribute(geoPos,i).normalize();
 const h=artLabBiomeHeight(normal.toArray());
 geoPos.setXYZ(i,normal.x*(R+h),normal.y*(R+h),normal.z*(R+h));
 const col=earth.clone().lerp(highland,
  clamp(.43+.28*Math.sin(normal.x*13+normal.y*7)*Math.sin(normal.z*9),0,1));
 broadColors.push(col.r,col.g,col.b);
}
skyGeometry.setAttribute('color',new THREE.Float32BufferAttribute(broadColors,3));
skyGeometry.computeVertexNormals();
const globe=new THREE.Mesh(skyGeometry,new THREE.MeshStandardMaterial({
 vertexColors:true,roughness:1,side:THREE.FrontSide
}));
scene.add(globe);
const divisions=132,vertices=[],uv=[],alpha=[],triangles=[];
for(let j=0;j<=divisions;j++)for(let i=0;i<=divisions;i++){
 const x=(i/divisions*2-1)*ART_LAB.halfSize,
  z=(j/divisions*2-1)*ART_LAB.halfSize;
 vertices.push(...artLabWorldPoint(x,z,.21));
 uv.push(i/divisions,j/divisions);
 const d=Math.max(Math.abs(x),Math.abs(z));
 const f=1-THREE.MathUtils.smoothstep(d,14.25,17);
 alpha.push(1,1,1,Math.max(0,f));
 if(i<divisions&&j<divisions){
  const a=j*(divisions+1)+i,b=a+divisions+1;
  triangles.push(a,a+1,b,b,a+1,b+1);
 }
}
const landGeo=new THREE.BufferGeometry();
landGeo.setIndex(triangles);
landGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
landGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
landGeo.setAttribute('color',new THREE.Float32BufferAttribute(alpha,4));
landGeo.computeVertexNormals();
const simpleLand=new THREE.MeshStandardMaterial({
 color:'#7c875e',vertexColors:true,roughness:1,transparent:true,depthWrite:false,
 side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2
});
const terrain=new THREE.Mesh(landGeo,simpleLand);terrain.receiveShadow=true;
terrain.name='original-art-lab-surface-no-collision';
scene.add(terrain);
const params=new URLSearchParams(location.search);
let quality='balanced',finished=true,artEnabled=true,asset=null,pbr=null;
let newTreesEnabled=params.get('tree')!=='before',dusk=params.get('light')==='dusk';
let selectedTree=TREE_LIBRARY.findIndex(t=>t.id===params.get('species'));
if(selectedTree<0)selectedTree=0;
const treeVariation=clamp(Number(params.get('variation'))||0,0,2)|0;
const grassData=artLabGroundDetails();
const decorBatches=[];
const tinted=(color,vertex=false)=>new THREE.MeshStandardMaterial({
 color,roughness:1,vertexColors:vertex,side:THREE.DoubleSide
});
// P2.4.3 — same four trees, now sculpted bark and leaf clusters.
const trunk=new THREE.MeshStandardMaterial({
 color:'#ad9a81',roughness:.98,metalness:0,vertexColors:true,side:THREE.DoubleSide
});
const bark=createForestBarkTextures(THREE);
if(bark?.map){trunk.map=bark.map;trunk.bumpMap=bark.bumpMap;
 trunk.bumpScale=.085;bark.map.repeat.set(1,3);bark.bumpMap.repeat.set(1,3);}
const leafMaterial=new THREE.MeshStandardMaterial({
 color:'#ffffff',roughness:1,metalness:0,vertexColors:true,side:THREE.DoubleSide
});
const crownNear=createDetailedCrownGeometry(THREE,{far:false}),
 crownLow=createDetailedCrownGeometry(THREE,{far:true});
const treeRoots=[],treeCrowns=[];
function branch(group,a,b,rStart=.20,rEnd=.10){
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
 const axis=end.clone().sub(start),len=axis.length();
 const part=new THREE.Mesh(createRidgedBarkSegment(THREE,rStart,rEnd,len),trunk);
 part.name='stonewind-original-ridged-branch-no-collision';
 part.position.copy(start).add(end).multiplyScalar(.5);
 part.quaternion.setFromUnitVectors(UP,axis.normalize());
 part.userData.barkPart=true;group.add(part);return part;
}
const leafTints=['#658162','#8b9e73','#5e8267','#9aa57c'];
for(let index=0;index<ART_LAB.treeSites.length;index++){
 const [x,z]=ART_LAB.treeSites[index],group=orient(new THREE.Group(),x,z);
 group.name='Ancient original stonewind cedar '+index;scene.add(group);
 const h=index===0?20.3:13.8+index*1.28;
 branch(group,[0,.25,0],[.38,h*.61,-.32],index===0?1.08:.74,.47);
 branch(group,[.38,h*.61,-.32],[.60,h,-.38],.49,.18);
 for(let j=0;j<(index===0?11:8);j++){
  const a=j*TAU/(index===0?11:8)+index*.19;
  const reach=(index===0?2.8:1.9)+(j%3)*.47;
  branch(group,[Math.sin(a)*.29,.28,Math.cos(a)*.29],
   [Math.sin(a)*reach,.16,Math.cos(a)*reach],index===0?.43:.33,.075);
 }
 const count=index===0?23:13;
 const canopy=new THREE.InstancedMesh(crownNear,leafMaterial,count);
 canopy.name='stonewind-original-cedar-folded-leaf-crowns';
 canopy.frustumCulled=false;canopy.castShadow=false;
 const dummy=new THREE.Object3D(),tint=new THREE.Color();
 for(let j=0;j<count;j++){
  const angle=j*TAU/count+index*.4,ry=h*(.55+(j%5)*.093);
  const radius=(index===0?3.7:2.3)+(j%4)*.53;
  dummy.position.set(Math.sin(angle)*radius,ry+.47,Math.cos(angle)*radius);
  dummy.scale.set((index===0?2.8:2.04)+(j%3)*.38,
   (index===0?2.30:1.65)+(j%2)*.48,
   (index===0?2.8:2.0)+(j%3)*.23);
  dummy.rotation.set(j*.2,j*.49,j*.18);dummy.updateMatrix();
  canopy.setMatrixAt(j,dummy.matrix);
  canopy.setColorAt(j,tint.set(leafTints[(j+index)%leafTints.length]));
  if(j%3===0)branch(group,[.25,h*.63,-.2],
   [dummy.position.x,ry,dummy.position.z],.19,.055);
 }
 canopy.instanceMatrix.needsUpdate=true;
 if(canopy.instanceColor)canopy.instanceColor.needsUpdate=true;
 const barkParts=group.children.filter(mesh=>mesh.userData?.barkPart);
 const merged=mergeBarkParts(THREE,barkParts);
 for(const part of barkParts){group.remove(part);part.geometry.dispose();}
 const stem=new THREE.Mesh(merged,trunk);
 stem.castShadow=true;stem.receiveShadow=true;
 stem.name='stonewind-merged-bark-no-collision';
 group.add(stem,canopy);
 treeRoots.push(group);treeCrowns.push(canopy);
}
// T2: five independently authored, reproducible species. Gallery replaces
// the art only; the original five trees remain to compare at identical sites.
const gallery= TREE_LIBRARY.map((entry,i)=>{
 const [x,z]=TREE_GALLERY_SITES[i];
 const groundHeight=(dx,dz)=>artLabHeight(x+dx,z+dz)-artLabHeight(x,z);
 const tree=i===0?createAncientPine(THREE,{seed:17+treeVariation*131,mapSize:1024,groundHeight}):
  createForestLibraryTree(THREE,{id:entry.id,seed:17+i*9+treeVariation*131,mapSize:512,groundHeight});
 orient(tree.group,x,z);scene.add(tree.group);
 return tree;
});
const heroPine=gallery[0];
const rockGeo=createDetailedRockGeometry(THREE);
const stoneMat=tinted('#dad7cb',true);
for(let i=0;i<ART_LAB.rockSites.length;i++){
 const [x,z]=ART_LAB.rockSites[i],cluster=orient(new THREE.Group(),x,z,.26);
 scene.add(cluster);
 for(let j=0;j<3;j++){
  const rock=new THREE.Mesh(rockGeo,stoneMat);
  rock.position.set(Math.sin(j*2.48)*(.75+j*.18),.22+j*.12,
   Math.cos(j*2.48)*(.6+j*.21));
  rock.scale.set(1.3-j*.15,.53+j*.23,1.15+j*.09);
  rock.rotation.y=j*1.75;rock.castShadow=true;rock.receiveShadow=true;
  cluster.add(rock);
 }
}
function shapedLeafGeometry(){
 const p=[],c=[];const push=(a,b,d,color)=>{
  p.push(...a,...b,...d);for(let j=0;j<3;j++)c.push(...color);
 };
 for(let j=0;j<6;j++){
  const a=j*TAU/6,dx=Math.cos(a),dz=Math.sin(a),tx=-dz,tz=dx;
  const r=.30+(j%3)*.1,w=.19,top=.38+(j%3)*.12;
  push([0,.015,0],[dx*r+tx*w,top*.63,dz*r+tz*w],
   [dx*(r+.30),top,dz*(r+.30)],[.42,.64,.37]);
  push([0,.015,0],[dx*(r+.30),top,dz*(r+.30)],
   [dx*r-tx*w,top*.63,dz*r-tz*w],[.72,.82,.52]);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.computeVertexNormals();
 return g;
}
function fallenLeafGeometry(){
 const positions=[],colors=[];
 for(let j=0;j<8;j++){
  const a=j*TAU/8,dx=Math.cos(a),dz=Math.sin(a),tx=-dz,tz=dx;
  const r=.17+(j%3)*.06,w=.13+(j%2)*.035;
  positions.push(dx*r,.014,dz*r,dx*(r+.18)+tx*w,.034,dz*(r+.18)+tz*w,
   dx*(r+.45),.025,dz*(r+.45));
  for(let k=0;k<3;k++)colors.push(.75,.55,.33);
  positions.push(dx*r,.014,dz*r,dx*(r+.45),.025,dz*(r+.45),
   dx*(r+.18)-tx*w,.018,dz*(r+.18)-tz*w);
  for(let k=0;k<3;k++)colors.push(.47,.38,.28);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.computeVertexNormals();return g;
}
function scatterBatch(name,items,geometry,palette,height){
 const mesh=new THREE.InstancedMesh(geometry,tinted('#ffffff',true),items.length);
 const obj=new THREE.Object3D(),q=new THREE.Quaternion(),yaw=new THREE.Quaternion();
 const tint=new THREE.Color();
 for(let i=0;i<items.length;i++){
  const p=items[i],n=nAt(p.x,p.z);
  obj.position.copy(at(p.x,p.z,height));
  obj.quaternion.copy(q.setFromUnitVectors(UP,n))
   .multiply(yaw.setFromAxisAngle(UP,p.angle));
  obj.scale.setScalar(p.size*.75);
  obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);
  mesh.setColorAt(i,tint.set(palette[Math.min(palette.length-1,
   Math.floor(p.tint*palette.length))]));
 }
 mesh.instanceMatrix.needsUpdate=true;
 mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
 mesh.name='art-lab-'+name+'-decorative-no-collision';
 scene.add(mesh);decorBatches.push({mesh,total:items.length});
}
scatterBatch('grass',grassData.grasses,shapedLeafGeometry(),
 ['#6a8552','#9ba264','#657c4a','#79966b'],.35);
scatterBatch('litter',grassData.leaves,fallenLeafGeometry(),
 ['#b48b58','#99734d','#715940','#aa8359'],.31);
const pebbleGeo=createWeatheredStoneGeometry(THREE,'forest');
scatterBatch('stonechips',grassData.pebbles,pebbleGeo,
 ['#99927d','#938775','#696e63'],.34);
const showcase=createStonewindShowcase(THREE,{scene});
// A small character-scale observer exists only in this standalone visual test.
const observer=new THREE.Group();scene.add(observer);
const body=new THREE.Mesh(new THREE.CapsuleGeometry(.37,1.12,3,9),
 tinted('#65574a'));body.position.y=1.04;body.castShadow=true;observer.add(body);
const head=new THREE.Mesh(new THREE.SphereGeometry(.27,10,8),
 tinted('#c1ab8b'));head.position.y=2.05;head.castShadow=true;observer.add(head);
const cloak=new THREE.Mesh(new THREE.ConeGeometry(.51,1.3,11),tinted('#455b51'));
cloak.position.set(0,.88,-.24);cloak.rotation.x=-.16;observer.add(cloak);
const marker=orient(new THREE.Group(),0,0,.24);scene.add(marker);
const compass=new THREE.Mesh(new THREE.RingGeometry(.7,.79,30),
 new THREE.MeshBasicMaterial({color:'#a8d4ac',transparent:true,opacity:.38,side:THREE.DoubleSide}));
compass.rotation.x=-PI/2;marker.add(compass);
const move={x:0,z:0},pose={x:0,z:0,yaw:-.24,pitch:.33,zoom:11.8};
function focusTree(zoom=7.4){
 const [x,z]=TREE_GALLERY_SITES[selectedTree];
 pose.x=clamp(x,-13,13);pose.z=clamp(z-4.9,-13,13);
 pose.yaw=0;pose.pitch=.26;pose.zoom=zoom;
}
if(params.get('view')==='pine'||params.has('species'))focusTree();
function qualityApply(){
 const q=artLabSurfaceQuality(quality);
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,q.dpr));
 sun.castShadow=q.shadows;renderer.shadowMap.enabled=q.shadows;
 sun.shadow.mapSize.set(q.shadows?(quality==='high'?1024:512):256,
  q.shadows?(quality==='high'?1024:512):256);
 for(const d of decorBatches){
  d.mesh.count=artEnabled?Math.floor(d.total*q.details):0;
 }
 showcase.setQuality(quality,artEnabled);
 for(const crown of treeCrowns)crown.geometry=quality==='high'?crownNear:crownLow;
 trunk.bumpScale=quality==='high'?.105:quality==='balanced'?.061:0;
 trunk.bumpMap=quality==='economy'?null:bark?.bumpMap||null;
 trunk.needsUpdate=true;
  scene.fog.near=quality==='high'?38:quality==='balanced'?32:24;
  scene.fog.far=quality==='high'?175:quality==='balanced'?147:112;
  sun.intensity=dusk?.46:(quality==='high'?2.85:quality==='balanced'?2.45:2.0);
  sun.color.set(dusk?'#b5c2ee':'#ffe1a8');
  hemi.color.set(dusk?'#8aabc7':'#d7e4c9');
  hemi.intensity=dusk?.68:1.19;
  scene.background.set(dusk?'#263743':'#9aaea5');
  scene.fog.color.set(dusk?'#405a5b':'#a3b7a3');
  renderer.toneMappingExposure=quality==='high'?1.09:1.12;
  for(const item of gallery)item.group.visible=artEnabled&&newTreesEnabled;
  treeRoots.forEach((r,i)=>{r.visible=artEnabled&&!newTreesEnabled;
   r.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)o.castShadow=q.shadows&&quality==='high';});
  });
 $('treeVariant').textContent=newTreesEnabled?'Показать старые деревья':'Показать новую библиотеку';
  $('lightMode').textContent=dusk?'Дневное освещение':'Сумерки';
  $('qualityInfo').textContent=
  'Режим: '+quality+' · атлас '+(asset?.atlasSize||'…')+
  ' px · '+(quality==='high'?'максимальная детализация':quality==='balanced'?'живой лес':'облегчённый лес')+
   ' · сектор '+ART_LAB.lon.toFixed(2)+'/'+ART_LAB.lat.toFixed(2);
}
function materialApply(){
 terrain.material=artEnabled?(pbr||simpleLand):simpleLand;
 qualityApply();
 $('compare').textContent=artEnabled?'Показать основу':'Вернуть живой лес';
}
async function loadAtlas(preset){
 const size=artLabSurfaceQuality(preset).atlas;
 if(asset?.atlasSize===size)return;
 $('loading').hidden=false;
 // Let Safari paint the feedback before CPU-baking five original families.
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const data=createArtLabTextures(THREE,{size});
 asset?.dispose();pbr?.dispose();
 asset=data;
 pbr=new THREE.MeshStandardMaterial({map:data.map,normalMap:data.normalMap,
  roughnessMap:data.roughnessMap,roughness:.94,metalness:0,
  vertexColors:true,transparent:true,depthWrite:false,
  side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2});
 pbr.normalScale.set(quality==='high'?.95:.71);
 materialApply();$('loading').hidden=true;
}
$('compare').addEventListener('click',()=>{artEnabled=!artEnabled;materialApply()});
$('treeVariant').addEventListener('click',()=>{newTreesEnabled=!newTreesEnabled;qualityApply()});
$('treeSelect').value=TREE_LIBRARY[selectedTree].id;
$('treeVariation').value=String(treeVariation);
$('treeVariation').addEventListener('change',e=>{
 const url=new URL(location.href);
 url.searchParams.set('species',TREE_LIBRARY[selectedTree].id);
 url.searchParams.set('variation',e.target.value);
 url.searchParams.set('tree',newTreesEnabled?'after':'before');
 url.searchParams.set('light',dusk?'dusk':'day');
 url.searchParams.set('view','pine');
 location.assign(url.toString());
});
$('treeSelect').addEventListener('change',e=>{
 const id=TREE_LIBRARY.findIndex(t=>t.id===e.target.value);
 if(id>=0){selectedTree=id;focusTree(6.9)}
});
$('lightMode').addEventListener('click',()=>{dusk=!dusk;qualityApply()});
$('treeFocus').addEventListener('click',()=>focusTree(5.8));
$('quality').addEventListener('change',async e=>{
 quality=e.target.value;
 try{await loadAtlas(quality);if(pbr)pbr.normalScale.set(quality==='high'?.95:.71)}catch(err){$('loading').textContent='Ошибка материалов: '+err.message;}
 qualityApply();
});
$('materials').innerHTML=ART_LAB.materialNames.map((label,i)=>
 '<span><i style="background:'+['#88835a','#5c493d','#52754d','#ab8456','#b69a78'][i]+'"></i>'+label+'</span>').join('');
let dragging=false,startX=0,startY=0,pinch=null,walkTouch=null;
function canvasPointerDown(e){
 if(e.pointerType==='touch'&&e.isPrimary===false)return;
 dragging=true;startX=e.clientX;startY=e.clientY;
 renderer.domElement.setPointerCapture(e.pointerId);
}
renderer.domElement.addEventListener('pointerdown',canvasPointerDown);
renderer.domElement.addEventListener('pointermove',e=>{
 if(!dragging||!e.isPrimary)return;
 pose.yaw-=clamp(e.clientX-startX,-45,45)*.0068;
 pose.pitch=clamp(pose.pitch+(e.clientY-startY)*.005,.10,1.1);
 startX=e.clientX;startY=e.clientY;
});
renderer.domElement.addEventListener('pointerup',()=>{dragging=false});
renderer.domElement.addEventListener('pointercancel',()=>{dragging=false});
renderer.domElement.addEventListener('wheel',e=>{
 e.preventDefault();pose.zoom=clamp(pose.zoom+e.deltaY*.012,2.2,29);
},{passive:false});
renderer.domElement.addEventListener('touchstart',e=>{
 if(e.touches.length===2){
  pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,
   e.touches[0].clientY-e.touches[1].clientY);dragging=false;
 }
},{passive:true});
renderer.domElement.addEventListener('touchmove',e=>{
 if(e.touches.length!==2||!pinch)return;
 const next=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,
  e.touches[0].clientY-e.touches[1].clientY);
 pose.zoom=clamp(pose.zoom*pinch/Math.max(1,next),2.2,29);pinch=next;
},{passive:true});
renderer.domElement.addEventListener('touchend',()=>{pinch=null},{passive:true});
const keys=new Set();document.addEventListener('keydown',e=>{
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)){
  keys.add(e.key.toLowerCase());e.preventDefault();
 }
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
const stick=$('stick'),nub=$('nub');
function stickUpdate(e){
 const rect=stick.getBoundingClientRect();
 const x=clamp((e.clientX-(rect.left+rect.width/2))/(rect.width*.39),-1,1),
  y=clamp((e.clientY-(rect.top+rect.height/2))/(rect.height*.39),-1,1);
 const magnitude=Math.max(1,Math.hypot(x,y));
 move.x=x/magnitude;move.z=-y/magnitude;
 nub.style.transform='translate('+move.x*32+'px,'+(-move.z)*32+'px)';
}
stick.addEventListener('pointerdown',e=>{
 stick.setPointerCapture(e.pointerId);walkTouch=e.pointerId;stickUpdate(e);
});
stick.addEventListener('pointermove',e=>{if(walkTouch===e.pointerId)stickUpdate(e)});
const stop=()=>{walkTouch=null;move.x=move.z=0;nub.style.transform='translate(0,0)'};
stick.addEventListener('pointerup',stop);stick.addEventListener('pointercancel',stop);
const clock=new THREE.Clock(),facing=new THREE.Quaternion(),camTarget=new THREE.Vector3(),
 desired=new THREE.Vector3(),east=new THREE.Vector3(),north=new THREE.Vector3(),
 heroForward=new THREE.Vector3(),right=new THREE.Vector3(),basis=new THREE.Matrix4();
let frames=0,seconds=0,draw=0;
function frame(){
 requestAnimationFrame(frame);
 const dt=Math.min(.04,clock.getDelta());
 const horizontal=move.x+(keys.has('a')||keys.has('arrowleft')?-1:0)+
  (keys.has('d')||keys.has('arrowright')?1:0);
 const vertical=move.z+(keys.has('w')||keys.has('arrowup')?1:0)+
  (keys.has('s')||keys.has('arrowdown')?-1:0);
 const mag=Math.hypot(horizontal,vertical);
 if(mag>.1){
  const x=horizontal/mag,z=vertical/mag,velocity=3.6*dt;
  const wx=x*Math.cos(pose.yaw)+z*Math.sin(pose.yaw);
  const wz=z*Math.cos(pose.yaw)-x*Math.sin(pose.yaw);
  pose.x=clamp(pose.x+wx*velocity,-13,13);
  pose.z=clamp(pose.z+wz*velocity,-13,13);
 }
 const n=nAt(pose.x,pose.z);observer.position.copy(at(pose.x,pose.z,.26));
 // Local north/east keep the camera upright on the actual spherical planet.
 east.copy(nAt(pose.x+.08,pose.z)).sub(n).normalize();
 north.copy(nAt(pose.x,pose.z+.08)).sub(n).normalize();
 heroForward.copy(north).multiplyScalar(Math.cos(pose.yaw))
  .addScaledVector(east,Math.sin(pose.yaw)).normalize();
 right.crossVectors(n,heroForward).normalize();
 basis.makeBasis(right,n,heroForward);facing.setFromRotationMatrix(basis);
 observer.quaternion.slerp(facing,.16);
 camTarget.copy(observer.position).addScaledVector(n,1.5);
 const camBack=north.clone().multiplyScalar(-Math.cos(pose.yaw))
  .addScaledVector(east,-Math.sin(pose.yaw));
 desired.copy(camTarget).addScaledVector(camBack,pose.zoom*Math.cos(pose.pitch))
  .addScaledVector(n,pose.zoom*Math.sin(pose.pitch)+1.4);
 camera.position.lerp(desired,1-Math.exp(-dt*9));
 camera.up.copy(n);camera.lookAt(camTarget);
 sun.position.copy(observer.position).addScaledVector(n,35).addScaledVector(east,-32).addScaledVector(north,19);
 sun.target.position.copy(observer.position);sun.target.updateMatrixWorld();
 renderer.render(scene,camera);
 frames++;seconds+=dt;if(seconds>1.1){
  draw=renderer.info.render.calls;
  $('fps').textContent='FPS '+Math.round(frames/seconds)+' · '+draw+' выз. отрисовки';
  frames=0;seconds=0;
 }
}
addEventListener('resize',()=>{
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);
});
camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
try{await loadAtlas(quality);qualityApply();$('loading').hidden=true;}
catch(err){$('loading').textContent='Ошибка загрузки материала: '+err.message;console.error(err);}
frame();
