import {SHIELD_BLOCK_SECONDS,shieldBlockPose} from './shield-block.js?v=0.3.7.1';
import {SHIELD_TUNER_VARIANTS,SHIELD_TUNER_DEFAULTS,SHIELD_TUNER_GROUPS,SHIELD_TUNER_FIELDS,shieldTunerStorageKey,normalizeShieldTuning,serializeShieldTuning} from './shield-tuner.js?v=0.3.7.1';
import {SHIELD_MODELS,shieldModelForRarity,styleShieldGlb} from './shield-assets.js?v=0.3.7.1';
import {itemRarity,highestLootRarity,QUALITY_VISUALS,applyWeaponQuality,applyShieldQuality} from './item-quality.js?v=0.3.7.1';
import {createAutoSwingClock,reconcileAbilityCooldown} from './combat-timing.js?v=0.3.7.1';
import {createCombatFeedback,HIT_REACTION_SECONDS,hitReaction} from './combat-feedback.js?v=0.3.7.1';
import {TARGET_ACQUISITION_RADIUS,targetsByProximity,nextTargetByProximity,targetIsInRange} from './target-selection.js?v=0.3.7.1';
import {DAGGER_TUNER_DEFAULTS,DAGGER_TUNER_STORAGE_KEY,DAGGER_TUNER_GROUPS,DAGGER_TUNER_FIELDS,normalizeDaggerTuning,serializeDaggerTuning} from './dagger-tuner.js?v=0.3.7.1';
import {WEAPON_KINDS,weaponSwingProfile,daggerThrustPose,visibleWeaponKind,equippedWeaponKind,setWeaponVisuals} from './weapon-visuals.js?v=0.3.7.1';
import {SWORD_TUNER_DEFAULTS,SWORD_TUNER_STORAGE_KEY,SWORD_TUNER_GROUPS,SWORD_TUNER_FIELDS,normalizeSwordTuning,serializeSwordTuning} from './sword-tuner.js?v=0.3.7.1';
import {AXE_TUNER_DEFAULTS,AXE_TUNER_STORAGE_KEY,AXE_TUNER_GROUPS,AXE_TUNER_FIELDS,normalizeAxeTuning,serializeAxeTuning} from './axe-tuner.js?v=0.3.7.1';
import {createLandscapeMap,createSkyMap} from './landscape.js?v=0.3.7.1';
import {screenMoveVector,turnTowardsAngle,followCameraYaw} from './movement-controls.js?v=0.3.7.1';
import {PLAINSTRIDER_GLB,validatePlainstriderGltf,attachPlainstriderGltf,advancePlainstriderVisual,resetPlainstriderVisual} from './plainstrider-model.js?v=0.3.7.1';
import {LAKE_BLUEPRINT,createLake,normalizedLakeRadius,lakeTerrainHeight,canWadeAt,lakeDryShorePoint,lakePointAt,createLakeVisuals} from './lake.js?v=0.3.7.1';
import {createMeadowDecorations} from './meadow.js?v=0.3.7.1';
import {createSharedChestPanel} from './chest-ui.js?v=0.3.5.36';
import {localToWorld2D,circleHitsRect,isInsideRect,buildingWallColliders} from './building-physics.js?v=0.3.5.36';
import {createWorldPresence} from './online.js?v=0.3.7.1';
import {collectSharedMobTargets,mobSnapshotErrorLabel} from './mob-network.js?v=0.3.7.1';
import {WORLD_WS_URL} from './online-config.js?v=0.3.7.1';
import {projectPartyMember} from './party-map.js?v=0.3.7.1';
import {ITEM_CATALOG,MERCHANT_STOCK,GEAR_LOOT,LOOT_CHANCES,rollEquipmentLoot,itemStackLimit,deriveStats,armorReduction} from './items.js?v=0.3.5.17';
import {CLASS_DEFINITIONS,getClassDefinition,getAbilityDefinition,getClassAbilities,normalizeClassId,normalizeResource,changeResource,createAbilityRuntime,tickAbilityRuntime,abilityCooldown,abilityFailure,activateAbility,WARRIOR_RAGE_PER_HIT,WARRIOR_RAGE_ON_HURT,WARRIOR_RAGE_DECAY} from './skills.js?v=0.3.5';
import {TRAINING_DUMMY,createTrainingStats,resetTrainingTarget,applyTrainingHit,updateTrainingTarget,trainingDps} from './training.js?v=0.3.5.1';
import {HOTBAR_SLOT_COUNT,DEFAULT_HOTBAR,USABLE_ITEMS,actionEntry,actionDefinition,availableHotbarActions,normalizeHotbar,assignHotbarSlot} from './hotbar.js?v=0.3.5.3';
// NexGame 3D · Alpha 0.3.5.3 — a small, procedural Mulgore-inspired starting zone.
const $=id=>document.getElementById(id);
// Prevent iOS Safari smart-zoom on double-tap. It can persist even after a
// refresh and looks like a stuck camera zoom. Do not prevent the two-finger
// pointer gesture: the game still uses it for its own camera distance.
let lastTouchTap=null;
const editableTapTarget=element=>element?.closest?.('input,textarea,select,[contenteditable="true"]');
document.addEventListener('touchstart',event=>{
 if(editableTapTarget(event.target)||event.touches.length!==1)return;
 const t=event.touches[0],now=performance.now();
 if(lastTouchTap&&now-lastTouchTap.time<350&&
    Math.hypot(t.clientX-lastTouchTap.x,t.clientY-lastTouchTap.y)<42){
  event.preventDefault();lastTouchTap=null;
 }
},{passive:false,capture:true});
document.addEventListener('touchend',event=>{
 if(editableTapTarget(event.target))return;
 if(event.touches.length||event.changedTouches.length!==1){
  lastTouchTap=null;return;
 }
 const finger=event.changedTouches[0],now=performance.now();
 const close=lastTouchTap&&now-lastTouchTap.time<330&&
  Math.hypot(finger.clientX-lastTouchTap.x,finger.clientY-lastTouchTap.y)<36;
 lastTouchTap={time:now,x:finger.clientX,y:finger.clientY};
 if(close){event.preventDefault();lastTouchTap=null}
},{passive:false,capture:true});
document.addEventListener('dblclick',event=>{
 if(!editableTapTarget(event.target))event.preventDefault();
},{capture:true});
for(const gesture of ['gesturestart','gesturechange','gestureend']){
 document.addEventListener(gesture,event=>{
  if(!editableTapTarget(event.target))event.preventDefault();
 },{passive:false,capture:true});
}
let THREE;
try{THREE=await import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js')}
catch(error){$('loadText').textContent='Не удалось загрузить 3D-движок. Проверь соединение и обнови страницу.';throw error}
try{
const clamp=THREE.MathUtils.clamp,TAU=Math.PI*2;
const settingsKey='nexgame-settings-v1';
const graphicsPresets={
 economy:{pixelRatio:1,shadows:false,shadowSize:512,grass:.40,flowers:.35,shrubs:.35},
 balanced:{pixelRatio:1.5,shadows:true,shadowSize:1024,grass:.75,flowers:.72,shrubs:.7},
 high:{pixelRatio:2,shadows:true,shadowSize:2048,grass:1,flowers:1,shrubs:1}
};
const qualityDescriptions={
 economy:'Меньше нагрузки: ниже чёткость, меньше травы и цветов, мягкие тени.',
 balanced:'Баланс чёткости, теней, травы, цветов и кустарников.',
 high:'Полная плотность растений, высокая чёткость и детальные тени.'
};
const settings={quality:'balanced',showFps:false,cameraPitch:.29};
try{const saved=JSON.parse(localStorage.getItem(settingsKey));if(saved&&typeof saved==='object'){
 if(typeof saved.quality==='string'&&Object.hasOwn(graphicsPresets,saved.quality))settings.quality=saved.quality;
 if(typeof saved.showFps==='boolean')settings.showFps=saved.showFps;
 if(Number.isFinite(saved.cameraPitch))settings.cameraPitch=clamp(saved.cameraPitch,.1,1.05);
}}catch(e){}
const saveSettings=()=>{try{localStorage.setItem(settingsKey,JSON.stringify(settings))}catch(e){}};
const wrapYaw=yaw=>Math.atan2(Math.sin(yaw),Math.cos(yaw));
const scene=new THREE.Scene();scene.background=createSkyMap(THREE);scene.fog=new THREE.Fog(0xd2d9ce,76,174);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.09,230);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'default'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,graphicsPresets[settings.quality].pixelRatio));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=graphicsPresets[settings.quality].shadows;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
$('scene').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe7e9d8,0x78684b,1.45));
const sun=new THREE.DirectionalLight(0xffd9a8,2.45);sun.position.set(-30,48,22);sun.castShadow=true;
sun.shadow.mapSize.setScalar(graphicsPresets[settings.quality].shadowSize);Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:110});sun.shadow.bias=-.0004;sun.shadow.normalBias=.045;
scene.add(sun,sun.target);
let seed=531;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
// Double-size hearth house is set back from the camp to protect NPCs, quests and paths.
const HEARTH_HOUSE={x:-27,z:-2,rotation:Math.PI/2,scale:2};
// The existing wooden box at local (2.7,-3.1) is now a shared 18-slot chest.
// For 90-degree house rotation and scale=2 its centre is (-33.2,-7.4).
const HEARTH_CHEST_POS={x:-33.2,z:-7.4};
const HEARTH_CHEST_RANGE=4.7;
function naturalHeightAt(x,z){const flat=smooth(10,29,Math.hypot(x+5,z-4));return flat*(Math.sin(x*.055)*Math.cos(z*.067)*1.65+Math.sin(z*.13+x*.047)*.6)}
const LAKE=createLake(naturalHeightAt(LAKE_BLUEPRINT.x,LAKE_BLUEPRINT.z));
const HEARTH_GROUND_Y=naturalHeightAt(HEARTH_HOUSE.x,HEARTH_HOUSE.z);
function heightAt(x,z){
 const natural=naturalHeightAt(x,z);
 // The 19.2 x 20.8 metre footprint is rotated 90 degrees. Grade just the plot
 // plus a soft 3.6 metre border; interior floor remains level with the terrain.
 const outside=Math.max(Math.abs(x-HEARTH_HOUSE.x)-10.4,Math.abs(z-HEARTH_HOUSE.z)-9.6);
 if(outside>=3.6)return lakeTerrainHeight(x,z,natural,LAKE);
 const amount=1-smooth(-.6,3.6,outside);
 return lakeTerrainHeight(x,z,natural+(HEARTH_GROUND_Y-natural)*amount,LAKE);
}
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:1,metalness:0,...extra});
function texture(draw,size=128){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const grain=texture((ctx,s)=>{ctx.fillStyle='#b2b993';ctx.fillRect(0,0,s,s);for(let i=0;i<2200;i++){ctx.fillStyle=rand()>.5?'#bfc69b55':'#62744130';ctx.fillRect(rand()*s,rand()*s,1+rand()*3,1+rand()*3)}});grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(58,58);
const hide=texture((c,s)=>{c.fillStyle='#dbc39a';c.fillRect(0,0,s,s);for(let i=0;i<900;i++){c.fillStyle=rand()>.5?'#fff0ca18':'#53392313';c.fillRect(rand()*s,rand()*s,rand()*12,1)}c.strokeStyle='#6d3d2b';c.lineWidth=9;c.beginPath();for(let x=0;x<=s;x+=16){c.lineTo(x,40+(x%32?13:-13))}c.stroke();c.fillStyle='#ac5938';c.fillRect(0,54,s,12);c.fillStyle='#346c66';c.fillRect(0,74,s,6);c.fillStyle='#795034';c.fillRect(0,s-7,s,7)});hide.wrapS=THREE.RepeatWrapping;hide.repeat.set(3,1);
const M={grass:material(0xffffff,{vertexColors:true}),dirt:material(0xa08c51),wood:material(0x5b3d24),woodLight:material(0x916139),hide:material(0xe0c899,{map:hide,side:THREE.DoubleSide}),hideDark:material(0x9b7449),red:material(0x9a4931),teal:material(0x427b70),gold:material(0xd7ae5e),bone:material(0xe5d5aa),rock:material(0x8a7250),rockLight:material(0xaa926c),rockDark:material(0x6e593c),leaf:material(0x718746),leafLight:material(0x98a253),black:material(0x231f19),metal:material(0x9caaa2,{roughness:.65,metalness:.2}),water:material(0x547d77,{roughness:.38,transparent:true,opacity:.85})};
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
const world=group(scene),colliders=[],boxColliders=[],cameraBlockers=[],mapLandmarks=[],interiorZones=[];
function obstacle(x,z,r,height=5){colliders.push({x,z,r,height})}
function obstacleBox(x,z,w,d,yaw=0,height=5){boxColliders.push({x,z,w,d,yaw,height})}
function clearAt(x,z,r=.58){
 if(Math.abs(x)>69||Math.abs(z)>69||!canWadeAt(x,z,LAKE))return false;
 for(const o of colliders)if((x-o.x)**2+(z-o.z)**2<(r+o.r)**2)return false;
 for(const o of boxColliders)if(circleHitsRect(x,z,r,o))return false;
 return true;
}
const terrainGeo=new THREE.PlaneGeometry(190,190,152,152);terrainGeo.rotateX(-Math.PI/2);
const tp=terrainGeo.attributes.position,colors=[];const ca=new THREE.Color(0xdde3d3),cb=new THREE.Color(0xffffff),cc=new THREE.Color();
const sandTint=new THREE.Color(0xe2cba7),underwaterTint=new THREE.Color(0x73918b);
for(let i=0;i<tp.count;i++){
 const x=tp.getX(i),z=tp.getZ(i),r=normalizedLakeRadius(x,z,LAKE);
 tp.setY(i,heightAt(x,z));
 cc.copy(ca).lerp(cb,.5+.24*Math.sin(x*.075+z*.04)+.13*Math.sin(x*.38-z*.22));
 if(r<1.22)cc.lerp(r<.89?underwaterTint:sandTint,(1-smooth(.86,1.22,r))*.75);
 colors.push(cc.r,cc.g,cc.b);
}terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrainGeo.computeVertexNormals();mesh(scene,terrainGeo,M.grass,0,0,0,1,1,1,false);
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
function path(points,width){
 for(let k=0;k<points.length-1;k++){
  const [ax,az]=points[k],[bx,bz]=points[k+1];pathSegments.push({ax,az,bx,bz,width});
 }
}
routes.forEach(r=>path(r,3.5));
// Bake paths directly into the ground: seamless junctions, no floating strips.
M.grass.map=createLandscapeMap(THREE,pathSegments);
M.grass.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
grain.dispose();
function onPath(x,z){return pathSegments.some(s=>{const dx=s.bx-s.ax,dz=s.bz-s.az,t=clamp(((x-s.ax)*dx+(z-s.az)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-s.ax-dx*t,z-s.az-dz*t)<s.width*.6})}
// Sandstone mesas and a grassy upper rim enclose the playable valley.
for(let i=0;i<25;i++){const angle=i/25*TAU,rr=104+rand()*10,x=Math.sin(angle)*rr,z=Math.cos(angle)*rr,h=12+rand()*18,r=8+rand()*8,y=heightAt(x,z);const base=mesh(world,new THREE.CylinderGeometry(r*.8,r,h,8),i%3?M.rock:M.rockDark,x,y+h/2-2,z);base.rotation.y=rand();cameraBlockers.push(base);mesh(world,new THREE.CylinderGeometry(r*.82,r*.85,2.3,8),M.rockLight,x,y+h-2.8,z);mesh(world,new THREE.CylinderGeometry(r*.76,r*.82,1.3,8),M.leaf,x,y+h-1,z);}
function tent(x,z,r=4,rotation=0){const g=group(world,x,heightAt(x,z),z);g.rotation.y=rotation;const roof=mesh(g,new THREE.ConeGeometry(r,r*1.42,14,1,true),M.hide,0,r*.71,0);cameraBlockers.push(roof);mesh(g,new THREE.CylinderGeometry(r,r,.5,14,1,true),M.hideDark,0,.25,0);for(let i=0;i<9;i++){const a=i/9*TAU;rod(g,M.wood,[Math.sin(a)*r*.99,0,Math.cos(a)*r*.99],[Math.sin(a)*.25,r*1.64,Math.cos(a)*.25],.07,.055)}
 const door=mesh(g,new THREE.PlaneGeometry(r*.49,r*.65),M.black,0,r*.33,r*.72);door.rotation.x=-.53;box(g,M.red,0,r*.66,r*.55,r*.65,.12,.12);for(const s of [-1,1])rod(g,M.wood,[s*r*.29,.04,r*.98],[s*r*.2,r*.66,r*.55],.07);
 obstacle(x,z,r*.87,r*1.5);mapLandmarks.push({x,z,r,color:'#cbb17a'});return g}

// A scalable, fully walkable timber-and-hide house. Keep its roof outside
// fuse(world,true): the roof and wall shell must remain independently fadeable.
function walkableHouse(x,z,{width=9.6,depth=10.4,wallH=4.55,roofRise=2.35,doorW=3.4,rotation=.5,scale=1}={}){
 const wallT=.34,doorH=3.55;
 const g=group(scene,x,heightAt(x,z),z);
 g.rotation.y=rotation;g.scale.setScalar(scale);
 const frame=group(g),furniture=group(g),shell=group(g);
 const wallMat=M.hide.clone(),roofMat=M.hide.clone();
 const hw=width/2,hd=depth/2,side=(width-doorW)/2;
 // Low raised floor and a woven central rug; no collider across the entry.
 box(frame,M.woodLight,0,.07,0,width-.25,.14,depth-.25,false);
 box(furniture,M.red,0,.152,1.6,3.3,.025,3.3,false);
 for(const i of [-1,1])for(const zStripe of [.45,2.7])
  box(furniture,M.gold,i*1.2,.177,zStripe,.09,.015,.43,false);
 // Hide-filled structural walls; front is split so the door is truly empty.
 const wall=(lx,lz,w,d,h=wallH,y=h/2)=>box(shell,wallMat,lx,y,lz,w,h,d);
 wall(-hw+wallT/2,0,wallT,depth);
 wall(hw-wallT/2,0,wallT,depth);
 wall(0,-hd+wallT/2,width,wallT);
 wall(-doorW/2-side/2,hd-wallT/2,side,wallT);
 wall(doorW/2+side/2,hd-wallT/2,side,wallT);
 wall(0,hd-wallT/2,doorW,wallT,wallH-doorH,doorH+(wallH-doorH)/2);
 // Posts and broad wooden trim give an original tribal-fantasy silhouette.
 for(const sx of [-1,1])for(const sz of [-1,1]){
  box(frame,M.wood,sx*(hw-.22),wallH/2,sz*(hd-.22),.42,wallH+.15,.42);
  ell(frame,M.bone,sx*(hw-.22),wallH+.1,sz*(hd-.22),.17,.22,.17);
 }
 for(const sz of [-1,1]){
  rod(frame,M.wood,[-hw,wallH,sz*hd],[hw,wallH,sz*hd],.13,.13);
  rod(frame,M.wood,[-hw,0,sz*hd],[-hw,wallH,sz*hd],.15,.12);
  rod(frame,M.wood,[hw,0,sz*hd],[hw,wallH,sz*hd],.15,.12);
 }
 for(const sx of [-1,1])rod(frame,M.wood,[sx*hw,wallH,-hd],[sx*hw,wallH,hd],.14,.14);
 for(const sx of [-1,1]){
  const jambX=sx*doorW/2;
  rod(frame,M.wood,[jambX,0,hd+.035],[jambX,doorH,hd+.035],.18,.16);
  // Tied-back curtain at either jamb does not block player movement.
  const curtain=box(frame,M.red,jambX+sx*.17,doorH-.7,hd+.10,.29,1.35,.08);
  curtain.rotation.z=sx*.08;
  box(frame,M.gold,jambX+sx*.17,doorH-1.05,hd+.17,.32,.09,.11);
 }
 rod(frame,M.wood,[-doorW/2,doorH,hd+.08],[doorW/2,doorH,hd+.08],.18,.16);
 // Front/rear triangular gables fill the roof profile without sealing the door.
 const gable=new THREE.Shape();
 gable.moveTo(-hw,wallH);gable.lineTo(hw,wallH);gable.lineTo(0,wallH+roofRise);gable.closePath();
 for(const zz of [-hd,hd]){
  const cap=mesh(shell,new THREE.ShapeGeometry(gable),wallMat,0,0,zz,false);
  cap.material.side=THREE.DoubleSide;
  rod(frame,M.wood,[-hw,wallH,zz],[0,wallH+roofRise,zz],.12,.1);
  rod(frame,M.wood,[hw,wallH,zz],[0,wallH+roofRise,zz],.12,.1);
 }
 const slope=Math.atan2(roofRise,hw),panelLen=Math.hypot(hw+.55,roofRise+.16);
 const roofLeft=box(g,roofMat,-hw/2,wallH+roofRise/2,0,panelLen,.20,depth+1.0,false);
 const roofRight=box(g,roofMat,hw/2,wallH+roofRise/2,0,panelLen,.20,depth+1.0,false);
 roofLeft.rotation.z=slope;roofRight.rotation.z=-slope;
 rod(frame,M.wood,[0,wallH+roofRise,-hd-.65],[0,wallH+roofRise,hd+.65],.16,.16);
 for(const sx of [-1,1])for(const zz of [-hd+.7,0,hd-.7]){
  const rafter=rod(frame,M.wood,[0,wallH+roofRise,zz],[sx*(hw+.32),wallH-.07,zz],.11,.09);
  rafter.castShadow=false;
 }
 // Two bedrolls, chest, shelves, table and stools. Furniture has real collision.
 for(const bedZ of [-2.5]){
  box(furniture,M.wood,-2.6,.32,bedZ,2.35,.50,2.55);
  box(furniture,M.hideDark,-2.6,.64,bedZ,2.05,.14,2.2);
  box(furniture,M.bone,-2.6,.79,bedZ-.75,1.7,.21,.49);
 }
 box(furniture,M.wood,2.7,.67,-3.1,1.7,1.3,1.2);
 box(furniture,M.woodLight,2.7,1.36,-3.1,1.84,.16,1.35);
 box(furniture,M.gold,2.7,1.44,-2.41,.24,.13,.07);
 for(const sx of [-1,1])for(const sz of [-1,1])
  box(furniture,M.wood,1.45+sx*.75,.46,-.4+sz*.65,.17,.92,.17);
 box(furniture,M.woodLight,1.45,.96,-.4,1.9,.18,1.6);
 for(const sz of [-1.8,1.0]){
  box(furniture,M.wood,2.9,.37,sz,.62,.65,.66);
  box(furniture,M.hideDark,2.9,.73,sz,.56,.11,.54);
 }
 // Decorations and warm, shadowless interior lamp (cheap for mobile GPUs).
 rod(frame,M.wood,[0,wallH-.05,0],[0,wallH-1.12,0],.065,.06);
 ell(frame,material(0xffc76d,{emissive:0xff9a34,emissiveIntensity:1.3}),0,wallH-1.3,0,.24,.32,.24,false);
 const lamp=new THREE.PointLight(0xffcb87,1.05,11*scale,2);
 lamp.position.set(0,wallH-1.3,0);lamp.castShadow=false;g.add(lamp);
 for(const sx of [-1,1]){
  box(frame,M.teal,sx*(hw-.05),2.4,.2,.10,1.4,1.0);
  box(frame,M.gold,sx*(hw-.02),2.4,.2,.11,.06,1.0);
 }
 // Use the identical transforms for visuals and collision; the centre remains free.
 for(const part of buildingWallColliders({x,z,width:width*scale,depth:depth*scale,doorWidth:doorW*scale,wallThickness:wallT*scale,rotation,height:wallH*scale}))
  boxColliders.push(part);
 for(const [lx,lz,w,d] of [[-2.6,-2.5,2.35,2.55],[2.7,-3.1,1.7,1.2],[1.45,-.4,1.9,1.6],[2.9,1,.62,.66],[2.9,-1.8,.62,.66]]){
  const p=localToWorld2D(lx*scale,lz*scale,x,z,rotation);
  obstacleBox(p.x,p.z,w*scale,d*scale,rotation,2*scale);
 }
 const zone={x,z,w:(width-.3)*scale,d:(depth+.45)*scale,yaw:rotation,roofMeshes:[roofLeft,roofRight],roofMat,wallMat,inside:false};
 interiorZones.push(zone);
 for(const roof of zone.roofMeshes){roof.userData.interiorRoof=zone;cameraBlockers.push(roof)}
 mapLandmarks.push({x,z,r:Math.min(width,depth)*scale*.18,color:'#cfb689',type:'building',width:width*scale,depth:depth*scale,rotation});
 fuse(frame,true);fuse(furniture,true);
 return g;
}
function updateInteriors(){
 for(const zone of interiorZones){
  const inside=isInsideRect(state.x,state.z,zone);
  if(inside===zone.inside)continue;
  zone.inside=inside;
  for(const [mat,opacity] of [[zone.roofMat,.12],[zone.wallMat,.33]]){
   mat.transparent=inside;mat.depthWrite=!inside;mat.opacity=inside?opacity:1;mat.needsUpdate=true;
  }
 }
}

walkableHouse(HEARTH_HOUSE.x,HEARTH_HOUSE.z,{rotation:HEARTH_HOUSE.rotation,scale:HEARTH_HOUSE.scale});tent(11,-7,4.2,-.5);tent(-15,12,3.8,2.2);tent(13,16,3.4,-1.7);tent(-23,-15,3,.5);
function totem(x,z,scale=1){const g=group(world,x,heightAt(x,z),z);g.scale.setScalar(scale);mesh(g,new THREE.CylinderGeometry(.48,.65,4.8,8),M.woodLight,0,2.4,0);for(let i=0;i<3;i++){const y=.9+i*1.25;mesh(g,new THREE.CylinderGeometry(.52,.53,.26,8),i%2?M.teal:M.red,0,y,0);box(g,M.bone,0,y+.43,.5,.67,.38,.13);for(const s of [-1,1])box(g,M.black,s*.2,y+.5,.58,.11,.09,.035);box(g,M.red,0,y+.28,.6,.14,.21,.15)}const wings=group(g,0,4.3,0);for(const s of [-1,1]){const w=box(wings,M.teal,s*1.15,0,0,2,.38,.3);w.rotation.z=s*.15;for(let i=0;i<4;i++){const f=box(wings,i%2?M.red:M.bone,s*(.65+i*.38),-.22,0,.18,.63,.16);f.rotation.z=s*.18}}ell(g,M.bone,0,5,0,.55,.43,.45);obstacle(x,z,.75*scale,5*scale);mapLandmarks.push({x,z,r:.8,color:'#73b9ae'});return g}
totem(-3,-5,1);totem(5,9,.75);totem(-5,25,.8);totem(35,-14,1.25);
function banner(x,z,angle){const g=group(world,x,heightAt(x,z),z);g.rotation.y=angle;rod(g,M.wood,[-1,0,0],[-1,4.6,0],.09);rod(g,M.wood,[1,0,0],[1,4.6,0],.09);rod(g,M.wood,[-1.25,4.3,0],[1.25,4.3,0],.09);mesh(g,new THREE.PlaneGeometry(1.85,2.1),M.hide,0,3.15,0);obstacle(x-1,z,.15);obstacle(x+1,z,.15)}
banner(-4,19,.2);banner(5,-14,-.1);
// Camp hearth. Only two flame meshes animate; there is no particle simulation.
const hearth=group(world,-6,heightAt(-6,7),7);for(let i=0;i<9;i++){const a=i/9*TAU;ell(hearth,M.rock,Math.sin(a)*1.15,.19,Math.cos(a)*1.15,.34,.23,.29)}for(let i=0;i<3;i++){const log=mesh(hearth,G.cylinder,M.wood,0,.25,0,.18,1.9,.18);log.rotation.z=Math.PI/2;log.rotation.y=i*Math.PI/3}obstacle(-6,7,1.05,1.3);
const fire=group(scene,-6,heightAt(-6,7)+.25,7);const flameM=new THREE.MeshBasicMaterial({color:0xf6a044,transparent:true,opacity:.85});mesh(fire,G.cone,flameM,0,.47,0,.55,1.3,.55,false);mesh(fire,G.cone,new THREE.MeshBasicMaterial({color:0xffda79}),0,.3,.04,.28,.85,.3,false);
for(let i=0;i<38;i++){const x=(rand()-.5)*136,z=(rand()-.5)*136;if(Math.hypot(x,z)<23||normalizedLakeRadius(x,z,LAKE)<1.16||interiorZones.some(zone=>isInsideRect(x,z,zone,3))||onPath(x,z)||!clearAt(x,z,3))continue;const size=.8+rand()*1.8;mesh(world,G.rock,i%2?M.rock:M.rockLight,x,heightAt(x,z)+size*.34,z,size,size*.7,size*.9);obstacle(x,z,size*.7,size)}
function tree(x,z,scale){const y=heightAt(x,z),g=group(world,x,y,z);g.scale.setScalar(scale);rod(g,M.wood,[0,0,0],[.2,4.2,0],.33,.15);for(const s of [-1,1])rod(g,M.wood,[0,2,0],[s*1.6,4.8,.2],.18,.07);ell(g,M.leaf,-1.4,4.8,0,2.4,.9,1.75);ell(g,M.leafLight,1.4,5,.2,2.1,.95,1.6);ell(g,M.leaf,0,5.65,0,2.5,.85,1.8);obstacle(x,z,.4*scale,5*scale)}
for(const [x,z,s] of [[-26,21,1.2],[54,35,1],[34,-26,.95],[-34,-30,1.15],[9,49,1.2],[-39,40,1.1],[51,25,1.3],[50,-8,.8],[-47,-7,1.1]])tree(x,z,s);
// Carved lake with real lakebed, animated water surface, banks and reed clusters.
const lakeVisual=createLakeVisuals(THREE,{scene,lake:LAKE,heightAt,onPath});
// Clustered instanced meadow: 1 grass draw call, 3 flower batches, 1 shrub batch.
const meadow=createMeadowDecorations(THREE,{
 scene,heightAt,clearAt,onPath,interiorZones,isInsideRect,
 isNearLake:(x,z)=>normalizedLakeRadius(x,z,LAKE)<1.18
});
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
  // Place the grip inside the closed right palm rather than floating above it.
   const axe=group(arms[1].hand,
    AXE_TUNER_DEFAULTS.posX,AXE_TUNER_DEFAULTS.posY,AXE_TUNER_DEFAULTS.posZ);
  axe.name='gear-axe';
  // Every Tauren with an axe (including remote players) starts with the
  // visually approved pose. The local tuner can override the hero's pose.
  axe.rotation.set(
   AXE_TUNER_DEFAULTS.axeX*Math.PI/180,
   AXE_TUNER_DEFAULTS.axeY*Math.PI/180,
   AXE_TUNER_DEFAULTS.axeZ*Math.PI/180,'YXZ');
  rod(axe,M.wood,[0,-.72,0],[0,.95,0],.068,.060);
  for(const y of [-.5,-.36,-.22,.76])mesh(axe,G.cylinder,T.hide,0,y,0,.077,.09,.077);
  // Move the complete axe head to the opposite end of the haft (local -Y).
  // Preserve the blade silhouette, weapon rotation and right-hand grip.
  const axeHead=group(axe,0,-1.4,0);
  const blade=new THREE.Shape();blade.moveTo(-.07,.84);blade.lineTo(.26,1.02);blade.quadraticCurveTo(.76,.98,.67,.49);blade.lineTo(.24,.35);blade.lineTo(.19,.54);blade.lineTo(-.07,.54);blade.closePath();
  mesh(axeHead,new THREE.ExtrudeGeometry(blade,{depth:.1,bevelEnabled:true,bevelSize:.022,bevelThickness:.014,bevelSegments:1,steps:1}),M.metal,0,0,-.05);
  rod(axeHead,T.ivory,[.65,.50,.01],[.65,.79,.01],.018,.018);
  ell(axeHead,M.gold,0,.69,0,.12,.15,.11);
  for(const kind of ['sword','dagger']){
   const g=group(arms[1].hand,0,-.23,.135);g.name='gear-'+kind;
   if(kind==='sword'){
    g.position.set(SWORD_TUNER_DEFAULTS.posX,SWORD_TUNER_DEFAULTS.posY,SWORD_TUNER_DEFAULTS.posZ);
    g.rotation.set(SWORD_TUNER_DEFAULTS.swordX*Math.PI/180,
     SWORD_TUNER_DEFAULTS.swordY*Math.PI/180,SWORD_TUNER_DEFAULTS.swordZ*Math.PI/180,'YXZ');
   }
   if(kind==='dagger'){
    // Use the initial dagger grip also on remote players and inspection clones.
    g.position.set(DAGGER_TUNER_DEFAULTS.posX,DAGGER_TUNER_DEFAULTS.posY,DAGGER_TUNER_DEFAULTS.posZ);
    g.rotation.set(DAGGER_TUNER_DEFAULTS.daggerX*Math.PI/180,
     DAGGER_TUNER_DEFAULTS.daggerY*Math.PI/180,DAGGER_TUNER_DEFAULTS.daggerZ*Math.PI/180,'YXZ');
   }
   rod(g,M.wood,[0,-.23,0],[0,.21,0],.067);box(g,M.metal,0,.25,0,.43,.07,.12);
   const length=kind==='sword'?1.12:.62;box(g,M.metal,0,.29+length/2,0,.16,length,.065);
   const tip=mesh(g,G.cone,M.metal,0,.29+length+.09,0,.115,.22,.055);tip.rotation.y=Math.PI/4;g.visible=false;
  }
  const shield=group(arms[0].hand,-.12,-.02,-.34);shield.name='gear-shield';shield.rotation.y=Math.PI;
  const disk=mesh(shield,new THREE.CylinderGeometry(.56,.56,.11,12),M.woodLight);disk.name='shield-face';disk.rotation.x=Math.PI/2;
  const rim=mesh(shield,new THREE.TorusGeometry(.53,.04,5,16),M.metal,0,0,.075);rim.name='shield-rim';
  const boss=ell(shield,M.metal,0,0,.09,.16,.16,.08);boss.name='shield-boss';
  for(const x of [-.22,0,.22])box(shield,M.wood,x,0,.066,.018,.92,.013);
  shield.visible=false;
 }
 root.scale.setScalar(scale);fuse(root);const shadow=contactShadow(2.7*scale);
 return{root,body,chest,neck,head,arms,legs,tail,braids,shadow,phase:0,scale,walk:0,weapon};
}
const hero=makeTauren({weapon:true});
// Relative wrist angles are added after each animation frame. Axe angles are
// absolute in the hand's local YXZ coordinates; the GLB and fallback agree.
let axeTuning={...AXE_TUNER_DEFAULTS};
try{axeTuning=normalizeAxeTuning(JSON.parse(localStorage.getItem(AXE_TUNER_STORAGE_KEY)))}catch{}
let rightWristBaseX=-Math.PI/2;
const radians=degrees=>degrees*Math.PI/180;
function applyAxeWristTuning(){
 const hand=hero.arms[1].hand;
 hand.rotation.set(rightWristBaseX+radians(axeTuning.handX),
  radians(axeTuning.handY),radians(axeTuning.handZ),'XYZ');
}
function applyAxeTransform(){
 const axe=hero.arms[1].hand.getObjectByName('gear-axe');
 if(!axe)return;
 axe.position.set(axeTuning.posX,axeTuning.posY,axeTuning.posZ);
 axe.rotation.set(radians(axeTuning.axeX),radians(axeTuning.axeY),
  radians(axeTuning.axeZ),'YXZ');
}
applyAxeWristTuning();applyAxeTransform();
const axeTunerPanel=$('axeTuner'),axeTunerFields=new Map();
function refreshAxeTuner(){
 for(const [key,entry] of axeTunerFields){
  entry.slider.value=String(axeTuning[key]);
  entry.value.textContent=Number(axeTuning[key]).toFixed(key.startsWith('pos')?3:0)+AXE_TUNER_FIELDS[key].unit;
 }
}
for(const section of AXE_TUNER_GROUPS){
 const wrap=document.createElement('section');wrap.className='axe-tuner-section';
 const heading=document.createElement('h3');heading.textContent=section.title;wrap.appendChild(heading);
 for(const key of section.fields){
  const spec=AXE_TUNER_FIELDS[key];
  const row=document.createElement('label');row.className='axe-tuner-field';
  const label=document.createElement('span');label.textContent=spec.label;
  const value=document.createElement('output');
  const slider=document.createElement('input');slider.type='range';slider.min=String(spec.minimum);
  slider.max=String(spec.maximum);slider.step=String(spec.step);slider.setAttribute('aria-label',section.title+' · '+spec.label);
  slider.addEventListener('input',()=>{
   axeTuning=normalizeAxeTuning({...axeTuning,[key]:Number(slider.value)});
   applyAxeWristTuning();applyAxeTransform();refreshAxeTuner();
   try{localStorage.setItem(AXE_TUNER_STORAGE_KEY,serializeAxeTuning(axeTuning))}catch{}
  });
  row.append(label,slider,value);wrap.appendChild(row);axeTunerFields.set(key,{slider,value});
 }
 $('axeTunerControls').appendChild(wrap);
}
refreshAxeTuner();
// Prevent dragging the tuner from also rotating the camera / using hotkeys.
for(const type of ['pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','keydown']){
 axeTunerPanel.addEventListener(type,event=>event.stopPropagation());
}
function openAxeTuner(){
 if(modalKind)closeDialog();
 if(!swordTunerPanel.hidden)closeSwordTuner();
 if(!daggerTunerPanel.hidden)closeDaggerTuner();
 if(!shieldTunerPanel.hidden)closeShieldTuner();
 axeTunerPanel.hidden=false;axeTunerPanel.classList.remove('axe-tuner-collapsed');
 refreshAxeTuner();
}
function closeAxeTuner(){axeTunerPanel.hidden=true}
$('axeTunerClose').addEventListener('click',closeAxeTuner);
$('axeTunerCollapse').addEventListener('click',()=>axeTunerPanel.classList.toggle('axe-tuner-collapsed'));
$('axeTunerSide').addEventListener('click',()=>axeTunerPanel.classList.toggle('axe-tuner-left'));
$('axeTunerReset').addEventListener('click',()=>{
 axeTuning={...AXE_TUNER_DEFAULTS};applyAxeWristTuning();applyAxeTransform();refreshAxeTuner();
 try{localStorage.removeItem(AXE_TUNER_STORAGE_KEY)}catch{}
 $('axeTunerStatus').textContent='Исходное положение восстановлено';
});
$('axeTunerCopy').addEventListener('click',async()=>{
 const text=serializeAxeTuning(axeTuning);
 try{
  if(!navigator.clipboard?.writeText)throw Error('no clipboard');
  await navigator.clipboard.writeText(text);
  $('axeTunerStatus').textContent='Значения скопированы — пришли их в чат';
 }catch{
  const output=$('axeTunerExport');output.hidden=false;output.value=text;output.focus();output.select();
  $('axeTunerStatus').textContent='Выдели и скопируй значения ниже';
 }
});
async function loadHeroAxeAsset(){
 const grip=hero.arms[1].hand,old=grip.getObjectByName('gear-axe');
 if(!old)return;
 try{
  const {GLTFLoader}=await import('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js');
  const asset=await new GLTFLoader().loadAsync('./assets/weapons/tauren-axe-v0.1.glb?v=1');
  const axe=asset.scene;
  axe.position.copy(old.position);axe.rotation.copy(old.rotation);axe.scale.copy(old.scale);
  grip.add(axe);axe.visible=old.visible;old.visible=false;
  old.name='gear-axe-fallback';axe.name='gear-axe';
  applyAxeTransform();syncEquipmentVisuals();
 }catch(error){console.warn('Axe GLB unavailable; keeping procedural fallback',error)}
}
void loadHeroAxeAsset();

