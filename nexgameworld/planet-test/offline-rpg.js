// Offline spherical NexGame systems. Use the unchanged production rules for items,
// abilities, hotbar, loot and dummy statistics; do not connect to multiplayer or saves.
import {HOTBAR_ART,HOTBAR_SHORT} from './native-hotbar-art.js?v=1';
import {ITEM_CATALOG,MERCHANT_STOCK,deriveStats,itemStackLimit} from '../items.js?v=0.3.5.17';
import {getAbilityDefinition,createAbilityRuntime,tickAbilityRuntime,abilityFailure,activateAbility,changeResource,WARRIOR_RAGE_ON_HURT,WARRIOR_RAGE_DECAY} from '../skills.js?v=0.3.5';
import {DEFAULT_HOTBAR,normalizeHotbar,assignHotbarSlot,availableHotbarActions,actionDefinition} from '../hotbar.js?v=0.3.5.3';
import {TRAINING_DUMMY,createTrainingStats,applyTrainingHit,updateTrainingTarget} from '../training.js?v=0.3.5.1';
import {PLAINSTRIDER_REQUIRED_CLIPS,validatePlainstriderGltf,advancePlainstriderVisual,resetPlainstriderVisual,PLAINSTRIDER_VISUAL_SCALE} from '../plainstrider-model.js?v=0.3.7.0';
import {AXE_TUNER_DEFAULTS} from '../axe-tuner.js?v=0.3.7.0';
import {SWORD_TUNER_DEFAULTS} from '../sword-tuner.js?v=0.3.7.0';
import {DAGGER_TUNER_DEFAULTS} from '../dagger-tuner.js?v=0.3.7.0';
import {SHIELD_TUNER_DEFAULTS} from '../shield-tuner.js?v=0.3.7.0';
import {GATHER_QUESTS,OFFLINE_CHEST,createGatherWorld} from './gather-world.js?v=9';
import {createCampActions} from './camp-actions.js?v=11';
import {OFFLINE_RPG_SAVE_KEY,clearOfflineProgress} from './progress-reset.js?v=1';
import {HIT_REACTION_SECONDS} from '../combat-feedback.js?v=0.3.7.0';
import {createSphereCombatFeedback} from './sphere-combat-feedback.js?v=1';
import {createSphericalCombatVfx} from './sphere-combat-vfx.js?v=1';
import {createQuestMarkerFactory} from './quest-markers.js?v=3';
import {cycleHostileTarget,nearbyInteractable} from './interaction-targeting.js?v=7';
import {sphereFacingYaw,turnSphereYaw,sphereFacingError} from './mob-facing.js?v=1';
import {BOSS_POSITION,SCOUT_POSITION,RELIC_POSITION,QUEST_LINES,mentorChainNumber,mentorGlyph,mentorJournalRows,migrateMentorQuest,createMentorChain} from './mentor-chain.js?v=1';
import {createMentorWorld} from './mentor-world.js?v=1';
import {createSphericalTargetRing} from './spherical-target-ring.js?v=1';
import {animateSphericalTauren} from './tauren-animation.js?v=3';
import {incomingShieldHit,sphericalMeleeFacing} from './sphere-combat.js?v=2';
import {createCombatTimeline,MELEE_RANGE,APPROACH_RANGE,rageForHit,rollMeleeDamage} from './combat-timeline.js?v=1';
import {equipmentGrip,applyEquipmentTransform} from './equipment-grip.js?v=1';
import {EQUIPMENT_LABELS,equipFromBag,unequipToBag} from './equipment-rules.js?v=1';
import {applyWeaponQuality,itemRarity,QUALITY_VISUALS,highestLootRarity} from '../item-quality.js?v=0.3.7.1';
import {styleShieldGlb} from '../shield-assets.js?v=0.3.7.1';
import {canWalkCamp} from './sphere-physics.js?v=3';
import {canWadeAtLocal} from './start-zone.js?v=20';
import {moveMobToward,mobSegmentClear} from './mob-navigation.js?v=1';
import {createSphericalStomp} from './sphere-skill-effects.js?v=1';
import {createMobDeath} from './mob-death.js?v=2';
import {NORMAL_MOB_RESPAWN_SECONDS,advanceCorpseTimer,advanceRespawnTimer,canStoreCorpseRow,takeCorpseRow,takeAllCorpseRows} from './corpse-loot.js?v=4';
import {rollCreatureLoot} from './loot-tables.js?v=1';
import {sellInventorySlot,buyBackFromMerchant,restoreBuyback} from './merchant-trade.js?v=1';