let swordTuning={...SWORD_TUNER_DEFAULTS};
try{swordTuning=normalizeSwordTuning(JSON.parse(localStorage.getItem(SWORD_TUNER_STORAGE_KEY)))}catch{}
let swordPreview=false;
function applySwordWristTuning(){
 hero.arms[1].hand.rotation.set(rightWristBaseX+radians(swordTuning.handX),
  radians(swordTuning.handY),radians(swordTuning.handZ),'XYZ');
}
function applySwordTransform(){
 const model=hero.arms[1].hand.getObjectByName('gear-sword');if(!model)return;
 model.position.set(swordTuning.posX,swordTuning.posY,swordTuning.posZ);
 model.rotation.set(radians(swordTuning.swordX),radians(swordTuning.swordY),
  radians(swordTuning.swordZ),'YXZ');
}
applySwordTransform();
const swordTunerPanel=$('swordTuner'),swordTunerFields=new Map();
function refreshSwordTuner(){
 for(const [key,entry] of swordTunerFields){
  entry.input.value=String(swordTuning[key]);
  entry.value.textContent=Number(swordTuning[key]).toFixed(key.startsWith('pos')?3:0)+SWORD_TUNER_FIELDS[key].unit;
 }
}
for(const section of SWORD_TUNER_GROUPS){
 const panel=document.createElement('section');panel.className='axe-tuner-section';
 const title=document.createElement('h3');title.textContent=section.title;panel.appendChild(title);
 for(const key of section.fields){
  const def=SWORD_TUNER_FIELDS[key],label=document.createElement('label');label.className='axe-tuner-field';
  const caption=document.createElement('span');caption.textContent=def.label;
  const value=document.createElement('output'),input=document.createElement('input');
  input.type='range';input.min=String(def.min);input.max=String(def.max);input.step=String(def.step);
  input.setAttribute('aria-label',section.title+' · '+def.label);
  input.addEventListener('input',()=>{
   swordTuning=normalizeSwordTuning({...swordTuning,[key]:Number(input.value)});
   applySwordTransform();if(swordPreview)applySwordWristTuning();refreshSwordTuner();
   try{localStorage.setItem(SWORD_TUNER_STORAGE_KEY,serializeSwordTuning(swordTuning))}catch{}
  });
  label.append(caption,input,value);panel.appendChild(label);swordTunerFields.set(key,{input,value});
 }
 $('swordTunerControls').appendChild(panel);
}
refreshSwordTuner();
for(const type of ['pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','keydown']){
 swordTunerPanel.addEventListener(type,event=>event.stopPropagation());
}
function openSwordTuner(){
 if(modalKind)closeDialog();
 if(!axeTunerPanel.hidden)closeAxeTuner();
 if(!daggerTunerPanel.hidden)closeDaggerTuner();
 if(!shieldTunerPanel.hidden)closeShieldTuner();
 swordPreview=true;swordTunerPanel.hidden=false;swordTunerPanel.classList.remove('axe-tuner-collapsed');
 syncEquipmentVisuals();applySwordTransform();applySwordWristTuning();refreshSwordTuner();
 $('swordTunerStatus').textContent='Меч примеряется без смены экипировки.';
}
function closeSwordTuner(){swordPreview=false;swordTunerPanel.hidden=true;syncEquipmentVisuals();}
$('swordTunerClose').addEventListener('click',closeSwordTuner);
$('swordTunerCollapse').addEventListener('click',()=>swordTunerPanel.classList.toggle('axe-tuner-collapsed'));
$('swordTunerSide').addEventListener('click',()=>swordTunerPanel.classList.toggle('axe-tuner-left'));
$('swordTunerReset').addEventListener('click',()=>{
 swordTuning={...SWORD_TUNER_DEFAULTS};applySwordTransform();if(swordPreview)applySwordWristTuning();
 refreshSwordTuner();try{localStorage.removeItem(SWORD_TUNER_STORAGE_KEY)}catch{}
 $('swordTunerExport').hidden=true;$('swordTunerStatus').textContent='Сброшено';
});
$('swordTunerCopy').addEventListener('click',async()=>{
 const data=serializeSwordTuning(swordTuning);
 try{
  if(!navigator.clipboard?.writeText)throw Error('unavailable');
  await navigator.clipboard.writeText(data);
  $('swordTunerStatus').textContent='JSON скопирован — пришли его в чат';
 }catch{
  const field=$('swordTunerExport');field.hidden=false;field.value=data;field.focus();field.select();
  $('swordTunerStatus').textContent='Скопируй выделенный JSON';
 }
});
// GLB downloaded once; shared geometry is cloned for other characters.
let swordAssetPromise=null;
async function attachSwordAsset(actor){
 const hand=actor.arms[1].hand,old=hand.getObjectByName('gear-sword');
 if(!old||old.userData?.nexgameGlbWeapon)return;
 try{
  if(!swordAssetPromise)swordAssetPromise=import('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js')
   .then(({GLTFLoader})=>new GLTFLoader().loadAsync('./assets/weapons/plains-sword-v0.1.glb?v=1'));
  const asset=await swordAssetPromise;if(!old.parent||!actor.root.parent)return;
  const sword=asset.scene.clone(true),visible=old.visible;
  sword.position.copy(old.position);sword.rotation.copy(old.rotation);sword.scale.copy(old.scale);
  old.name='gear-sword-fallback';old.visible=false;
  sword.name='gear-sword';sword.userData.nexgameGlbWeapon=true;
  sword.visible=visible;hand.add(sword);
  if(actor!==hero&&actor!==characterView?.actor){
   const match=[...remotePlayers.values()].find(remote=>remote.actor===actor);
   if(match&&match.weaponId)applyWeaponQuality(THREE,actor.root,'sword',ITEM_CATALOG[match.weaponId]?.rarity);
  }
  if(actor===hero){
   applySwordTransform();
   syncEquipmentVisuals();
   if(characterView?.actor)void attachSwordAsset(characterView.actor);
  }else if(characterView?.actor===actor)syncEquipmentVisuals();
 }catch(error){swordAssetPromise=null;console.warn('Sword GLB unavailable; fallback remains',error)}
}
void attachSwordAsset(hero);

/* Dagger pose tuning is visual only. Never change equipment, damage or saves. */
let daggerTuning={...DAGGER_TUNER_DEFAULTS};
try{daggerTuning=normalizeDaggerTuning(JSON.parse(localStorage.getItem(DAGGER_TUNER_STORAGE_KEY)))}catch{}
let daggerPreview=false,daggerPreviewAttackElapsed=-1;
function applyDaggerWristTuning(){
 hero.arms[1].hand.rotation.set(rightWristBaseX+radians(daggerTuning.handX),
  radians(daggerTuning.handY),radians(daggerTuning.handZ),'XYZ');
}
function applyDaggerTransform(){
 const model=hero.arms[1].hand.getObjectByName('gear-dagger');
 if(!model)return;
 model.position.set(daggerTuning.posX,daggerTuning.posY,daggerTuning.posZ);
 model.rotation.set(radians(daggerTuning.daggerX),radians(daggerTuning.daggerY),
  radians(daggerTuning.daggerZ),'YXZ');
}
applyDaggerTransform();
const daggerTunerPanel=$('daggerTuner'),daggerTunerFields=new Map();
function refreshDaggerTuner(){
 for(const [key,field] of daggerTunerFields){
  field.slider.value=String(daggerTuning[key]);
  field.output.textContent=Number(daggerTuning[key]).toFixed(key.startsWith('pos')?3:0)+DAGGER_TUNER_FIELDS[key].unit;
 }
}
for(const section of DAGGER_TUNER_GROUPS){
 const group=document.createElement('section');group.className='axe-tuner-section';
 const title=document.createElement('h3');title.textContent=section.title;group.appendChild(title);
 for(const key of section.fields){
  const spec=DAGGER_TUNER_FIELDS[key],row=document.createElement('label');
  row.className='axe-tuner-field';
  const legend=document.createElement('span');legend.textContent=spec.label;
  const output=document.createElement('output'),slider=document.createElement('input');
  slider.type='range';slider.min=String(spec.min);slider.max=String(spec.max);slider.step=String(spec.step);
  slider.setAttribute('aria-label',section.title+' · '+spec.label);
  slider.addEventListener('input',()=>{
   daggerTuning=normalizeDaggerTuning({...daggerTuning,[key]:Number(slider.value)});
   applyDaggerTransform();if(daggerPreview)applyDaggerWristTuning();refreshDaggerTuner();
   try{localStorage.setItem(DAGGER_TUNER_STORAGE_KEY,serializeDaggerTuning(daggerTuning))}catch{}
  });
  row.append(legend,slider,output);group.appendChild(row);daggerTunerFields.set(key,{slider,output});
 }
 $('daggerTunerControls').appendChild(group);
}
refreshDaggerTuner();
for(const type of ['pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','keydown']){
 daggerTunerPanel.addEventListener(type,event=>event.stopPropagation());
}
function openDaggerTuner(){
 if(modalKind)closeDialog();
 daggerPreviewAttackElapsed=-1;
 if(!axeTunerPanel.hidden)closeAxeTuner();
 if(!swordTunerPanel.hidden)closeSwordTuner();
 if(!shieldTunerPanel.hidden)closeShieldTuner();
 daggerPreview=true;daggerTunerPanel.hidden=false;daggerTunerPanel.classList.remove('axe-tuner-collapsed');
 syncEquipmentVisuals();applyDaggerTransform();applyDaggerWristTuning();refreshDaggerTuner();
 $('daggerTunerStatus').textContent='Кинжал показан для примерки. Экипировка не меняется.';
}
function closeDaggerTuner(){
 daggerPreview=false;daggerPreviewAttackElapsed=-1;
 daggerTunerPanel.hidden=true;syncEquipmentVisuals();
}
$('daggerTunerClose').addEventListener('click',closeDaggerTuner);
$('daggerTunerCollapse').addEventListener('click',()=>daggerTunerPanel.classList.toggle('axe-tuner-collapsed'));
$('daggerTunerSide').addEventListener('click',()=>daggerTunerPanel.classList.toggle('axe-tuner-left'));
$('daggerTunerTryAttack').addEventListener('click',()=>{
 if(!daggerPreview)return;
 // Demonstration runs the same real animation on the local actor, without hit checks.
 daggerPreviewAttackElapsed=0;
 $('daggerTunerStatus').textContent='Колющий удар: короткий замах, укол и возврат. Урон не наносится.';
});
$('daggerTunerReset').addEventListener('click',()=>{
 daggerTuning={...DAGGER_TUNER_DEFAULTS};applyDaggerTransform();
 if(daggerPreview)applyDaggerWristTuning();refreshDaggerTuner();
 try{localStorage.removeItem(DAGGER_TUNER_STORAGE_KEY)}catch{}
 $('daggerTunerExport').hidden=true;
 $('daggerTunerStatus').textContent='Сброшено к исходному положению';
});
$('daggerTunerCopy').addEventListener('click',async()=>{
 const data=serializeDaggerTuning(daggerTuning);
 try{
  if(!navigator.clipboard?.writeText)throw Error('Clipboard not available');
  await navigator.clipboard.writeText(data);
  $('daggerTunerStatus').textContent='Значения скопированы — пришли их в чат';
 }catch{
  const textarea=$('daggerTunerExport');textarea.hidden=false;textarea.value=data;
  textarea.focus();textarea.select();
  $('daggerTunerStatus').textContent='Скопируй выделенные значения';
 }
});
// Load a single GLB; replace the fallback and clone real geometry for each actor.
let daggerAssetPromise=null;
async function attachDaggerAsset(actor){
 const hand=actor.arms[1].hand,old=hand.getObjectByName('gear-dagger');
 if(!old||old.userData?.nexgameGlbWeapon)return;
 try{
  if(!daggerAssetPromise)daggerAssetPromise=import('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js')
   .then(({GLTFLoader})=>new GLTFLoader().loadAsync('./assets/weapons/steppe-dagger-v0.1.glb?v=1'));
  const asset=await daggerAssetPromise;
  if(!old.parent||!actor.root.parent)return;
  const dagger=asset.scene.clone(true),visible=old.visible;
  dagger.position.copy(old.position);dagger.rotation.copy(old.rotation);dagger.scale.copy(old.scale);
  old.name='gear-dagger-fallback';old.visible=false;
  dagger.name='gear-dagger';dagger.userData.nexgameGlbWeapon=true;
  dagger.visible=visible;hand.add(dagger);
  if(actor!==hero&&actor!==characterView?.actor){
   const match=[...remotePlayers.values()].find(remote=>remote.actor===actor);
   if(match&&match.weaponId)applyWeaponQuality(THREE,actor.root,'dagger',ITEM_CATALOG[match.weaponId]?.rarity);
  }
  if(actor===hero){
   applyDaggerTransform();
   syncEquipmentVisuals();
   if(characterView?.actor)void attachDaggerAsset(characterView.actor);
  }else if(characterView?.actor===actor)syncEquipmentVisuals();
 }catch(error){
  daggerAssetPromise=null;
  console.warn('Dagger GLB unavailable; keeping procedural fallback',error);
 }
}
void attachDaggerAsset(hero);


// Two shield poses are independent, in localStorage only; never touch inventory.
const shieldTuning=Object.fromEntries(SHIELD_TUNER_VARIANTS.map(kind=>{
 let input=null;try{input=JSON.parse(localStorage.getItem(shieldTunerStorageKey(kind)))}catch{}
 return [kind,normalizeShieldTuning(input,kind)];
}));
let shieldPreview=null,shieldTunerKind='round';
const shieldTunerPanel=$('shieldTuner'),shieldTunerFields=new Map();
function applyShieldTransform(root,kind){
 const mount=root?.getObjectByName('gear-shield');if(!mount)return;
 const name=SHIELD_TUNER_VARIANTS.includes(kind)?kind:'round',p=shieldTuning[name];
 mount.userData.shieldPoseKind=name;
 mount.position.set(p.posX,p.posY,p.posZ);
 mount.rotation.set(radians(p.shieldX),radians(p.shieldY),radians(p.shieldZ),'YXZ');
}
function applyShieldWristPose(actor,baseX){
 const mount=actor.arms[0]?.hand.getObjectByName('gear-shield');
 if(!mount?.visible)return;
 const p=shieldTuning[mount.userData.shieldPoseKind||'round'];
 actor.arms[0].hand.rotation.set(baseX+radians(p.handX),radians(p.handY),radians(p.handZ),'XYZ');
}
function refreshShieldTuner(){
 for(const [key,row] of shieldTunerFields){
  row.slider.value=String(shieldTuning[shieldTunerKind][key]);
  row.output.textContent=Number(shieldTuning[shieldTunerKind][key]).toFixed(key.startsWith('pos')?3:0)+SHIELD_TUNER_FIELDS[key].unit;
 }
 $('shieldTunerTitle').textContent=shieldTunerKind==='round'?'🛡 Круглый щит':'🛡 Вытянутый щит';
 for(const kind of SHIELD_TUNER_VARIANTS)
  $('shieldTuner'+(kind==='round'?'Round':'Kite')).setAttribute('aria-pressed',String(shieldTunerKind===kind));
}
for(const section of SHIELD_TUNER_GROUPS){
 const wrap=document.createElement('section');wrap.className='axe-tuner-section';
 const title=document.createElement('h3');title.textContent=section.title;wrap.appendChild(title);
 for(const key of section.fields){
  const spec=SHIELD_TUNER_FIELDS[key],label=document.createElement('label');label.className='axe-tuner-field';
  const span=document.createElement('span');span.textContent=spec.label;
  const slider=document.createElement('input'),output=document.createElement('output');slider.type='range';
  slider.min=spec.min;slider.max=spec.max;slider.step=spec.step;
  slider.setAttribute('aria-label',section.title+' · '+spec.label);
  slider.addEventListener('input',()=>{
   shieldTuning[shieldTunerKind]=normalizeShieldTuning({...shieldTuning[shieldTunerKind],[key]:Number(slider.value)},shieldTunerKind);
   applyShieldTransform(hero.root,shieldTunerKind);
   if(characterView?.actor)applyShieldTransform(characterView.actor.root,
    shieldModelForRarity(ITEM_CATALOG[state.equipment.shield?.id]?.rarity));
   try{localStorage.setItem(shieldTunerStorageKey(shieldTunerKind),serializeShieldTuning(shieldTuning[shieldTunerKind],shieldTunerKind))}catch{}
   refreshShieldTuner();
   $('shieldTunerStatus').textContent='Сохранено на устройстве';
  });
  label.append(span,slider,output);wrap.appendChild(label);shieldTunerFields.set(key,{slider,output});
 }
 $('shieldTunerControls').appendChild(wrap);
}
function chooseShieldTuner(kind){
 if(!SHIELD_TUNER_VARIANTS.includes(kind))return;
 shieldTunerKind=kind;shieldPreview=kind;refreshShieldTuner();syncEquipmentVisuals();
 $('shieldTunerStatus').textContent='Примерка без смены экипировки';
}
function openShieldTuner(kind='round'){
 if(modalKind)closeDialog();
 if(!axeTunerPanel.hidden)closeAxeTuner();
 if(!swordTunerPanel.hidden)closeSwordTuner();
 if(!daggerTunerPanel.hidden)closeDaggerTuner();
 shieldTunerPanel.hidden=false;shieldTunerPanel.classList.remove('axe-tuner-collapsed');
 chooseShieldTuner(kind);
}
function closeShieldTuner(){shieldPreview=null;shieldTunerPanel.hidden=true;syncEquipmentVisuals()}
for(const name of ['Round','Kite'])
 $('shieldTuner'+name).addEventListener('click',()=>chooseShieldTuner(name.toLowerCase()));
$('shieldTunerClose').addEventListener('click',closeShieldTuner);
$('shieldTunerCollapse').addEventListener('click',()=>shieldTunerPanel.classList.toggle('axe-tuner-collapsed'));
$('shieldTunerSide').addEventListener('click',()=>shieldTunerPanel.classList.toggle('axe-tuner-left'));
$('shieldTunerReset').addEventListener('click',()=>{
 shieldTuning[shieldTunerKind]={...SHIELD_TUNER_DEFAULTS[shieldTunerKind]};
 try{localStorage.removeItem(shieldTunerStorageKey(shieldTunerKind))}catch{}
 refreshShieldTuner();syncEquipmentVisuals();
 $('shieldTunerExport').hidden=true;$('shieldTunerStatus').textContent='Сброшен только выбранный щит';
});
$('shieldTunerCopy').addEventListener('click',async()=>{
 const value=serializeShieldTuning(shieldTuning[shieldTunerKind],shieldTunerKind);
 try{
  if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
  await navigator.clipboard.writeText(value);$('shieldTunerStatus').textContent='JSON скопирован';
 }catch{
  const box=$('shieldTunerExport');box.hidden=false;box.value=value;box.focus();box.select();
  $('shieldTunerStatus').textContent='Скопируй выделенные значения';
 }
});
for(const type of ['pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','keydown'])
 shieldTunerPanel.addEventListener(type,event=>event.stopPropagation());
// Compact accordion shared by weapon tuners and the new shield tuner.
function initializeCompactTuner(panel){
 const sections=[...panel.querySelectorAll('.axe-tuner-section')];
 for(const [i,section] of sections.entries()){
  const heading=section.querySelector('h3');if(!heading)continue;
  const show=(panel===shieldTunerPanel?i===0:i===sections.length-1);
  section.classList.toggle('is-open',show);heading.setAttribute('aria-expanded',String(show));
  heading.setAttribute('role','button');heading.tabIndex=0;
  const toggle=()=>{
   const open=!section.classList.contains('is-open');
   for(const item of sections){item.classList.remove('is-open');item.querySelector('h3')?.setAttribute('aria-expanded','false')}
   if(open){section.classList.add('is-open');heading.setAttribute('aria-expanded','true')}
  };
  heading.addEventListener('click',toggle);
  heading.addEventListener('keydown',event=>{
   if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle()}
  });
 }
}
for(const panel of [axeTunerPanel,swordTunerPanel,daggerTunerPanel,shieldTunerPanel])
 initializeCompactTuner(panel);
refreshShieldTuner();

// Reuse both original shield GLBs for all players; leave the old procedural
// shield in place as a fallback whenever the asset cannot be downloaded.
const shieldAssetPromises=new Map();
async function attachShieldAsset(root,rarity){
 const mount=root?.getObjectByName('gear-shield');
 if(!mount)return;
 const key=shieldModelForRarity(rarity),spec=SHIELD_MODELS[key];
 const existing=mount.getObjectByName('shield-glb-model');
 if(existing&&mount.userData.shieldVariant===key){
  styleShieldGlb(THREE,existing,rarity);
  return;
 }
 const ticket=(mount.userData.shieldRequest||0)+1;
 mount.userData.shieldRequest=ticket;
 try{
  if(!shieldAssetPromises.has(key))
   shieldAssetPromises.set(key,import('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js')
    .then(({GLTFLoader})=>new GLTFLoader().loadAsync(spec.path+'?asset=1'))
    .catch(error=>{shieldAssetPromises.delete(key);throw error}));
  const gltf=await shieldAssetPromises.get(key);
  if(mount.userData.shieldRequest!==ticket||!mount.parent)return;
  const previous=mount.getObjectByName('shield-glb-model');
  if(previous)mount.remove(previous);
  const model=gltf.scene.clone(true);
  model.name='shield-glb-model';
  model.scale.setScalar(spec.scale);
  styleShieldGlb(THREE,model,rarity);
  mount.add(model);
  applyShieldTransform(root,key);
  // Hide only the old procedural fallback and its decorative overlay.
  for(const child of mount.children)if(child!==model)child.visible=false;
  mount.userData.shieldVariant=key;
  if(characterView?.actor?.root===root)characterView.nextFrame=0;
 }catch(error){
  // Keep the previously equipped model or procedural fallback visible.
  console.warn('Shield GLB unavailable, keeping fallback:',error);
 }
}



const mentor=makeTauren({fur:0x725438,cloth:M.teal,scale:.95});mentor.root.position.set(-1.5,heightAt(-1.5,-5),-5);mentor.root.rotation.y=.2;
const trader=makeTauren({fur:0x978064,cloth:M.hideDark,scale:.89});trader.root.position.set(8,heightAt(8,1),1);trader.root.rotation.y=-.7;
const armorer=makeTauren({fur:0x665043,cloth:M.woodLight,scale:.94});armorer.root.position.set(6,heightAt(6,11),11);armorer.root.rotation.y=-1.2;
const npcs=[{x:6,z:11,name:'Борун Крепкая Ладонь',actor:armorer,type:'armorer'},{x:-1.5,z:-5,name:'Наставник Каменный Рог',actor:mentor,type:'mentor'},{x:8,z:1,name:'Травница Тихая Заря',actor:trader,type:'trader'}];
// Friendly NPCs are interaction targets, not physical obstacles.
function spriteText(text,color='#f9df91',size=32){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+size+'px Georgia';ctx.lineWidth=5;ctx.strokeStyle='#302817';ctx.fillStyle=color;ctx.strokeText(text,256,48);ctx.fillText(text,256,48);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthWrite:false,transparent:true}));s.scale.set(4.3,.81,1);return s}
for(const n of npcs){const name=spriteText(n.name,'#d9e2a1',25);scene.add(name);name.position.set(n.x,heightAt(n.x,n.z)+4.45,n.z);n.nameTag=name}
const chestTag=spriteText('Общий сундук · 18','#ffe0a0',24);
chestTag.position.set(HEARTH_CHEST_POS.x,heightAt(HEARTH_CHEST_POS.x,HEARTH_CHEST_POS.z)+5.4,HEARTH_CHEST_POS.z);scene.add(chestTag);
const merchantLabel=spriteText('Оружие и доспехи', '#e5c574',23);merchantLabel.position.set(6,heightAt(6,11)+3.85,11);scene.add(merchantLabel);
const questMarker=spriteText('!','#ffe180',72);questMarker.scale.set(2.5,1.6,1);scene.add(questMarker);
const herbalistMarker=spriteText('!','#ffe180',72);
herbalistMarker.scale.set(2.5,1.48,1);
herbalistMarker.position.set(8,heightAt(8,1)+5.65,1);
herbalistMarker.visible=true;scene.add(herbalistMarker);
let lastHerbalistGlyph='!';
function herbalistQuestGlyph(){
 if(state.gatherStage===0||(state.gatherAvailable&&state.gatherStage>=2&&state.gatherStage<=3))return '!';
 if(state.gatherStage>0&&state.gatherStage<4){
  const q=GATHER_QUESTS[state.gatherStage];
  if(q&&gatherQuestCount()>=q.count)return '?';
 }
 return '';
}
function updateHerbalistMarker(){
 const glyph=herbalistQuestGlyph();
 herbalistMarker.visible=Boolean(glyph);
 if(!glyph||glyph===lastHerbalistGlyph)return;
 lastHerbalistGlyph=glyph;
 const canvas=herbalistMarker.material.map.image,ctx=canvas.getContext('2d');
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 72px Georgia';ctx.lineWidth=5;
 ctx.strokeStyle='#392718';ctx.fillStyle='#ffe180';
 ctx.strokeText(glyph,256,48);ctx.fillText(glyph,256,48);
 herbalistMarker.material.map.needsUpdate=true;
}
const relic=group(scene,35,heightAt(35,-14)+1.7,-11.8);const featherMat=material(0x79c8ba,{emissive:0x2c5b45,emissiveIntensity:.5});ell(relic,featherMat,0,.15,0,.18,.48,.08);rod(relic,M.bone,[0,-.4,0],[0,.53,0],.025);const relicShadow=contactShadow(1);
// Lightweight wildlife: animated joint groups, no skinned meshes or animation files.
function makePlainstrider(x,z,index){const root=group(scene,x,heightAt(x,z),z),body=group(root,0,1.23,0),brown=material(index%2?0x826649:0x917044),plume=material(0xa77944),legs=[];ell(body,brown,0,.1,0,.58,.49,.8);ell(body,plume,0,.18,-.4,.53,.35,.47);rod(body,brown,[0,.25,.5],[0,.92,.82],.18,.13);ell(body,brown,0,.97,.85,.25,.29,.27);ell(body,M.gold,0,.89,1.12,.15,.1,.28);for(const s of [-1,1]){ell(body,M.black,s*.19,1.02,.99,.045,.045,.03);const wing=ell(body,plume,s*.46,.12,-.05,.14,.35,.6);wing.rotation.x=.2;const leg=group(root,s*.24,1.1,.06);rod(leg,M.hideDark,[0,0,0],[0,-.93,0],.055);box(leg,M.wood,0,-1,.14,.18,.12,.38);legs.push(leg)}for(let i=0;i<3;i++){const f=ell(body,plume,(i-1)*.16,.98,.63,.055,.42,.11);f.rotation.x=-.2}fuse(root);return{root,body,legs,shadow:contactShadow(1.7),spawnX:x,spawnZ:z,hp:54,maxHp:54,dead:0,corpseAge:0,loot:[],hit:0,aggro:false,stunned:0,attackCd:0,attackWindup:0,returning:false,alertRemaining:0,phase:index,roamTime:rand()*8,index}}
const enemies=[[-9,-23],[1,-28],[13,-22],[21,-33],[-22,-35],[-28,29],[15,36],[48,9]].map(([x,z],i)=>makePlainstrider(x,z,i));
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
// Low-cost aggro marker, visible briefly when a wild creature notices a player.
for(const e of enemies){
 const alert=spriteText('!','#ffc978',78);
 alert.scale.set(1.55,1.4,1);alert.visible=false;scene.add(alert);
 e.alertTag=alert;
}
function animateMobAlert(e,dt){
 e.alertRemaining=Math.max(0,(e.alertRemaining||0)-dt);
 if(!e.alertTag)return;
 e.alertTag.visible=e.dead<=0&&e.alertRemaining>0;
 if(e.alertTag.visible)e.alertTag.position.set(e.root.position.x,
  heightAt(e.root.position.x,e.root.position.z)+(e.boss?5.9:3.6)+Math.sin(clock*7)*.08,
  e.root.position.z);
}
// Every confirmed hit (including other players' hits) uses this same
// lightweight presentation layer. The world server remains authoritative.
const combatFeedback=createCombatFeedback({THREE,document,camera,layer:$('combatFeedback')});
function showCombatHit(enemy,damage,abilityId='autoAttack'){
 if(!enemy)return;
 enemy.hit=HIT_REACTION_SECONDS;
 combatFeedback.hit(enemy,damage,abilityId);
}
// A distinct stationary training target, not a bird with boosted HP.
// Build it from cheap procedural geometry so it renders on mobile Safari.
function makeTrainingDummy(){
 const {x,z,maxHp}=TRAINING_DUMMY;
 const root=group(scene,x,heightAt(x,z),z);
 const straw=material(0xc7a36a),strawLight=material(0xe3bf7b),
  strawDark=material(0x99764b),rope=material(0x947447);
 const base=group(root);
 box(base,M.wood,-.63,.13,0,.24,.26,1.55);
 box(base,M.wood,.63,.13,0,.24,.26,1.55);
 box(base,M.wood,0,.15,0,1.9,.22,.22);
 rod(base,M.woodLight,[-.64,.3,0],[-.64,2.54,0],.105,.10);
 rod(base,M.woodLight,[.64,.3,0],[.64,2.54,0],.105,.10);
 rod(base,M.wood,[-.74,2.44,0],[.74,2.44,0],.14,.12);
 const body=group(root,0,1.45,0);
 ell(body,straw,0,0,0,.66,.85,.39);
 ell(body,strawLight,0,.85,0,.41,.44,.38);
 ell(body,strawDark,0,.17,.30,.49,.22,.12);
 for(const y of [-.48,.55]){
  const band=mesh(body,new THREE.TorusGeometry(.62,.045,5,20),rope,0,y,0);
  band.rotation.x=Math.PI/2;band.scale.y=.64;
 }
 rod(body,M.woodLight,[-1.24,.45,0],[1.24,.45,0],.12);
 for(const side of [-1,1]){
  ell(body,strawLight,side*.82,.38,0,.32,.22,.22);
  for(let i=0;i<4;i++){
   const tip=mesh(body,G.cone,strawLight,side*(.93+i*.1),.36,.02,.06,.25,.055);
   tip.rotation.z=side*(i%2?.45:-.45);
  }
 }
 // Hand-painted concentric target plate facing the walk-in side of camp.
 const rings=[
  {r:.53,mat:M.woodDark||M.wood,z:.429},
  {r:.43,mat:M.bone,z:.441},
  {r:.32,mat:M.red,z:.453},
  {r:.215,mat:strawLight,z:.465},
  {r:.102,mat:M.red,z:.478}
 ];
 for(const ring of rings){
  const disc=mesh(body,new THREE.CylinderGeometry(ring.r,ring.r,.022,24),ring.mat,0,.01,ring.z);
  disc.rotation.x=Math.PI/2;
 }
 for(let i=-2;i<=2;i++){
  const tuft=mesh(body,G.cone,strawLight,i*.16,1.17,-.02,.13,.42,.12);
  tuft.rotation.z=Math.PI+i*.08;
 }
 fuse(root);
 const shadow=contactShadow(2.25);
 shadow.position.set(x,heightAt(x,z)+.055,z);
 const nameTag=spriteText(TRAINING_DUMMY.name,'#f4dfa6',26);
 nameTag.scale.set(4.7,.82,1);
 nameTag.position.set(x,heightAt(x,z)+4.04,z);
 scene.add(nameTag);
 const unit={kind:'trainingDummy',trainingDummy:true,passive:true,immortal:true,
  noLoot:true,noXp:true,noQuest:true,name:TRAINING_DUMMY.name,boss:false,
  root,shadow,nameTag,spawnX:x,spawnZ:z,
  hp:maxHp,maxHp,dead:0,corpseAge:0,loot:[],hit:0,
  aggro:false,stunned:0,attackCd:0,phase:0,roamTime:0,index:enemies.length,
  baseScale:1,trainingStats:createTrainingStats()};
 // Keep a physical pillar, yet leave room to walk around and attack it.
 obstacle(x,z,.64,3.2);
 return unit;
}
const trainingDummy=makeTrainingDummy();
enemies.push(trainingDummy);
// Load the ONE original GLB and share its geometry/material between all
// wild dolgonogs and the scaled-up boss. Gameplay starts immediately;
// procedural meshes stay available as a fallback if loading fails offline.
async function loadOriginalDolgonogs(){
 try{
  const {GLTFLoader}=await import('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js');
  const gltf=await new GLTFLoader().loadAsync(PLAINSTRIDER_GLB);
  if(!validatePlainstriderGltf(gltf))throw Error('Unexpected dolgonog rig/animations');
  for(const enemy of enemies)if(!enemy.trainingDummy){
   attachPlainstriderGltf(THREE,enemy,gltf);
   advancePlainstriderVisual(THREE,enemy,0,0,enemy.dead>0);
  }
  dolgonogRenderStatus='GLB';
  showWorldNetworkStatus();
 }catch(error){
  dolgonogRenderStatus='резерв';
  showWorldNetworkStatus();
  console.warn('Original Dolgonog GLB unavailable; keeping procedural fallback:',error);
 }
}
void loadOriginalDolgonogs();
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
 // Unique material per corpse; shared texture/geometry remains lightweight.
 e.lootMarker=new THREE.Sprite(corpseLootMaterial.clone());
 e.lootMarker.userData.rarity='common';
 e.lootMarker.scale.set(.95,.95,1);
 e.lootMarker.visible=false;scene.add(e.lootMarker);
}
function refreshLootMarkerQuality(e){
 if(!e?.lootMarker)return;
 const rarity=highestLootRarity(e.loot,ITEM_CATALOG);
 e.lootMarker.userData.rarity=rarity;
 e.lootMarker.material.color.setHex(QUALITY_VISUALS[rarity].marker);
 e.lootMarker.material.opacity=1;
 e.lootMarker.scale.set(.95,.95,1);
}
function animateLootMarkerQuality(e){
 const sprite=e.lootMarker;
 if(!sprite?.visible)return;
 const rarity=sprite.userData.rarity;
 const intensity=rarity==='rare'?.085:rarity==='uncommon'?.035:0;
 if(!intensity)return;
 const pulse=Math.sin(clock*(rarity==='rare'?4:2.7)+e.index)*intensity;
 sprite.scale.set(.95+pulse,.95+pulse,1);
 sprite.material.opacity=.91+.09*Math.sin(clock*3+e.index)**2;
}
const selection=mesh(scene,new THREE.RingGeometry(.8,.88,40),new THREE.MeshBasicMaterial({color:0xf6d580,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false}),0,.07,0,1,1,1,false);selection.rotation.x=-Math.PI/2;selection.visible=false;
const stompRing=mesh(scene,new THREE.RingGeometry(.85,1,48),new THREE.MeshBasicMaterial({color:0xe9c66b,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}),0,.08,0,1,1,1,false);stompRing.rotation.x=-Math.PI/2;
function animateTauren(actor,time,dt,walk=0,attack=-1,stomp=-1,turn=0,gather=0){
 actor.walk=THREE.MathUtils.damp(actor.walk,walk,10,dt);const w=actor.walk,phase=actor.phase,breath=Math.sin(time*1.7),stride=Math.sin(phase*TAU),beat=Math.cos(phase*TAU*2);
 actor.body.position.set(stride*.035*w,1.4+.008*breath+.026*(1-beat)*w,0);actor.chest.rotation.set(.035*w,Math.sin(phase*TAU)*.065*w,-stride*.025*w);actor.chest.scale.y=1+breath*.005;
 actor.neck.rotation.set(-.018*breath-.025*beat*w,-actor.chest.rotation.y*.65,stride*.015*w);
 // Choose the animation from the weapon actually visible on this actor.
 // Keep previously approved wrist and GLB attachment angles unchanged.
 const weaponKind=actor.weapon?visibleWeaponKind(actor.arms[1].hand):'none';
 const swingProfile=weaponSwingProfile(weaponKind);
 const daggerStab=weaponKind==='dagger'?daggerThrustPose(attack):null;
 let swing=0,windup=0;
 if(attack>=0&&daggerStab){
  // Unlike sweeping blades, the dagger barely twists the torso.
  actor.chest.rotation.y+=.06*daggerStab.draw-.07*daggerStab.extend;
  actor.chest.rotation.x+=.10*daggerStab.extend;
 }else if(attack>=0){
  const a=clamp(attack,0,1);
  windup=smooth(0,.32,a)*(1-smooth(.38,.65,a));
  swing=smooth(.32,.58,a)*(1-smooth(.64,1,a));
  actor.chest.rotation.y+=-swingProfile.torsoWindup*windup+swingProfile.torsoSwing*swing;
  actor.chest.rotation.x+=.12*swing;
 }
 const crouch=stomp>=0?.14*Math.sin(Math.min(stomp/.55,1)*Math.PI):0;
 const bend=clamp(gather,0,1);
 const shieldVisible=actor.arms[0]?.hand.getObjectByName('gear-shield')?.visible===true;
 const block=shieldVisible?shieldBlockPose(actor.blockRemaining):shieldBlockPose(0);
 actor.chest.rotation.x+=block.chestX;
 actor.chest.rotation.y+=block.chestY;
 actor.body.position.y-=crouch+.47*bend;
 if(daggerStab)actor.body.position.z+=.16*daggerStab.extend;
 actor.chest.rotation.x+=.20*bend;actor.neck.rotation.x+=.1*bend;
 for(let i=0;i<2;i++){const arm=actor.arms[i],sign=i?1:-1;arm.shoulder.rotation.x=sign*stride*.31*w-(i?swingProfile.shoulderWindup*windup-swingProfile.shoulderSwing*swing:0);arm.shoulder.rotation.z=-sign*(.12+.025*breath+(stomp>=0?.17*Math.sin(stomp*Math.PI):0))+(i?swingProfile.shoulderSlash*swing:0);arm.shoulder.rotation.x-=bend*(i?.95:1.12);arm.elbow.rotation.x=-.14-Math.abs(stride)*.11*w-(i?swingProfile.elbowWindup*windup:0)-.45*bend;
  if(i===0&&block.power>0){
   arm.shoulder.rotation.x+=block.shoulderX;
   arm.shoulder.rotation.z+=block.shoulderZ;
   arm.elbow.rotation.x+=block.elbowX;
  }
  if(i===1&&daggerStab){
   // Pull the forearm in close, then thrust straight forward at the impact.
   // The elbow opens on extension; no lateral slashing arc is introduced.
   arm.shoulder.rotation.x+=.24*daggerStab.draw-1.16*daggerStab.extend;
   arm.shoulder.rotation.z-=.07*daggerStab.extend;
   arm.elbow.rotation.x+=-.72*daggerStab.draw+.11*daggerStab.extend;
  }
  // Rotate the weapon wrist by 90 degrees. During an axe swing the wrist
  // follows a wood-chopping arc: raised on windup, edge down on impact.
  arm.hand.rotation.x=i?(-Math.PI/2-swingProfile.wristWindup*windup+swingProfile.wristSwing*swing):Math.PI;
  if(i===0)applyShieldWristPose(actor,arm.hand.rotation.x+block.wristX);
  if(i===1&&daggerStab)arm.hand.rotation.x+=.12*daggerStab.draw-.08*daggerStab.extend;
  if(i===1&&actor.weapon){
   const daggerVisible=arm.hand.getObjectByName('gear-dagger')?.visible;
   const swordVisible=arm.hand.getObjectByName('gear-sword')?.visible;
   const axeVisible=arm.hand.getObjectByName('gear-axe')?.visible;
   if(daggerVisible){
    if(actor===hero){rightWristBaseX=arm.hand.rotation.x;applyDaggerWristTuning();}
    else arm.hand.rotation.set(
     arm.hand.rotation.x+DAGGER_TUNER_DEFAULTS.handX*Math.PI/180,
     DAGGER_TUNER_DEFAULTS.handY*Math.PI/180,
     DAGGER_TUNER_DEFAULTS.handZ*Math.PI/180,'XYZ');
   }else if(swordVisible){
    if(actor===hero){rightWristBaseX=arm.hand.rotation.x;applySwordWristTuning();}
    else arm.hand.rotation.set(
     arm.hand.rotation.x+SWORD_TUNER_DEFAULTS.handX*Math.PI/180,
     SWORD_TUNER_DEFAULTS.handY*Math.PI/180,SWORD_TUNER_DEFAULTS.handZ*Math.PI/180,'XYZ');
   }else if(axeVisible){
    if(actor===hero){rightWristBaseX=arm.hand.rotation.x;applyAxeWristTuning();}
    else arm.hand.rotation.set(
     arm.hand.rotation.x+AXE_TUNER_DEFAULTS.handX*Math.PI/180,
     AXE_TUNER_DEFAULTS.handY*Math.PI/180,AXE_TUNER_DEFAULTS.handZ*Math.PI/180,'XYZ');
   }
  }
 }
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
const playerNameKey='nexgame-character-name-v1';
const sanitizePlayerName=name=>typeof name==='string'?
 name.replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,24):'';