const UP_AXIS=[0,1,0], TAU=Math.PI*2;
const SPAWNS=[[-9,-23],[1,-28],[13,-22],[21,-33],[-22,-35],[-28,29],[15,36],[48,9]];
const SAVE_KEY=OFFLINE_RPG_SAVE_KEY;
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const xpRequired=level=>100+(level-1)*50;
const pretty=num=>Number(num).toLocaleString('ru-RU',{maximumFractionDigits:1});
const LABEL=EQUIPMENT_LABELS;
const EQUIP_SLOTS=['weapon','shield','head','chest','legs','hands','waist','wrists','feet'];
const ICON={autoAttack:'⚔️',thunderStomp:'💥',heavyStrike:'🪓',healingPotion:'🧪'};
const initial=()=>({level:1,xp:0,gold:30,resource:0,hp:null,inventory:[{id:'wornAxe',qty:1},{id:'healingPotion',qty:3}],equipment:{},kills:0,quest:0,gatherStage:0,gatherAvailable:false,chestInventory:[],buyback:[],hotbar:DEFAULT_HOTBAR});
function restore(){
 try {
  const raw=JSON.parse(localStorage.getItem(SAVE_KEY));
  if(!raw||typeof raw!=='object')return initial();
  const safe=initial();
  safe.level=clamp(Math.floor(Number(raw.level)||1),1,60);
  safe.xp=clamp(Math.floor(Number(raw.xp)||0),0,999999);
  safe.gold=clamp(Math.floor(Number(raw.gold)||0),0,999999);
  safe.resource=clamp(Number(raw.resource)||0,0,100);
  safe.hp=raw.hp==null?null:Math.max(1,Number(raw.hp)||1);
  safe.kills=clamp(Math.floor(Number(raw.kills)||0),0,3);
  safe.quest=migrateMentorQuest(raw.quest);
  safe.gatherStage=clamp(Math.floor(Number(raw.gatherStage)||0),0,4);
  safe.gatherAvailable=!!raw.gatherAvailable&&safe.gatherStage>=2&&safe.gatherStage<=3;
  safe.chestInventory=Array.isArray(raw.chestInventory)?
   raw.chestInventory.slice(0,OFFLINE_CHEST.slots).filter(entry=>entry&&(ITEM_CATALOG[entry.id]||entry.id==='healingPotion')&&Number.isFinite(entry.qty)&&entry.qty>0)
    .map(entry=>({id:entry.id,qty:clamp(Math.floor(entry.qty),1,itemStackLimit(entry.id))})):[];
  safe.inventory=Array.isArray(raw.inventory)?raw.inventory.slice(0,12).filter(x=>x&&
   (ITEM_CATALOG[x.id]||x.id==='healingPotion')&&Number.isFinite(x.qty)&&x.qty>0).map(x=>({id:x.id,qty:Math.min(itemStackLimit(x.id),Math.floor(x.qty))})):safe.inventory;
  safe.equipment={};
  for(const slot of EQUIP_SLOTS){const id=raw.equipment?.[slot]?.id;if(ITEM_CATALOG[id]?.slot===slot)safe.equipment[slot]={id};}
  safe.hotbar=normalizeHotbar(raw.hotbar,'warrior',safe.level);
  safe.buyback=restoreBuyback(raw.buyback);
  return safe;
 }catch{return initial();}
}
export function createOfflineRpg({THREE,scene,hero,makeTauren,playerNormal,getRadius,toNormal,toLocal,heightAt,camera,canvas,preview=false}){
 const state=preview?initial():restore(),runtime=createAbilityRuntime();
 const rightHand=hero.arms[1]?.hand,leftHand=hero.arms[0]?.hand;
 const modelSlots={weapon:null,shield:null};
 hero.root.userData.equipmentGrip={weapon:equipmentGrip('weapon'),shield:equipmentGrip('shield')};
 hero.root.userData.weaponKind='none';
 const modelLoader=import('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js')
  .then(({GLTFLoader})=>new GLTFLoader()).catch(()=>null);
 let visualRequest=0;
 async function updateEquipmentVisuals(){
  const request=++visualRequest;
  const weaponDef=ITEM_CATALOG[state.equipment.weapon?.id];
  const shieldDef=ITEM_CATALOG[state.equipment.shield?.id];
  const weaponKind=weaponDef?.weaponKind||null;
  const shieldKind=shieldDef?.rarity==='uncommon'||shieldDef?.rarity==='rare'?'kite':shieldDef?'round':null;
  hero.root.userData.weaponKind=weaponKind||'none';
  hero.root.userData.equipmentGrip={weapon:equipmentGrip('weapon'),shield:equipmentGrip('shield')};
  for(const [slot,model] of Object.entries(modelSlots)){
   if(model){model.removeFromParent();modelSlots[slot]=null;}
  }
  if(rightHand)rightHand.rotation.set(-Math.PI/2,0,0);
  if(leftHand)leftHand.rotation.set(Math.PI,0,0);
  const loader=await modelLoader;if(!loader||request!==visualRequest)return;
  const desired=[];
  if(weaponKind&&rightHand){
   const data={axe:['tauren-axe-v0.1.glb',AXE_TUNER_DEFAULTS,'axe'],sword:['plains-sword-v0.1.glb',SWORD_TUNER_DEFAULTS,'sword'],dagger:['steppe-dagger-v0.1.glb',DAGGER_TUNER_DEFAULTS,'dagger']}[weaponKind];
   if(data)desired.push(['weapon','../assets/weapons/'+data[0],data[1],data[2],rightHand]);
  }
  if(shieldKind&&leftHand){
   const name=shieldKind==='kite'?'nexgame_kite_shield_quality.glb':'nexgame_round_shield_poor.glb';
   desired.push(['shield','../assets/shields/'+name,SHIELD_TUNER_DEFAULTS[shieldKind],shieldKind,leftHand]);
  }
  for(const [slot,url,tuning,kind,hand] of desired){
   try{
    const gltf=await loader.loadAsync(url);
    if(request!==visualRequest)return;
    const mesh=gltf.scene;mesh.name='gear-'+(slot==='shield'?'shield':kind);
    const def=slot==='weapon'?weaponDef:shieldDef;
    const grip=applyEquipmentTransform(mesh,hand,{slot,kind,tuning,sourceId:def?.sourceId});
    hand.add(mesh);modelSlots[slot]=mesh;
    hero.root.userData.equipmentGrip[slot]=grip;
    if(slot==='weapon')applyWeaponQuality(THREE,hero.root,kind,weaponDef?.rarity);
    if(slot==='shield')styleShieldGlb(THREE,mesh,shieldDef?.rarity);
   }catch(err){console.warn('Planet equipment model unavailable',url,err);}
  }
 }

 let target=null,autoplay=false,swing=0,clock=0,messageUntil=0,pendingLoot=null,chooseSlot=-1,gatherCast=null,
  blockRemaining=0,approach=null;
 const timeline=createCombatTimeline();
 let lastCombatAt=-100;
 function inCombat(){
  const current=timeline.current;
  const swinging=current&&current.skill!=='thunderStomp'&&isLivingHostile(current.target);
  const preparingStomp=current?.skill==='thunderStomp'&&!current.impacted&&[...mobs,dummy].some(e=>isLivingHostile(e)&&distance(e)<4.5);
  return swinging||preparingStomp||mobs.some(m=>m.root.visible&&m.hp>0&&!m.corpse&&m.aggro);
 }
 let journalTab='current',merchantTab='buy';
 const group=new THREE.Group();scene.add(group);
 // The mesh is bent vertex-by-vertex onto the actual spherical terrain:
 // no texture intersection/z-fighting and a saturated red outline.
 const targetRing=createSphericalTargetRing({THREE,parent:group,getRadius,toNormal,heightAt});
 const stompEffect=createSphericalStomp({THREE,parent:group,getRadius,heightAt});
 const up=new THREE.Vector3(...UP_AXIS),anchorQuat=new THREE.Quaternion(),spinQuat=new THREE.Quaternion();
 const mobs=[],entities=[],citizens=[];
 let multiplayer=null,partyState={groupId:null,leaderId:null,members:[]},onlinePlayers=[],onlineChest=null;
 const receivedCredits=new Set();
 const isOnline=()=>!!multiplayer?.connected;
 function setMultiplayer(transport){multiplayer=transport||null;}
 function networkCharacter(){return {level:state.level,hp:state.hp,equipment:state.equipment};}
 function onOnlinePlayers(rows){onlinePlayers=Array.isArray(rows)?rows:[];if(!modal.hidden&&modal.dataset.kind==='party')renderModal();}
 function onPartyState(event){partyState=event||{groupId:null,leaderId:null,members:[]};if(!modal.hidden&&modal.dataset.kind==='party')renderModal();}
 function onPartyInvite(event){
  if(isOnline())multiplayer.respondInvite(event.fromId,window.confirm((event.fromName||'Игрок')+' приглашает в группу. Принять?'));
 }
 function onPartyNotice(event){if(event?.message)msg(event.message);}
 function onChat(event){if(event?.text)msg((event.channel==='party'?'[Группа] ':'[Мир] ')+(event.name||'Игрок')+': '+event.text,3.3);}
 function onChestState(event){onlineChest=event;if(!modal.hidden&&modal.dataset.kind==='chest')renderModal();}
 function onChestResult(event){
  if(event?.ok&&Array.isArray(event.inventory)){
   state.inventory=event.inventory.filter(Boolean).map(row=>({id:row.id,qty:row.qty}));
   onlineChest={slots:event.slots,revision:event.revision};persist();draw();
   if(!modal.hidden&&modal.dataset.kind==='chest')renderModal();
  }else if(event?.reason)msg(event.reason);
 }
 function onVitals(event){
  if(!isOnline())return;
  if(Number.isFinite(event.hp))state.hp=Math.max(0,Math.min(stats().maxHp,event.hp));
  if(Number.isFinite(event.resource))state.resource=clamp(event.resource,0,100);
 }
 function onCombatEvent(event,selfId){
  const mob=mobs.find(e=>e.index===Number(String(event?.mobId).split('-').at(-1)));
  if(!mob||event.life!==mob.life)return;
  if(Number.isFinite(event.hp))mob.hp=Math.max(0,event.hp);
  mob.hit=HIT_REACTION_SECONDS;
  combatFeedback.hit(mob,event.damage,event.abilityId);
  combatVfx.trigger(mob,event.abilityId==='heavyStrike'?'strong':event.abilityId==='thunderStomp'?'stomp':'hit');
  if(event.fromId===selfId)lastCombatAt=clock;
  draw(false);
 }
 function onKillCredit(event){
  const mob=mobs.find(e=>e.index===Number(String(event?.mobId).split('-').at(-1)));
  if(!mob||!Number.isInteger(event.life))return;
  const key=event.mobId+':'+event.life;
  if(receivedCredits.has(key))return;
  receivedCredits.add(key);
  mob.loot=Array.isArray(event.loot)?event.loot.filter(row=>row&&ITEM_CATALOG[row.id]&&Number.isInteger(row.qty)&&row.qty>0).map(row=>({...row})):[];
  state.xp+=Number(event.xp)||0;state.gold+=Number(event.gold)||0;
  mentorChain.killed(mob);levelCheck();persist();updateLootMarker(mob);draw();
  msg('Награда за '+mob.name+': опыт '+(Number(event.xp)||0));
 }
 function onMobAttack(event){
  if(!isOnline())return;
  if(Number.isFinite(event.hp))state.hp=Math.max(0,event.hp);
  if(event.blocked){blockRemaining=.65;hero.root.userData.blockRecoil=.65;combatVfx.trigger({root:hero.root},'block');}
  state.resource=changeResource(state.resource,5,'warrior');lastCombatAt=clock;draw(false);
 }
 function onNetworkRespawn(event){
  state.hp=Number(event.hp)||stats().maxHp;state.resource=0;
  autoplay=false;approach=null;timeline.clear();target=null;
  for(const mob of mobs)mob.aggro=false;
  resetPosition?.();updateSelection();persist();draw();msg('Герой возродился у костра');
 }
 function onMobSnapshot(rows){
  if(!isOnline()||!Array.isArray(rows))return;
  const byIndex=new Map(rows.filter(x=>Number.isInteger(x.index)).map(x=>[x.index,x]));
  for(const mob of mobs){
   const remote=byIndex.get(mob.index);
   if(!remote||!['alive','corpse','hidden'].includes(remote.phase)||
    !Number.isFinite(remote.x)||!Number.isFinite(remote.z)||!Number.isFinite(remote.hp))continue;
   const oldX=mob.x,oldZ=mob.z,wasCorpse=mob.corpse,wasHidden=!mob.root.visible;
   mob.x=remote.x;mob.z=remote.z;mob.yaw=remote.yaw||0;
   mob.networkMovement=Math.hypot(oldX-mob.x,oldZ-mob.z);
   mob.hp=remote.hp;mob.life=remote.life;mob.aggro=remote.aggro===true;mob.returning=false;
   mob.corpse=remote.phase==='corpse';mob.dead=mob.corpse?6:0;
   mob.root.visible=remote.phase!=='hidden';
   if(mob.corpse&&!wasCorpse){
    mob.deathAnimation.begin(playerNormal());
    if(target===mob){target=null;autoplay=false;approach=null;timeline.clear();}
   }else if(remote.phase==='alive'&&(wasCorpse||wasHidden)){
    mob.deathAnimation.reset();resetPlainstriderVisual(mob);
    mob.loot=null;mob.navigation=null;
   }else if(remote.phase==='hidden'){
    mob.loot=null;if(pendingLoot===mob)closeWindow();
   }
   setModelAt(mob);updateLootMarker(mob);
  }
 }
 const hotbar=$('actionsBar'),modal=$('modal'),toast=$('toast');
 const feedbackLayer=$('combatFeedback');
 if(!feedbackLayer)throw Error('Отсутствует слой чисел урона');
 const combatFeedback=createSphereCombatFeedback({THREE,document,camera,layer:feedbackLayer});
  const combatVfx=createSphericalCombatVfx({THREE,parent:scene});
  const questMarkers=createQuestMarkerFactory(THREE,{document,camera});
 const nameEl=$('playerName'),objective=$('qtext');
 const originalControls=$('labSettingsSources');
 const settingsControls=[...originalControls.children];
 if(!hotbar||!modal||!toast||!nameEl||!$('playerFrame')||!$('minimap'))throw Error('Не загружен оригинальный интерфейс NexGame');
 const bind=(el,ev,fn)=>el.addEventListener(ev,fn);
 const stats=()=>deriveStats(state.level,state.equipment);
 if(state.hp==null)state.hp=stats().maxHp;
 function persist(){if(preview)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(state))}catch{}}
 function msg(text,seconds=2.35){
  toast.textContent=text;toast.hidden=false;toast.classList.add('show');
  messageUntil=clock+Math.min(4,Math.max(1,seconds));
 }
 function setModelAt(entity){
  const normal=toNormal(entity.x,entity.z,getRadius());
  entity.root.position.copy(normal).multiplyScalar(getRadius()+heightAt(normal)+.09);
  anchorQuat.setFromUnitVectors(up,normal);
  entity.root.quaternion.copy(anchorQuat).multiply(spinQuat.setFromAxisAngle(up,entity.yaw||0));
 }
 // Identical native NexGame spriteText typography and palette, no backdrop.
 function makeLabel(name,color='#f9df91',size=32){
  const canvasLabel=document.createElement('canvas');canvasLabel.width=512;canvasLabel.height=96;
  const ctx=canvasLabel.getContext('2d');
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+size+'px Georgia';
  ctx.lineWidth=5;ctx.strokeStyle='#302817';ctx.fillStyle=color;
  ctx.strokeText(String(name).slice(0,42),256,48);
  ctx.fillText(String(name).slice(0,42),256,48);
  const texture=new THREE.CanvasTexture(canvasLabel);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false,transparent:true}));
  sprite.scale.set(4.3,.81,1);
  return sprite;
 }
 function npc(kind,x,z,name){
  const root=new THREE.Group();root.name='planet-'+kind;group.add(root);
  // Full procedurally modelled Tauren identical to the playable hero.
  // Match the original NexGame NPC materials and scale.
  const looks={
   mentor:{fur:0x725438,clothColor:0x427b70,scale:.95},
   vendor:{fur:0x665043,clothColor:0x987046,scale:.94},
   herbalist:{fur:0x978064,clothColor:0x9d7d50,scale:.89}
  };
  const appearance=looks[kind]||looks.mentor;
  const npcActor=makeTauren(appearance);
  npcActor.root.scale.setScalar(appearance.scale);
  root.add(npcActor.root);
  const tag=makeLabel(name,'#d9e2a1',25);tag.position.y=4.45;root.add(tag);
  const e={kind,name,x,z,yaw:.2,root,radius:1.5,actor:npcActor};entities.push(e);citizens.push(e);setModelAt(e);return e;
 }
 const mentor=npc('mentor',-1.5,-5,'Наставник Каменный Рог');
 for(const glyph of ['!','?','·'])mentor.root.add(questMarkers.create(glyph,5.55));
 const vendor=npc('vendor',6,11,'Борун Крепкая Ладонь');
 const merchantLabel=makeLabel('Оружие и доспехи','#e5c574',23);
 merchantLabel.position.y=3.85;vendor.root.add(merchantLabel);
 const herbalist=npc('herbalist',8,1,'Травница Тихая Заря');
 for(const glyph of ['!','?','·'])herbalist.root.add(questMarkers.create(glyph,5.58));
 // Shared radial ground-shadow texture. Only one transparent plane per mob.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
 const shadowContext=shadowCanvas.getContext('2d');
 const shadowGradient=shadowContext.createRadialGradient(32,32,2,32,32,32);
 shadowGradient.addColorStop(0,'rgba(12,24,16,0.36)');
 shadowGradient.addColorStop(.5,'rgba(12,24,16,0.22)');
 shadowGradient.addColorStop(1,'rgba(12,24,16,0)');
 shadowContext.fillStyle=shadowGradient;shadowContext.fillRect(0,0,64,64);
 const shadowTexture=new THREE.CanvasTexture(shadowCanvas);
 const shadowGeometry=new THREE.PlaneGeometry(2.7,2.3);
 const shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,side:THREE.DoubleSide});
 function addContactShadow(parent,scale=1){
  const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.06;
  shadow.scale.setScalar(scale);shadow.renderOrder=1;parent.add(shadow);
  return shadow;
 }
 function createBird(x,z,i){
  const root=new THREE.Group();group.add(root);
  const contactShadow=addContactShadow(root);
  const fallback=new THREE.Group();fallback.name='dolgonog-fallback';root.add(fallback);
  const mat=new THREE.MeshStandardMaterial({color:i%2?'#917044':'#826649',roughness:1});
  const body=new THREE.Mesh(new THREE.SphereGeometry(1,12,9),mat);
  body.scale.set(.58,.48,.8);body.position.y=1.25;fallback.add(body);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.13,.19,.9,7),mat);neck.position.set(0,1.83,.57);neck.rotation.x=.45;fallback.add(neck);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.28,9,7),mat);head.position.set(0,2.25,.74);fallback.add(head);
  const beak=new THREE.Mesh(new THREE.ConeGeometry(.18,.5,7),new THREE.MeshStandardMaterial({color:'#d5b16f'}));
  beak.rotation.x=Math.PI/2;beak.position.set(0,2.17,1.1);fallback.add(beak);
  for(const side of [-1,1]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.08,.075,1.2,6),mat);leg.position.set(side*.25,.6,0);fallback.add(leg);}
  const entity={kind:'mob',index:i,name:'Равнинный долгоног',lootId:'dolgonog',root,x,z,yaw:.1,
   spawnX:x,spawnZ:z,hp:54,maxHp:54,aggro:false,attackCd:1.2,stun:0,dead:0,loot:null,corpse:false,
   respawn:0,returning:false,walk:0,visual:null,hit:0,attackWindup:0,alertRemaining:0,corpseAge:0,boss:false,contactShadow,roamTime:i*1.73,navigation:null};
  const tag=makeLabel(entity.name,'#f9df91',26);tag.position.y=4.25;root.add(tag);entity.nameTag=tag;
  const alertTag=makeLabel('!','#ffc978',78);
  alertTag.position.y=4.95;alertTag.scale.set(1.55,1.4,1);alertTag.visible=false;
  root.add(alertTag);entity.alertTag=alertTag;
  const lootMarker=makeLabel('◆','#ffffff',68);
  lootMarker.position.y=1.58;lootMarker.scale.set(1.3,1.06,1);
  lootMarker.material.opacity=.95;lootMarker.visible=false;
  root.add(lootMarker);entity.lootMarker=lootMarker;
  entity.fallbackVisual=fallback;
  entity.deathAnimation=createMobDeath({THREE,entity,visual:fallback,getRadius,heightAt});
  mobs.push(entity);entities.push(entity);setModelAt(entity);return entity;
 }
 SPAWNS.forEach(([x,z],i)=>createBird(x,z,i));
 // The original Narache elite uses the same GLB at 1.8× scale.
 const giant=createBird(BOSS_POSITION.x,BOSS_POSITION.z,mobs.length);
 giant.name='Грозоклюв — огромный долгоног';giant.boss=true;giant.lootId='stormbeak';
 giant.hp=giant.maxHp=108;giant.root.scale.setScalar(1.8);
 const oldTag=giant.root.children.find(child=>child.isSprite&&child!==giant.alertTag);
 if(oldTag)oldTag.visible=false;
 const bossTag=makeLabel('Грозоклюв · Исполин','#f9bd91',27);
 bossTag.position.y=3.4;bossTag.scale.set(4.7,.84,1);
 giant.root.add(bossTag);giant.nameTag=bossTag;giant.alertTag.position.y=4.0;
 const dummyRoot=new THREE.Group();group.add(dummyRoot);addContactShadow(dummyRoot,1.1);
 const straw=new THREE.MeshStandardMaterial({color:'#bb9665',roughness:1});
 const dummyBody=new THREE.Mesh(new THREE.CylinderGeometry(.56,.63,2.2,12),straw);
 dummyBody.position.y=1.45;dummyRoot.add(dummyBody);
 for(const s of [-1,1]){const arm=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,1.65,8),straw);arm.rotation.z=Math.PI/2;arm.position.set(s*.7,2.2,0);dummyRoot.add(arm);}
 const dummyTag=makeLabel(TRAINING_DUMMY.name,'#f4dfa6',26);dummyTag.position.y=4.04;dummyTag.scale.set(4.7,.82,1);dummyRoot.add(dummyTag);
 const dummy={kind:'dummy',name:TRAINING_DUMMY.name,root:dummyRoot,x:TRAINING_DUMMY.x,z:TRAINING_DUMMY.z,
  yaw:0,trainingDummy:true,maxHp:TRAINING_DUMMY.maxHp,hp:TRAINING_DUMMY.maxHp,trainingStats:createTrainingStats()};
 entities.push(dummy);setModelAt(dummy);
 // Preserve original locations in metres and project every mesh onto the sphere.
 const gathering=createGatherWorld({THREE,parent:group,place:e=>{entities.push(e);setModelAt(e);}});
 const gatherNodes=gathering.nodes;
 const chestLabel=makeLabel('Общий сундук · 18','#ffe0a0',24);
 chestLabel.position.y=5.4;gathering.chest.root.add(chestLabel);
 const mentorWorld=createMentorWorld({THREE,parent:group,
  place:e=>{entities.push(e);setModelAt(e);},getRadius,toNormal,heightAt});
 // Use the exact approved longstrider model and clips when the shared GLB loads.
 // Procedural fallback remains available if the CDN or asset fails.
 void (async()=>{
  try{
   const loader=await modelLoader;
   if(!loader)throw Error('GLTFLoader unavailable');
   const asset=await loader.loadAsync('../bestiary/models/dolgonog-v0.1.glb?v=0.3.5.43');
   if(!validatePlainstriderGltf(asset))throw Error('Unexpected Dolgonog clips');
   for(const mob of mobs){
    // Never swap an already falling/settled corpse to a freshly loaded rig.
    if(mob.corpse)mob.pendingBirdAsset=asset;
    else attachBirdVisual(mob,asset);
   }
  }catch(err){console.warn('Planet offline Dolgonog fallback:',err);}
 })();
 function attachBirdVisual(mob,asset){
  // A deferred GLB swap after respawn must replace, not overlay, the previous rig.
  if(mob.birdVisual){
   mob.birdVisual.mixer.stopAllAction();
   mob.birdVisual.container.removeFromParent();
   mob.birdVisual=null;
  }
  const bird=asset.scene.clone(true);
  const container=new THREE.Group();container.name='dolgonog-original-v0.1';
  container.scale.setScalar(PLAINSTRIDER_VISUAL_SCALE);
  container.add(bird);mob.root.add(container);mob.fallbackVisual.visible=false;
  bird.traverse(obj=>{if(obj.isMesh){obj.castShadow=/^(Body|Head|Neck|Wing)/.test(obj.name);obj.receiveShadow=false;}});
  const mixer=new THREE.AnimationMixer(bird);
  const actions=Object.fromEntries(PLAINSTRIDER_REQUIRED_CLIPS.map(k=>[k,mixer.clipAction(asset.animations.find(a=>a.name===k))]));
  mob.birdVisual={container,bird,mixer,actions,mode:null,walkGrace:0,attackRemaining:0,lastAttackCd:mob.attackCd};
  mob.deathAnimation=createMobDeath({THREE,entity:mob,visual:container,getRadius,heightAt,mixer});
  advancePlainstriderVisual(THREE,mob,1/60,0,false);
 }
 // Smooth original NexGame GLB Idle, Walk, Peck and hit reactions.
 function birdAnimation(mob,dt,moved=0){
  if(mob.birdVisual&&!mob.corpse)advancePlainstriderVisual(THREE,mob,dt,moved,false);
 }
 function player(){return toLocal(playerNormal(),getRadius());}
 function distance(entity){
  const a=playerNormal(),b=toNormal(entity.x,entity.z,getRadius());
  return getRadius()*Math.acos(clamp(a.dot(b),-1,1));
 }
 // Align target positions with the character's real forward direction (+Z)
 // in the tangent plane of the planet; camera rotation is irrelevant.
 const aimForward=new THREE.Vector3(),aimTarget=new THREE.Vector3();
 function targetFacingAlignment(entity){
  const normal=playerNormal(),other=toNormal(entity.x,entity.z,getRadius());
  aimTarget.copy(other).addScaledVector(normal,-other.dot(normal));
  if(aimTarget.lengthSq()<1e-12)return NaN;
  aimForward.set(0,0,1).applyQuaternion(hero.root.quaternion);
  aimForward.addScaledVector(normal,-aimForward.dot(normal));
  if(aimForward.lengthSq()<1e-12)return NaN;
  return clamp(aimForward.normalize().dot(aimTarget.normalize()),-1,1);
 }
 function updateSelection(){targetRing.update(target);}
 function addItem(id,qty=1){
  if(!ITEM_CATALOG[id]&&id!=='healingPotion')return false;
  // Reject the complete stack before any mutation; partial additions duplicate loot.
  if(!canStoreCorpseRow(state.inventory,{id,qty},itemStackLimit,12))return false;
  const cap=itemStackLimit(id);
  let left=qty;
  for(const slot of state.inventory){if(slot.id===id&&slot.qty<cap){const n=Math.min(left,cap-slot.qty);slot.qty+=n;left-=n;}}
  while(left>0&&state.inventory.length<12){const n=Math.min(left,cap);state.inventory.push({id,qty:n});left-=n;}
  persist();return left===0;
 }
 function takeItem(id,qty=1){
  let remaining=qty;
  for(let i=state.inventory.length-1;i>=0&&remaining>0;i--){
   const item=state.inventory[i];if(item.id!==id)continue;
   const n=Math.min(remaining,item.qty);item.qty-=n;remaining-=n;
   if(!item.qty)state.inventory.splice(i,1);
  }
  if(remaining===0)persist();return remaining===0;
 }
 const itemCount=id=>state.inventory.filter(x=>x.id===id).reduce((sum,x)=>sum+x.qty,0);
 const camp=createCampActions({state,herbalist,gathering,mobs,hero,distance,addItem,takeItem,
  itemCount,persist,levelCheck,draw,openWindow,closeWindow,msg,getClock:()=>clock});
 const mentorChain=createMentorChain({state,persist,levelCheck,closeWindow,draw,msg});
 function finishEquipmentChange(slot){
  if(slot!=='weapon'){autoplay=false;approach=null;timeline.clear();swing=0;}
  persist();draw();void updateEquipmentVisuals();
 }
 function equip(id){
  const result=equipFromBag(state,id,inCombat());
  if(!result.ok)return msg(result.error);
  finishEquipmentChange(result.slot);msg('Надето: '+ITEM_CATALOG[id].name);
 }
 function updateLootMarker(mob){
  if(!mob?.lootMarker)return;
  const available=mob.corpse&&!mob.dying&&mob.root.visible&&mob.loot?.length>0;
  mob.lootMarker.visible=!!available;
  if(!available)return;
  const rarity=highestLootRarity(mob.loot,ITEM_CATALOG);
  mob.lootMarker.material.color.setHex(QUALITY_VISUALS[rarity].marker);
  mob.lootMarker.userData.rarity=rarity;
 }
 function showCorpseLoot(mob){
  if(!mob?.corpse||!mob.root.visible)return msg('Тело уже исчезло');
  if(mob.dying)return msg('Дождись, пока тело опустится на землю');
  if(distance(mob)>3.1)return msg('Подойди к телу ближе');
  if(!mob.loot?.length)return msg('На теле ничего нет');
  pendingLoot=mob;openWindow('loot');
 }
 function finishCorpseLoot(mob){
  // Looting never removes the body or starts/restarts its respawn clock.
  mob.loot=[];updateLootMarker(mob);
  if(target===mob){target=null;autoplay=false;updateSelection();}
  closeWindow();draw();
 }
 function lootNotice(message){
  const label=$('mbody').querySelector('.planet-loot-notice');
  if(label)label.textContent=message;
  else msg(message);
 }
 function corpseLootServices(){
  return {inventory:state.inventory,stackLimit:itemStackLimit,store:addItem,slotCount:12};
 }
 function takeLootFromCorpse(mob,index){
  if(pendingLoot!==mob||modal.hidden||modal.dataset.kind!=='loot')return;
  if(distance(mob)>3.1)return msg('Подойди к телу ближе');
  const result=takeCorpseRow(mob,index,corpseLootServices());
  if(!result.ok)return lootNotice(result.reason==='full'?'Рюкзак заполнен — предмет остался в теле':'Добыча недоступна');
  updateLootMarker(mob);
  const def=ITEM_CATALOG[result.item.id];
  const received='Получено: '+(def?.name||result.item.id)+(result.item.qty>1?' ×'+result.item.qty:'');
  if(!result.remaining){finishCorpseLoot(mob);msg(received);}
  else{renderModal();lootNotice(received);draw();}
 }
 function takeAllFromCorpse(mob){
  if(pendingLoot!==mob||modal.hidden||modal.dataset.kind!=='loot')return;
  if(distance(mob)>3.1)return msg('Подойди к телу ближе');
  const result=takeAllCorpseRows(mob,corpseLootServices());
  updateLootMarker(mob);
  if(!result.taken.length)return lootNotice('Рюкзак заполнен — добыча осталась в теле');
  if(!result.remaining){
   finishCorpseLoot(mob);msg('Собрано предметов: '+result.taken.length);
  }else{
   renderModal();lootNotice('Часть добычи осталась в теле — рюкзак заполнен');draw();
  }
 }
 function targetEntity(entity){
  if(entity&&!['mob','dummy'].includes(entity.kind))entity=null;
  if(entity&&(entity.hp<=0||entity.dead||!entity.root.visible))entity=null;
  if(target!==entity){autoplay=false;approach=null;}
  if(!entity&&timeline.current?.skill!=='thunderStomp')timeline.clear();
  target=entity;
  updateSelection();draw();
 }
 function targetNearest(step=1){
  if(!modal.hidden)return;
  // Limit targeting to living enemies within 40 m. Priority goes to mobs
  // in front of the hero; repeated presses still cycle through all targets.
  const next=cycleHostileTarget(mobs,dummy,target,distance,step,targetFacingAlignment);
  if(next){targetEntity(next);}
  else if(!target)msg('В радиусе 40 м нет противников');
 }
 function nearestInteraction(){
  return nearbyInteractable(entities,distance,camp.available);
 }
 function openWindow(kind){
  if(kind!=='gatherLoot')camp.cancel();
  modal.hidden=false;modal.dataset.kind=kind;
  if(kind==='chest'&&isOnline()){
   onlineChest=null;
   const items=[...state.inventory];
   while(items.length<12)items.push(null);
   multiplayer.openChest(items);
  }
  renderModal();
 }
 function closeWindow(){
  if(modal.dataset.kind==='chest'&&isOnline())multiplayer.closeChest();
  modal.hidden=true;pendingLoot=null;
 }
 let resetProgressView=null;
 function onResetProgress(fn){resetProgressView=typeof fn==='function'?fn:null;}
 function resetProgress(){
  if(preview)return;
  if(!window.confirm('Сбросить весь прогресс тестового персонажа? Задания, уровень, инвентарь, экипировка и сундук начнутся заново. Настройки графики сохранятся.'))return;
  if(!clearOfflineProgress(localStorage,{preview})){
   msg('Не удалось сбросить сохранение. Проверь разрешение на хранение данных.');return;
  }
  // The planet resets location before reload; a fresh game also resets
  // corpses, merchant buyback, ground loot and gathering cooldowns.
  if(resetProgressView)resetProgressView();
  window.location.reload();
 }
 function interact(){
  if(!modal.hidden||camp.casting)return;
  // Approach alone enables NPC dialogue, gathering, storage and corpse loot.
  // It never requires a selected combat target.
  const nearby=nearestInteraction();
  if(!nearby)return msg('Подойди к жителю или предмету ближе');
  if(camp.interact(nearby)){draw();return;}
  if(nearby.kind==='mentor')openWindow('mentor');
  else if(nearby.kind==='relic')mentorChain.pickedRelic();
  else if(nearby.kind==='vendor')openWindow('merchant');
  else if(nearby.kind==='mob'&&nearby.corpse)showCorpseLoot(nearby);
  draw();
 }
 function levelCheck(){
  while(state.level<60&&state.xp>=xpRequired(state.level)){
   state.xp-=xpRequired(state.level);state.level++;
   const oldMax=stats().maxHp;state.hp=oldMax;msg('Новый уровень: '+state.level+'!');
  }
  state.hotbar=normalizeHotbar(state.hotbar,'warrior',state.level);persist();
 }
 function harm(enemy,damage,skill='autoAttack'){
  if(!isLivingHostile(enemy))return;
  lastCombatAt=clock;
  state.resource=changeResource(state.resource,rageForHit(skill),'warrior');
  if(enemy.kind==='dummy'){applyTrainingHit(enemy,damage,clock,skill);combatFeedback.hit(enemy,damage,skill);combatVfx.trigger(enemy,skill==='heavyStrike'?'strong':skill==='thunderStomp'?'stomp':'hit');persist();draw();return;}
  if(enemy.kind!=='mob'||enemy.dead||isOnline())return;
  lastCombatAt=clock;enemy.hp=Math.max(0,enemy.hp-damage);enemy.aggro=true;enemy.returning=false;enemy.hit=HIT_REACTION_SECONDS;
  combatFeedback.hit(enemy,damage,skill);
  combatVfx.trigger(enemy,skill==='heavyStrike'?'strong':skill==='thunderStomp'?'stomp':'hit');
  if(enemy.hp===0){
   enemy.dead=6;enemy.corpse=true;enemy.aggro=false;enemy.attackCd=0;enemy.attackWindup=0;
   if(target===enemy){
    target=null;autoplay=false;approach=null;swing=0;
    if(timeline.current?.target===enemy)timeline.clear();
   }
   setModelAt(enemy);enemy.deathAnimation.begin(playerNormal());
   if(enemy.nameTag)enemy.nameTag.visible=false;
   enemy.loot=rollCreatureLoot(enemy.lootId);
   updateLootMarker(enemy);
   state.xp+=enemy.boss?70:22;state.gold+=enemy.boss?12:4;
   levelCheck();mentorChain.killed(enemy);
   if(!enemy.boss)msg('Долгоног повержен · доступна добыча');
   persist();
  }
  persist();draw();
 }
 function facesTarget(enemy){
  if(!enemy)return false;
  return sphericalMeleeFacing(THREE,playerNormal(),hero.root,
   toNormal(enemy.x,enemy.z,getRadius()));
 }
 function isLivingHostile(enemy){
  return !!enemy&&['mob','dummy'].includes(enemy.kind)&&enemy.root.visible&&enemy.hp>0&&!enemy.dead&&!enemy.corpse;
 }
 function hitEnemy(enemy,skill='autoAttack'){
  if(!isLivingHostile(enemy)||distance(enemy)>MELEE_RANGE||!facesTarget(enemy)||timeline.busy)return false;
  timeline.start(skill,enemy);lastCombatAt=clock;return true;
 }
 function abilityContext(){
  return {runtime,classId:'warrior',level:state.level,resource:state.resource,
   hasTarget:isLivingHostile(target),range:target?distance(target):Infinity,facing:!target||facesTarget(target),
   hasConsumable:itemCount('healingPotion')>0,needsHealing:state.hp<stats().maxHp};
 }
 function castAction(id){
  if(!modal.hidden||camp.casting||state.hp<=0)return false;
  const def=getAbilityDefinition(id);if(!def)return false;
  if(id==='autoAttack'){
   approach=null;
   if(autoplay){autoplay=false;draw();return true;}
   if(!isLivingHostile(target)){
    const found=cycleHostileTarget(mobs,dummy,null,distance);
    if(!found){msg('В радиусе 40 м нет противников');return false;}
    target=found;
   }
   if(distance(target)>APPROACH_RANGE){msg('Цель слишком далеко — подойди на 20 м');draw();return false;}
   // Toggling autoattack must not reset the weapon's current cooldown.
   autoplay=true;draw();return true;
  }
  if((id==='heavyStrike'||id==='thunderStomp')&&timeline.busy){msg('Дождитесь окончания удара');return false;}
  if(def.requiresTarget&&isLivingHostile(target)&&distance(target)>def.range){
   if(distance(target)>APPROACH_RANGE){msg('Цель слишком далеко');return false;}
   const error=abilityFailure(def,{...abilityContext(),range:null,facing:true});
   if(error){msg(error);return false;}
   approach={target,abilityId:id};return true;
  }
  const result=activateAbility(def,abilityContext());
  if(!result.ok){msg(result.error);return false;}
  approach=null;state.resource=result.resource;
  if(id==='healingPotion'){takeItem('healingPotion');state.hp=Math.min(stats().maxHp,state.hp+55);if(isOnline())multiplayer.sendHeal();msg('Здоровье восстановлено');}
  else if(id==='heavyStrike'){timeline.start(id,target);lastCombatAt=clock;}
  else if(id==='thunderStomp')timeline.start(id);
  persist();draw();return true;
 }
 function useAbility(slot){
  const action=actionDefinition(state.hotbar[slot],'warrior',state.level);
  if(!action)return msg('Пустая ячейка');
  return castAction(action.abilityId);
 }
 function draw(refreshInteractive=true){
  const s=stats();state.hp=clamp(state.hp,0,s.maxHp);
  nameEl.textContent='Странник';$('levelBadge').textContent=state.level;
  $('className').textContent='Таурен · Воин';
  $('hpFill').style.width=clamp(state.hp/s.maxHp*100,0,100)+'%';
  $('hpText').textContent=Math.ceil(state.hp)+' / '+s.maxHp;
  $('rageFill').style.width=state.resource+'%';
  $('rageText').textContent='Ярость '+Math.floor(state.resource)+' / 100';
  $('resourceBar').setAttribute('aria-valuenow',Math.floor(state.resource));
  $('combatState').textContent=inCombat()?'В бою':
   state.hp<s.maxHp?(clock-lastCombatAt<5?'Отдых после боя':'Восстановление'):'Готов к бою';
  $('xpFill').style.width=Math.min(100,state.xp/xpRequired(state.level)*100)+'%';
  $('xpText').textContent='Опыт '+state.xp+' / '+xpRequired(state.level);
  const hostile=target&&['mob','dummy'].includes(target.kind)&&target.root.visible&&target.hp>0&&!target.dead;
  $('targetFrame').hidden=!hostile;$('targetPlaceholder').hidden=!!hostile;
  if(hostile){
    $('targetName').textContent=target.boss?'Грозоклюв · 5 · Элитный':target.name;
    $('targetFill').style.width=clamp(target.hp/target.maxHp*100,0,100)+'%';
    $('targetHp').textContent=Math.ceil(target.hp)+' / '+target.maxHp;
    $('targetDistance').textContent='Дистанция: '+pretty(distance(target))+' м';
    $('targetStatus').textContent=target.corpse?'Доступна добыча':autoplay?'Автоатака':'Нажми 1 для автоатаки';
    $('dummyStats').hidden=target.kind!=='dummy';
  }
  const stage=state.quest,lines=QUEST_LINES[stage]||QUEST_LINES[12];
  objective.textContent=stage===1?'Победи долгоногов: '+state.kills+' / 3':lines[1];
  $('qtitle').textContent=lines[0];
  $('mainQuestTracker').hidden=stage===12;
  $('quest-progress').textContent=stage===12?'Цепочка · 5 / 5 ✓':'Цепочка · '+mentorChainNumber(stage)+' / 5';
  const guidance=$('questGuidance');
  guidance.hidden=stage!==7&&stage!==10;
  if(stage===7)guidance.textContent='Разведка: найди каменную развилку (12, 37).';
  if(stage===10)guidance.textContent='Красный пунктир ведёт к Грозоклюву · 108 HP';
  const glyph=mentorGlyph(state.quest);
  for(const child of mentor.root.children)if(child.userData.questMarker)child.visible=child.userData.glyph===glyph;
  const nearby=modal.hidden&&!camp.casting?nearestInteraction():null;
  $('interact').hidden=!nearby;
  if(nearby)$('interact').textContent=nearby.kind==='gather'?
    (nearby.pending?'Забрать':'Собрать'):nearby.kind==='relic'?'Взять перо':nearby.kind==='chest'?'Открыть сундук':
    nearby.kind==='mob'?'Обыскать':nearby.kind==='vendor'?'Торговец':'Поговорить';
  $('targetNext')?.classList.toggle('target-selected',!!target&&target.hp>0&&!target.dead);
  if(refreshInteractive){
  hotbar.replaceChildren();
  state.hotbar.forEach((entry,i)=>{
   const button=document.createElement('button');button.type='button';button.dataset.slot=String(i);
   button.className='ability';button.title=entry?.id||'Назначить умение';
   const key=document.createElement('kbd');key.textContent=String(i+1);
   const icon=document.createElement('span');icon.className='planetAbilityIcon';if(entry&&HOTBAR_ART[entry.id])icon.innerHTML=HOTBAR_ART[entry.id];else icon.textContent='＋';
   const caption=document.createElement('span');caption.className='planetAbilityName';
   const entryDef=entry?actionDefinition(entry,'warrior',state.level):null;
   caption.textContent=entry?HOTBAR_SHORT[entry.id]||entryDef?.name||'Умение':'Пусто';
   const cooldownShade=document.createElement('span');cooldownShade.className='planetCooldownShade';
   const gcdShade=document.createElement('span');gcdShade.className='planetGcdShade';
   const cooldownText=document.createElement('span');cooldownText.className='planetCooldownText';
   button.append(key,icon,caption,cooldownShade,gcdShade,cooldownText);
   button.classList.toggle('is-empty',!entry);
   if(entry?.id==='autoAttack'&&autoplay)button.classList.add('is-active');
   const ability=entry?getAbilityDefinition(entry.id==='healingPotion'?'healingPotion':entry.id):null;
   if(ability?.cooldown&&runtime.cooldowns[ability.id]>0)button.classList.add('is-cooldown');
   button.addEventListener('click',()=>{if(chooseSlot>=0){chooseSlot=i;openWindow('spells');}else useAbility(i)});
   hotbar.append(button);
  });
  if(!modal.hidden)renderModal();
  }
  // Don't destroy pressed buttons during each 200ms HUD refresh.
  for(const [i,entry] of state.hotbar.entries()){
   const button=hotbar.children[i];if(!button)continue;
   const def=entry?getAbilityDefinition(entry.id):null;
   const remain=def?(runtime.cooldowns[def.id]||0):0,ratio=def?.cooldown?clamp(remain/def.cooldown,0,1):0;
   const shade=button.querySelector('.planetCooldownShade');
   const cd=button.querySelector('.planetCooldownText');
   const gcd=button.querySelector('.planetGcdShade');
   if(shade)shade.style.height=(ratio*100).toFixed(2)+'%';
   if(cd)cd.textContent=remain>0?remain>=10?String(Math.ceil(remain)):remain.toFixed(1):'';
   if(gcd)gcd.style.transform='scaleY('+(def?.gcd?clamp(runtime.gcd/1.5,0,1):0)+')';
   button.classList.toggle('is-cooldown',remain>0);
   button.classList.toggle('is-active',entry?.id==='autoAttack'&&autoplay);
  }
 }
 function renderModal(){
  const kind=modal.dataset.kind,title=$('mtitle'),body=$('mbody');
  $('panel').classList.toggle('character-modal',kind==='character');
  $('panel').classList.toggle('inventory-modal',kind==='bag');
  $('msub').textContent=isOnline()?'NEXGAMEWORLD · ОБЩИЙ МИР':'NEXGAMEWORLD · ЛОКАЛЬНЫЙ РЕЖИМ';
  // Only the pause/settings menu may expose camera and graphics controls.
  // Dialogs, loot, backpack, quests and merchant must never inherit these.
  $('cameraControl').hidden=kind!=='menu';
  $('graphicsControl').hidden=kind!=='menu';
  title.textContent=({bag:'Рюкзак',character:'Персонаж',quests:'Журнал заданий',
   merchant:'Торговец',spells:'Книга способностей',loot:'Обыск тела',menu:'Меню',herbalist:'Травница Тихая Заря',chest:'Сундук',gatherLoot:'Собранный ресурс',mentor:'Наставник Каменный Рог',party:'Группа и чат'})[kind]||'NexGameWorld';
  body.replaceChildren();
  const line=(label,caption,actions=[])=>{
   const row=document.createElement('div');row.className='rpgRow';
   const name=document.createElement('div');name.innerHTML='<strong></strong><small></small>';
   name.querySelector('strong').textContent=label;name.querySelector('small').textContent=caption;
   row.append(name);for(const [caption,fn] of actions){const b=document.createElement('button');b.type='button';b.textContent=caption;b.addEventListener('click',fn);row.append(b);}
   body.append(row);
  };
  if(kind==='party'){
   if(!isOnline()){line('Нет подключения','Группы и чат доступны при подключении к общему миру.');return;}
   line('Группа',partyState.groupId?'Участников: '+partyState.members.length+' / 5':'Вы пока не в группе',
    partyState.groupId?[['Покинуть',()=>multiplayer.leaveParty()]]:[]);
   for(const member of partyState.members)
    line(member.name||'Игрок',(member.id===partyState.leaderId?'Лидер · ':'')+'Уровень '+(member.level||1));
   if(!partyState.groupId||partyState.members.length<5){
    line('Игроки в мире','Выбери игрока для приглашения.');
    for(const peer of onlinePlayers)if(!partyState.members.some(x=>x.id===peer.id))
     line(peer.name||'Странник','Уровень '+(peer.level||1),[['Пригласить',()=>multiplayer.invite(peer.id)]]);
   }
   const message=document.createElement('input');message.type='text';message.maxLength=180;
   message.placeholder='Написать сообщение…';message.style.cssText='width:100%;margin:8px 0;padding:9px';
   body.append(message);
   const sendMessage=channel=>{
    if(message.value.trim()&&multiplayer.sendChat(channel,message.value.trim())){
     message.value='';msg('Сообщение отправлено',1.2);
    }
   };
   line('Чат','Общий чат или чат участников группы',[
    ['В мир',()=>sendMessage('world')],['В группу',()=>sendMessage('party')]
   ]);
   return;
  }
  if(kind==='chest'&&isOnline()){
   if(!onlineChest?.slots){line('Общий сундук','Загружаем 18 ячеек с сервера…');return;}
   line('Общий сундук','18 ячеек синхронизируются через Render.');
   for(let i=0;i<onlineChest.slots.length;i++){
    const item=onlineChest.slots[i],def=ITEM_CATALOG[item?.id];
    if(item)line('Ячейка '+(i+1)+' · '+(def?.name||item.id),'×'+item.qty,
     [['Забрать',()=>multiplayer.moveChest('withdraw',i,crypto.randomUUID())]]);
   }
   line('Рюкзак','Нажми «Положить», чтобы переместить предмет.');
   state.inventory.forEach((item,i)=>{
    const def=ITEM_CATALOG[item.id];
    if(def&&!def.quest)
     line(def.name+' ×'+item.qty,'Ячейка '+(i+1),
      [['Положить',()=>multiplayer.moveChest('deposit',i,crypto.randomUUID())]]);
   });
   return;
  }
  if(camp.render(kind,body,line))return;
  if(kind==='mentor'){mentorChain.render(line);return;}
  if(kind==='loot'){
   const corpse=pendingLoot;
   if(!corpse?.corpse||!corpse.root.visible||!corpse.loot?.length){
    line('Нет добычи','Тело уже обыскано или исчезло.');
    const close=document.createElement('button');close.type='button';close.className='choice';
    close.textContent='Закрыть';close.addEventListener('click',closeWindow);body.append(close);
    return;
   }
   $('msub').textContent='ДОБЫЧА С ТЕЛА · '+corpse.name;
   const description=document.createElement('p');description.className='planet-loot-intro';
   description.textContent='Нажми на нужный предмет, чтобы забрать его. Остальное останется в теле, если закрыть окно.';
   body.append(description);
   const notice=document.createElement('p');notice.className='planet-loot-notice';
   notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
   body.append(notice);
   const list=document.createElement('div');list.className='loot-list';
   corpse.loot.forEach((item,index)=>{
    const def=ITEM_CATALOG[item.id],rarity=itemRarity(def?.rarity);
    const button=document.createElement('button');button.type='button';button.className='loot-item';
    button.dataset.rarity=rarity;
    button.setAttribute('aria-label','Взять '+(def?.name||item.id)+', '+item.qty+' шт.');
    const name=document.createElement('span');name.className='loot-item-name';
    name.textContent=(def?.icon||'📦')+'  '+(def?.name||item.id)+(item.qty>1?' ×'+item.qty:'');
    name.style.color=QUALITY_VISUALS[rarity]?.color||'#e6d2aa';
    button.append(name);
    const sub=document.createElement('small');sub.className='loot-item-stats';
    sub.textContent=def?.slot?LABEL[def.slot]+' · '+(def.quality||'Снаряжение')+
     (def.requiredLevel>1?' · Ур. '+def.requiredLevel:''):def?.description||'Предмет для продажи';
    button.append(sub);
    button.addEventListener('click',()=>takeLootFromCorpse(corpse,index));
    list.append(button);
   });
   body.append(list);
   const actions=document.createElement('div');actions.className='planet-loot-actions';
   const takeAll=document.createElement('button');takeAll.type='button';takeAll.className='choice';
   takeAll.textContent='Забрать всё';takeAll.addEventListener('click',()=>takeAllFromCorpse(corpse));
   const leave=document.createElement('button');leave.type='button';leave.className='choice planet-loot-leave';
   leave.textContent='Оставить и закрыть';leave.addEventListener('click',closeWindow);
   actions.append(takeAll,leave);body.append(actions);
   return;
  }
  if(kind==='menu'){
   line('Сферический мир','Меняй радиус планеты, вращай её свайпами и исследуй NexGameWorld.');
   for(const item of settingsControls)body.append(item);
   line('Сетевая игра',isOnline()?'Общий мир: мобы, бой, награды и группы синхронизируются через Render.':'Сервер недоступен: персонаж продолжает играть локально.');
   if(!preview){
    line('Тестирование заданий','Начать заново: уровень, все задания, вещи и сундук. Графика, масштаб и режим слежения камеры сохранятся.',[['Сбросить прогресс',resetProgress]]);
    body.lastElementChild?.querySelector('button')?.classList.add('reset-progress-action');
   }
  }else if(kind==='bag'){
    const summary=document.createElement('div');summary.className='inventory-summary';
    summary.textContent='Ячейки '+state.inventory.length+' / 12 · Монеты '+pretty(state.gold)+' · Настои '+itemCount('healingPotion');
    const grid=document.createElement('div');grid.className='inventory-grid';
    const detail=document.createElement('div');detail.className='inventory-detail';
    detail.textContent='Нажми на предмет, чтобы узнать подробности.';
    for(let i=0;i<12;i++){
      const item=state.inventory[i],def=item&&ITEM_CATALOG[item.id];
      const cell=document.createElement('button');cell.type='button';
      cell.className='inventory-slot'+(item?' occupied':' empty');
      if(def){cell.classList.add('rarity-'+itemRarity(def.rarity));
       cell.style.setProperty('--item-quality-color',QUALITY_VISUALS[itemRarity(def.rarity)].color);}
      cell.setAttribute('aria-label',item?(def?.name||'Лечебный настой'):'Пустая ячейка '+(i+1));
      if(item){
        const icon=document.createElement('span');icon.className='slot-icon';icon.textContent=def?.icon||'🧪';
        const qty=document.createElement('span');qty.className='slot-count';qty.textContent=item.qty>1?item.qty:'';
        cell.append(icon,qty);
        cell.addEventListener('click',()=>{
          detail.replaceChildren();
          const name=document.createElement('strong');name.textContent=def?.name||'Лечебный настой';
     if(def)name.style.color=QUALITY_VISUALS[itemRarity(def.rarity)].color;
          const description=document.createElement('p');description.textContent=def?.description||'Восстанавливает здоровье';
          detail.append(name,description);
          const commands=[...(def?.slot?[['Надеть',()=>equip(item.id)]]:[]),
            ['🗑 Удалить',()=>{takeItem(item.id,1);draw();}]];
          for(const [label,action] of commands){
            const b=document.createElement('button');b.type='button';b.className='choice';b.textContent=label;
            b.addEventListener('click',action);detail.append(b);
          }
          for(const el of grid.children)el.classList.remove('active');
          cell.classList.add('active');
        });
      }else{const dot=document.createElement('span');dot.className='slot-empty-mark';dot.textContent='·';cell.append(dot);}
      grid.append(cell);
    }
    body.append(summary,grid,detail);
  }else if(kind==='character'){
    const values=stats(),summary=document.createElement('div');summary.className='inventory-summary';
    summary.textContent='Таурен · Воин · '+state.level+' ур. · '+state.xp+'/'+xpRequired(state.level)+' опыта · '+pretty(state.gold)+' монет';
    body.append(summary);
    const statsBlock=document.createElement('dl');statsBlock.className='character-stats';
    for(const [name,value] of [['Сила',values.strength],['Выносливость',values.stamina],['Броня',values.armor]]){
      const cell=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
      dt.textContent=name;dd.textContent=value;cell.append(dt,dd);statsBlock.append(cell);
    }
    body.append(statsBlock);
    const gear=document.createElement('div');gear.className='planetEquipmentGrid';
    for(const slot of EQUIP_SLOTS){
      const id=state.equipment[slot]?.id,def=ITEM_CATALOG[id];
      const btn=document.createElement('button');btn.type='button';
      btn.className='equipment-slot'+(def?' equipped':'');
      const icon=document.createElement('span');icon.textContent=def?.icon||'◇';icon.style.fontSize='25px';
      const caption=document.createElement('small');caption.textContent=LABEL[slot]+': '+(def?.name||'Пусто');
      btn.append(icon,caption);btn.title=def?'Снять '+def.name:LABEL[slot];
      if(def)btn.addEventListener('click',()=>{
        const result=unequipToBag(state,slot,inCombat());
        if(!result.ok)return msg(result.error);
        finishEquipmentChange(slot);
      });
      gear.append(btn);
    }
    body.append(gear);
    line('Урон и здоровье',pretty(values.damageMin)+'–'+pretty(values.damageMax)+' урона · '+Math.ceil(state.hp)+' / '+values.maxHp+' HP');
  }else if(kind==='quests'){
   const tabs=document.createElement('div');tabs.className='planet-journal-tabs';tabs.setAttribute('role','tablist');
   const labels={current:'Текущие',available:'Доступные',completed:'Выполненные'};
   for(const [tab,label] of Object.entries(labels)){
    const button=document.createElement('button');button.type='button';button.className='choice'+(journalTab===tab?' is-selected':'');
    button.setAttribute('role','tab');button.setAttribute('aria-selected',String(journalTab===tab));
    button.textContent=label;button.addEventListener('click',()=>{journalTab=tab;renderModal();});tabs.append(button);
   }
   body.append(tabs);
   const entries=mentorJournalRows(state).map(item=>({...item,npc:'Наставник Каменный Рог'}));
   for(let i=1;i<=3;i++){
    const quest=GATHER_QUESTS[i],stage=state.gatherStage;
    const status=stage>i?'completed':stage===i?(state.gatherAvailable?'available':'current'):i===1&&stage===0?'available':null;
    if(!status)continue;
    const count=status==='completed'?quest.count:state.inventory.filter(entry=>entry.id===quest.item).reduce((sum,entry)=>sum+entry.qty,0);
    entries.push({id:'gather-'+i,status,title:quest.title,
     objective:'Собрать '+quest.count+' шт.: '+(ITEM_CATALOG[quest.item]?.name||quest.item),
     progress:status==='completed'?'Сдано травнице':status==='available'?'Доступно у травницы':'Собрано '+count+' / '+quest.count,
     reward:quest.gold+' монет · '+quest.xp+' опыта',npc:'Травница Тихая Заря'});
   }
   const visible=entries.filter(entry=>entry.status===journalTab);
   for(const entry of visible)line((entry.status==='completed'?'✓ ':entry.status==='available'?'! ':'• ')+entry.title,
    entry.objective+' · '+entry.progress+(entry.reward?' · '+entry.reward:'')+' · '+entry.npc);
   if(!visible.length)line('Пока пусто','В этом разделе заданий пока нет.');
  }else if(kind==='merchant'){
   line('Борун Крепкая Ладонь','Твои монеты: '+pretty(state.gold));
   const tabs=document.createElement('div');tabs.className='planet-journal-tabs';
   for(const [tab,label] of [['buy','Купить'],['sell','Продать'],['buyback','Выкупить обратно']]){
    const button=document.createElement('button');button.type='button';
    button.className='choice'+(merchantTab===tab?' is-selected':'');
    button.textContent=label;button.addEventListener('click',()=>{merchantTab=tab;renderModal();});
    tabs.append(button);
   }
   body.append(tabs);
   if(merchantTab==='buy'){
    for(const id of MERCHANT_STOCK){
     const item=ITEM_CATALOG[id];if(!item?.buy)continue;
     line((item.icon||'📦')+' '+item.name,item.buy+' монет · '+LABEL[item.slot],
      [['Купить',()=>{
       if(state.gold<item.buy)return msg('Недостаточно монет');
       if(!addItem(id))return msg('Сумка заполнена');
       state.gold-=item.buy;persist();renderModal();draw();msg('Куплено: '+item.name);
      }]]);
    }
   }else if(merchantTab==='sell'){
    let available=0;
    state.inventory.forEach((row,index)=>{
     const item=ITEM_CATALOG[row.id];if(!item?.sell||item.quest)return;
     available++;
     line((item.icon||'📦')+' '+item.name+(row.qty>1?' ×'+row.qty:''),
      'Продажа всего слота · '+(item.sell*row.qty)+' монет',
      [['Продать',()=>{
       const result=sellInventorySlot(state,index);
       if(!result.ok)return msg('Этот предмет нельзя продать');
       persist();renderModal();draw();msg('Продано: '+item.name);
      }]]);
    });
    if(!available)line('Нет предметов на продажу','Квестовые вещи нельзя продавать.');
   }else{
    if(!state.buyback.length)line('Выкуп пуст','Недавно проданные предметы появятся здесь.');
    state.buyback.forEach((row,index)=>{
     const item=ITEM_CATALOG[row.id];
     line((item?.icon||'📦')+' '+(item?.name||row.id)+(row.qty>1?' ×'+row.qty:''),
      row.price+' монет · цена последней продажи',
      [['Выкупить',()=>{
       const result=buyBackFromMerchant(state,index);
       if(!result.ok)return msg(result.reason==='gold'?'Недостаточно монет':
        result.reason==='full'?'Рюкзак заполнен':'Предмет недоступен');
       persist();renderModal();draw();msg('Возвращено: '+(item?.name||row.id));
      }]]);
    });
   }
  }else if(kind==='spells'){
   const intro=document.createElement('p');intro.className='spellbook-intro';
   intro.textContent='Выбери ячейку 1–8, затем способность или предмет. Занятую ячейку тоже можно заменить.';
   body.append(intro);
   const picker=document.createElement('div');picker.className='planet-hotbar-slot-picker';
   for(let i=0;i<8;i++){
    const button=document.createElement('button');button.type='button';
    button.className='choice'+(chooseSlot===i?' is-selected':'');
    button.textContent=String(i+1);button.title='Выбрать ячейку '+(i+1);
    button.setAttribute('aria-pressed',String(chooseSlot===i));
    button.addEventListener('click',()=>{chooseSlot=i;renderModal();});
    picker.append(button);
   }
   body.append(picker);
   const list=document.createElement('div');list.className='spellbook-list';
   const abilities=availableHotbarActions('warrior',state.level);
   for(const info of [...abilities.abilities,...abilities.items]){
     const btn=document.createElement('button');btn.type='button';btn.className='spellbook-entry';
     const icon=document.createElement('span');icon.className='spellbook-entry-icon';if(HOTBAR_ART[info.id])icon.innerHTML=HOTBAR_ART[info.id];else icon.textContent=ICON[info.id]||'✨';
     const block=document.createElement('span');block.className='spellbook-entry-content';
     const title=document.createElement('span');title.className='spellbook-entry-title';title.textContent=info.name;
     const detail=document.createElement('span');detail.className='spellbook-entry-desc';detail.textContent=info.description;
     const meta=document.createElement('span');meta.className='spellbook-entry-meta';
     meta.textContent=info.kind==='item'?'Настоев: '+itemCount('healingPotion'):
      (info.resourceCost?info.resourceCost+' ярости · ':'')+(info.cooldown?info.cooldown+' с восстановления':'Без перезарядки');
     block.append(title,detail,meta);
     const arrow=document.createElement('span');arrow.className='spellbook-entry-use';arrow.textContent='➜';
     btn.append(icon,block,arrow);
     btn.addEventListener('click',()=>{
       const slot=chooseSlot>=0?chooseSlot:state.hotbar.findIndex(entry=>entry===null);
       if(slot<0)return msg('Нажми нужную ячейку на панели');
       state.hotbar=assignHotbarSlot(state.hotbar,slot,{kind:info.kind,id:info.id},'warrior',state.level);
       chooseSlot=-1;persist();draw();msg('Назначено в ячейку '+(slot+1));
     });list.append(btn);
   }
   const clear=document.createElement('button');clear.type='button';
   clear.className='spellbook-entry spellbook-remove';clear.textContent='✕ Очистить выбранную ячейку';
   clear.addEventListener('click',()=>{
     if(chooseSlot<0)return msg('Сначала выбери ячейку панели');
     state.hotbar=assignHotbarSlot(state.hotbar,chooseSlot,null,'warrior',state.level);
     chooseSlot=-1;persist();draw();
   });list.append(clear);body.append(list);
  }
 }
 const actions=[
  ['targetNext',()=>targetNearest(1)],['interact',interact],
  ['bag',()=>openWindow('bag')],['character',()=>openWindow('character')],
  ['journal',()=>openWindow('quests')],['questJournalOpen',()=>openWindow('quests')],
  ['spellbookButton',()=>{chooseSlot=-1;openWindow('spells')}],
  ['pause',()=>openWindow('menu')],
  ['partyOpen',()=>openWindow('party')],
  ['targetClear',()=>{targetEntity(null);autoplay=false;draw()}],
  ['dummyReset',()=>{dummy.trainingStats=createTrainingStats();draw();}]
 ];
 for(const [id,fn] of actions){const node=$(id);if(node)bind(node,'click',fn);}
 bind($('modalClose'),'click',()=>{chooseSlot=-1;closeWindow();});
 document.addEventListener('keydown',e=>{
  const key=e.key.toLowerCase();
  if(key==='escape'&&!modal.hidden){closeWindow();e.preventDefault();}
  if(!modal.hidden)return;
  const shortcut={i:'bag',c:'character',j:'quests',b:'spells'};
  if(shortcut[key]&&!e.repeat){openWindow(shortcut[key]);e.preventDefault();}
  if(key==='tab'){targetNearest(e.shiftKey?-1:1);e.preventDefault();}
  if(key==='e'){interact();e.preventDefault();}
 });
 // Tap actors by their actual Three.js shapes; ordinary terrain taps clear selection.
 const picker=new THREE.Raycaster(),startPointer=new Map();
 canvas.addEventListener('pointerdown',e=>{startPointer.set(e.pointerId,{x:e.clientX,y:e.clientY});});
 canvas.addEventListener('pointercancel',e=>startPointer.delete(e.pointerId));
 canvas.addEventListener('pointerup',e=>{
  const start=startPointer.get(e.pointerId);startPointer.delete(e.pointerId);
  if(!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)>14)return;
  const rect=canvas.getBoundingClientRect();
  const x=(e.clientX-rect.left)/rect.width*2-1,y=-((e.clientY-rect.top)/rect.height*2-1);
  picker.setFromCamera(new THREE.Vector2(x,y),camera);
  const visible=entities.filter(o=>o.root.visible&&!(o.kind==='mob'&&o.dead&&!o.corpse));
  const roots=visible.map(o=>o.root);
  const intersects=picker.intersectObjects(roots,true);
  const hit=intersects.find(v=>v.distance<100)?.object;
  const selected=hit?visible.find(o=>{let p=hit;while(p){if(p===o.root)return true;p=p.parent;}return false;}):null;
  if(selected?.kind==='mob'&&selected.corpse){
   if(distance(selected)<=3.1)showCorpseLoot(selected);
   return;
  }
  targetEntity(selected||null);
 });
 function resetWorldTransforms(){for(const e of entities){setModelAt(e);e.deathAnimation?.refresh();}mentorWorld.rebuild();targetRing.invalidate();stompEffect.invalidate();updateSelection();draw();}
 function canMoveTo(x,z){
  // Friendly NPCs are interaction targets, not physical colliders in the
  // main NexGame. Use the shared geometry for houses, furniture and nature.
  return canWalkCamp(x,z);
 }
 function cancelAutoApproach(){approach=null;}
 function getApproachTarget(){
  if(!modal.hidden||camp.casting||state.hp<=0||timeline.stompProgress>=0)return null;
  if(approach&&(!isLivingHostile(approach.target)||target!==approach.target||distance(approach.target)>APPROACH_RANGE))approach=null;
  const enemy=approach?.target||(autoplay?target:null);
  if(!isLivingHostile(enemy))return null;
  const d=distance(enemy);
  return d>3.25&&d<=APPROACH_RANGE?enemy:null;
 }
 function stopAutoApproach(){
  if(autoplay||approach){autoplay=false;approach=null;msg('Путь к цели перекрыт');draw();}
 }
 function update(dt){
  clock+=dt;
  blockRemaining=Math.max(0,blockRemaining-dt);
  const impact=timeline.update(dt);
  if(impact?.skill==='thunderStomp'){
   stompEffect.trigger(playerNormal());
   if(isOnline())multiplayer.sendAttack('thunderStomp');
   let hits=0;
   for(const enemy of [...mobs,dummy])if(isLivingHostile(enemy)&&distance(enemy)<4.5){
    if(enemy.kind==='mob'&&!isOnline())enemy.stun=2.5;
    if(enemy.kind==='dummy'||!isOnline())harm(enemy,6,impact.skill);
    hits++;
   }
   msg('Громовая поступь: '+hits+' целей');
  }else if(impact&&isLivingHostile(impact.target)&&distance(impact.target)<=MELEE_RANGE){
   if(facesTarget(impact.target)){
    const bonus=impact.skill==='heavyStrike'?(getAbilityDefinition(impact.skill).damageBonus||0):0;
    if(isOnline()&&impact.target.kind==='mob')multiplayer.sendAttack(impact.skill,'dolgonog-'+impact.target.index);
    else harm(impact.target,rollMeleeDamage(stats(),bonus),impact.skill);
   }else if(impact.skill!=='autoAttack')msg('Цель не перед вами',1.1);
  }
  if(!toast.hidden&&clock>messageUntil){toast.classList.remove('show');toast.hidden=true;}
  tickAbilityRuntime(runtime,dt);
  // Original NexGame regenerates +3 HP/s and loses 5 rage/s after five
  // seconds of peace. This local test does not depend on network snapshots.
  if(inCombat())lastCombatAt=clock;
  else if(clock-lastCombatAt>5){
   const hpBefore=state.hp,rageBefore=state.resource;
   state.hp=Math.min(stats().maxHp,state.hp+3*dt);
   if(state.resource>0)state.resource=changeResource(state.resource,-WARRIOR_RAGE_DECAY*dt,'warrior');
   if((state.hp!==hpBefore||state.resource!==rageBefore)&&Math.floor(clock/2)!==Math.floor((clock-dt)/2))persist();
  }
  camp.update(dt);
  // The original inhabitants have subtle idle breathing instead of frozen T-poses.
  for(let i=0;i<citizens.length;i++){
   animateSphericalTauren(citizens[i].actor,{dt,time:clock+i*1.47,walk:0,phase:0});
  }
  mentorWorld.update(state,clock);
  if(state.quest===7&&distance(mentorWorld.scout)<5.5)mentorChain.discoveredScout();
  const local=player();
  swing-=dt;
  if(approach){
   if(!isLivingHostile(approach.target)||target!==approach.target||distance(approach.target)>APPROACH_RANGE)approach=null;
   else if(distance(approach.target)<=MELEE_RANGE&&facesTarget(approach.target)&&!timeline.busy){
    const id=approach.abilityId;approach=null;castAction(id);
   }
  }
  if(autoplay&&!approach&&modal.hidden&&!camp.casting&&swing<=0){
   if(hitEnemy(target))swing=stats().speed;
  }
  for(const mob of mobs){
   mob.hit=Math.max(0,(mob.hit||0)-dt);
   mob.alertRemaining=Math.max(0,(mob.alertRemaining||0)-dt);
   if(mob.lootMarker?.visible){
    const tier=mob.lootMarker.userData.rarity;
    const t=tier==='rare'?.12:tier==='uncommon'?.065:.02;
    const pulse=Math.sin(clock*(tier==='rare'?4:2.7)+mob.index);
    const markerScale=1+.12*pulse*t;
     mob.lootMarker.scale.set(1.3*markerScale,1.06*markerScale,markerScale);
    mob.lootMarker.position.y=1.58+.12*Math.sin(clock*3.6);
    mob.lootMarker.material.opacity=.86+.13*Math.pow(Math.sin(clock*2.6),2);
   }
   if(mob.contactShadow)mob.contactShadow.visible=mob.root.visible;
   if(mob.nameTag)mob.nameTag.visible=mob.root.visible&&!mob.corpse;
   if(mob.alertTag){
    mob.alertTag.visible=mob.alertRemaining>0&&mob.root.visible&&!mob.corpse;
    if(mob.alertTag.visible)mob.alertTag.position.y=(mob.boss?4:4.95)+Math.sin(clock*7)*.1;
   }
   if(isOnline()){
    if(mob.corpse){
     const wasDying=mob.dying;mob.deathAnimation.update(dt);
     if(wasDying&&!mob.dying)updateLootMarker(mob);
    }else if(mob.root.visible){
     setModelAt(mob);birdAnimation(mob,dt,mob.networkMovement||0);
     mob.networkMovement=0;
    }
    continue;
   }
   if(!mob.root.visible){
    if(advanceRespawnTimer(mob,dt)){mob.dead=0;mob.corpse=false;mob.hp=mob.maxHp;mob.x=mob.spawnX;mob.z=mob.spawnZ;
     mob.navigation=null;
     mob.root.visible=true;mob.returning=false;mob.aggro=false;mob.attackCd=1.2;mob.attackWindup=0;mob.hit=0;mob.corpseAge=0;mob.alertRemaining=0;
     mob.deathAnimation.reset();
     resetPlainstriderVisual(mob);
     if(mob.pendingBirdAsset){attachBirdVisual(mob,mob.pendingBirdAsset);mob.pendingBirdAsset=null;}
     updateLootMarker(mob);setModelAt(mob);}
    continue;
   }
   if(mob.corpse){
    const wasDying=mob.dying;mob.deathAnimation.update(dt);
    if(wasDying&&!mob.dying)updateLootMarker(mob);
    // A settled body has one fixed lifetime, even when empty or being looted.
    if(advanceCorpseTimer(mob,dt)){
     mob.corpse=false;mob.root.visible=false;
     mob.respawn=mob.boss?12:NORMAL_MOB_RESPAWN_SECONDS;
     mob.loot=[];updateLootMarker(mob);
     if(pendingLoot===mob)closeWindow();
     if(target===mob){target=null;autoplay=false;}
    }
    continue;
   }
   if(mob.dead>0){mob.dead=Math.max(0,mob.dead-dt);continue;}
   mob.attackCd=Math.max(0,mob.attackCd-dt);mob.stun=Math.max(0,mob.stun-dt);mob.roamTime+=dt;
   const spawnNormal=toNormal(mob.spawnX,mob.spawnZ,getRadius());
   const playerSpawnDistance=getRadius()*Math.acos(clamp(playerNormal().dot(spawnNormal),-1,1));
   const dist=distance(mob);
   if(mob.aggro&&playerSpawnDistance>23){mob.aggro=false;mob.returning=true;mob.hp=mob.maxHp;mob.attackWindup=0;mob.navigation=null;}
   if(!mob.aggro&&!mob.returning&&dist<(mob.boss?9:7)&&playerSpawnDistance<23&&state.hp>0){
    mob.aggro=true;mob.alertRemaining=1.05;
   }
   let dx=0,dz=0;
   if(mob.returning){dx=mob.spawnX-mob.x;dz=mob.spawnZ-mob.z;if(Math.hypot(dx,dz)<.25){mob.returning=false;mob.hp=mob.maxHp;mob.navigation=null;}}
   else if(mob.aggro){dx=local.x-mob.x;dz=local.z-mob.z;}
   else{
    // Original calm wildlife slowly wanders within a couple of metres.
    const tx=mob.spawnX+Math.sin(mob.roamTime*.18+mob.index)*2.2;
    const tz=mob.spawnZ+Math.cos(mob.roamTime*.14+mob.index)*2.2;
    dx=tx-mob.x;dz=tz-mob.z;
   }
   const len=Math.hypot(dx,dz),moving=len>.06&&mob.stun<=0;
   const beforeX=mob.x,beforeZ=mob.z;
   const mobCanWalk=(x,z)=>canWalkCamp(x,z,mob.boss?.94:.52)&&canWadeAtLocal(x,z);
   if(moving&&(!mob.aggro||len>(mob.boss?3:2.35))&&mob.attackWindup<=0){
    moveMobToward(mob,{
     goalX:mob.x+dx,goalZ:mob.z+dz,dt,
     speed:mob.aggro?(mob.boss?1.75:2.05):1.45,
     mode:mob.returning?'return':mob.aggro?'chase':'roam',
     canWalk:mobCanWalk,detour:mob.aggro||mob.returning
    });
   }
   // Face the actual travel direction when navigating around a building,
   // then turn back toward the hero in attack range. This also respects
   // the radial "up" and turns smoothly on the sphere.
   const travelled=Math.hypot(mob.x-beforeX,mob.z-beforeZ);
   const travelAim=travelled>.0001?toNormal(mob.x+(mob.x-beforeX)/travelled,
    mob.z+(mob.z-beforeZ)/travelled,getRadius()):null;
   const aim=mob.aggro&&state.hp>0?
    (travelAim&&distance(mob)>(mob.boss?3:2.6)?travelAim:playerNormal()):
    mob.returning?travelAim||toNormal(mob.spawnX,mob.spawnZ,getRadius()):
    travelAim||(len>.05?toNormal(mob.x+dx/len,mob.z+dz/len,getRadius()):null);
   const normal=toNormal(mob.x,mob.z,getRadius());
   const desiredYaw=aim?sphereFacingYaw(THREE,normal,aim):null;
   // Face the moving player on EVERY frame, including stationary melee/Peck.
   mob.yaw=turnSphereYaw(mob.yaw,desiredYaw,dt,mob.attackWindup>0?16:12);
   // No pecking through solid tents, rocks or house walls.
   const close=distance(mob)<(mob.boss?3:2.6)&&
    mobSegmentClear(mob.x,mob.z,local.x,local.z,(x,z)=>canWalkCamp(x,z,.12)&&canWadeAtLocal(x,z));
   if(mob.stun>0||!mob.aggro||state.hp<=0||!close){
    mob.attackWindup=0;
   }else if(mob.attackCd<=0){
    if(mob.attackWindup<=0)mob.attackWindup=mob.boss?.45:.4;
    else{
     mob.attackWindup=Math.max(0,mob.attackWindup-dt);
     // An attack cannot land until the bird is visibly facing the player.
     if(mob.attackWindup<=0&&sphereFacingError(mob.yaw,desiredYaw)>.32)
      mob.attackWindup=.09;
     else if(mob.attackWindup<=0){
      const result=incomingShieldHit({
       THREE,heroNormal:playerNormal(),heroRoot:hero.root,
       enemyNormal:toNormal(mob.x,mob.z,getRadius()),stats:stats(),
       raw:mob.boss?14:9,attackerLevel:mob.boss?5:1
      });
      lastCombatAt=clock;state.hp=Math.max(0,state.hp-result.damage);
      if(result.blocked){
       blockRemaining=result.blockSeconds;
       hero.root.userData.blockRecoil=.65;
       combatVfx.trigger({root:hero.root},'block');
       msg('Блок щитом · отражено '+result.absorbed+' урона',1.1);
      }
      mob.attackCd=mob.boss?1.8:2.1;
      state.resource=changeResource(state.resource,WARRIOR_RAGE_ON_HURT,'warrior');
      if(state.hp<=0){
       // End the ENTIRE encounter before moving the hero back to the fire.
       // Otherwise other aggro mobs keep swinging at the old position or
       // instantly damage the freshly respawned hero during the same tick.
       state.hp=stats().maxHp;state.resource=0;
       autoplay=false;blockRemaining=0;approach=null;timeline.clear();
       target=null;swing=stats().speed;
       lastCombatAt=clock;
       for(const enemy of mobs){
        enemy.aggro=false;enemy.returning=!enemy.corpse&&enemy.hp>0;
        enemy.attackWindup=0;enemy.attackCd=1.5;enemy.alertRemaining=0;
       }
       msg('Герой возродился у костра');resetPosition?.();
       updateSelection();
      }
      persist();
     }
    }
   }
   setModelAt(mob);
   birdAnimation(mob,dt,Math.hypot(mob.x-beforeX,mob.z-beforeZ));
  }
  updateTrainingTarget(dummy,clock);
  combatFeedback.update(dt);
  combatVfx.update(dt);
  stompEffect.update(dt);
  updateSelection();
  if(Math.floor(clock*5)!==Math.floor((clock-dt)*5))draw(false);
 }
 let resetPosition=null;
 function onRespawn(fn){resetPosition=fn;}
 let questMarkerQuality=.68;
 function updateQuestMarkers(){questMarkers.update(clock,questMarkerQuality);}
 function setVisualQuality(detail){
  combatVfx.setQuality(detail);
  camp.setVisualQuality(detail);
  questMarkerQuality=Number.isFinite(detail)?detail:.68;
 }
 function getAnimationState(){
  return {gather:camp.casting,attack:timeline.attackProgress,
   stomp:timeline.stompProgress,blockRemaining,weaponKind:hero.root.userData.weaponKind||'none'};
 }
 function getQuestMapState(){
  return {
   stage:state.quest,guide:state.quest===10,
   scout:state.quest===7||state.quest===8,
   relic:state.quest===4,
   bossAlive:giant.root.visible&&!giant.corpse&&giant.hp>0,
   boss:{x:giant.x,z:giant.z},scoutPosition:SCOUT_POSITION,relicPosition:RELIC_POSITION
  };
 }
 function handleSlotKey(key){
  const n=Number(key);if(Number.isInteger(n)&&n>=1&&n<=8){useAbility(n-1);return true;}
  return false;
 }
 persist();draw();void updateEquipmentVisuals();
 return {update,targetNearest,interact,resetWorldTransforms,canMoveTo,onRespawn,onResetProgress,handleSlotKey,getApproachTarget,stopAutoApproach,cancelAutoApproach,
  setMultiplayer,networkCharacter,onOnlinePlayers,onPartyState,onPartyInvite,onPartyNotice,onChat,onChestState,onChestResult,
  onVitals,onCombatEvent,onKillCredit,onMobAttack,onNetworkRespawn,onMobSnapshot,
  get movementLocked(){return timeline.stompProgress>=0},
  getAnimationState,getQuestMapState,setVisualQuality,updateQuestMarkers,draw,get state(){return state}};
}