let characterName='';
try{characterName=sanitizePlayerName(localStorage.getItem(playerNameKey))}catch{}
if(!characterName){
 characterName='Таурен '+String(Math.floor(1000+Math.random()*9000));
 try{localStorage.setItem(playerNameKey,characterName)}catch{}
}

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
 const kind=equippedWeaponKind(state.equipment,ITEM_CATALOG),
  shield=ITEM_CATALOG[state.equipment.shield?.id];
 for(const root of [hero.root,characterView?.actor.root].filter(Boolean)){
  const visualKind=root===hero.root&&daggerPreview?'dagger':root===hero.root&&swordPreview?'sword':kind;
  const previewKind=root===hero.root?shieldPreview:null;
  setWeaponVisuals(root,visualKind,!!shield||!!previewKind);
  if(visualKind!=='none'){
   const weaponDef=ITEM_CATALOG[state.equipment.weapon?.id];
   applyWeaponQuality(THREE,root,visualKind,weaponDef?.weaponKind===visualKind?weaponDef.rarity:'common');
  }
  const shieldModel=root.getObjectByName('gear-shield');
  if(shieldModel){
   shieldModel.scale.setScalar(!previewKind&&shield?.sourceId===2210?.8:1);
   const rarity=previewKind?(previewKind==='round'?'poor':'uncommon'):shield?.rarity;
   applyShieldTransform(root,previewKind||shieldModelForRarity(rarity));
   if(rarity){
    const glb=shieldModel.getObjectByName('shield-glb-model');
    if(glb)styleShieldGlb(THREE,glb,rarity);
    else applyShieldQuality(THREE,root,rarity);
    void attachShieldAsset(root,rarity);
   }
  }
 }
 if(characterView)characterView.nextFrame=0;
}
function rollMeleeDamage(rng=Math.random){const stats=playerStats();return Math.round(stats.damageMin+rng()*(stats.damageMax-stats.damageMin))}
function incomingDamage(enemy,raw,rng=Math.random){
 const stats=playerStats(),dx=enemy.root.position.x-state.x,dz=enemy.root.position.z-state.z;
 const inFront=Math.sin(hero.root.rotation.y)*dx+Math.cos(hero.root.rotation.y)*dz>=0;
 const blocked=stats.blockChance>0&&inFront&&rng()<stats.blockChance;
 const damage=Math.max(blocked?0:1,Math.round(raw*(1-armorReduction(stats.armor,enemy.boss?5:1))-(blocked?stats.blockValue:0)));
 if(blocked){
  hero.blockRemaining=SHIELD_BLOCK_SECONDS;
  msg('Блок щитом! Поглощено до '+stats.blockValue+' урона',1100);
 }
 return damage;
}
function finishEquipmentChange(slot){
 // Equipment stat changes never heal; removing stamina clamps to the new cap.
 state.hp=Math.min(state.hp,playerStats().maxHp);
 // Weapon swaps during a fight preserve autoattack, the current swing and its
 // cooldown. Resetting a timer here would enable instantaneous extra attacks.
 // Armor and shields keep their existing equipment-change behaviour.
 if(slot!=='weapon'){
  autoAttack=false;attackElapsed=-1;swingTarget=null;attackCooldown=0;
  autoSwingClock.reset();
 }
 syncEquipmentVisuals();save();updateHUD();
}
function equipInventorySlot(index,expected=state.inventory[index]){
 const item=state.inventory[index],def=ITEM_CATALOG[item?.id];
 if(!item||item!==expected||!def?.slot)return false;
 if(def.slot!=='weapon'&&inCombat()){msg('Сначала выйди из боя, чтобы сменить экипировку');return false}
 if(state.level<(def.requiredLevel||1)){msg('Требуется уровень '+def.requiredLevel);return false}
 // Exchange within the same backpack cell, including when all 12 cells are occupied.
 const previous=state.equipment[def.slot];
 state.equipment[def.slot]={id:item.id,qty:1};
 state.inventory[index]=previous?{id:previous.id,qty:1}:null;
 finishEquipmentChange(def.slot);msg('Надето: '+def.name);return true;
}
function unequipSlot(slot,expected=state.equipment[slot]){
 const item=state.equipment[slot];if(!item||item!==expected)return false;
 if(slot!=='weapon'&&inCombat()){msg('Сначала выйди из боя, чтобы снять экипировку');return false}
 if(!storeItem({id:item.id,qty:1},false)){msg('Для снятой вещи нужно свободное место в рюкзаке');return false}
 state.equipment[slot]=null;finishEquipmentChange(slot);msg('Снято: '+ITEM_CATALOG[item.id].name);return true;
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
 const name=document.createElement('strong');name.className='item-name';name.dataset.rarity=itemRarity(def.rarity);name.textContent=def.icon+' '+def.name;card.appendChild(name);
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
  row.dataset.rarity=itemRarity(def.rarity);
  const info=document.createElement('div'),name=document.createElement('strong');name.className='item-name';name.dataset.rarity=itemRarity(def.rarity);name.textContent=def.icon+' '+def.name+(item.qty>1?' ×'+item.qty:'');info.appendChild(name);
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
 openDialog(characterName,'ТАУРЕН · ВОИН · УРОВЕНЬ '+state.level,[],'character');
 const view=ensureCharacterView();view.nextFrame=0;view.drag=null;
 const body=$('mbody'),intro=document.createElement('div');intro.className='character-section-label';intro.textContent='ЭКИПИРОВКА';body.appendChild(intro);
 const layout=document.createElement('div');layout.className='character-layout';
 const left=document.createElement('div'),right=document.createElement('div');left.className=right.className='equipment-column';
 const detail=document.createElement('div');detail.className='equipment-detail';detail.setAttribute('role','status');detail.setAttribute('aria-live','polite');detail.textContent='Выбери вещь, чтобы посмотреть её свойства или снять. Новые вещи надеваются из рюкзака.';
 for(const [index,slot] of EQUIPMENT_SLOTS.entries()){
  const item=state.equipment[slot.id],def=item?ITEM_CATALOG[item.id]:null,button=document.createElement('button');button.type='button';button.className='equipment-slot'+(item?' equipped':'');button.dataset.slot=slot.id;if(def)button.dataset.rarity=itemRarity(def.rarity);
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
 return !!q&&!state.gatherAvailable&&node.stage===state.gatherStage&&
   (node.pending||(gatherQuestCount()<q.count&&clock>=node.readyAt));
}
function updateGatherVisibility(){
 for(const node of gatherNodes){
  node.root.visible=gatherNodeAvailable(node);
  if(node.root.visible){node.root.rotation.y=.09*Math.sin(clock*1.4+node.index);node.sparkle.position.y=.85+.1*Math.sin(clock*2.5+node.index)}
 }
}
const initial={x:0,z:10,yaw:Math.PI,hp:120,level:1,xp:0,gold:0,potions:2,classId:'warrior',resource:0,actionBar:normalizeHotbar(null),quest:0,kills:0,relic:false,gatherStage:0,gatherAvailable:false,inventory:Array(BASE_INVENTORY_SLOTS).fill(null),bags:Array(EQUIPPED_BAG_SLOTS).fill(null),equipment:startingEquipment(),buyback:[]};
let state={...initial,inventory:[...initial.inventory],bags:[...initial.bags],equipment:startingEquipment(),buyback:[],actionBar:normalizeHotbar(null)};
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
// One-time migration: purge retired test weapons from old saves.
const hadRetiredTestAxe=(Array.isArray(state.inventory)&&state.inventory.some(item=>item?.id==='stormbeakCrusher'))||state.equipment?.weapon?.id==='stormbeakCrusher'||(Array.isArray(state.buyback)&&state.buyback.some(item=>item?.id==='stormbeakCrusher'));
state.level=clamp(Math.floor(state.level),1,60);state.classId=normalizeClassId(state.classId);state.resource=normalizeResource(state.resource,state.classId);state.quest=clamp(Math.floor(state.quest),0,12);state.gatherStage=clamp(Math.floor(state.gatherStage),0,4);if(state.gatherStage===0||state.gatherStage===4)state.gatherAvailable=false;state.kills=clamp(Math.floor(state.kills),0,3);state.potions=clamp(Math.floor(state.potions),0,99);state.gold=clamp(Math.floor(state.gold),0,99999);state.xp=Math.max(0,state.xp);if(!clearAt(state.x,state.z)){state.x=initial.x;state.z=initial.z}
state.bags=normalizeBags(state.bags);state.inventory=normalizeInventory(state.inventory);
state.actionBar=normalizeHotbar(state.actionBar,state.classId,state.level);
const needsStarterWeapon=!state.equipment||!Object.hasOwn(state.equipment,'weapon');
state.equipment=normalizeEquipment(state.equipment);
if(needsStarterWeapon)state.equipment.weapon={id:'wornAxe',qty:1};
state.buyback=Array.isArray(state.buyback)?state.buyback.filter(row=>row&&ITEM_CATALOG[row.id]&&Number.isInteger(row.qty)&&row.qty>0&&row.qty<=itemStackLimit(row.id)&&row.price===ITEM_CATALOG[row.id].sell*row.qty).slice(0,12):[];
state.hp=clamp(state.hp,1,playerStats().maxHp);syncEquipmentVisuals();
// Old saves might place characters inside the newly carved deep water.
let rescuedFromLake=false;
if(!canWadeAt(state.x,state.z,LAKE)){
 const shore=lakeDryShorePoint(state.x,state.z,LAKE);
 const destination=clearAt(shore.x,shore.z)?shore:{x:initial.x,z:initial.z};
 state.x=destination.x;state.z=destination.z;rescuedFromLake=true;
}
hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);hero.root.rotation.y=state.yaw;
const save=()=>{try{localStorage.setItem(saveKey,JSON.stringify(state))}catch(e){}};
if(hadRetiredTestAxe||rescuedFromLake)save(); // Save migrations while preserving character progress.
let hotbarPending=null,spellbookTab='abilities';
const hotbarButtons=[],hotbarVisuals=[];
const keys=new Set(),joy={x:0,y:0,id:null},look={id:null,x:0,y:0,startX:0,startY:0,selectOnly:false},pinch={id:null,x:0,y:0,startSpan:0,startDistance:0},stick=$('stick'),nub=$('nub');
let gatherCast=null;
const abilityRuntime=createAbilityRuntime();
const autoSwingClock=createAutoSwingClock();
let swingAbilityId='autoAttack';
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
 meadow.applyDensity(preset);
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
function setCameraDistance(value,persist=true){if(!Number.isFinite(value))return;cameraDistance=Math.round(clamp(value,4,44)*10)/10;cameraSlider.value=String(cameraDistance);const valueText=cameraDistance.toFixed(1).replace('.',',');$('cameraDistanceValue').textContent=valueText;cameraSlider.setAttribute('aria-valuetext',valueText);if(persist)try{localStorage.setItem(cameraStoreKey,String(cameraDistance))}catch(e){}}
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
function finishPinch(){
 const id=pinch.id,zoomed=pinch.startSpan>0;
 pinch.id=null;pinch.startSpan=0;
 if(id!==null){
  if(zoomed)setCameraDistance(cameraDistance); // Save the final zoom, not every touch-move.
  if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
 }
}
function finishLook(){
 finishPinch();
 const id=look.id;look.id=null;
 if(id!==null){cameraFollowCooldown=.85;rememberCameraPitch();if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id)}
}
function updatePinchZoom(){
 if(pinch.id===null||look.id===null)return;
 const span=Math.hypot(look.x-pinch.x,look.y-pinch.y);
 // Very close fingers should not produce huge jumps when they first separate.
 if(span<24)return;
 if(pinch.startSpan===0){pinch.startSpan=span;pinch.startDistance=cameraDistance;return}
 // Spreading fingers zooms in, pinching together zooms out.
 setCameraDistance(pinch.startDistance*pinch.startSpan/span,false);
 cameraFollowCooldown=.85;
}
function clearInput(){keys.clear();resetStick();finishLook();velocityX=velocityZ=0;if(characterView?.drag){const id=characterView.drag.id;characterView.drag=null;if(characterView.canvas?.hasPointerCapture(id))characterView.canvas.releasePointerCapture(id)}}
function stickMove(e){const r=stick.getBoundingClientRect(),radius=r.width*.3,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),s=len>radius?radius/len:1;joy.x=Math.abs(dx*s)<3?0:dx*s/radius;joy.y=Math.abs(dy*s)<3?0:dy*s/radius;nub.style.transform=`translate(${dx*s}px,${dy*s}px)`}
stick.addEventListener('pointerdown',e=>{if(modalKind||joy.id!==null)return;e.preventDefault();joy.id=e.pointerId;stick.setPointerCapture(e.pointerId);stickMove(e)});
stick.addEventListener('pointermove',e=>{if(e.pointerId===joy.id){e.preventDefault();stickMove(e)}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(joy.id===e.pointerId)resetStick()});
const canvas=renderer.domElement,pickRay=new THREE.Raycaster();canvas.style.touchAction='none';
// World taps work on both mouse and touch. A short tap on EMPTY scenery
// cancels targeting; dragging the camera, tapping an NPC/the hero, touching
// collectible objects, or clicking a battle target does not cancel it.
function handleWorldTap(clientX,clientY,allowEmptyClear=true){
 if(modalKind)return 'blocked';
 if(hotbarPending!==null){
  cancelHotbarAssignment();
  return 'assignment-cancelled';
 }
 pickRay.setFromCamera(new THREE.Vector2(clientX/innerWidth*2-1,1-clientY/innerHeight*2),camera);
 const visibleMobs=enemies.filter(enemy=>enemy.dead<=0||enemy.corpseAge>0);
 const hitObjects=visibleMobs.flatMap(enemy=>enemy.nameTag?.visible!==false&&enemy.nameTag?
  [enemy.root,enemy.nameTag]:[enemy.root]);
 const otherPlayers=[...remotePlayers.entries()];
 const interactive=otherPlayers.flatMap(([,player])=>[player.actor.root,player.nameTag]);
 const hits=pickRay.intersectObjects([...hitObjects,...interactive],true);
 if(hits.length){
  let obj=hits[0].object;
  while(obj.parent&&obj.parent!==scene)obj=obj.parent;
  const remote=otherPlayers.find(([,player])=>player.actor.root===obj||player.nameTag===obj);
  if(remote){selectRemotePlayer(remote[0]);return 'player'}
  const enemy=visibleMobs.find(m=>m.root===obj||m.nameTag===obj);
  if(enemy){
   if(enemy.dead>0)showCorpseLoot(enemy);
   else setTarget(enemy);
   return 'enemy';
  }
 }
 const nodes=gatherNodes.filter(node=>gatherNodeAvailable(node));
 const resources=pickRay.intersectObjects(nodes.map(node=>node.root),true);
 if(resources.length){
  let obj=resources[0].object;
  while(obj.parent&&obj.parent!==scene)obj=obj.parent;
  const node=nodes.find(n=>n.root===obj);
  if(node){startGather(node);return 'resource'}
 }
 // Characters and the visible relic are not "empty" scenery.
 const characters=[
  hero.root,...npcs.flatMap(n=>[n.actor.root,n.nameTag]),
  merchantLabel,questMarker,herbalistMarker
 ].filter(o=>o&&o.visible!==false);
 if(relic.visible)characters.push(relic);
 if(pickRay.intersectObjects(characters,true).length)return 'character';
 if(allowEmptyClear&&(selected||selectedPlayerId)){
  clearTarget();selectRemotePlayer(null);return 'cleared';
 }
 return 'empty';
}
canvas.addEventListener('pointerdown',e=>{
 if(modalKind)return;
 if(look.id!==null){
  // Track the second finger only on the 3D canvas, not the movement joystick.
  if(e.pointerId!==look.id&&e.pointerType==='touch'&&pinch.id===null){
   e.preventDefault();look.multitouch=true;
   pinch.id=e.pointerId;pinch.x=e.clientX;pinch.y=e.clientY;
   pinch.startSpan=0;pinch.startDistance=cameraDistance;
   canvas.setPointerCapture(e.pointerId);updatePinchZoom();
  }
  return;
 }
 if(e.button!==undefined&&e.button!==0)return;
 look.id=e.pointerId;look.selectOnly=e.pointerType==='touch'&&e.clientX<innerWidth*.35;
 look.x=look.startX=e.clientX;look.y=look.startY=e.clientY;
 look.moved=0;look.multitouch=false;look.downAt=performance.now();
 cameraFollowCooldown=.85;canvas.setPointerCapture(e.pointerId);
 if(document.activeElement===cameraSlider)cameraSlider.blur();
});
canvas.addEventListener('pointermove',e=>{
 if(e.pointerId===pinch.id){
  if(e.pointerType==='touch')e.preventDefault();
  pinch.x=e.clientX;pinch.y=e.clientY;updatePinchZoom();return;
 }
 if(look.id!==e.pointerId)return;
 if(pinch.id!==null){
  if(e.pointerType==='touch')e.preventDefault();
  look.x=e.clientX;look.y=e.clientY;updatePinchZoom();return;
 }
 look.moved+=Math.hypot(e.clientX-look.x,e.clientY-look.y);
 if(!look.selectOnly){
  cameraYaw=wrapYaw(cameraYaw-(e.clientX-look.x)*.007);
  cameraPitch=clamp(cameraPitch+(e.clientY-look.y)*.0045,.1,1.05);
 }
 look.x=e.clientX;look.y=e.clientY;cameraFollowCooldown=.85;
});
function endCanvasPointer(e,cancelled=false){
 if(e.pointerId===pinch.id){
  finishPinch();
  // Keeping the remaining finger down must never count as a world tap.
  look.multitouch=true;look.selectOnly=false;look.moved=Infinity;
  return;
 }
 if(e.pointerId!==look.id)return;
 if(pinch.id!==null){
  // When the first finger lifts, promote the second finger to camera orbit
  // without releasing its pointer capture or clearing the selected target.
  const nextId=pinch.id,nextX=pinch.x,nextY=pinch.y;
  if(pinch.startSpan>0)setCameraDistance(cameraDistance);
  pinch.id=null;pinch.startSpan=0;finishLook();
  look.id=nextId;look.x=look.startX=nextX;look.y=look.startY=nextY;
  look.selectOnly=false;look.multitouch=true;look.moved=Infinity;
  look.downAt=performance.now();return;
 }
 const distance=Math.hypot(e.clientX-look.startX,e.clientY-look.startY);
 if(!cancelled&&!modalKind&&!look.multitouch&&look.moved<8&&distance<8){
  // A tap selects or clears a target; a pinch never does.
  const isShortTap=performance.now()-look.downAt<=450;
  handleWorldTap(e.clientX,e.clientY,isShortTap);
 }
 finishLook();
}
canvas.addEventListener('pointerup',e=>endCanvasPointer(e));
for(const type of ['pointercancel','lostpointercapture'])
 canvas.addEventListener(type,e=>endCanvasPointer(e,true));
canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{if(!modalKind)setCameraDistance(cameraDistance+Math.sign(e.deltaY)*.5)},{passive:true});
addEventListener('blur',clearInput);addEventListener('pagehide',()=>{clearInput();save()});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();save()}last=performance.now();resetFps()});
addEventListener('keydown',e=>{
 if(e.target?.matches?.('input,textarea,[contenteditable="true"]'))return;
 const k=e.code==='KeyC'?'c':e.key.toLowerCase();
 if(k==='g'){e.preventDefault();if(!e.repeat)openPartyDialog();return}
 if(k==='enter'&&!modalKind&&!e.repeat&&!(e.target instanceof HTMLButtonElement)){
  e.preventDefault();setChatCollapsed(false);$('chatInput').focus();return;
 }
 if(k==='escape'&&!chatCollapsed){e.preventDefault();setChatCollapsed(true);return}
 if(k==='c'&&modalKind==='character'){e.preventDefault();if(!e.repeat)closeDialog();return}
  if(k==='j'&&modalKind==='journal'){e.preventDefault();if(!e.repeat)closeDialog();return}
 if(k==='b'&&modalKind==='spellbook'){e.preventDefault();if(!e.repeat)closeDialog();return}
 if(k==='escape'){e.preventDefault();if(modalKind)closeDialog();else if(hotbarPending!==null)cancelHotbarAssignment();else if(selected)clearTarget();else pause();return}
 if(modalKind||e.target===cameraSlider)return;
 if(e.target instanceof HTMLButtonElement&&(k===' '||k==='enter'))return;
 if(['arrowup','arrowdown','arrowleft','arrowright',' ','tab'].includes(k))e.preventDefault();
 if(['1','2','3','4','5','6','7','8',' ','e','i','c','j','b','tab'].includes(k)){
  if(e.repeat)return;
  if(k>='1'&&k<='8')useHotbarSlot(Number(k)-1);
  if(k===' ')attack();
  if(k==='e')interact();
  if(k==='i')bag();
  if(k==='c')character();
  if(k==='j')journal();
  if(k==='b')spellbook();
  if(k==='tab')cycleTarget(e.shiftKey?-1:1);
  return;
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
function openDialog(title,sub,lines,kind='dialog'){if(hotbarPending!==null&&kind!=='spellbook')cancelHotbarAssignment();if(gatherCast&&kind!=='gatherLoot')cancelGather();clearInput();resetFps();modalKind=kind;$('panel').classList.toggle('chest-modal',kind==='sharedChest');$('panel').classList.toggle('inventory-modal',kind==='bag');$('panel').classList.toggle('character-modal',kind==='character');$('panel').classList.toggle('merchant-modal',kind==='merchant');$('panel').classList.toggle('journal-modal',kind==='journal');$('panel').classList.toggle('spellbook-modal',kind==='spellbook');$('modalClose').hidden=false;if(characterView){characterView.drag=null;if(kind!=='character'){characterView.canvas=null;characterView.context=null}}$('cameraControl').hidden=kind!=='settings';$('graphicsControl').hidden=kind!=='graphics';$('mtitle').textContent=title;$('msub').textContent=sub;$('mbody').replaceChildren();$('choices').replaceChildren();for(const line of lines){const p=document.createElement('p');p.textContent=line;$('mbody').appendChild(p)}$('modal').hidden=false;$('interact').hidden=true}
function choice(label,fn,type=''){
 // Every modal has a red X at the top. Do not add redundant bottom-row
 // close/continue buttons; keep real actions and navigation controls.
 if(fn===closeDialog)return;
 const button=document.createElement('button');button.className='choice '+type;button.textContent=label;button.addEventListener('click',fn);$('choices').appendChild(button)}
function closeDialog(){if(modalKind==='sharedChest')chestUI.close();modalKind=null;$('modal').hidden=true;$('panel').classList.remove('inventory-modal','character-modal','merchant-modal','journal-modal','spellbook-modal','chest-modal');$('modalClose').hidden=true;if(characterView){characterView.drag=null;characterView.canvas=null;characterView.context=null}$('cameraControl').hidden=true;$('graphicsControl').hidden=true;clearInput();resetFps();document.activeElement?.blur();save();updateHUD()}
function pause(){
 if(modalKind==='pause'){closeDialog();return}
 openDialog('У костра','NEXGAME · МУЛГОР · ALPHA 0.3.5.33',
 ['Локальное меню персонажа. Онлайн-мир продолжает жить: группа, другие игроки и мобы не останавливаются.',
  'W/S — идти вперёд и назад; A/D — поворачивать; Tab — цель. Кнопки 1–8 соответствуют ячейкам панели; B — книга заклинаний.',
   'Открой книгу заклинаний, выбери навык или зелье и нажми нужную ячейку 1–8. Раскладка сохраняется. Ярость воина: 0–100.',
  'Enter — чат. Общий канал Мулгора доступен всем игрокам, канал группы видят только союзники.',
  'Обыскивай тела и надевай добычу из рюкзака (I). Оружейник Борун стоит у входа в лагерь: жёлтый квадрат на мини-карте.'], 'pause');
 choice('▶ Продолжить путь',closeDialog);
 choice('♙ Персонаж и экипировка',character);
 choice('📖 Книга заклинаний',spellbook);
 choice('📜 Журнал заданий',journal);
 choice('👥 Группа и имя',openPartyDialog);
 choice('⚙ Настройки камеры',cameraSettings);
 choice('Графика и FPS',graphicsSettings);
 choice('🛠 Тюнер кисти и топора',openAxeTuner);
 choice('⚔ Тюнер меча · примерка',openSwordTuner);
 choice('🗡 Тюнер кинжала · примерка',openDaggerTuner);
 choice('🛡 Тюнер круглого щита',()=>openShieldTuner('round'));
 choice('🛡 Тюнер вытянутого щита',()=>openShieldTuner('kite'));
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
 hero.blockRemaining=0;
 cancelGather();
 for(const node of gatherNodes){node.pending=false;node.readyAt=0;node.root.visible=false}
 combatFeedback.clear();
 state={...initial,inventory:[...initial.inventory],bags:[...initial.bags],equipment:startingEquipment(),buyback:[],actionBar:normalizeHotbar(null)};
 hotbarPending=null;renderHotbar();
 abilityRuntime.gcd=0;abilityRuntime.cooldowns=Object.create(null);autoSwingClock.reset();swingAbilityId='autoAttack';
 for(const e of enemies){
  e.hp=e.maxHp;e.dead=0;e.corpseAge=0;e.loot=[];e.lootMarker.visible=false;
  e.hit=0;e.aggro=false;e.stunned=0;e.attackCd=0;e.attackWindup=0;e.returning=false;e.alertRemaining=0;
  e.root.visible=true;e.shadow.visible=true;
  e.root.rotation.z=0;e.root.scale.setScalar(e.baseScale||1);
  e.root.position.set(e.spawnX,heightAt(e.spawnX,e.spawnZ),e.spawnZ);
  e.shadow.position.set(e.spawnX,heightAt(e.spawnX,e.spawnZ)+.055,e.spawnZ);
 }hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);hero.root.rotation.y=state.yaw;hero.phase=hero.walk=0;syncEquipmentVisuals();resetTrainingTarget(trainingDummy);
 attackElapsed=stompElapsed=-1;attackCooldown=stompCooldown=0;selected=null;autoAttack=false;swingTarget=null;lastCombatAt=-100;hideCombatWarning();shockAge=9;cameraYaw=0;cameraFollowCooldown=0;closeDialog();msg('Новый путь начинается в лагере Нараче')}
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
const chestUI=createSharedChestPanel({
 getWorld:()=>worldConnection,getInventory:()=>state.inventory,
 setInventory:rows=>{state.inventory=rows;save();updateHUD()},
 openDialog:(title,subtitle)=>openDialog(title,subtitle,[],'sharedChest'),
 getModal:()=>modalKind,notify:msg,items:ITEM_CATALOG,stackLimit:itemStackLimit
});
function nearTarget(){
 let closest=null,dist=HEARTH_CHEST_RANGE;
 const dChest=Math.hypot(state.x-HEARTH_CHEST_POS.x,state.z-HEARTH_CHEST_POS.z);
 if(dChest<HEARTH_CHEST_RANGE){dist=dChest;closest={kind:'sharedChest'}}
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
 if(target.kind==='sharedChest'){chestUI.open();return}
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
   state.gatherStage=1;state.gatherAvailable=false;save();closeDialog();updateHUD();
   msg('Найди четыре луговых цветка');
  });
  return;
 }
 if(stage>=4){
  openDialog('Дары Мулгора','ТРАВНИЦА ТИХАЯ ЗАРЯ',
   ['Ты принёс все травы, корни и грибы. Лагерю хватит лекарств. Спасибо, странник!']);
  return;
 }
 if(state.gatherAvailable&&stage>=2&&stage<=3){
  const quest=GATHER_QUESTS[stage];
  openDialog(quest.title,'НОВОЕ ЗАДАНИЕ · ДАРЫ МУЛГОРА · '+stage+' / 3',
   [quest.intro,quest.hint,'Награда: '+quest.gold+' монет, '+quest.xp+' опыта.']);
  choice('Принять: '+quest.title+' ('+stage+'/3)',()=>{
   state.gatherAvailable=false;save();updateGatherVisibility();closeDialog();updateHUD();
   msg('Новое задание: '+quest.title);
  });
  return;
 }
 const q=GATHER_QUESTS[stage],count=gatherQuestCount();
 openDialog(q.title,'СОБИРАТЕЛЬСТВО · '+stage+' / 3',
  [q.intro,'Собрано: '+count+' / '+q.count+'. '+q.hint,
   count>=q.count?'Все ингредиенты в рюкзаке. Можно сдать их травнице.':'Подойди к светящимся ресурсам на земле и нажми «Собрать».']);
 if(count>=q.count){
  choice('Сдать '+q.count+' шт. · +'+q.gold+' монет, +'+q.xp+' опыта',()=>{
   if(!consumeGatherQuestItems(stage)){msg('Недостаточно нужных предметов');herbalistGatherTalk();return}
   state.gold+=q.gold;experience(q.xp);state.gatherStage=stage+1;state.gatherAvailable=stage<3;
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
  choice(q?(state.gatherAvailable?'🌿 Новое задание: '+q.title:'🌿 Задание: '+q.title+' ('+gatherQuestCount()+'/'+q.count+')'):'🌿 Новая цепочка: Дары Мулгора',herbalistGatherTalk);
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
  if(item)cell.dataset.rarity=itemRarity(ITEM_CATALOG[item.id].rarity);
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
 e.loot=[];e.lootMarker.visible=false;refreshLootMarkerQuality(e);
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
  const title=document.createElement('span');title.className='loot-item-name';title.textContent=def.icon+'  '+def.name+(row.qty>1?' ×'+row.qty:'');
  button.appendChild(title);
  if(def.slot){
   const stats=document.createElement('small');stats.className='loot-item-stats';
   stats.textContent=itemStatText(def)+(def.requiredLevel>1?' · Ур. '+def.requiredLevel:'');
   button.appendChild(stats);
  }
  button.setAttribute('aria-label','Взять '+def.name+', '+row.qty+' шт.');
  button.addEventListener('click',()=>{
   if(e.loot[i]!==row)return;
   if(!storeItem(row)){msg('В рюкзаке недостаточно места');return}
   e.loot.splice(i,1);
   refreshLootMarkerQuality(e);
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
  refreshLootMarkerQuality(e);
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
// One shared class/ability gateway for melee skills, area effects and consumables.
function abilityContext(def,options={}){
 const living=validTargetInRange(selected);
 let facing=false;
 if(living){
  const dx=selected.root.position.x-state.x,dz=selected.root.position.z-state.z;
  facing=Math.sin(hero.root.rotation.y)*dx+Math.cos(hero.root.rotation.y)*dz>=Math.hypot(dx,dz)*.04;
 }
 return {classId:state.classId,level:state.level,resource:state.resource,
  runtime:abilityRuntime,hasTarget:living,range:living?targetDistance(selected):Infinity,
  facing,hasConsumable:state.potions>0,needsHealing:state.hp<playerStats().maxHp,...options};
}
function gainClassResource(amount){
 if(state.classId!=='warrior'||amount<=0)return;
 state.resource=changeResource(state.resource,amount,state.classId);
}
function castAbility(id,options={}){
 const def=getAbilityDefinition(id);
 if(!def)return false;
 const fromBag=options.fromBag===true;
 if(gatherCast||(modalKind&&!(id==='healingPotion'&&fromBag)))return false;
 if(id==='autoAttack')return attack();
 if(def.requiresTarget&&selected&&!validTargetInRange(selected)){
  // A cast outside acquisition/combat range does not erase a manual target.
  return false;
 }
 // A weapon swing or stomp cannot play two mutually incompatible animations.
 if((id==='heavyStrike'||id==='thunderStomp')&&(attackElapsed>=0||stompElapsed>=0)){
  combatWarning('Дождитесь окончания удара',true);return false;
 }
 if(def.requiresTarget&&isAliveTarget(selected)&&targetDistance(selected)>def.range){
   if(targetDistance(selected)>20){combatWarning('Цель слишком далеко',true);return false}
   const fail=abilityFailure(def,abilityContext(def,{range:null,facing:true}));
   if(fail){combatWarning(fail,true);return false}
   approach={target:selected,abilityId:id,stuck:0};return true;
  }
  approach=null;
  const result=activateAbility(def,abilityContext(def));
 if(!result.ok){
  if(id==='healingPotion')msg(result.error);else combatWarning(result.error,true);
  return false;
 }
 state.resource=result.resource;
 if(id==='heavyStrike'){
  attackElapsed=0;attackLanded=false;swingTarget=selected;swingAbilityId=id;
 }else if(id==='thunderStomp'){
  stompElapsed=0;stompLanded=false;
  stompCooldown=abilityCooldown(abilityRuntime,id);
 }else if(id==='healingPotion'){
  state.hp=Math.min(playerStats().maxHp,state.hp+55);state.potions--;
  msg('Луговые травы восстановили здоровье');
 }
 hideCombatWarning();save();updateHUD();
 return true;
}
function heal(fromBag=false){return castAbility('healingPotion',{fromBag})}
function strike(){return castAbility('heavyStrike')}

// Melee combat: select first, validate distance and facing, then animate.
const MELEE_RANGE=3.45,TARGET_RANGE=TARGET_ACQUISITION_RADIUS;
let approach=null;
function isAliveTarget(e){return !!e&&e.dead<=0&&e.hp>0&&enemies.includes(e)}
function targetDistance(e){return Math.hypot(state.x-e.root.position.x,state.z-e.root.position.z)}
function targetPosition(){return {x:state.x,z:state.z}}
function validTargetInRange(e){return isAliveTarget(e)&&targetIsInRange(e,targetPosition())}
function nearestEnemy(){
 return targetsByProximity(enemies,targetPosition(),isAliveTarget)[0]||null;
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
 approach=null;
 selected=null;autoAttack=false;swingTarget=null;
 attackElapsed=-1;attackCooldown=0;
 hideCombatWarning();updateHUD();
}
function setTarget(e){
 // Direct taps may select ANY visible living enemy, regardless of distance.
 // Only the target-cycle button and automatic acquisition use the 40 m radius.
 if(!isAliveTarget(e)){clearTarget();return false}
 selectedPlayerId=null;
 renderAllySelection();
 if(selected!==e)approach=null;
 selected=e;hideCombatWarning();updateHUD();return true;
}
function cycleTarget(step=1){
 if(modalKind)return;
 const next=nextTargetByProximity(enemies,selected,targetPosition(),isAliveTarget,step);
 // Nothing in 40 m: no selection, approach, warning or popup.
 if(!next)return;
 setTarget(next);
}
function tryAutoSwing(){
 if(!autoAttack||modalKind||gatherCast||stompElapsed>=0||attackElapsed>=0||attackCooldown>0)return false;
 if(!validTargetInRange(selected)){
  autoAttack=false;approach=null;updateHUD();return false;
 }
 const fail=abilityFailure(getAbilityDefinition('autoAttack'),abilityContext(getAbilityDefinition('autoAttack')));
 if(fail){combatWarning(fail);return false}
 // Delay the next visible swing until its prior network hit was accepted and
 // the server's actual weapon-speed timer allows the next hit to land.
 if(worldCombatReady&&!selected.trainingDummy&&!autoSwingClock.canStart())return false;
 attackElapsed=0;attackCooldown=playerStats().speed;attackLanded=false;swingTarget=selected;swingAbilityId='autoAttack';
 hideCombatWarning();return true;
}
function attack(){
 if(modalKind||gatherCast)return false;
 if(autoAttack){autoAttack=false;approach=null;hideCombatWarning();updateHUD();return true}
 if(isAliveTarget(selected)){
  // A distant manually tapped unit stays selected; do not secretly retarget.
  if(!validTargetInRange(selected))return false;
 }else{
  const e=nearestEnemy();
  if(!e)return false; // Auto-acquisition searches only within 40 m.
  setTarget(e);
 }
 if(targetDistance(selected)>20){combatWarning('Цель слишком далеко',true);return false}
  // Autoattack can be armed while out of melee range, but never swings there.
 const def=getAbilityDefinition('autoAttack');
 const reason=abilityFailure(def,abilityContext(def,{range:null,facing:true}));
 if(reason){combatWarning(reason,true);return false}
 autoAttack=true;
 const fail=meleeFailure(selected);
 if(fail==='Цель слишком далеко')approach={target:selected,abilityId:'autoAttack',stuck:0};
  else if(fail)combatWarning(fail,true);else tryAutoSwing();
 updateHUD();return true;
}
function damageEnemy(e,amount,source='autoAttack'){
 if(!isAliveTarget(e)||!Number.isFinite(amount)||amount<=0)return;
 // When a PvE-capable world server is connected, only it may change mob HP.
 if(worldCombatReady&&!e.trainingDummy){
  if(worldConnection.sendAttack(source,e.index)){
   lastCombatAt=clock;
   if(source==='autoAttack')autoSwingClock.onSent();
  }
  return;
 }
 lastCombatAt=clock;
 // A successful attack generates rage; area attacks award less per opponent.
 gainClassResource(source==='autoAttack'?WARRIOR_RAGE_PER_HIT:source==='heavyStrike'?8:source==='thunderStomp'?3:0);
 if(e.trainingDummy){
  // A target dummy accepts all ability damage and awards warrior rage, but
  // cannot aggro, die, leave loot, award XP/gold, or advance kill objectives.
  applyTrainingHit(e,amount,clock,source);
  e.aggro=false;showCombatHit(e,amount,source);
  updateHUD();return;
 }
 e.hp-=amount;e.aggro=true;showCombatHit(e,amount,source);
 if(e.hp<=0){
  e.hp=0;e.dead=CORPSE_DURATION;e.corpseAge=0;e.aggro=false;
  e.loot=e.boss?[{id:'giantFeather',qty:1},...rollCorpseLoot(e)]:rollCorpseLoot(e);
  e.root.visible=true;e.shadow.visible=true;
  e.lootMarker.visible=e.loot.length>0;
  refreshLootMarkerQuality(e);
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
function stomp(){return castAbility('thunderStomp')}
// Customizable action bar: the spellbook is the only source of assignments.
// Buttons are generated once per layout change, then updated without reflow.
const HOTBAR_ART={
 autoAttack:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 39L36 10" stroke="#714520" stroke-width="7"/><path d="M22 12L36 5L45 19L35 25L29 20L22 22Z" fill="#c5c8b6" stroke="#ece2be" stroke-width="2"/><path d="M10 35L16 40" stroke="#e9bf72" stroke-width="4"/></svg>',
 thunderStomp:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 5L32 5L30 24L38 32L35 36L13 36L10 31L17 21Z" fill="#b6a383" stroke="#e6cd94" stroke-width="2"/><path d="M4 35L13 42M44 35L36 43M24 39L24 47" stroke="#edc968" stroke-width="3"/></svg>',
 heavyStrike:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 40L35 9" stroke="#83532c" stroke-width="6" stroke-linecap="round"/><path d="M20 9L34 5L44 15L35 23L26 20L21 24" fill="#b9c2c7" stroke="#e8dfc3" stroke-width="2"/><path d="M7 28L19 40" stroke="#cf9b4d" stroke-width="4"/><path d="M34 30L44 30M37 24L46 21" stroke="#ffc36a" stroke-width="2" stroke-linecap="round"/></svg>',
 healingPotion:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M19 6L29 6L29 16Q42 27 36 38Q24 44 12 38Q6 27 19 16Z" fill="#742d28" stroke="#d5b976" stroke-width="2"/><path d="M15 26L33 26L34 36Q24 41 14 36Z" fill="#bf5344"/><path d="M18 7L30 7" stroke="#a5834d" stroke-width="6"/></svg>'
};
const HOTBAR_SHORT={autoAttack:'Авто',thunderStomp:'Поступь',heavyStrike:'Рубящий',healingPotion:'Настой'};
function hotbarActionName(entry){
 if(entry?.kind==='clear')return 'пустую ячейку';
 return actionDefinition(entry,state.classId,state.level)?.name||'умение';
}
function updateHotbarAssignmentPrompt(){
 const active=hotbarPending!==null;
 $('hotbarAssign').hidden=!active;
 $('actionsBar').classList.toggle('is-assigning',active);
 $('hotbarAssignText').textContent=active?
  'Выбери ячейку 1–8 для '+(hotbarPending.kind==='clear'?'удаления умения':'«'+hotbarActionName(hotbarPending)+'»'):'';
}
function cancelHotbarAssignment(){
 if(hotbarPending===null)return;
 hotbarPending=null;updateHotbarAssignmentPrompt();
}
function beginHotbarAssignment(entry){
 if(entry?.kind!=='clear'&&!actionDefinition(entry,state.classId,state.level))return;
 if(modalKind==='spellbook')closeDialog();
 hotbarPending=entry;updateHotbarAssignmentPrompt();
 msg(entry?.kind==='clear'?'Выбери ячейку, которую нужно очистить':
  'Выбери ячейку 1–8 для «'+hotbarActionName(entry)+'»');
}
function assignSelectedHotbarSlot(index){
 if(hotbarPending===null)return false;
 if(!Number.isInteger(index)||index<0||index>=HOTBAR_SLOT_COUNT)return false;
 const entry=hotbarPending.kind==='clear'?null:hotbarPending;
 state.actionBar=assignHotbarSlot(state.actionBar,index,entry,state.classId,state.level);
 hotbarPending=null;
 updateHotbarAssignmentPrompt();
 save();renderHotbar();
 msg(entry?'Ячейка '+(index+1)+': '+hotbarActionName(entry):
  'Ячейка '+(index+1)+' очищена');
 return true;
}
function useHotbarSlot(index){
 if(!Number.isInteger(index)||index<0||index>=HOTBAR_SLOT_COUNT)return false;
 if(hotbarPending!==null)return assignSelectedHotbarSlot(index);
 if(modalKind||gatherCast)return false;
 const entry=state.actionBar[index],info=actionDefinition(entry,state.classId,state.level);
 if(!info){spellbook();return false}
 if(info.kind==='ability')return info.id==='autoAttack'?attack():castAbility(info.abilityId);
 if(info.kind==='item'&&info.id==='healingPotion')return heal();
 return false;
}
function renderHotbar(){
 const bar=$('actionsBar');bar.replaceChildren();
 hotbarButtons.length=0;hotbarVisuals.length=0;
 for(let i=0;i<HOTBAR_SLOT_COUNT;i++){
  const entry=state.actionBar[i];
  const info=actionDefinition(entry,state.classId,state.level);
  const button=document.createElement('button');
  button.type='button';button.className='hotbar-slot'+(info?'':' is-empty');
  button.dataset.slot=String(i);
  button.setAttribute('aria-label','Ячейка '+(i+1)+': '+(info?info.name:'пустая. Открыть книгу заклинаний'));
  button.title=info?info.name+' — '+info.description:'Пустая ячейка — выбери умение из книги';
  if(info){
   button.innerHTML='<span class="hotbar-slot-key">'+(i+1)+'</span>'+
    (HOTBAR_ART[info.id]||'<span class="hotbar-emoji">'+(info.icon||'✦')+'</span>')+
    '<span class="hotbar-slot-name">'+(HOTBAR_SHORT[info.id]||info.name)+'</span>'+
    '<span class="hotbar-slot-count"></span>'+
    '<i class="hotbar-slot-cooldown"></i><i class="hotbar-slot-global"></i>';
  }else{
   button.innerHTML='<span class="hotbar-slot-key">'+(i+1)+'</span><span class="hotbar-slot-empty">＋</span>';
  }
  bindImmediateButton(button,()=>useHotbarSlot(i));
  bar.appendChild(button);hotbarButtons.push(button);
  hotbarVisuals.push(info?{
   cooldown:button.querySelector('.hotbar-slot-cooldown'),
   gcd:button.querySelector('.hotbar-slot-global'),
   count:button.querySelector('.hotbar-slot-count')
  }:null);
 }
 updateHotbarAssignmentPrompt();
 updateHotbarVisuals();
}
function updateHotbarVisuals(){
 for(let i=0;i<HOTBAR_SLOT_COUNT;i++){
  const button=hotbarButtons[i],visual=hotbarVisuals[i];
  if(!button||!visual)continue;
  const info=actionDefinition(state.actionBar[i],state.classId,state.level);
  if(!info)continue;
  const def=getAbilityDefinition(info.abilityId);
  const item=info.kind==='item';
  const cd=info.id==='autoAttack'?attackCooldown:
   abilityCooldown(abilityRuntime,info.abilityId);
  const full=info.id==='autoAttack'?playerStats().speed:def?.cooldown||0;
  visual.cooldown.style.transform='scaleY('+(full?clamp(cd/full,0,1):0)+')';
  visual.gcd.style.transform='scaleY('+(def?.gcd?clamp(abilityRuntime.gcd/1.5,0,1):0)+')';
  visual.count.textContent=item?String(state.potions):'';
  button.classList.toggle('auto-attacking',info.id==='autoAttack'&&autoAttack);
  button.classList.toggle('insufficient',item?state.potions<=0:!!def?.resourceCost&&state.resource<def.resourceCost);
  button.setAttribute('aria-pressed',String(info.id==='autoAttack'&&autoAttack));
  if(info.id==='autoAttack')button.title=autoAttack?'Остановить автоатаку':info.name;
 }
}
function spellbook(){
 if(modalKind==='spellbook'){closeDialog();return}
 if(hotbarPending!==null)cancelHotbarAssignment();
 openDialog('Книга заклинаний','УМЕНИЯ И АКТИВИРУЕМЫЕ ПРЕДМЕТЫ',[],'spellbook');
 renderSpellbook();
}
function renderSpellbook(){
 if(modalKind!=='spellbook')return;
 const body=$('mbody');body.replaceChildren();
 const intro=document.createElement('p');intro.className='spellbook-intro';
 intro.textContent='Нажми на умение или предмет, затем выбери ячейку 1–8 внизу экрана.';
 body.appendChild(intro);
 const tabs=document.createElement('div');tabs.className='spellbook-tabs';
 tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Раздел книги');
 for(const [key,name] of [['abilities','Способности'],['items','Предметы']]){
  const tab=document.createElement('button');tab.type='button';tab.className='spellbook-tab';
  tab.textContent=name;tab.setAttribute('role','tab');
  tab.setAttribute('aria-selected',String(spellbookTab===key));
  tab.addEventListener('click',()=>{spellbookTab=key;renderSpellbook()});
  tabs.appendChild(tab);
 }
 body.appendChild(tabs);
 const list=document.createElement('div');list.className='spellbook-list';
 const available=availableHotbarActions(state.classId,state.level);
 const entries=spellbookTab==='items'?available.items:available.abilities;
 for(const info of entries){
  const button=document.createElement('button');button.type='button';button.className='spellbook-entry';
  button.setAttribute('aria-label','Выбрать '+info.name+' для панели');
  const icon=document.createElement('span');icon.className='spellbook-entry-icon';
  icon.innerHTML=HOTBAR_ART[info.id]||'<span class="hotbar-emoji">'+(info.icon||'✦')+'</span>';
  const textBlock=document.createElement('span');textBlock.className='spellbook-entry-content';
  const title=document.createElement('span');title.className='spellbook-entry-title';title.textContent=info.name;
  const description=document.createElement('span');description.className='spellbook-entry-desc';description.textContent=info.description;
  const meta=document.createElement('span');meta.className='spellbook-entry-meta';
  meta.textContent=info.kind==='item'?'В наличии: '+state.potions:
   (info.resourceCost?info.resourceCost+' ярости · ':'')+
   (info.cooldown?('Кулдаун '+info.cooldown+' с · '):'')+'Уровень '+(getAbilityDefinition(info.id)?.level||1);
  const arrow=document.createElement('span');arrow.className='spellbook-entry-use';arrow.textContent='➜';
  textBlock.appendChild(title);textBlock.appendChild(description);textBlock.appendChild(meta);
  button.appendChild(icon);button.appendChild(textBlock);button.appendChild(arrow);
  button.addEventListener('click',()=>beginHotbarAssignment(actionEntry(info.kind,info.id)));
  list.appendChild(button);
 }
 const remove=document.createElement('button');remove.type='button';
 remove.className='spellbook-entry spellbook-remove';
 remove.setAttribute('aria-label','Очистить выбранную ячейку панели');
 remove.textContent='✕  Очистить ячейку панели';
 remove.addEventListener('click',()=>beginHotbarAssignment({kind:'clear'}));
 list.appendChild(remove);body.appendChild(list);
 const note=document.createElement('p');note.className='spellbook-help';
 note.textContent='Назначения сохраняются автоматически. Зелья тратятся из общего запаса рюкзака. Одна способность может занимать несколько ячеек.';
 body.appendChild(note);
}
// iPhone multi-touch: the target button must work while another pointer
// owns the movement joystick. Native click may be suppressed by Safari then.
function bindImmediateButton(id,action){
 const button=typeof id==='string'?$(id):id;
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
bindImmediateButton('dummyReset',()=>{
 resetTrainingTarget(trainingDummy);
 trainingDummy.hit=0;trainingDummy.root.rotation.z=0;
 updateHUD();msg('Тренировочный манекен: замер урона сброшен');
});
bindImmediateButton('spellbookButton',spellbook);
bindImmediateButton('hotbarCancel',cancelHotbarAssignment);
// Touch controls also work with a second finger while the joystick is held.
bindImmediateButton('interact',interact);
bindImmediateButton('journal',journal);
bindImmediateButton('questJournalOpen',journal);
renderHotbar();
$('bag').addEventListener('click',bag);$('character').addEventListener('click',character);$('modalClose').addEventListener('click',closeDialog);$('pause').addEventListener('click',pause);
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
/* Quest journal: compute all categories from existing save-state fields.
   No migration and no duplicate quest-completion flags are needed. */
const MAIN_JOURNAL=[
 {title:'Первые шаги',description:'Познакомься с наставником Каменный Рог у большого тотема лагеря Нараче.',objective:'Поговорить с наставником.',npc:'Наставник Каменный Рог',reward:''},
 {title:'Обряд силы',description:'Докажи, что готов защищать родные равнины. На тропе встречаются обычные долгоноги.',objective:'Победить трёх равнинных долгоногов и вернуться в лагерь.',npc:'Наставник Каменный Рог',reward:'25 монет · 80 опыта'},
 {title:'Голос предков',description:'У древнего тотема на востоке лежит перо предков. Принеси его наставнику.',objective:'Найти перо предков и отнести наставнику.',npc:'Наставник Каменный Рог',reward:'40 монет · 110 опыта'},
 {title:'Следы исполина',description:'На дальних пастбищах заметили огромные птичьи следы. Разведай юго-восточную дорогу.',objective:'Достичь дальнего участка тропы и вернуться.',npc:'Наставник Каменный Рог',reward:'50 монет · 95 опыта'},
 {title:'Грозоклюв, вожак стада',description:'Громадный долгоног угрожает пастбищам. Красная пунктирная линия укажет путь к нему.',objective:'Победить Грозоклюва и вернуться к наставнику.',npc:'Наставник Каменный Рог',reward:'90 монет · 190 опыта'}
];
let journalTab='current';
const journalOpenItems=new Set();
function journalQuestEntries(){
 const result=[],q=state.quest;
 const completeAt=[1,3,6,9,12],offeredAt=[0,-1,3,6,9],startedAt=[-1,1,4,7,10];
 for(let i=0;i<MAIN_JOURNAL.length;i++){
  const status=q>=completeAt[i]?'completed':
   q===offeredAt[i]?'available':
   startedAt[i]>=0&&q>=startedAt[i]&&q<completeAt[i]?'current':null;
  if(!status)continue;
  let progress=status==='completed'?'Завершено и сдано наставнику.':
   status==='available'?'Доступно у наставника.':'Выполняется.';
  if(status==='current'){
   if(i===1)progress=q===2?'3 / 3 · Можно сдать наставнику.':'Долгоноги: '+state.kills+' / 3.';
   if(i===2)progress=q===5?'Перо найдено · Вернись к наставнику.':'Перо предков: 0 / 1.';
   if(i===3)progress=q===8?'Дальний участок разведан · Вернись в лагерь.':'Доберись до дальнего участка дороги.';
   if(i===4)progress=q===11?'Грозоклюв повержен · Вернись к наставнику.':'Грозоклюв: 0 / 1 · Следуй по красному пунктиру.';
  }
  result.push({id:'main-'+i,chain:'Испытания Нараче',status,progress,...MAIN_JOURNAL[i]});
 }
 for(let i=1;i<=3;i++){
  const quest=GATHER_QUESTS[i],stage=state.gatherStage;
  const status=stage>i?'completed':stage===i?(state.gatherAvailable?'available':'current'):i===1&&stage===0?'available':null;
  if(!status)continue;
  const amount=status==='completed'?quest.count:gatherQuestCount(i);
  const progress=status==='completed'?'Завершено · Ингредиенты переданы травнице.':
   status==='available'?'Доступно у травницы Тихой Зари.':
   'Собрано '+amount+' / '+quest.count+(amount>=quest.count?' · Можно сдавать травнице.':' · '+quest.hint);
  result.push({id:'gather-'+i,chain:'Дары Мулгора',status,title:quest.title,
   description:quest.intro,objective:'Собрать '+quest.count+' шт.: '+ITEM_CATALOG[quest.item].name+'.',
   npc:'Травница Тихая Заря',progress,reward:quest.gold+' монет · '+quest.xp+' опыта'});
 }
 return result;
}
function journal(){
 if(modalKind==='journal'){closeDialog();return}
 openDialog('Журнал заданий','ИСТОРИЯ ТВОИХ ПРИКЛЮЧЕНИЙ',[],'journal');
 renderJournal();
}
function renderJournal(){
 if(modalKind!=='journal')return;
 const all=journalQuestEntries(),body=$('mbody');
 body.replaceChildren();
 const tabs=document.createElement('div');tabs.className='journal-tabs';
 tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Состояние заданий');
 const names={current:'Текущие',available:'Доступные',completed:'Пройденные'};
 for(const [key,label] of Object.entries(names)){
  const button=document.createElement('button'),total=all.filter(x=>x.status===key).length;
  button.type='button';button.className='journal-tab';button.id='journal-tab-'+key;
  button.setAttribute('role','tab');button.setAttribute('aria-selected',String(journalTab===key));
  button.setAttribute('aria-controls','journal-list');
  button.textContent=label+' ('+total+')';
  button.addEventListener('click',()=>{journalTab=key;renderJournal()});
  tabs.appendChild(button);
 }
 body.appendChild(tabs);
 const list=document.createElement('div');list.id='journal-list';list.className='journal-list';
 list.setAttribute('role','tabpanel');list.setAttribute('aria-labelledby','journal-tab-'+journalTab);
 const entries=all.filter(x=>x.status===journalTab);
 if(!entries.length){
  const empty=document.createElement('div');empty.className='journal-empty';
  empty.textContent=journalTab==='current'?'Нет активных заданий. Посмотри вкладку «Доступные».':
   journalTab==='available'?'Сейчас нет новых заданий. Продолжай выполнять текущие.':
   'Ты ещё не завершил ни одного задания.';
  list.appendChild(empty);
 }
 let lastChain='';
 for(const entry of entries){
  if(entry.chain!==lastChain){
   const group=document.createElement('div');group.className='journal-chain-label';
   group.textContent=entry.chain;list.appendChild(group);lastChain=entry.chain;
  }
  const details=document.createElement('details');details.className='journal-entry';
  details.dataset.status=entry.status;details.open=journalOpenItems.has(entry.id);
  details.addEventListener('toggle',()=>{
   if(details.open)journalOpenItems.add(entry.id);
   else journalOpenItems.delete(entry.id);
  });
  const summary=document.createElement('summary');
  const title=document.createElement('span');title.className='journal-entry-title';
  title.textContent=entry.title;
  const status=document.createElement('span');status.className='journal-entry-status';
  status.textContent=entry.status==='completed'?'✓ Завершено':entry.status==='available'?'! Доступно':'● Активно';
  summary.appendChild(title);summary.appendChild(status);
  details.appendChild(summary);
  const content=document.createElement('div');content.className='journal-entry-body';
  for(const [line,kind] of [
    [entry.description,'journal-entry-description'],
    ['Цель: '+entry.objective,'journal-entry-objective'],
    [entry.progress,'journal-entry-meta'],
    ['NPC: '+entry.npc,'journal-entry-meta'],
    [entry.reward?'Награда: '+entry.reward:'','journal-entry-reward']
  ]){
   if(!line)continue;
   const p=document.createElement('p');p.className=kind;p.textContent=line;content.appendChild(p);
  }
  details.appendChild(content);list.appendChild(details);
 }
 body.appendChild(list);
}
// Online stage 2a: remote player presence + shared server-driven idle wildlife.
// Combat, loot, aggro and personal quest progress still stay local until stage 2b.
const remotePlayers=new Map();
let selectedPlayerId=null;
let currentParty={groupId:null,leaderId:null,members:[]};
let pendingPartyInvite=null,partyInviteTimer=null,lastPartyHudSignature='';
const partyHudFoldKey='nexgame-party-hud-collapsed-v1';
let partyHudCollapsed=false;
try{partyHudCollapsed=localStorage.getItem(partyHudFoldKey)==='true'}catch{}
function isInParty(id){return currentParty.members.some(p=>p.id===id)}
function playerRosterEntry(id){
 if(id===onlineSelfId)return {id,name:characterName,level:state.level,hp:state.hp,maxHp:playerStats().maxHp};
 const remote=remotePlayers.get(id);
 return remote?{id,name:remote.name,level:remote.level,hp:remote.hp,maxHp:remote.maxHp}:null;
}
function positionGroupHud(){
 const hud=$('partyHud'),controls=$('top'),actions=$('actionsBar');
 if(!hud||!controls)return;
 const menu=controls.getBoundingClientRect();
 const actionTop=actions?.getBoundingClientRect().top||innerHeight-100;
 const gap=8;
 const anchor=Math.ceil(menu.bottom+gap);
 // Keep the party tray below inventory/quest/menu buttons and above the hotbar.
 const available=Math.max(60,Math.floor(actionTop-anchor-12));
 const maxHeight=Math.min(240,available);
 hud.style.top=anchor+'px';
 hud.style.maxHeight=maxHeight+'px';
 hud.style.setProperty('--party-body-max-height',Math.max(30,maxHeight-34)+'px');
}
function toggleGroupHud(){
 // The expanded chat temporarily folds the group tray; touching the group tab closes chat.
 if(!chatCollapsed){setChatCollapsed(true);return}
 partyHudCollapsed=!partyHudCollapsed;
 try{localStorage.setItem(partyHudFoldKey,String(partyHudCollapsed))}catch{}
 lastPartyHudSignature='';renderGroupHud();
}
function renderGroupHud(){
 const widget=$('partyHud');
 if(!currentParty.groupId||currentParty.members.length<2){
  widget.hidden=true;lastPartyHudSignature='';widget.replaceChildren();return;
 }
 const members=currentParty.members.map(m=>({...m,...playerRosterEntry(m.id)}));
 const folded=partyHudCollapsed||!chatCollapsed;
 const signature=JSON.stringify({
  folded,roster:members.map(m=>
   [m.id,m.name,m.level,Math.round(m.hp||0),Math.round(m.maxHp||0)]),
  leader:currentParty.leaderId
 });
 if(!widget.hidden&&signature===lastPartyHudSignature)return;
 lastPartyHudSignature=signature;widget.hidden=false;widget.replaceChildren();
 widget.classList.toggle('party-hud-collapsed',folded);
 widget.setAttribute('aria-expanded',String(!folded));
 const toggle=document.createElement('button');
 toggle.type='button';toggle.id='partyHudToggle';
 toggle.setAttribute('aria-expanded',String(!folded));
 toggle.setAttribute('aria-label',folded?'Развернуть группу':'Свернуть группу');
 toggle.title=folded?'Развернуть группу':'Свернуть группу';
 const chevron=document.createElement('span');chevron.className='party-hud-chevron';
 chevron.textContent=folded?'‹':'›';
 toggle.appendChild(chevron);
 toggle.addEventListener('click',toggleGroupHud);
 if(folded){
  const icon=document.createElement('span');icon.className='party-hud-icon';icon.textContent='👥';
  const count=document.createElement('span');count.className='party-hud-count';
  count.textContent=members.length+'/5';
  toggle.append(icon,count);
  widget.appendChild(toggle);
  positionGroupHud();return;
 }
 widget.appendChild(toggle);
 const content=document.createElement('div');content.className='party-hud-content';
 const title=document.createElement('div');title.id='partyHudTitle';
 title.textContent='Группа '+members.length+'/5';content.appendChild(title);
 for(const member of members){
  const button=document.createElement('button');button.type='button';button.className='party-hud-member';
  const avatar=document.createElement('span');avatar.className='party-hud-avatar';
  avatar.textContent=(member.name||'?').slice(0,1).toUpperCase();
  const data=document.createElement('span');data.className='party-hud-data';
  const name=document.createElement('span');name.className='party-hud-name';
  name.textContent=(member.id===currentParty.leaderId?'★ ':'')+(member.name||'Странник');
  const health=document.createElement('span');health.className='party-hud-health';
  const fill=document.createElement('i');
  const max=Number.isFinite(member.maxHp)&&member.maxHp>0?member.maxHp:1;
  fill.style.width=Math.max(0,Math.min(100,(member.hp||0)/max*100))+'%';
  health.appendChild(fill);
  const level=document.createElement('span');level.className='party-hud-level';
  level.textContent='Ур. '+(member.level||1);
  data.append(name,health);button.append(avatar,data,level);
  button.setAttribute('aria-label',member.name+', уровень '+(member.level||1)+', выбрать игрока');
  button.addEventListener('click',()=>
   member.id===onlineSelfId?openPartyDialog():selectRemotePlayer(member.id));
  content.appendChild(button);
 }
 widget.appendChild(content);
 positionGroupHud();
}
function renderAllySelection(){
 const remote=remotePlayers.get(selectedPlayerId);
 const panel=$('allyFrame');panel.hidden=!remote;
 // Only one frame occupies the center HUD slot: hostile target,
 // friendly player, or a subtle empty-target placeholder.
 $('targetPlaceholder').hidden=isAliveTarget(selected)||!!remote;
 if(!remote)return;
 $('allyName').textContent=remote.name||'Странник';
 $('allyLevel').textContent='Таурен · Воин · уровень '+(remote.level||1);
 const max=Number.isFinite(remote.maxHp)&&remote.maxHp>0?remote.maxHp:1;
 $('allyHpFill').style.width=Math.max(0,Math.min(100,(remote.hp||0)/max*100))+'%';
 $('allyHpText').textContent=Number.isFinite(remote.hp)?Math.ceil(remote.hp)+' / '+Math.ceil(max)+' HP':'HP —';
 const invitedAlready=isInParty(selectedPlayerId);
 const blocked=currentParty.groupId&&currentParty.leaderId!==onlineSelfId;
 const full=currentParty.members.length>=5;
 const button=$('allyInvite');
 button.disabled=!worldConnection?.connected()||invitedAlready||blocked||full;
 button.textContent=invitedAlready?'Уже в группе':blocked?'Приглашает лидер':full?'Группа заполнена':'Пригласить в группу';
}
function selectRemotePlayer(id){
 if(id&&!remotePlayers.has(id))return;
 if(id){
  clearTarget();
  selectedPlayerId=id;
 }else selectedPlayerId=null;
 renderAllySelection();
}
function inviteRemotePlayer(id){
 if(!id||!remotePlayers.has(id)){msg('Игрок недоступен');return}
 if(!worldConnection?.invite(id)){msg('Сначала подключись к миру');return}
 msg('Приглашение отправляется');
}
function saveCharacterName(raw){
 const next=sanitizePlayerName(raw);
 if(next.length<2){msg('Имя должно содержать хотя бы 2 символа');return}
 characterName=next;
 try{localStorage.setItem(playerNameKey,next)}catch{}
 $('playerName').textContent=next;
 if(worldConnection?.connected())worldConnection.rename(next);
 if(modalKind==='party')renderPartyDialog();
 msg('Имя персонажа: '+next);
}
function renderPartyDialog(){
 openDialog('Группа','ОБЩИЙ МИР · ДО ПЯТИ ИГРОКОВ',[],'party');
 const parent=$('mbody');
 const editor=document.createElement('div');editor.className='party-editor';
 const label=document.createElement('label');label.textContent='Имя персонажа';
 const input=document.createElement('input');input.id='partyNameInput';input.type='text';
 input.maxLength=24;input.value=characterName;input.autocomplete='off';
 input.setAttribute('aria-label','Имя персонажа');
 label.appendChild(input);
 const rename=document.createElement('button');rename.type='button';rename.textContent='Сохранить';
 rename.addEventListener('click',()=>saveCharacterName(input.value));
 input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();saveCharacterName(input.value)}});
 editor.append(label,rename);parent.appendChild(editor);
 const summary=document.createElement('div');summary.className='party-panel-section';
 summary.textContent=currentParty.groupId?'УЧАСТНИКИ '+currentParty.members.length+'/5':'СОЗДАТЬ ГРУППУ';
 parent.appendChild(summary);
 const details=document.createElement('div');details.className='party-panel-roster';parent.appendChild(details);
 if(currentParty.groupId){
  for(const member of currentParty.members){
   const row=document.createElement('div');row.className='party-panel-roster-row';
   const label=document.createElement('b');
   label.textContent=(member.id===currentParty.leaderId?'★ ':'')+member.name;
   const level=document.createElement('span');level.textContent='Ур. '+member.level;
   row.append(label,level);details.appendChild(row);
  }
  if(currentParty.leaderId===onlineSelfId){
   const hint=document.createElement('p');hint.className='party-panel-note';
   hint.textContent='Ты лидер группы и можешь приглашать новых игроков.';parent.appendChild(hint);
  }
 }else{
  const hint=document.createElement('p');hint.className='party-panel-note';
  hint.textContent='Выбери другого таурена в мире и нажми «Пригласить» — группа появится после принятия приглашения. Или пригласи игрока из списка ниже.';
  parent.appendChild(hint);
 }
 const listTitle=document.createElement('div');listTitle.className='party-panel-section';
 listTitle.textContent='ИГРОКИ В МУЛГОРЕ';parent.appendChild(listTitle);
 const candidates=[...remotePlayers.entries()].filter(([id])=>!isInParty(id))
  .sort((a,b)=>(a[1].name||'').localeCompare(b[1].name||'','ru'));
 if(!candidates.length){
  const empty=document.createElement('p');empty.className='party-panel-note';
  empty.textContent='Других доступных игроков пока нет.';parent.appendChild(empty);
 }
 const canInvite=!currentParty.groupId||currentParty.leaderId===onlineSelfId;
 for(const [id,remote] of candidates){
  const row=document.createElement('div');row.className='party-panel-roster-row';
  const label=document.createElement('span');label.textContent=(remote.name||'Странник')+' · ур. '+(remote.level||1);
  const button=document.createElement('button');button.type='button';
  button.textContent='Пригласить';button.disabled=!canInvite||currentParty.members.length>=5;
  button.addEventListener('click',()=>inviteRemotePlayer(id));
  row.append(label,button);parent.appendChild(row);
 }
 if(currentParty.groupId){
  choice('Покинуть группу',()=>{
   if(!worldConnection.leaveParty())msg('Нет связи с сервером');
  },'danger');
 }
}
function openPartyDialog(){
 if(modalKind==='party'){closeDialog();return}
 renderPartyDialog();
}
function applyPartyState(data){
 if(!data||!Array.isArray(data.members))return;
 const previousGroup=currentParty.groupId;
 currentParty={groupId:typeof data.groupId==='string'?data.groupId:null,
  leaderId:typeof data.leaderId==='string'?data.leaderId:null,
  members:data.members.filter(m=>m&&typeof m.id==='string').slice(0,5)};
 if(previousGroup!==currentParty.groupId){
  chatHistory.party.length=0;chatUnread.party=0;
  if(currentParty.groupId)chatSystem('Групповой чат доступен','party');
 }
 updateChatControls();
 renderGroupHud();renderAllySelection();
 if(modalKind==='party')renderPartyDialog();
}
function hidePartyInvite(){
 pendingPartyInvite=null;
 clearTimeout(partyInviteTimer);
 $('partyInvitation').hidden=true;
}
function receivePartyInvite(event){
 if(!event||typeof event.fromId!=='string')return;
 hidePartyInvite();
 pendingPartyInvite=event.fromId;
 $('partyInviteMessage').textContent=(event.fromName||'Странник')+' приглашает тебя в группу.';
 $('partyInvitation').hidden=false;
 partyInviteTimer=setTimeout(hidePartyInvite,Math.min(60,Math.max(1,event.expiresIn||60))*1000);
}
function respondToPartyInvite(accept){
 const id=pendingPartyInvite;
 if(!id)return;
 hidePartyInvite();
 if(!worldConnection.respondInvite(id,accept))msg('Нет связи с сервером');
}

// Online stage 3: the chat is ephemeral and stays out of the mobile controls.
// Do not store public/party conversation history in localStorage.
const CHAT_HISTORY_LIMIT=75;
const chatHistory={world:[],party:[]};
const chatUnread={world:0,party:0};
const chatCollapsedKey='nexgame-chat-collapsed-v1';
let chatCollapsed=true,chatChannel='world',worldChatReady=false,pendingChatMessage='';
try{chatCollapsed=localStorage.getItem(chatCollapsedKey)!=='false'}catch{}
function renderChatLog(){
 const log=$('chatMessages');if(!log||chatCollapsed)return;
 log.replaceChildren();
 const history=chatHistory[chatChannel];
 if(chatChannel==='party'&&!currentParty.groupId){
  const empty=document.createElement('div');empty.className='chat-empty';
  empty.textContent='Вступи в группу, чтобы общаться с союзниками.';
  log.appendChild(empty);
 }
 if(!history.length&&chatChannel==='world'){
  const empty=document.createElement('div');empty.className='chat-empty';
  empty.textContent='Чат Мулгора. Сообщения видят игроки онлайн.';
  log.appendChild(empty);
 }
 for(const line of history){
  const row=document.createElement('div');
  row.className='chat-line'+(line.system?' chat-system':line.fromId===onlineSelfId?' chat-self':'');
  if(!line.system){
   const name=document.createElement('span');name.className='chat-sender';
   name.textContent=(line.name||'Странник')+': ';
   row.appendChild(name);
  }
  const content=document.createElement('span');content.textContent=line.text;
  row.appendChild(content);log.appendChild(row);
 }
 log.scrollTop=log.scrollHeight;
}
function updateChatControls(){
 const dock=$('chatDock'),panel=$('chatPanel'),toggle=$('chatToggle');
 if(!dock||!panel||!toggle)return;
 dock.classList.toggle('chat-collapsed',chatCollapsed);
 toggle.hidden=!chatCollapsed;panel.hidden=chatCollapsed;
 toggle.setAttribute('aria-expanded',String(!chatCollapsed));
 const partyAvailable=!!currentParty.groupId;
 if(!partyAvailable&&chatChannel==='party')chatChannel='world';
 $('chatPartyTab').disabled=!partyAvailable;
 $('chatWorldTab').setAttribute('aria-selected',String(chatChannel==='world'));
 $('chatPartyTab').setAttribute('aria-selected',String(chatChannel==='party'));
 $('chatWorldTab').textContent='Мулгор'+(chatUnread.world?' · '+chatUnread.world:'');
 $('chatPartyTab').textContent='Группа'+(chatUnread.party?' · '+chatUnread.party:'');
 $('chatInput').placeholder=!worldChatReady?'Ожидание чат-сервера...':
  chatChannel==='party'?'Сообщение группе...':'Сообщение Мулгору...';
 $('chatInput').disabled=!worldConnection?.connected()||!worldChatReady||
  (chatChannel==='party'&&!partyAvailable);
 $('chatSend').disabled=$('chatInput').disabled;
 $('chatHeader').querySelector('strong').textContent=chatChannel==='party'?'Чат группы':'Чат Мулгора';
 const unread=chatUnread.world+chatUnread.party;
 const badge=$('chatUnread');badge.hidden=!unread;
 badge.textContent=unread>9?'9+':String(unread);
 renderChatLog();
}
function setChatCollapsed(collapsed){
 chatCollapsed=Boolean(collapsed);
 try{localStorage.setItem(chatCollapsedKey,String(chatCollapsed))}catch{}
 if(!chatCollapsed)chatUnread[chatChannel]=0;
 updateChatControls();
 // Avoid overlap with the party controls on narrow iPhone screens.
 renderGroupHud();
}
function setChatChannel(channel){
 if(channel!=='world'&&channel!=='party')return;
 if(channel==='party'&&!currentParty.groupId){msg('Сначала вступи в группу');return}
 chatChannel=channel;chatUnread[channel]=0;
 updateChatControls();
}
function addChatLine(channel,line){
 const history=chatHistory[channel];
 if(!history)return;
 history.push(line);
 if(history.length>CHAT_HISTORY_LIMIT)history.splice(0,history.length-CHAT_HISTORY_LIMIT);
 if((chatCollapsed||chatChannel!==channel)&&line.fromId!==onlineSelfId)
  chatUnread[channel]=Math.min(99,chatUnread[channel]+1);
 updateChatControls();
}
function receiveChatMessage(event){
 if(!event||!['world','party'].includes(event.channel)||typeof event.text!=='string')return;
 if(event.channel==='party'&&event.groupId!==currentParty.groupId)return;
 if(event.text.length>720)return;
 if(event.fromId===onlineSelfId&&event.text===pendingChatMessage)pendingChatMessage='';
 addChatLine(event.channel,{
  fromId:event.fromId,name:String(event.name||'Странник').slice(0,24),
  text:event.text,at:event.at
 });
}
function chatSystem(text,channel=currentParty.groupId?'party':'world'){
 if(!text)return;
 addChatLine(channel,{system:true,text:String(text).slice(0,210),at:Date.now()});
}
function chatRejected(event){
 const input=$('chatInput');
 if(pendingChatMessage&&!input.value)input.value=pendingChatMessage;
 pendingChatMessage='';
 const reason=String(event?.reason||'Сообщение не отправлено').slice(0,100);
 msg(reason,3300);
 chatSystem(reason,chatChannel);
}
function submitChatMessage(event){
 event.preventDefault();
 const input=$('chatInput'),text=input.value.trim();
 if(!text)return;
 if(Array.from(text).length>180){msg('Максимум 180 символов');return}
 if(!worldConnection.sendChat(chatChannel,text)){
  msg('Чат недоступен без соединения с сервером');return;
 }
 pendingChatMessage=text;
 input.value='';
 // Wait for the server echo: never fabricate a successful message locally.
}
function adjustChatForKeyboard(){
 const viewport=window.visualViewport,dock=$('chatDock'),input=$('chatInput'),panel=$('chatPanel');
 if(!viewport||!dock||!input||!panel)return;
 const focused=document.activeElement===input;
 const keyboardOverlap=Math.max(0,innerHeight-viewport.height-viewport.offsetTop);
 const cssBottom=parseFloat(getComputedStyle(dock).bottom)||0;
 const lift=focused&&keyboardOverlap>110?Math.max(0,keyboardOverlap-cssBottom+12):0;
 dock.style.transform=lift?'translateY(-'+Math.round(lift)+'px)':'';
 panel.style.height=focused&&keyboardOverlap>110?
  Math.max(140,Math.min(230,Math.floor(viewport.height*.48)))+'px':'';
}
function initChatControls(){
 $('chatToggle').addEventListener('click',()=>setChatCollapsed(false));
 $('chatClose').addEventListener('click',()=>setChatCollapsed(true));
 $('chatWorldTab').addEventListener('click',()=>setChatChannel('world'));
 $('chatPartyTab').addEventListener('click',()=>setChatChannel('party'));
 $('chatForm').addEventListener('submit',submitChatMessage);
 $('chatInput').addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();$('chatInput').blur();setChatCollapsed(true)}
 });
 $('chatInput').addEventListener('focus',()=>requestAnimationFrame(adjustChatForKeyboard));
 $('chatInput').addEventListener('blur',adjustChatForKeyboard);
 window.visualViewport?.addEventListener('resize',adjustChatForKeyboard);
 window.visualViewport?.addEventListener('scroll',adjustChatForKeyboard);
 updateChatControls();
}

function removeRemotePlayer(id){
 const remote=remotePlayers.get(id);if(!remote)return;
 scene.remove(remote.actor.root,remote.actor.shadow,remote.nameTag);
 remote.nameTag.material.map.dispose();remote.nameTag.material.dispose();
 remotePlayers.delete(id);
 if(selectedPlayerId===id){selectedPlayerId=null;renderAllySelection()}
}
function updateRemoteSnapshot(list){
 if(!Array.isArray(list))return;
 const visible=new Set();
 for(const p of list.slice(0,40)){
  if(typeof p?.id!=='string'||!Number.isFinite(p.x)||!Number.isFinite(p.z)||
     !Number.isFinite(p.yaw)||p.x<-1000||p.x>1000||p.z<-1000||p.z>1000)continue;
  visible.add(p.id);
  let remote=remotePlayers.get(p.id);
  if(!remote){
   const actor=makeTauren({fur:0x977c61,cloth:M.teal,scale:.94,weapon:true});
   void attachSwordAsset(actor);
   void attachDaggerAsset(actor);
   actor.root.position.set(p.x,heightAt(p.x,p.z),p.z);actor.root.rotation.y=p.yaw;
   const nameTag=spriteText(String(p.name||'Странник').slice(0,24)+' · '+(p.level||1),'#c3f1ff',26);
   scene.add(nameTag);
   remote={actor,nameTag,name:String(p.name||'Странник').slice(0,24),level:p.level||1,hp:p.hp,maxHp:p.maxHp,
    x:p.x,z:p.z,yaw:p.yaw,lastX:p.x,lastZ:p.z,moving:false,attackAge:-1,stompAge:-1};
   remotePlayers.set(p.id,remote);
  }
  const name=String(p.name||'Странник').slice(0,24);
  const level=Number.isInteger(p.level)?p.level:remote.level;
  if(remote.name!==name||remote.level!==level){
   scene.remove(remote.nameTag);
   remote.nameTag.material.map.dispose();remote.nameTag.material.dispose();
   remote.nameTag=spriteText(name+' · '+level,'#c3f1ff',26);scene.add(remote.nameTag);
  }
  remote.name=name;remote.level=level;
  remote.hp=Number.isFinite(p.hp)?p.hp:remote.hp;
  remote.maxHp=Number.isFinite(p.maxHp)?p.maxHp:remote.maxHp;
  remote.weaponId=typeof p.equipment?.weapon==='string'?p.equipment.weapon:null;
  // New servers send the sanitized weapon item ID and shield flag.
  // Old servers omit equipment: retain the original default axe in that case.
  const hasEquipment=!!p.equipment&&typeof p.equipment==='object';
  const remoteKind=hasEquipment?equippedWeaponKind(
   {weapon:p.equipment.weapon?{id:p.equipment.weapon}:null},ITEM_CATALOG):'axe';
  setWeaponVisuals(remote.actor.root,remoteKind,hasEquipment&&p.equipment.shield===true);
  const remoteShield=ITEM_CATALOG[p.equipment?.shieldId];
  if(hasEquipment&&p.equipment.shield){
   const shieldRoot=remote.actor.root.getObjectByName('gear-shield');
   const glb=shieldRoot?.getObjectByName('shield-glb-model');
   const rarity=remoteShield?.rarity||'common';
   applyShieldTransform(remote.actor.root,shieldModelForRarity(rarity));
   if(glb)styleShieldGlb(THREE,glb,rarity);
   else applyShieldQuality(THREE,remote.actor.root,rarity);
   void attachShieldAsset(remote.actor.root,rarity);
  }
  if(remoteKind!=='none'){
   const weaponDef=ITEM_CATALOG[p.equipment?.weapon];
   applyWeaponQuality(THREE,remote.actor.root,remoteKind,weaponDef?.rarity);
  }
  remote.x=p.x;remote.z=p.z;remote.yaw=p.yaw;remote.moving=!!p.moving;
 }
 for(const id of remotePlayers.keys())if(!visible.has(id))removeRemotePlayer(id);
}
function animateRemotePlayers(dt){
 for(const remote of remotePlayers.values()){
  const actor=remote.actor,position=actor.root.position;
  const lerp=1-Math.exp(-Math.max(0,dt)*11);
  position.x+= (remote.x-position.x)*lerp;position.z+=(remote.z-position.z)*lerp;
  position.y=heightAt(position.x,position.z);
  const turn=Math.atan2(Math.sin(remote.yaw-actor.root.rotation.y),Math.cos(remote.yaw-actor.root.rotation.y));
  actor.root.rotation.y+=turn*lerp;
  const traveled=Math.hypot(position.x-remote.lastX,position.z-remote.lastZ);
  remote.lastX=position.x;remote.lastZ=position.z;
  actor.phase+=traveled*.65;
  const attack=remote.attackAge<0?-1:remote.attackAge/.8;
  const stomp=remote.stompAge<0?-1:remote.stompAge/.75;
  animateTauren(actor,clock,dt,remote.moving?Math.min(1,traveled/Math.max(dt*.8,.001)):0,attack,stomp);
  if(remote.attackAge>=0){remote.attackAge+=dt;if(remote.attackAge>=.8)remote.attackAge=-1}
  if(remote.stompAge>=0){remote.stompAge+=dt;if(remote.stompAge>=.75)remote.stompAge=-1}
  remote.nameTag.position.set(position.x,position.y+4.4,position.z);
 }
}
// Wildlife snapshots use the same stable mob indexes as the local world model.
// Keep a local fallback so the game remains playable during Render cold starts.
const SHARED_MOB_COUNT=enemies.filter(enemy=>!enemy.trainingDummy).length;
let sharedMobTargets=new Map(),sharedMobsConnected=false,worldCombatReady=false;
let lastSharedMobPacketAt=0,onlineSelfId=null;
let worldNetworkStatus='solo',mobNetworkStatus='ожидание',onlinePopulation=null,dolgonogRenderStatus='загрузка';
const creditedMobLives=new Set();
function showWorldNetworkStatus(){
 const el=$('onlineStatus');if(!el)return;
 const label=worldNetworkStatus==='online'?'Мир: онлайн':worldNetworkStatus==='connecting'?
  'Мир: подключение':worldNetworkStatus==='solo'?'Мир: одиночный':'Мир: нет связи';
 const world=worldNetworkStatus==='online'?
  label+' · игроков: '+(Number.isInteger(onlinePopulation)?onlinePopulation:'—')+
  ' · мобы: '+mobNetworkStatus:label;
 el.textContent=world+' · долгоноги: '+dolgonogRenderStatus;
}
function resetSharedMobAppearance(e){
 e.dead=0;e.corpseAge=0;e.loot=[];e.lootMarker.visible=false;
 refreshLootMarkerQuality(e);
 e.aggro=false;e.stunned=0;e.attackCd=0;e.attackWindup=0;e.returning=false;e.alertRemaining=0;e.hit=0;
 e.root.visible=e.shadow.visible=true;
 e.root.rotation.z=0;e.root.scale.setScalar(e.baseScale||1);
 e.legs[0].rotation.x=e.legs[1].rotation.x=0;
 resetPlainstriderVisual(e);
 if(e.boss&&e.nameTag)e.nameTag.visible=true;
}
function syncSharedMobState(e,row){
 const newLife=e.serverLife!==row.life;
 if(newLife){
  e.serverLife=row.life;resetSharedMobAppearance(e);
 }
 const firstDeath=row.dead&&!e.serverDead;
 if(firstDeath){
  e.dead=CORPSE_DURATION;e.corpseAge=0;
  e.root.visible=e.shadow.visible=true;
  if(e.boss&&e.nameTag)e.nameTag.visible=false;
  if(selected===e){clearTarget();hideCombatWarning()}
 }
 if(!row.dead&&e.serverDead)resetSharedMobAppearance(e);
 e.serverDead=row.dead;
 e.hp=row.hp;e.maxHp=row.maxHp;
 if(row.aggroId&&!e.serverAggroId)e.alertRemaining=1.05;
 e.serverAggroId=row.aggroId;
 e.aggro=!!row.aggroId&&row.aggroId===onlineSelfId;
 e.returning=!!row.returning;
 if(Number.isInteger(row.attackSeq)&&row.attackSeq!==e.serverAttackSeq){
  if(e.serverAttackSeq!==undefined)e.attackCd=e.boss?1.8:1.5;
  e.serverAttackSeq=row.attackSeq;
 }
 if(row.stunned)e.stunned=Math.max(e.stunned,.18);
}
function updateSharedMobTargets(snapshot){
 if(snapshot===null){
  sharedMobsConnected=false;worldCombatReady=false;
  sharedMobTargets.clear();lastSharedMobPacketAt=0;
  mobNetworkStatus='нет связи';showWorldNetworkStatus();return;
 }
 if(!Array.isArray(snapshot))return;
 const {targets:next,rejected}=collectSharedMobTargets(snapshot,enemies);
 if(next.size!==SHARED_MOB_COUNT){
  sharedMobsConnected=false;worldCombatReady=false;sharedMobTargets.clear();
  lastSharedMobPacketAt=0;
  mobNetworkStatus=snapshot.length===0?'нет данных от сервера':
    mobSnapshotErrorLabel(rejected,next.size,SHARED_MOB_COUNT);
  showWorldNetworkStatus();return;
 }
 const firstSnapshot=!sharedMobsConnected;
 sharedMobTargets=next;sharedMobsConnected=true;lastSharedMobPacketAt=performance.now();
 worldCombatReady=[...next.values()].every(row=>
  Number.isFinite(row.hp)&&Number.isFinite(row.maxHp)&&row.maxHp>0&&
  Number.isInteger(row.life)&&typeof row.dead==='boolean');
 mobNetworkStatus=SHARED_MOB_COUNT+'/'+SHARED_MOB_COUNT+
  (worldCombatReady?' · PvE':' · старый сервер');
 showWorldNetworkStatus();
 for(const [id,row] of next){
  const mob=enemies[id];
  if(worldCombatReady)syncSharedMobState(mob,row);
  if(firstSnapshot&&mob.dead<=0&&!mob.aggro){
   mob.root.position.set(row.x,heightAt(row.x,row.z),row.z);
   mob.root.rotation.y=row.yaw;
   if(row.phase!==null)mob.phase=row.phase;
   mob.shadow.position.set(row.x,heightAt(row.x,row.z)+.055,row.z);
  }
 }
}
function animateSharedMob(e,dt,target){
 const p=e.root.position,oldX=p.x,oldZ=p.z;
 const gap=Math.hypot(target.x-p.x,target.z-p.z);
 const lerp=gap>2?1:1-Math.exp(-Math.max(0,dt)*9);
 p.x+=(target.x-p.x)*lerp;p.z+=(target.z-p.z)*lerp;
 const turn=Math.atan2(Math.sin(target.yaw-e.root.rotation.y),Math.cos(target.yaw-e.root.rotation.y));
 e.root.rotation.y+=turn*lerp;
 p.y=heightAt(p.x,p.z);
 e.hit=Math.max(0,e.hit-dt);
 e.stunned=Math.max(0,e.stunned-dt);
 e.attackCd=Math.max(0,e.attackCd-dt);
 const moved=Math.hypot(p.x-oldX,p.z-oldZ);
 e.phase=Number.isFinite(target.phase)?target.phase:e.phase+moved*4;
 const stride=Math.sin(e.phase),power=Math.min(1,moved/(dt||1));
 e.legs[0].rotation.x=stride*.48*power;
 e.legs[1].rotation.x=-stride*.48*power;
 e.body.position.y=1.23+Math.abs(stride)*.025*power;
 const recoil=hitReaction(e.hit);
 e.body.rotation.x=(e.attackCd>1.15?Math.sin((1.5-e.attackCd)/.3*Math.PI)*.2:0)-.25*recoil;
 e.body.rotation.z=(e.stunned>0?Math.sin(clock*8)*.08:0)+.13*recoil;
 advancePlainstriderVisual(THREE,e,dt,moved);
 animateMobAlert(e,dt);
 e.shadow.position.set(p.x,p.y+.055,p.z);
 if(e.boss&&e.nameTag){
  e.nameTag.visible=true;e.nameTag.position.set(p.x,p.y+4.65,p.z);
 }
}
function animateSharedCorpse(e,dt,target){
 const p=e.root.position;
 p.x=target.x;p.z=target.z;
 e.corpseAge+=dt;e.dead=CORPSE_DURATION;
 const fall=smooth(0,CORPSE_FALL_TIME,e.corpseAge);
 e.root.rotation.z=-1.34*fall;
 p.y=heightAt(p.x,p.z)+.13*fall;
 e.legs[0].rotation.x=-.55*fall;e.legs[1].rotation.x=.3*fall;
 e.body.rotation.x=0;e.body.rotation.z=0;
 advancePlainstriderVisual(THREE,e,dt,0,true);
 animateMobAlert(e,dt);
 e.shadow.position.set(p.x,heightAt(p.x,p.z)+.055,p.z);
 if(e.boss&&e.nameTag)e.nameTag.visible=false;
 if(e.lootMarker.visible){
  e.lootMarker.position.set(p.x,heightAt(p.x,p.z)+1.1+Math.sin(clock*3.6)*.13,p.z);
 }
}
function updateWildlife(dt){
 if(sharedMobsConnected&&performance.now()-lastSharedMobPacketAt>3000){
  sharedMobsConnected=false;worldCombatReady=false;sharedMobTargets.clear();
  mobNetworkStatus='потеря данных';showWorldNetworkStatus();
 }
 for(const enemy of enemies){
  animateLootMarkerQuality(enemy);
  const row=sharedMobsConnected&&!enemy.trainingDummy?
   sharedMobTargets.get(enemy.index):null;
  if(row&&worldCombatReady){
   if(row.dead)animateSharedCorpse(enemy,dt,row);
   else animateSharedMob(enemy,dt,row);
  }else if(row&&enemy.dead<=0&&!enemy.aggro)animateSharedMob(enemy,dt,row);
  else updateEnemy(enemy,dt);
 }
}
function updateOnlineSceneWhileMenuOpen(dt){
 animateRemotePlayers(dt);
 if(!sharedMobsConnected)return;
 for(const enemy of enemies){
  animateLootMarkerQuality(enemy);
  if(enemy.trainingDummy)continue;
  const row=sharedMobTargets.get(enemy.index);
  if(!row)continue;
  if(worldCombatReady){
   if(row.dead)animateSharedCorpse(enemy,dt,row);
   else animateSharedMob(enemy,dt,row);
  }else if(enemy.dead<=0&&!enemy.aggro)animateSharedMob(enemy,dt,row);
 }
}
function applySharedCombat(event,selfId){
 if(!event||!Array.isArray(event.hits))return;
 if(event.actorId===selfId){
  if(event.abilityId==='autoAttack')
   autoSwingClock.onAccepted(Number.isFinite(event.cooldownMs)?event.cooldownMs:playerStats().speed*1000);
  else reconcileAbilityCooldown(abilityRuntime,event.abilityId,event.cooldownMs,event.gcdMs);
 }
 if(event.actorId!==selfId){
  const other=remotePlayers.get(event.actorId);
  if(other){
   if(event.abilityId==='thunderStomp')other.stompAge=0;
   else other.attackAge=0;
  }
 }else if(event.hits.length){
  const gain=event.abilityId==='autoAttack'?WARRIOR_RAGE_PER_HIT:
   event.abilityId==='heavyStrike'?8:event.abilityId==='thunderStomp'?3:0;
  gainClassResource(gain*event.hits.length);lastCombatAt=clock;
 }
 for(const hit of event.hits){
  const enemy=enemies[hit.id];
  if(!enemy||enemy.trainingDummy||enemy.serverLife!==hit.life)continue;
  if(Number.isFinite(hit.hp))enemy.hp=Math.max(0,hit.hp);
  // Exactly one number per authoritative hit. Every connected player sees it.
  showCombatHit(enemy,hit.amount,event.abilityId);
 }
 updateHUD();
}
function applyMobAttack(event,selfId){
 const enemy=enemies[event?.mobId];
 if(!enemy||enemy.trainingDummy||enemy.serverLife!==event.life)return;
 if(event.targetId!==selfId){
  if(enemy.attackCd<=.15)enemy.attackCd=enemy.boss?1.8:1.5;return;
 }
 // Ignore combat packets generated at the corpse's old coordinates before
 // the world server has acknowledged the instantaneous respawn teleport.
 if(respawnPending||performance.now()<respawnGraceUntil||
    Math.hypot(state.x-enemy.root.position.x,state.z-enemy.root.position.z)>(enemy.boss?4.4:3.4))return;
 if(enemy.attackCd<=.15)enemy.attackCd=enemy.boss?1.8:1.5;
 const amount=enemy.boss?14:9;
 lastCombatAt=clock;
 const suffered=incomingDamage(enemy,amount);
 state.hp-=suffered;
 if(suffered>0)gainClassResource(WARRIOR_RAGE_ON_HURT);
 if(state.hp<=0)revive();
 updateHUD();
}
function applySharedKillCredit(event){
 if(!Number.isInteger(event?.mobId)||!Number.isInteger(event.life))return;
 const enemy=enemies[event.mobId];if(!enemy||enemy.trainingDummy)return;
 const key=event.mobId+':'+event.life;
 if(creditedMobLives.has(key))return;
 creditedMobLives.add(key);
 enemy.loot=Array.isArray(event.loot)?event.loot.filter(item=>
  item&&ITEM_CATALOG[item.id]&&Number.isInteger(item.qty)&&item.qty>0&&
  item.qty<=itemStackLimit(item.id)).map(item=>({id:item.id,qty:item.qty})):[];
 enemy.lootMarker.visible=enemy.loot.length>0;
 refreshLootMarkerQuality(enemy);
 enemy.lootMarker.position.set(enemy.root.position.x,heightAt(enemy.root.position.x,enemy.root.position.z)+1.1,enemy.root.position.z);
 if(enemy.hp<=0){enemy.dead=CORPSE_DURATION;enemy.corpseAge=0}
 state.gold+=enemy.boss?12:4;
 experience(enemy.boss?70:22);
 if(enemy.boss&&state.quest===10){
  state.quest=11;msg('Грозоклюв повержен! Вернись к наставнику.');
 }
 if(state.quest===1&&!enemy.boss){
  state.kills=Math.min(3,state.kills+1);
  if(state.kills===3){state.quest=2;msg('Обряд силы: вернись к наставнику')}
 }
 save();updateHUD();
}
function showSharedCombatError(event){
 if(!event)return;
 if(event.abilityId==='autoAttack'){
  // Server can reject a hit by a few ms due to RTT jitter: realign rather
  // than showing a cooldown warning every time the local animation repeats.
  autoSwingClock.onRejected(Number.isFinite(event.retryAfterMs)?event.retryAfterMs:playerStats().speed*1000);
  if(event.reason==='Способность восстанавливается')return;
 }else{
  reconcileAbilityCooldown(abilityRuntime,event.abilityId,event.cooldownMs,event.gcdMs);
 }
 if(event.reason)combatWarning(String(event.reason).slice(0,80),true);
}
// Declared before connection callbacks: onStatus may fire synchronously.
let respawnGraceUntil=0,respawnPending=false;
const worldConnection=createWorldPresence({
 url:WORLD_WS_URL,
 onStatus:status=>{
  worldNetworkStatus=status;
  if(status!=='online'){
   onlinePopulation=null;
   autoSwingClock.reset();
  }
  if(status==='online')mobNetworkStatus='ожидание';
  if(status==='offline'||status==='solo')respawnPending=false;
  if(status==='offline'||status==='solo')worldChatReady=false;
  showWorldNetworkStatus();
  // Connecting is emitted synchronously before worldConnection is initialized.
  if(status!=='connecting')updateChatControls();
 },
 onPlayers:updateRemoteSnapshot,
 onPopulation:count=>{
  // Exact number of WebSocket players supplied by the world server.
  const next=Number.isInteger(count)&&count>=0?count:null;
  if(next===onlinePopulation)return;
  onlinePopulation=next;showWorldNetworkStatus();
 },
 onMobs:updateSharedMobTargets,
 onWelcome:welcome=>{
  onlineSelfId=welcome.id;
  chestUI.ready(Number(welcome.protocol)>=6);
  worldChatReady=Number(welcome.protocol)>=5;
  if(!worldChatReady)chatSystem('Ожидание обновления Render для работы чата','world');
  updateChatControls();
 },
 onCombat:applySharedCombat,
 onMobAttack:applyMobAttack,
 onRespawnAccepted:packet=>{
  respawnPending=false;
  respawnGraceUntil=performance.now()+3000;
  // The server accepts the teleport and releases aggro; do not let stale
  // snapshots move the hero back to the corpse.
  if(Number.isFinite(packet.x)&&Number.isFinite(packet.z)){
   state.x=packet.x;state.z=packet.z;
   hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);
  }
 },
 onKillCredit:applySharedKillCredit,
 onCombatRejected:showSharedCombatError,
 onPartyState:applyPartyState,
 onPartyInvite:receivePartyInvite,
 onPartyNotice:notice=>{
  if(notice?.message){msg(notice.message,3600);chatSystem(notice.message,'world')}
 },
 onChat:receiveChatMessage,
 onChatRejected:chatRejected,
 onChestState:chestUI.state,
 onChestResult:chestUI.result,
 onNameChanged:event=>{
  if(event?.name&&event.name!==characterName){
   characterName=sanitizePlayerName(event.name);
   try{localStorage.setItem(playerNameKey,characterName)}catch{}
   $('playerName').textContent=characterName;
  }
 },
 onLeave:removeRemotePlayer,
 getPosition:()=>({
  name:characterName,x:state.x,z:state.z,yaw:state.yaw,level:state.level,
  hp:state.hp,maxHp:playerStats().maxHp,
  equipment:Object.fromEntries(Object.entries(state.equipment||{}).filter(([,item])=>item?.id).map(([slot,item])=>[slot,item.id])),
  moving:Math.abs(joy.x)+Math.abs(joy.y)>0||keys.has('w')||keys.has('arrowup')
 })
});
$('partyOpen').addEventListener('click',openPartyDialog);
$('allyInvite').addEventListener('click',()=>inviteRemotePlayer(selectedPlayerId));
$('allyClear').addEventListener('click',()=>selectRemotePlayer(null));
$('partyAccept').addEventListener('click',()=>respondToPartyInvite(true));
$('partyDecline').addEventListener('click',()=>respondToPartyInvite(false));
initChatControls();

let lastMarker='';
function updateHUD(){const max=playerStats().maxHp;
 $('playerName').textContent=characterName;
 renderAllySelection();renderGroupHud();$('levelBadge').textContent=state.level;$('hpText').textContent=Math.ceil(state.hp)+' / '+max;$('hpFill').style.width=state.hp/max*100+'%';$('xpFill').style.width=Math.min(100,state.xp/xpNeed()*100)+'%';$('xpText').textContent='Опыт '+state.xp+' / '+xpNeed();updateHotbarVisuals();
 const klass=getClassDefinition(state.classId);
 $('className').textContent='Таурен · '+klass.name;
 $('rageFill').style.width=(100*state.resource/klass.resourceMax)+'%';
 $('rageText').textContent=klass.resourceName+' '+Math.floor(state.resource)+' / '+klass.resourceMax;
 $('resourceBar').setAttribute('aria-label',klass.resourceName);
 $('resourceBar').setAttribute('aria-valuenow',String(Math.floor(state.resource)));
 $('resourceBar').setAttribute('aria-valuemax',String(klass.resourceMax));
 $('resourceBar').classList.toggle('resource-mana',klass.resource==='mana');
 $('combatState').textContent=inCombat()?'В бою':state.hp<max?(clock-lastCombatAt<HEALTH_REGEN_DELAY?'Отдых после боя':'Восстановление'):'Готов к бою';
$('qtitle').textContent=questLines[state.quest][0];$('qtext').textContent=state.quest===1?'Равнинные долгоноги: '+state.kills+' / 3':questLines[state.quest][1];
 const camp=Math.hypot(state.x+3,state.z-3)<23,indoors=interiorZones.some(zone=>isInsideRect(state.x,state.z,zone));
 const nearLake=normalizedLakeRadius(state.x,state.z,LAKE)<1.22;
 $('area').textContent=indoors?'Дом очага':nearLake?LAKE.name:camp?'Лагерь Нараче':'Плато Красного Облака';
 $('mapLabel').textContent=indoors?'Дом очага':nearLake?'Озеро':camp?'Лагерь Нараче':'Мулгор';
 const questNumber=state.quest===0?1:state.quest<=2?2:state.quest<=5?3:state.quest<=8?4:5;
 $('quest-progress').textContent=state.quest===12?'Цепочка · 5 / 5 ✓':'Цепочка · '+questNumber+' / 5';
 const gatherPanel=$('gatherQuestTracker');
 const mainStageActive=[1,2,4,5,7,8,10,11].includes(state.quest);
 $('mainQuestTracker').hidden=!mainStageActive;
 gatherPanel.hidden=!(state.gatherStage>=1&&state.gatherStage<=3&&!state.gatherAvailable);
 if(state.gatherStage>=1&&state.gatherStage<=3&&!state.gatherAvailable){
  const stage=state.gatherStage;
  $('gatherQuestStage').textContent=stage===4?'Сбор · 3 / 3 ✓':'Сбор · '+stage+' / 3';
  const q=GATHER_QUESTS[stage],count=q?gatherQuestCount():0;
  $('gatherQuestTitle').textContent=q?q.title:'Дары Мулгора завершены';
  $('gatherQuestText').textContent=q?(count>=q.count?
   'Собрано '+count+'/'+q.count+' · Вернись к Тихой Заре.':
   'Собрано '+count+'/'+q.count+' · '+q.hint):
   'Все три поручения травницы выполнены.';
 }
 updateGatherVisibility();updateHerbalistMarker();
 const guide=$('questGuidance');
 guide.hidden=state.quest!==7&&state.quest!==10;
 if(state.quest===7)guide.textContent='Разведка: идите на юго-восток по дороге.';
 if(state.quest===10)guide.textContent='Красный пунктир ведёт к Грозоклюву · 108 HP';
 bossGuide.visible=state.quest===10;
 const target=nearTarget();$('interact').hidden=Boolean(modalKind)||!!gatherCast||!target;
 if(target)$('interact').innerHTML=target.kind==='gather'?(target.node.pending?'Забрать <kbd>E</kbd>':'Собрать <kbd>E</kbd>'):
 target.kind==='corpse'?'Обыскать <kbd>E</kbd>':target.kind==='relic'?'Взять перо <kbd>E</kbd>':target.kind==='sharedChest'?'Открыть сундук <kbd>E</kbd>':'Поговорить <kbd>E</kbd>';
 const valid=isAliveTarget(selected);
 $('targetFrame').hidden=!valid;
 $('targetPlaceholder').hidden=valid||!!remotePlayers.get(selectedPlayerId);$('zoneTitle').hidden=Boolean(valid);
 const isDummy=valid&&selected.trainingDummy===true;
 $('targetFrame').classList.toggle('dummy-target',isDummy);
 $('dummyStats').hidden=!isDummy;
 updateHotbarVisuals();
 $('targetNext').classList.toggle('target-selected',valid);
 if(valid){
  const dist=targetDistance(selected),problem=meleeFailure(selected);
  $('targetName').textContent=selected.trainingDummy?selected.name:selected.name+(selected.boss?' · 5 · Элитный':' · 1');
  $('targetFill').style.width=Math.max(0,selected.hp/selected.maxHp*100)+'%';
  $('targetHp').textContent=Math.ceil(selected.hp)+' / '+selected.maxHp;
  $('targetDistance').textContent='Дистанция: '+dist.toFixed(1).replace('.',',')+' м · удар до '+MELEE_RANGE.toFixed(1).replace('.',',')+' м';
  const status=autoAttack?(problem?'Автоатака: '+problem.toLowerCase():'Автоатака включена'):(problem||'В зоне удара');
  $('targetStatus').textContent=status;
  $('targetStatus').className=problem?(problem.includes('далеко')?'target-far':'target-back'):(autoAttack?'target-active':'target-ready');
  if(isDummy){
   const metrics=selected.trainingStats;
   $('dummyLastHit').textContent='Последний: '+(metrics.hits?metrics.lastDamage.toFixed(0):'—');
   $('dummyTotal').textContent='Урон: '+Math.round(metrics.totalDamage).toLocaleString('ru-RU');
   $('dummyDps').textContent='DPS: '+trainingDps(selected).toFixed(1);
   $('dummyHitCount').textContent='Удары: '+metrics.hits;
   const ability=metrics.lastAbility?getAbilityDefinition(metrics.lastAbility)?.name:'';
   $('dummyLastAbility').textContent='Последний навык: '+(ability||'—');
   const remaining=TRAINING_DUMMY.resetAfter-(clock-metrics.lastHitAt);
   $('dummyReady').textContent=!metrics.hits?'Манекен готов к тренировке':
    metrics.restored?'Здоровье восстановлено · следующий удар начнёт новый замер':
    'Восстановление HP через '+Math.max(0,remaining).toFixed(1).replace('.',',')+' с';
  }
 }
 const marker=[0,3,6,9].includes(state.quest)?'!':[2,5,8,11].includes(state.quest)?'?':'·';questMarker.visible=state.quest!==12;if(marker!==lastMarker){lastMarker=marker;const c=questMarker.material.map.image,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 72px Georgia';ctx.lineWidth=5;ctx.strokeStyle='#3a2c19';ctx.fillStyle=marker==='·'?'#b4b395':'#ffe180';ctx.strokeText(marker,256,48);ctx.fillText(marker,256,48);questMarker.material.map.needsUpdate=true}relic.visible=state.quest===4;relicShadow.visible=relic.visible;
}
const minimap=$('minimap'),mapCtx=minimap.getContext('2d');
function drawPartyMapMarkers(ctx,scale){
 if(!currentParty.groupId)return;
 ctx.save();ctx.translate(120,120);
 for(const member of currentParty.members){
  if(member.id===onlineSelfId)continue;
  const remote=remotePlayers.get(member.id);
  if(!remote)continue;
  const marker=projectPartyMember(remote.x,remote.z,state.x,state.z,scale,103);
  if(!marker)continue;
  ctx.save();ctx.translate(marker.x,marker.y);
  ctx.fillStyle='#89f1d0';ctx.strokeStyle=selectedPlayerId===member.id?'#fff3b1':'#284e41';
  ctx.lineWidth=selectedPlayerId===member.id?3:1.8;
  if(marker.edge){
   ctx.rotate(Math.atan2(marker.y,marker.x));
   ctx.beginPath();ctx.moveTo(6,0);ctx.lineTo(-4,-4);ctx.lineTo(-4,4);
   ctx.closePath();ctx.fill();ctx.stroke();
  }else{
   ctx.beginPath();ctx.arc(0,0,selectedPlayerId===member.id?5.5:4.5,0,TAU);
   ctx.fill();ctx.stroke();
  }
  ctx.restore();
 }
 ctx.restore();
}
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
 for(const p of mapLandmarks){
 c.fillStyle=p.color;c.strokeStyle='#4e4e30';c.lineWidth=1;
 if(p.type==='building'){
  c.save();c.translate(p.x*k,p.z*k);c.rotate(-p.rotation);
  c.fillRect(-p.width*k/2,-p.depth*k/2,p.width*k,p.depth*k);
  c.strokeRect(-p.width*k/2,-p.depth*k/2,p.width*k,p.depth*k);
  c.strokeStyle='#493923';c.lineWidth=4;
  c.beginPath();c.moveTo(-p.width*k*.16,p.depth*k/2);c.lineTo(p.width*k*.16,p.depth*k/2);c.stroke();
  c.restore();
 }else{c.beginPath();c.arc(p.x*k,p.z*k,Math.max(3,p.r*k),0,TAU);c.fill();c.stroke()}
}
// Minimap follows the new irregular lake outline.
c.fillStyle='#4c92a2';c.strokeStyle='#a4c0ac';c.lineWidth=1.6;c.beginPath();
for(let i=0;i<=84;i++){
 const p=lakePointAt(i/84*TAU,.99,LAKE);
 if(i===0)c.moveTo(p.x*k,p.z*k);else c.lineTo(p.x*k,p.z*k);
}
c.closePath();c.fill();c.stroke();
for(const e of enemies){if(e.dead<=0){
  if(e.trainingDummy){
   const px=e.root.position.x*k,pz=e.root.position.z*k;
   c.fillStyle='#ead6a4';c.strokeStyle='#87502e';c.lineWidth=2.4;
   c.beginPath();c.arc(px,pz,5.1,0,TAU);c.fill();c.stroke();
   c.fillStyle='#a74f36';c.beginPath();c.arc(px,pz,2.15,0,TAU);c.fill();
   continue;
  }
  c.fillStyle=e.boss?'#d33f39':e.aggro?'#b94f35':'#d8c073';
  c.beginPath();c.arc(e.root.position.x*k,e.root.position.z*k,e.boss?5:2.5,0,TAU);c.fill();
  if(e.boss&&state.quest===10){c.strokeStyle='#ffe4b5';c.lineWidth=1.5;c.stroke()}
 }else if(isLootableCorpse(e)){c.fillStyle='#ffe6a0';c.beginPath();c.arc(e.root.position.x*k,e.root.position.z*k,3.8,0,TAU);c.fill()}}if(state.quest<12){c.fillStyle='#fff397';c.font='bold 19px Georgia';c.textAlign='center';c.fillText([2,5,8,11].includes(state.quest)?'?':'!',-1.5*k,-5*k-5)}if(state.quest===4){c.fillStyle='#a6ffeb';c.beginPath();c.arc(35*k,-11.8*k,5,0,TAU);c.fill()}
 const herbalistMapGlyph=herbalistQuestGlyph();
 if(herbalistMapGlyph){c.fillStyle='#ffe087';c.strokeStyle='#382817';c.lineWidth=3;c.font='bold 20px Georgia';c.textAlign='center';c.strokeText(herbalistMapGlyph,8*k,1*k-11);c.fillText(herbalistMapGlyph,8*k,1*k-11)}
 c.restore();drawPartyMapMarkers(c,k);c.save();c.translate(120,120);c.rotate(-hero.root.rotation.y);c.fillStyle='#fff1b5';c.strokeStyle='#463723';c.lineWidth=2;c.beginPath();c.moveTo(0,10);c.lineTo(-6,-7);c.lineTo(0,-3);c.lineTo(6,-7);c.closePath();c.fill();c.stroke();c.restore()}
function updateApproach(dt){
  if(!approach)return 0;
  const task=approach;
  if(!validTargetInRange(task.target)||selected!==task.target||modalKind||gatherCast||state.hp<=0){approach=null;return 0}
  const def=getAbilityDefinition(task.abilityId),range=def?.range||MELEE_RANGE,d=targetDistance(task.target);
  if(d>21){approach=null;if(task.abilityId==='autoAttack')autoAttack=false;combatWarning('Цель слишком далеко',true);return 0}
  if(d<=range-.2){approach=null;if(task.abilityId==='autoAttack')tryAutoSwing();else castAbility(task.abilityId);return 0}
  const tx=task.target.root.position.x-state.x,tz=task.target.root.position.z-state.z,yaw=Math.atan2(tx,tz);
  hero.root.rotation.y=yaw;state.yaw=yaw;
  const step=Math.min(4.05*dt,d-range+.2),ux=tx/d,uz=tz/d,px=state.x,pz=state.z,nx=px+ux*step,nz=pz+uz*step;
  if(clearAt(nx,nz)){state.x=nx;state.z=nz}
  else if(clearAt(nx,pz))state.x=nx;
  else if(clearAt(px,nz))state.z=nz;
  const moved=Math.hypot(state.x-px,state.z-pz);
  task.stuck=moved<.0001?task.stuck+dt:0;
  if(task.stuck>.65){approach=null;if(task.abilityId==='autoAttack')autoAttack=false;combatWarning('Путь к цели перекрыт',true)}
  return moved;
 }
// Shared stick/keyboard axes: manual movement and camera auto-follow must
// agree on precisely when the player is driving the character.
function movementAxes(){
 return {
  x:clamp(joy.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),-1,1),
  y:clamp(joy.y+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup')),-1,1)
 };
}
function movement(dt){
 // Screen-relative 360-degree movement stays unchanged in both camera modes.
 const {x,y}=movementAxes();
 const input=screenMoveVector(x,y,cameraYaw);
 const manual=input.strength>0;
 if(manual&&approach){approach=null;autoAttack=false}
 const approachMoved=!manual&&approach?updateApproach(dt):0;
 const speed=stompElapsed>=0||approachMoved?0:4.05;
 if(manual&&speed>0){
  const yaw=turnTowardsAngle(hero.root.rotation.y,input.heading,dt);
  hero.root.rotation.y=wrapYaw(yaw);state.yaw=hero.root.rotation.y;
  velocityX=input.x*speed*input.strength;
  velocityZ=input.z*speed*input.strength;
 }else{
  // Releasing the joystick stops the actor immediately, not after a drift.
  velocityX=velocityZ=0;
 }
 const prevX=state.x,prevZ=state.z,nx=state.x+velocityX*dt,nz=state.z+velocityZ*dt;
 if(clearAt(nx,nz)){state.x=nx;state.z=nz}
 else if(clearAt(nx,state.z)){state.x=nx;velocityZ=0}
 else if(clearAt(state.x,nz)){state.z=nz;velocityX=0}
 else velocityX=velocityZ=0;
 const travelled=Math.hypot(state.x-prevX,state.z-prevZ)+approachMoved;
 if(travelled>.00005)hero.phase=(hero.phase+travelled/2.67)%1;
 hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);
 animateTauren(hero,clock,dt,clamp(travelled/(dt*4.05||1),0,1),
  daggerPreview&&daggerPreviewAttackElapsed>=0?daggerPreviewAttackElapsed/.8:attackElapsed>=0?attackElapsed/.8:-1,
   stompElapsed>=0?stompElapsed/.75:-1,0);
}
function revive(){hero.blockRemaining=0;cancelGather();lastCombatAt=clock;
 respawnGraceUntil=performance.now()+6000;respawnPending=!!worldConnection?.connected?.();state.hp=playerStats().maxHp;state.resource=normalizeResource(0,state.classId);state.x=initial.x;state.z=initial.z;selected=null;autoAttack=false;approach=null;swingTarget=null;hideCombatWarning();attackElapsed=stompElapsed=-1;attackCooldown=0;autoSwingClock.reset();swingAbilityId='autoAttack';for(const e of enemies){e.aggro=false;}
 worldConnection?.sendRespawn?.();
 clearInput();hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);save();msg('Духи вернули тебя к костру. Твой путь продолжается.',3600)}
function updateEnemy(e,dt){
 if(e.trainingDummy){
  // Independent of wildlife AI; never wander, stun, chase, retaliate or die.
  e.aggro=false;e.stunned=0;e.dead=0;
  e.hit=Math.max(0,e.hit-dt);
  e.root.rotation.z=Math.sin(clock*23)*e.hit*.18;
  updateTrainingTarget(e,clock);
  return;
 }
 if(e.dead>0){
  if(e.boss&&e.nameTag)e.nameTag.visible=false;
  e.dead=Math.max(0,e.dead-dt);e.corpseAge+=dt;
  const fall=smooth(0,CORPSE_FALL_TIME,e.corpseAge);
  // Tilt the whole bird onto the ground instead of instantly hiding it.
  e.root.rotation.z=-1.34*fall;
  e.root.position.y=heightAt(e.root.position.x,e.root.position.z)+.13*fall;
  e.legs[0].rotation.x=-.55*fall;
  e.legs[1].rotation.x=.3*fall;
  advancePlainstriderVisual(THREE,e,dt,0,true);
  animateMobAlert(e,dt);
  if(e.lootMarker.visible){
   e.lootMarker.position.set(e.root.position.x,heightAt(e.root.position.x,e.root.position.z)+1.1+Math.sin(clock*3.6)*.13,e.root.position.z);
  }
  if(e.dead<=0){
   e.dead=0;e.corpseAge=0;e.hp=e.maxHp;e.loot=[];
   e.lootMarker.visible=false;e.root.visible=e.shadow.visible=true;if(e.boss&&e.nameTag)e.nameTag.visible=true;
   e.aggro=false;e.stunned=0;e.attackCd=0;e.attackWindup=0;e.returning=false;e.alertRemaining=0;e.hit=0;
   e.root.rotation.z=0;e.root.scale.setScalar(e.baseScale||1);
   e.legs[0].rotation.x=e.legs[1].rotation.x=0;
   resetPlainstriderVisual(e);
   e.root.position.set(e.spawnX,heightAt(e.spawnX,e.spawnZ),e.spawnZ);
   e.shadow.position.set(e.spawnX,heightAt(e.spawnX,e.spawnZ)+.055,e.spawnZ);
  }
  return;
 }
 e.hit=Math.max(0,e.hit-dt);e.stunned=Math.max(0,e.stunned-dt);e.attackCd=Math.max(0,e.attackCd-dt);e.roamTime+=dt;const p=e.root.position,dist=Math.hypot(state.x-p.x,state.z-p.z);
 // Offline behavior mirrors the world server: notice, pursue, wind up, peck, return.
 if(e.aggro&&Math.hypot(state.x-e.spawnX,state.z-e.spawnZ)>23){
  e.aggro=false;e.returning=true;e.attackWindup=0;e.hp=e.maxHp;
 }
 if(e.returning&&Math.hypot(p.x-e.spawnX,p.z-e.spawnZ)<.65)e.returning=false;
 if(!e.aggro&&!e.returning&&state.hp>0&&
    Math.hypot(state.x-e.spawnX,state.z-e.spawnZ)<=23&&
    dist<(e.boss?9:7)){
  e.aggro=true;e.returning=false;e.alertRemaining=1.05;
 }
 let tx=e.spawnX+Math.sin(e.roamTime*.18+e.index)*2.2,
     tz=e.spawnZ+Math.cos(e.roamTime*.14+e.index)*2.2,speed=.42;
 if(e.returning){tx=e.spawnX;tz=e.spawnZ;speed=1.4}
 if(e.aggro){tx=state.x;tz=state.z;speed=e.boss?1.75:2.1}
 const d=Math.hypot(tx-p.x,tz-p.z),oldX=p.x,oldZ=p.z;
 const face=Math.atan2(tx-p.x,tz-p.z);
 if(e.aggro&&d>.001)
  e.root.rotation.y+=Math.atan2(Math.sin(face-e.root.rotation.y),Math.cos(face-e.root.rotation.y))*(1-Math.exp(-dt*6));
 const reach=e.aggro?(e.boss?2.75:1.75):e.returning?.35:.25;
 if(d>reach&&e.stunned===0&&e.attackWindup<=0){
  const step=Math.min(speed*dt,d-reach),side=e.index%2?-1:1;
  // Probe the actual world colliders before advancing; prefer one side.
  for(const turn of [0,side*.5,side,side*1.5,-side*.5,-side,-side*1.5,side*2,-side*2]){
   const angle=face+turn,sx=Math.sin(angle),sz=Math.cos(angle),probe=Math.min(.8,d-reach);
   if(!clearAt(p.x+sx*step,p.z+sz*step,.36)||
      !clearAt(p.x+sx*probe,p.z+sz*probe,.36))continue;
   p.x+=sx*step;p.z+=sz*step;
   if(!e.aggro)e.root.rotation.y+=Math.atan2(Math.sin(angle-e.root.rotation.y),Math.cos(angle-e.root.rotation.y))*(1-Math.exp(-dt*6));
   break;
  }
 }
 if(e.stunned>0)e.attackWindup=0;
 else if(e.attackWindup>0){
  e.attackWindup-=dt;
  if(e.attackWindup<=0&&e.aggro&&
     Math.hypot(state.x-p.x,state.z-p.z)<(e.boss?3:2.1)){
   lastCombatAt=clock;
   const suffered=incomingDamage(e,e.boss?14:9);
   state.hp-=suffered;
   if(suffered>0)gainClassResource(WARRIOR_RAGE_ON_HURT);
   if(state.hp<=0)revive();
  }
 }else if(e.aggro&&d<(e.boss?3:2.1)&&e.attackCd===0){
  e.attackWindup=.45;e.attackCd=e.boss?1.8:1.5;
 }
 if(e.boss&&e.nameTag){e.nameTag.visible=true;e.nameTag.position.set(p.x,heightAt(p.x,p.z)+4.65,p.z)}
  const moved=Math.hypot(p.x-oldX,p.z-oldZ);e.phase+=moved*4;p.y=heightAt(p.x,p.z);const stride=Math.sin(e.phase),power=Math.min(1,moved/(dt||1));e.legs[0].rotation.x=stride*.48*power;e.legs[1].rotation.x=-stride*.48*power;e.body.position.y=1.23+Math.abs(stride)*.025*power;const recoil=hitReaction(e.hit);
 e.body.rotation.x=(e.attackCd>1.2?Math.sin((1.5-e.attackCd)/.3*Math.PI)*.2:0)-.25*recoil;
 e.body.rotation.z=(e.stunned>0?Math.sin(clock*8)*.08:0)+.13*recoil;
 advancePlainstriderVisual(THREE,e,dt,moved);
 animateMobAlert(e,dt);
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
 // Only auto-rotate after manual movement has stopped. Otherwise holding
 // DOWN creates a feedback loop: hero turns toward camera, camera turns
 // behind hero, and the target heading turns again on the next frame.
 // Camera POSITION still follows the hero during joystick movement.
 if(cameraFollow&&!modalKind){
  cameraFollowCooldown=Math.max(0,cameraFollowCooldown-dt);
  const {x,y}=movementAxes();
  cameraYaw=followCameraYaw(cameraYaw,hero.root.rotation.y,dt,{
   enabled:true,manual:screenMoveVector(x,y,cameraYaw).strength>0,
   orbiting:look.id!==null,cooldown:cameraFollowCooldown
  });
 }
 camTarget.set(state.x,heightAt(state.x,state.z)+2.15,state.z);camFocus.lerp(camTarget,1-Math.exp(-dt*12));camDirection.set(Math.sin(cameraYaw)*Math.cos(cameraPitch),Math.sin(cameraPitch),Math.cos(cameraYaw)*Math.cos(cameraPitch));
 updateInteriors();
 camRay.set(camFocus,camDirection);camRay.far=Math.max(cameraDistance,actualCameraDistance);let distance=camRay.far;
 const blockers=cameraBlockers.filter(mesh=>!mesh.userData.interiorRoof?.inside);
 const hits=camRay.intersectObjects(blockers,false);
 if(hits.length)distance=Math.min(distance,Math.max(1.15,hits[0].distance-.35));
 for(let d=1.1;d<distance;d+=.55){const x=camFocus.x+camDirection.x*d,z=camFocus.z+camDirection.z*d,y=camFocus.y+camDirection.y*d;if(y<heightAt(x,z)+.5){distance=Math.max(1.1,d-.55);break}}
 // Smooth user zoom; approaching an obstacle still retracts the camera immediately.
 actualCameraDistance=Math.min(distance,THREE.MathUtils.damp(actualCameraDistance,Math.min(cameraDistance,distance),8,dt));camera.position.copy(camFocus).addScaledVector(camDirection,actualCameraDistance);camera.position.y=Math.max(camera.position.y,heightAt(camera.position.x,camera.position.z)+.4);camera.lookAt(camFocus);
 sun.position.set(state.x-30,48,state.z+22);sun.target.position.set(state.x,0,state.z);sun.target.updateMatrixWorld();
}
function update(dt){
 clock+=dt;saveClock+=dt;hudClock+=dt;
 hero.blockRemaining=Math.max(0,(hero.blockRemaining||0)-Math.max(0,dt));
 // Tuner preview demonstrates the real dagger attack but never calls combat.
 if(daggerPreview&&daggerPreviewAttackElapsed>=0){
  daggerPreviewAttackElapsed+=dt;
  if(daggerPreviewAttackElapsed>=.8)daggerPreviewAttackElapsed=-1;
 }
 tickAbilityRuntime(abilityRuntime,dt);
 attackCooldown=Math.max(0,attackCooldown-dt);
 stompCooldown=abilityCooldown(abilityRuntime,'thunderStomp');
 if(state.classId==='warrior'&&!inCombat()&&clock-lastCombatAt>5&&state.resource>0){
  state.resource=changeResource(state.resource,-WARRIOR_RAGE_DECAY*dt,state.classId);
 }
 if(attackElapsed>=0){
  attackElapsed+=dt;
  if(attackElapsed>=.34&&!attackLanded){
   attackLanded=true;
   if(isAliveTarget(swingTarget)&&!meleeFailure(swingTarget)){
    const bonus=swingAbilityId==='heavyStrike'?(getAbilityDefinition('heavyStrike').damageBonus||0):0;
    damageEnemy(swingTarget,rollMeleeDamage()+bonus,swingAbilityId);
   }
  }
  if(attackElapsed>=.8){attackElapsed=-1;swingTarget=null;swingAbilityId='autoAttack'}
 }
 if(stompElapsed>=0){stompElapsed+=dt;if(stompElapsed>=.36&&!stompLanded){stompLanded=true;shockAge=0;stompRing.position.set(state.x,heightAt(state.x,state.z)+.08,state.z);if(worldCombatReady)worldConnection.sendAttack('thunderStomp');for(const e of enemies)if(e.dead<=0&&Math.hypot(state.x-e.root.position.x,state.z-e.root.position.z)<4.5){if(!worldCombatReady||e.trainingDummy){if(!e.trainingDummy)e.stunned=2.5;damageEnemy(e,6,'thunderStomp')}}}if(stompElapsed>=.75)stompElapsed=-1}
 if(gatherCast){
  velocityX=velocityZ=0;
  hero.root.position.set(state.x,heightAt(state.x,state.z),state.z);
 }else movement(dt);
 if(state.quest===7&&Math.hypot(state.x-SCOUT_X,state.z-SCOUT_Z)<5.2){
  state.quest=8;save();msg('Следы исполина найдены! Вернись к наставнику.');
 }
 animateRemotePlayers(dt);updateWildlife(dt);
 // Moving away or a mob leaving the 40-metre circle releases the target.
 if(selected&&!isAliveTarget(selected))clearTarget();
 if(gatherCast)updateGatherCast(dt);updateHealthRegen(dt);if(autoAttack&&!gatherCast)tryAutoSwing();animateTauren(mentor,clock+.7,dt);animateTauren(trader,clock+2.4,dt);animateTauren(armorer,clock+1.4,dt);
 lakeVisual.update(clock);
 fire.scale.set(1+Math.sin(clock*7)*.035,1+Math.sin(clock*9)*.1,1);questMarker.position.set(-1.5,heightAt(-1.5,-5)+5.18+Math.sin(clock*2)*.09,-5);herbalistMarker.position.set(8,heightAt(8,1)+5.65+Math.sin(clock*2.1)*.1,1);relic.rotation.y=clock*.45;relic.position.y=heightAt(35,-11.8)+1.3+Math.sin(clock*2)*.1;relicShadow.position.set(35,heightAt(35,-11.8)+.06,-11.8);
 selection.visible=isAliveTarget(selected);
 if(selection.visible){
  selection.position.set(selected.root.position.x,heightAt(selected.root.position.x,selected.root.position.z)+.06,selected.root.position.z);
  selection.material.color.setHex(meleeFailure(selected)?0xd97456:0xe9db84);
  selection.material.opacity=autoAttack?.96:.79;selection.scale.setScalar(selected.boss?1.65:selected.trainingDummy?1.2:1);
 }
 shockAge+=dt;stompRing.visible=shockAge<.6;if(stompRing.visible){stompRing.scale.setScalar(1+shockAge*7);stompRing.material.opacity=(1-shockAge/.6)*.7}
 // Update hotbar overlays through the HUD at ~8 Hz to avoid redundant DOM work on iPhone.
 if(hudClock>.12){hudClock=0;updateHUD();drawMap()}if(saveClock>6){saveClock=0;save()}
}
addEventListener('resize',()=>{positionGroupHud();camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio||1,graphicsPresets[settings.quality].pixelRatio));renderer.setSize(innerWidth,innerHeight);clearInput();resetFps()});
function sampleFps(milliseconds){
 if(!settings.showFps||modalKind||document.hidden||milliseconds<=0)return;
 // Use real frame time: the physics timestep is capped and would overstate low FPS.
 fpsElapsed+=milliseconds;fpsFrames++;
 if(fpsElapsed>=1000){fpsCounter.textContent='FPS '+Math.round(fpsFrames*1000/fpsElapsed);fpsElapsed=fpsFrames=0}
}
let last=performance.now();function frame(t){const milliseconds=Math.max(0,t-last),dt=Math.min(milliseconds/1000,.05);last=t;if(!document.hidden){if(!modalKind)update(dt);else updateOnlineSceneWhileMenuOpen(dt);animateCamera(dt);combatFeedback.update(dt);renderCharacterPreview(t,dt);renderer.render(scene,camera);sampleFps(milliseconds)}requestAnimationFrame(frame)}
update(0);updateHUD();drawMap();animateCamera(1);renderer.render(scene,camera);requestAnimationFrame(frame);$('loader').remove();
if(state.quest===0)msg('Мулгор. Поговори с наставником у большого тотема.',4400);
}catch(error){const text=$('loadText');if(text)text.textContent='Ошибка запуска: '+String(error.message||error);throw error}


