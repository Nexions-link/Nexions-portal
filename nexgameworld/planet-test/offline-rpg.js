import {createChestSheet} from './chest-sheet.js?v=3';
import {createCharacterPreview} from './character-preview.js?v=3';
import {renderCharacterSheet} from './character-sheet.js?v=6';
import {renderChiefRewardChoice} from './quest-reward-choice.js?v=1';
import {questWaypoint,questDirection,preferredQuestId} from './starter-quest-guidance.js?v=1';
// Offline spherical NexGame systems. Use the unchanged production rules for items,
// abilities, hotbar, loot and dummy statistics; do not connect to multiplayer or saves.
import {HOTBAR_ART,HOTBAR_SHORT,HOTBAR_AUTO_ACTIVE} from './native-hotbar-art.js?v=2';
import {getAbilityRangeIndicator,getAbilityResourceIndicator} from './ability-range-visuals.js?v=2';
import {compareEquipment,itemStatRows} from './equipment-comparison.js?v=1';
import {ITEM_CATALOG,MERCHANT_STOCK,deriveStats,itemStackLimit} from '../items.js?v=0.6.43.5';
import {getAbilityDefinition,getClassDefinition,createAbilityRuntime,tickAbilityRuntime,abilityFailure,activateAbility,changeResource,WARRIOR_RAGE_ON_HURT,WARRIOR_RAGE_DECAY} from '../skills.js?v=0.3.5';
import {DEFAULT_HOTBAR,normalizeHotbar,assignHotbarSlot,availableHotbarActions,actionDefinition} from '../hotbar.js?v=0.3.5.3';
import {TRAINING_DUMMY,createTrainingStats,applyTrainingHit,updateTrainingTarget} from '../training.js?v=0.3.5.1';
import {PLAINSTRIDER_REQUIRED_CLIPS,validatePlainstriderGltf,advancePlainstriderVisual,resetPlainstriderVisual,resetWalkingClip,PLAINSTRIDER_VISUAL_SCALE} from '../plainstrider-model.js?v=0.6.43.35';
import {AXE_TUNER_DEFAULTS} from '../axe-tuner.js?v=0.3.7.0';
import {BATTLEFURY_ITEM_ID,BATTLEFURY_TUNER_DEFAULTS,BATTLEFURY_TUNER_FIELDS,BATTLEFURY_TUNER_GROUPS,readBattlefuryTuning,saveBattlefuryTuning,applyBattlefuryPose} from './battlefury-tuner.js?v=2';
import {SWORD_TUNER_DEFAULTS} from '../sword-tuner.js?v=0.3.7.0';
import {DAGGER_TUNER_DEFAULTS} from '../dagger-tuner.js?v=0.3.7.0';
import {SHIELD_TUNER_DEFAULTS} from '../shield-tuner.js?v=0.3.7.0';
import {GATHER_QUESTS,GATHER_RESPAWN_SECONDS,OFFLINE_CHEST,createGatherWorld} from './gather-world.js?v=23';
import {BANDIT_WEAPON_ITEM,BANDIT_WEAPON_REQUIRED,BANDIT_WEAPON_RESPAWN_SECONDS,createBanditWeaponWorld} from './bandit-weapons.js?v=1';
import {createCampActions} from './camp-actions.js?v=21';
import {OFFLINE_RPG_SAVE_KEY,clearOfflineProgress} from './progress-reset.js?v=1';
import {HIT_REACTION_SECONDS} from '../combat-feedback.js?v=0.3.7.0';
import {createSphereCombatFeedback} from './sphere-combat-feedback.js?v=1';
import {createXpFeedback} from './xp-feedback.js?v=1';
import {createSphericalCombatVfx} from './sphere-combat-vfx.js?v=2';
import {createQuestMarkerFactory} from './quest-markers.js?v=3';
import {createCameraTargetFilter} from './camera-targeting.js?v=1';
import {createHostileTargetCycle,nearbyInteractable,CORPSE_LOOT_RANGE} from './interaction-targeting.js?v=23';
import {sphereFacingYaw,turnSphereYaw,sphereFacingError} from './mob-facing.js?v=1';
import {BOSS_POSITION,SCOUT_POSITION,RELIC_POSITION,QUEST_LINES,mentorChainNumber,mentorGlyph,mentorJournalRows,migrateMentorQuest,createMentorChain} from './mentor-chain.js?v=1';
import {createMentorWorld} from './mentor-world.js?v=1';
import {createSphericalTargetRing} from './spherical-target-ring.js?v=1';
import {animateSphericalTauren} from './tauren-animation.js?v=10';
import {incomingShieldHit,sphericalMeleeFacing} from './sphere-combat.js?v=3';
import {createCombatTimeline,MELEE_RANGE,APPROACH_RANGE,rageForHit,rollMeleeDamage} from './combat-timeline.js?v=1';
import {equipmentGrip,applyEquipmentTransform} from './equipment-grip.js?v=1';
import {EQUIPMENT_LABELS,equipFromBag,unequipToBag} from './equipment-rules.js?v=1';
import {applyWeaponQuality,itemRarity,QUALITY_VISUALS,highestLootRarity} from '../item-quality.js?v=0.3.7.1';
import {styleShieldGlb} from '../shield-assets.js?v=0.3.7.1';
import {canWalkCamp,cameraObstruction} from './sphere-physics.js?v=14';
import {canWadeAtLocal} from './start-zone.js?v=45';
import {moveMobToward,mobSegmentClear} from './mob-navigation.js?v=1';
import {consumeAnimationTime} from './animation-budget.js?v=1';
import {advanceCreatureGait} from './creature-gait.js?v=3';
import {advanceMobImpact,mobVisualMode} from './mob-impact.js?v=1';
import {advanceCreatureSecondary,applyCreatureSecondary,resetCreatureSecondary,shouldReplayCreatureHurt} from './creature-secondary.js?v=5';
import {advanceCreatureStrike,resetCreatureStrike} from './creature-strike.js?v=1';
import {createSphericalStomp} from './sphere-skill-effects.js?v=1';
import {createMobDeath} from './mob-death.js?v=2';
import {NORMAL_MOB_RESPAWN_SECONDS,advanceCorpseTimer,advanceRespawnTimer,canStoreCorpseRow,takeCorpseRow,takeAllCorpseRows} from './corpse-loot.js?v=4';
import {rollCreatureLoot} from './loot-tables.js?v=2';
import {creatureByIndex,BANDIT_SPAWNS,BANDIT_QUEST_GIVER,BANDIT_QUEST_KILLS,BANDIT_QUEST_MIN_LEVEL,BANDIT_BOSS_SCALE} from './creature-registry.js?v=5';
import {createBanditVisual} from './bandit-visual.js?v=2';
import {rollCreatureCoins} from './creature-types.js?v=1';
import {creatureTypeForMob,CREATURE_TYPE_LABELS,CORPSE_COIN_ID,isValidCorpseCoins} from './creature-types.js?v=1';
import {DOLGONOG_SPAWNS,mobLevelForIndex,mobBaseExperience,monsterKillExperience,monsterDifficulty,MONSTER_LEVEL_COLORS,monsterMaxHealth,monsterAttackDamage} from './mob-levels.js?v=1';
import {sellInventorySlot,buyBackFromMerchant,restoreBuyback} from './merchant-trade.js?v=1';

const UP_AXIS=[0,1,0], TAU=Math.PI*2;
const SPAWNS=DOLGONOG_SPAWNS.slice(0,-1);
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
export function createOfflineRpg({THREE,scene,hero,makeTauren,playerNormal,getRadius,toNormal,toLocal,heightAt,camera,canvas,preview=false,authenticatedProfile=null}){
 const serverInitial=()=>{
  const safe=initial(),row=authenticatedProfile;
  safe.level=row.level;safe.xp=row.experience||0;safe.gold=row.gold||0;
  safe.hp=row.health??null;safe.resource=row.resource||0;
  safe.inventory=Array.isArray(row.inventory)?row.inventory.filter(Boolean).map(item=>({...item})):[];
  safe.equipment=row.equipment||{};
  safe.quest=row.quests?.mentor?.step||0;
  safe.gatherStage=row.quests?.gather?.stage||0;
  safe.gatherAvailable=safe.gatherStage>=1&&safe.gatherStage<=3&&
   row.quests?.gather?.accepted===false;
   safe.banditQuest=row.quests?.bandit||{stage:0,kills:0};
  safe.banditChiefQuest=row.quests?.banditChief||{stage:0};
  safe.banditWeaponsQuest=row.quests?.banditWeapons||{stage:row.quests?.banditChief?.stage>0?2:0};
  safe.hotbar=normalizeHotbar(row.actionBar?.length?row.actionBar:DEFAULT_HOTBAR,'warrior',safe.level);
  return safe;
 };
 const state=preview?initial():authenticatedProfile?serverInitial():restore(),runtime=createAbilityRuntime();
 let chiefRewardSelection=null,chiefRewardSubmitting=false,chiefRewardRenderSnapshot=null;
 let serverBagSlots=Array.isArray(authenticatedProfile?.inventory)?
  authenticatedProfile.inventory.map(row=>row?{...row}:null):Array(12).fill(null);
 // The UI compacts occupied cells, but mutations must keep real server slots.
 function syncServerBag(rows){
  if(!authenticatedProfile||!Array.isArray(rows))return false;
  serverBagSlots=Array.from({length:12},(_,i)=>rows[i]?{...rows[i]}:null);
  state.inventory=serverBagSlots.filter(Boolean).map(row=>({...row}));
  return true;
 }
 const isAccountHero=()=>!!authenticatedProfile;
 const serverBagSlot=(clientIndex)=>{
  const row=state.inventory[clientIndex];if(!row)return -1;
  const ordinal=state.inventory.slice(0,clientIndex+1).filter(r=>r.id===row.id).length;
  let found=0;
  for(let i=0;i<serverBagSlots.length;i++)
   if(serverBagSlots[i]?.id===row.id&&++found===ordinal)return i;
  return -1;
 };
 const sendAccountAction=(kind,params={})=>{
  if(!isOnline())return msg('Нет связи с сервером. Изменения не применены.');
  if(!multiplayer.economy(kind,{...params,
   ...(['merchantBuy','merchantSell'].includes(kind)?{requestId:crypto.randomUUID()}:{} )})){
   msg('Не удалось отправить команду');return false;
  }
  return true;
 };

 const rightHand=hero.arms[1]?.hand,leftHand=hero.arms[0]?.hand;
 const modelSlots={weapon:null,shield:null};
 let battlefuryTuning=readBattlefuryTuning(localStorage);
 function tuneBattlefury(values){
  battlefuryTuning=saveBattlefuryTuning(localStorage,values);
  if(state.equipment.weapon?.id!==BATTLEFURY_ITEM_ID||!modelSlots.weapon||!rightHand)return;
  const grip=applyBattlefuryPose(modelSlots.weapon,rightHand,battlefuryTuning);
  hero.root.userData.equipmentGrip.weapon=grip;
  characterPreview.refresh();
 }
 const characterPreview=createCharacterPreview({THREE,heroRoot:hero.root});
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
  const loader=await modelLoader;
  if(request!==visualRequest)return;
  if(!loader){characterPreview.refresh();return;}
  const desired=[];
  if(weaponKind&&rightHand){
   const data={axe:['tauren-axe-v0.1.glb',AXE_TUNER_DEFAULTS,'axe'],sword:['plains-sword-v0.1.glb',SWORD_TUNER_DEFAULTS,'sword'],dagger:['steppe-dagger-v0.1.glb',DAGGER_TUNER_DEFAULTS,'dagger']}[weaponKind];
   if(weaponDef?.modelPath)desired.push(['weapon',weaponDef.modelPath,battlefuryTuning,'axe',rightHand]);
    else if(data)desired.push(['weapon','../assets/weapons/'+data[0],data[1],data[2],rightHand]);
  }
  if(shieldKind&&leftHand){
   const name=shieldKind==='kite'?'nexgame_kite_shield_quality.glb':'nexgame_round_shield_poor.glb';
   desired.push(['shield','../assets/shields/'+name,SHIELD_TUNER_DEFAULTS[shieldKind],shieldKind,leftHand]);
  }
  for(const [slot,url,tuning,kind,hand] of desired){
   try{
    const gltf=await loader.loadAsync(url);
    if(request!==visualRequest)return;
    const unique=slot==='weapon'&&weaponDef?.adminOnly;
    // Only runtime scene transforms are changed; the original GLB stays untouched.
    const mesh=unique?new THREE.Group():gltf.scene;
    if(unique){
     const asset=gltf.scene,bbox=new THREE.Box3().setFromObject(asset);
     const dim=bbox.getSize(new THREE.Vector3());
     const scale=1.95/Math.max(0.001,dim.x,dim.y,dim.z);
     const center=bbox.getCenter(new THREE.Vector3());
     asset.scale.multiplyScalar(scale);
     asset.position.sub(center.multiplyScalar(scale));
     mesh.add(asset);
    }
    mesh.name='gear-'+(slot==='shield'?'shield':kind);
    const def=slot==='weapon'?weaponDef:shieldDef;
    const grip=unique?applyBattlefuryPose(mesh,hand,battlefuryTuning):
     applyEquipmentTransform(mesh,hand,{slot,kind,tuning,sourceId:def?.sourceId});
    hand.add(mesh);modelSlots[slot]=mesh;
    hero.root.userData.equipmentGrip[slot]=grip;
    if(slot==='weapon')applyWeaponQuality(THREE,hero.root,kind,weaponDef?.rarity);
    if(slot==='shield')styleShieldGlb(THREE,mesh,shieldDef?.rarity);
   }catch(err){console.warn('Planet equipment model unavailable',url,err);}
  }
  characterPreview.refresh();
 }

 let target=null,autoplay=false,swing=0,clock=0,messageUntil=0,pendingLoot=null,pendingLootTake=null,chooseSlot=-1,gatherCast=null,
  blockRemaining=0,approach=null;
 const timeline=createCombatTimeline();
 let lastCombatAt=-100;
 function inCombat(){
  const current=timeline.current;
  const swinging=current&&current.skill!=='thunderStomp'&&isLivingHostile(current.target);
  const preparingStomp=current?.skill==='thunderStomp'&&!current.impacted&&[...mobs,dummy].some(e=>isLivingHostile(e)&&distance(e)<4.5);
  return swinging||preparingStomp||mobs.some(m=>m.root.visible&&m.hp>0&&!m.corpse&&m.aggro);
 }
 let journalTab='current',merchantTab='buy',selectedEquipmentSlot=null;
 let trackedQuestId=null,journalRenderSnapshot=null;
 let selectedBagSlot=-1,selectedBagItemId=null,bagRenderSnapshot=null;
 const group=new THREE.Group();scene.add(group);
 // The mesh is bent vertex-by-vertex onto the actual spherical terrain:
 // no texture intersection/z-fighting and a saturated red outline.
 const targetRing=createSphericalTargetRing({THREE,parent:group,getRadius,toNormal,heightAt});
 const stompEffect=createSphericalStomp({THREE,parent:group,getRadius,heightAt});
 const up=new THREE.Vector3(...UP_AXIS),anchorQuat=new THREE.Quaternion(),spinQuat=new THREE.Quaternion();
 const mobs=[],entities=[],citizens=[];
 let multiplayer=null,partyState={groupId:null,leaderId:null,members:[]},onlinePlayers=[],onlineChest=null;
 let selectedAllyId=null;
 const chatHistory=[];
 // Refresh the live party and nearby-player list without touching the chat input.
 // iOS Safari closes its keyboard if the focused input is detached.
 function paintPartyRoster(roster){
  if(!roster)return;
  const snapshot=JSON.stringify([partyState.groupId,partyState.leaderId,
   partyState.members.map(member=>[member.id,member.name,member.level]),
   onlinePlayers.map(peer=>[peer.id,peer.name,peer.level])]);
  if(roster.dataset.snapshot===snapshot)return;
  roster.dataset.snapshot=snapshot;
  roster.replaceChildren();
  const row=(label,caption,actions=[])=>{
   const node=document.createElement('div');node.className='rpgRow';
   const name=document.createElement('div');name.innerHTML='<strong></strong><small></small>';
   name.querySelector('strong').textContent=label;
   name.querySelector('small').textContent=caption;
   node.append(name);
   for(const [caption,fn] of actions){
    const button=document.createElement('button');
    button.type='button';button.textContent=caption;button.addEventListener('click',fn);
    node.append(button);
   }
   roster.append(node);
  };
  row('Группа',partyState.groupId?'Участников: '+partyState.members.length+' / 5':'Вы пока не в группе',
   partyState.groupId?[['Покинуть',()=>multiplayer.leaveParty()]]:[]);
  for(const member of partyState.members)
   row(member.name||'Игрок',(member.id===partyState.leaderId?'Лидер · ':'')+'Уровень '+(member.level||1),
    onlinePlayers.some(peer=>peer.id===member.id)?[['Выбрать',()=>{selectAlly(member.id);closeWindow()}]]:[]);
  if(!partyState.groupId||partyState.members.length<5){
   row('Игроки в мире','Выбери игрока для приглашения.');
   for(const peer of onlinePlayers)if(!partyState.members.some(member=>member.id===peer.id))
    row(peer.name||'Странник','Уровень '+(peer.level||1),[
     ['Выбрать',()=>{selectAlly(peer.id);closeWindow()}],
     ['Пригласить',()=>multiplayer.invite(peer.id)]
    ]);
   if(!onlinePlayers.length)row('Никого рядом','Другие игроки в этом мире пока не обнаружены.');
  }
 }
 const rosterKey=rows=>JSON.stringify(rows.map(({id,name,level})=>[id,name,level]).sort((a,b)=>a[0].localeCompare(b[0])));
 function paintChatHistory(){
  const log=$('partyChatLog');
  if(!log)return;
  const atBottom=log.scrollHeight-log.clientHeight-log.scrollTop<35;
  log.replaceChildren();
  for(const entry of chatHistory){
   const row=document.createElement('div');
   row.className='ngw-chat-entry';
   const prefix=document.createElement('strong');
   prefix.textContent=(entry.channel==='party'?'[Группа] ':'[Мир] ')+(entry.name||'Игрок')+': ';
   const body=document.createElement('span');
   body.textContent=entry.text;
   row.append(prefix,body);log.append(row);
  }
  if(atBottom)log.scrollTop=log.scrollHeight;
 }
 function paintAllyTarget(){
  const ally=selectedAllyId?onlinePlayers.find(player=>player.id===selectedAllyId):null;
  const frame=$('allyFrame');
  frame.hidden=!ally||!isOnline();
  if(!ally||!isOnline())return false;
  $('allyName').textContent=ally.name||'Игрок';
  $('allyLevel').textContent='Уровень '+(ally.level||1)+' · Таурен · Воин';
  const max=Number(ally.maxHp)||0,hp=Math.max(0,Number(ally.hp)||0);
  $('allyHpFill').style.width=(max>0?clamp(hp/max*100,0,100):0)+'%';
  $('allyHpText').textContent=max>0?Math.ceil(hp)+' / '+max:'HP —';
  const alreadyMember=partyState.members.some(member=>member.id===ally.id);
  const notLeader=!!partyState.groupId&&partyState.leaderId!==multiplayer?.selfId;
  const invite=$('allyInvite');
  invite.disabled=alreadyMember||notLeader||partyState.members.length>=5;
  invite.textContent=alreadyMember?'В вашей группе':notLeader?'Приглашает лидер':'Пригласить в группу';
  return true;
 }
 function selectAlly(id){
  if(!onlinePlayers.some(row=>row.id===id))return;
  targetEntity(null);
  selectedAllyId=id;
  draw();
 }
 function inviteSelectedAlly(){
  if(!selectedAllyId||!isOnline())return msg('Игрок недоступен');
  if(!multiplayer.invite(selectedAllyId))msg('Не удалось отправить приглашение');
 }
 let chestRetryTimer=null,chestRetryCount=0;
 function clearChestRetry(){
  if(chestRetryTimer!==null)clearTimeout(chestRetryTimer);
  chestRetryTimer=null;chestRetryCount=0;
 }
 const receivedCredits=new Set();
 const isOnline=()=>!!multiplayer?.connected;
 function setMultiplayer(transport){multiplayer=transport||null;}
 function networkCharacter(){return {level:state.level,hp:state.hp,equipment:state.equipment};}
 function onOnlinePlayers(rows){
  const next=Array.isArray(rows)?rows:[];
  const changed=rosterKey(next)!==rosterKey(onlinePlayers);
  onlinePlayers=next;
  const lostSelection=!!selectedAllyId&&!next.some(peer=>peer.id===selectedAllyId);
  if(lostSelection)selectedAllyId=null;
  paintAllyTarget();
  if(lostSelection)draw(false);
  if(changed&&!modal.hidden&&modal.dataset.kind==='party')paintPartyRoster($('mbody').querySelector('.ngw-party-roster'));
 }
 function onPartyState(event){
  partyState=event||{groupId:null,leaderId:null,members:[]};
  paintAllyTarget();
  if(!modal.hidden&&modal.dataset.kind==='party')paintPartyRoster($('mbody').querySelector('.ngw-party-roster'));
 }
 function onPartyInvite(event){
  if(isOnline())multiplayer.respondInvite(event.fromId,window.confirm((event.fromName||'Игрок')+' приглашает в группу. Принять?'));
 }
 function onPartyNotice(event){if(event?.message)msg(event.message);}
 function onChat(event){
  if(!event?.text)return;
  chatHistory.push({channel:event.channel,name:event.name,text:event.text});
  if(chatHistory.length>60)chatHistory.shift();
  paintChatHistory();
  if(modal.hidden||modal.dataset.kind!=='party')
   msg((event.channel==='party'?'[Группа] ':'[Мир] ')+(event.name||'Игрок')+': '+event.text,3.3);
 }
 function onChestState(event){
  onlineChest={...(onlineChest||{}),...event};
  if(Array.isArray(event?.inventory))syncServerBag(event.inventory);
  if(Array.isArray(event?.slots)){setChestUsed(event.slots,event.revision);clearChestRetry();}
  if(!modal.hidden&&modal.dataset.kind==='chest'){
   if(Array.isArray(event?.slots)){gathering.setChestOpen(true);chestLabel.visible=false;}
   renderModal();
  }
 }
 function onChestStatus(event){
  if(!Number.isInteger(event?.occupied)||event.occupied<0||
     event.occupied>OFFLINE_CHEST.slots)return;
  if(Number.isInteger(event.revision)&&event.revision<lastChestRevision)return;
  knownChestUsed=event.occupied;
  if(Number.isInteger(event.revision))lastChestRevision=event.revision;
  // A confirmed response ends the rapid initialization retries.
  nextChestStatusCheck=clock+8;
  paintChestLabel();
 }
 function onChestResult(event){
  chestSheet.result(event);
  if(event?.ok&&Array.isArray(event.inventory)){
   if(!syncServerBag(event.inventory))
    state.inventory=event.inventory.filter(Boolean).map(row=>({...row}));
   onlineChest={slots:event.slots,revision:event.revision,inventory:event.inventory};
   setChestUsed(event.slots,event.revision);
   persist();draw();
   if(!modal.hidden&&modal.dataset.kind==='chest')renderModal();
  }else {
   const awaitingOpen=!modal.hidden&&modal.dataset.kind==='chest'&&!Array.isArray(onlineChest?.slots);
   // A server-owned hero position can trail the client after Safari throttles
   // frames. Recheck only an OPEN rejection, never an inventory mutation.
   if(awaitingOpen&&event?.reason==='interaction_too_far'&&
      (!event.kind||event.kind==='chestOpen')&&isOnline()&&chestRetryCount<12){
    chestRetryCount++;
    if(chestRetryTimer!==null)clearTimeout(chestRetryTimer);
    chestRetryTimer=setTimeout(()=>{
     chestRetryTimer=null;
     if(modal.hidden||modal.dataset.kind!=='chest'||Array.isArray(onlineChest?.slots))return;
     if(!isOnline()||multiplayer.openChest(onlineChest?.inventory)===false){
      closeWindow();msg('Нет связи с сервером');
     }
    },700);
    renderModal();return;
   }
   const labels={interaction_too_far:'Подойди ближе к сундуку',untrusted_interaction_context:'Нельзя открыть сундук во время боя',chest_not_open:'Открой сундук заново',chest_transfer_rejected:'В сундуке или рюкзаке нет места',pending_server_inventory:'Дождись загрузки персонажа',server_save_failed:'Сундук временно недоступен'};
   if(awaitingOpen)closeWindow();
   if(event?.reason)msg(labels[event.reason]||'Не удалось переместить предмет. Открой сундук заново.');
   if(!modal.hidden&&modal.dataset.kind==='chest')renderModal();
  }
 }
 let pendingServerGather=null;
 let serverGatherTimer=null;
 // Online plants and bandit daggers share the herbalist's original casting UI
 // and the same Tauren kneeling pose. The server remains authoritative over
 // elapsed cast time, collection range, item grant and cooldown.
 function stopServerGatherCast(){
  if(serverGatherTimer!==null)clearTimeout(serverGatherTimer);
  serverGatherTimer=null;pendingServerGather=null;
  if(!camp.casting){
   $('gatherCast').hidden=true;
   $('gatherCastFill').style.width='0%';
   $('gatherCast').setAttribute('aria-valuenow','0');
  }
 }
 function startServerGatherCast(job,castMs){
  if(serverGatherTimer!==null)clearTimeout(serverGatherTimer);
  job.phase='casting';job.startedAt=Date.now();
  job.durationMs=Math.max(1500,Math.min(20000,Number(castMs)||1500));
  $('gatherCast').hidden=false;
  $('gatherCastLabel').textContent=job.kind==='banditWeapon'?
   'Сбор: Кинжал разбойника':'Сбор: '+(ITEM_CATALOG[GATHER_QUESTS[job.stage]?.item]?.name||'Растение');
  $('gatherCastTime').textContent=(job.durationMs/1000).toFixed(1).replace('.',',')+' с';
  $('gatherCastFill').style.width='0%';
  $('gatherCast').setAttribute('aria-valuenow','0');
  serverGatherTimer=setTimeout(()=>{
   serverGatherTimer=null;
   if(pendingServerGather!==job)return;
   if(!isOnline()){stopServerGatherCast();return}
   job.phase='finishing';
   $('gatherCastFill').style.width='100%';
   $('gatherCastTime').textContent='0,0 с';
   $('gatherCast').setAttribute('aria-valuenow','100');
   const sent=job.kind==='banditWeapon'?
    sendAccountAction('banditWeaponFinish',{index:job.index}):
    sendAccountAction('gatherFinish',{stage:job.stage,index:job.index});
   if(!sent)stopServerGatherCast();
  },job.durationMs+120);
 }
 function updateServerGatherCast(){
  const job=pendingServerGather;
  if(!job||!['casting','finishing'].includes(job.phase))return;
  if(!isOnline()){stopServerGatherCast();return}
  if(Date.now()-job.startedAt>10000){
   stopServerGatherCast();msg('Сервер не подтвердил сбор. Попробуй снова.');return;
  }
  const elapsed=Math.max(0,Date.now()-job.startedAt);
  const percent=job.phase==='finishing'?100:Math.min(100,elapsed/job.durationMs*100);
  $('gatherCast').hidden=false;
  $('gatherCastFill').style.width=percent.toFixed(1)+'%';
  $('gatherCastTime').textContent=(Math.max(0,job.durationMs-elapsed)/1000).toFixed(1).replace('.',',')+' с';
  $('gatherCast').setAttribute('aria-valuenow',String(Math.round(percent)));
 }
 let lastServerScoutRequest=0;
 function onEconomyResult(event){
  if(!authenticatedProfile||!event)return;
  if(event.kind==='lootTake')pendingLootTake=null;
  if(event.ok&&['lootAvailable','lootOpen','lootInspect','lootTake'].includes(event.kind)){
   const mob=mobs.find(e=>e.id===event.mobId);
   if(!mob||mob.life!==event.life)return;
   mob.loot=(Array.isArray(event.loot)?event.loot:[]).filter(row=>
    (ITEM_CATALOG[row?.id]&&Number.isInteger(row.qty)&&row.qty>0)||
    isValidCorpseCoins(row)).map(row=>({...row}));
   mob.lootKnown=true;updateLootMarker(mob);
   if(event.kind==='lootOpen'){pendingLoot=mob;openWindow('loot')}
   else if(event.kind==='lootTake'&&pendingLoot===mob&&!modal.hidden&&modal.dataset.kind==='loot'){
    if(!mob.loot.length)finishCorpseLoot(mob);else renderModal();
   }
   if(event.taken?.length)msg('Получено: '+event.taken.map(row=>row.id===CORPSE_COIN_ID?'Монеты +'+row.qty:(ITEM_CATALOG[row.id]?.name||row.id)+(row.qty>1?' ×'+row.qty:'')).join(', '));
   draw();return;
  }
  if(!event.ok){
   if(event.kind==='banditChiefTurnIn'){
    chiefRewardSubmitting=false;
    chiefRewardRenderSnapshot=null;
    if(!modal.hidden&&modal.dataset.kind==='banditQuest')renderModal();
   }
   if(['gatherStart','gatherFinish','banditWeaponStart','banditWeaponFinish'].includes(event.kind))
    stopServerGatherCast();
   if(event.kind==='lootTake'&&!modal.hidden&&modal.dataset.kind==='loot'){
    renderModal();
    const reason=event.reason==='inventory_full'?'Рюкзак заполнен — вещи остались на теле.':
     event.reason==='interaction_too_far'?'Подойди к телу ближе.':
     event.reason==='corpse_empty'?'Тело уже обыскано.':
     'Не удалось забрать предмет. Попробуй ещё раз.';
    lootNotice(reason);
    return;
   }
   const labels={
    interaction_too_far:'Подойди ближе к персонажу или предмету',
    bandit_quest_level_too_low:'Задание на разбойников доступно с 3-го уровня.',
    bandit_weapons_quest_locked:'Сначала заверши разведку лагеря.',
    bandit_weapons_quest_unavailable:'Задание на оружие сейчас недоступно.',
    bandit_weapons_quest_not_active:'Сначала прими задание «Оружие разбойников».',
    bandit_weapons_already_collected:'Все три кинжала собраны. Вернись к следопыту.',
    bandit_weapons_quest_not_ready:'Нужно собрать три кинжала.',
    bandit_chief_quest_locked:'Заверши предыдущие задания и достигни 4-го уровня.',
    invalid_quest_reward_choice:'Сначала выбери топор или щит.',
    bandit_chief_quest_already_paid:'Награда за главаря уже получена.',
    untrusted_interaction_context:'Сейчас взаимодействовать нельзя',
    not_enough_gold:'Недостаточно монет',inventory_full:'Рюкзак заполнен',
    item_not_owned:'Предмет не найден в рюкзаке',item_not_sellable:'Предмет нельзя продать',
    potion_cooldown:'Зелье восстанавливается',potion_not_needed:'Сейчас здоровье полное',
    chest_transfer_rejected:'В сундуке или рюкзаке нет места',
    gather_node_respawning:'Растение ещё не выросло',
    gather_cast_in_progress:'Сбор пока не завершён',gather_cast_not_started:'Сбор прерван',
    quest_not_ready:'Сначала выполни условия задания',
    quest_not_active:'Сначала прими задание травницы',
    mentor_reward_not_ready:'Испытание ещё не завершено',
    stale_revision:'Сохранение обновилось. Повтори действие',
    corpse_unavailable:'Тело уже исчезло или недоступно',corpse_empty:'Тело уже обыскано',
    corpse_not_owned:'Эта добыча принадлежит другому персонажу',
    equipment_requirements_not_met:'Это снаряжение пока нельзя надеть'
   };
   msg(labels[event.reason]||'Сервер отклонил действие: '+(event.reason||'ошибка'));
   return;
  }
  if((event.kind==='gatherStart'||event.kind==='banditWeaponStart')&&pendingServerGather){
   const job=pendingServerGather;
   if(event.kind!==(job.kind==='banditWeapon'?'banditWeaponStart':'gatherStart'))return;
   if(job.phase==='request')startServerGatherCast(job,event.castMs);
   return;
  }
  if((event.kind==='gatherFinish'||event.kind==='banditWeaponFinish')&&pendingServerGather){
   const job=pendingServerGather;
   if(event.kind!==(job.kind==='banditWeapon'?'banditWeaponFinish':'gatherFinish')||
      job.phase!=='finishing')return;
   stopServerGatherCast();
   const node=job.kind==='banditWeapon'?banditWeapons.nodes.find(n=>n.index===job.index):
    gathering.nodes.find(n=>n.stage===job.stage&&n.index===job.index);
   if(node)node.readyAt=clock+(job.kind==='banditWeapon'?BANDIT_WEAPON_RESPAWN_SECONDS:GATHER_RESPAWN_SECONDS);
  }
  const labels={
   hotbarSet:'Панель умений сохранена',merchantBuy:'Покупка сохранена',merchantSell:'Продажа сохранена',
   gatherAccept:'Задание травницы принято',gatherFinish:'Ресурс собран и сохранён',
   banditAccept:'Разведка принята · найди лагерь на западе.',
   banditTurnIn:'Разведка завершена! Следопыт предложит собрать кинжалы.',
   banditWeaponsAccept:'Задание «Оружие разбойников» принято',
   banditWeaponFinish:'Кинжал разбойника собран',
   banditWeaponsTurnIn:'Оружие сдано следопыту! Открывается задание на главаря.',
   banditChiefAccept:'Задание на главаря принято',banditChiefTurnIn:'Главарь побеждён. Цепочка завершена!',
   gatherTurnIn:'Награда за сбор получена',mentorAccept:'Испытание принято',
   mentorInteract:'Цель задания выполнена',mentorTurnIn:'Награда наставника получена',
   equip:'Предмет экипирован',unequip:'Предмет снят',
   usePotion:'Зелье использовано и сохранено'
  };
  if(event.kind==='banditChiefTurnIn'){
   chiefRewardSubmitting=false;
   chiefRewardSelection=null;
   chiefRewardRenderSnapshot=null;
  }
  if(labels[event.kind])msg(labels[event.kind],2.2);
  if(!modal.hidden&&['merchant','mentor','herbalist','bag','character','quests','spells','banditQuest'].includes(modal.dataset.kind))
   renderModal();
 }
 function onVitals(event){
  if(!isOnline())return;
  if(Number.isFinite(event.hp))state.hp=Math.max(0,Math.min(stats().maxHp,event.hp));
  if(Number.isFinite(event.resource))state.resource=clamp(event.resource,0,100);
 }
 function onCombatEvent(event,selfId){
  const mob=mobs.find(e=>e.id===event?.mobId);
  if(!mob||event.life!==mob.life)return;
  if(Number.isFinite(event.hp))mob.hp=Math.max(0,event.hp);
  mob.hit=HIT_REACTION_SECONDS;
  mob.visualHitSequence=(mob.visualHitSequence||0)+1;
  combatFeedback.hit(mob,event.damage,event.abilityId);
  combatVfx.trigger(mob,event.abilityId==='heavyStrike'?'strong':event.abilityId==='thunderStomp'?'stomp':'hit');
  if(event.fromId===selfId)lastCombatAt=clock;
  draw(false);
 }
 function applyServerProgress(progress,source='checkpoint'){
  if(!authenticatedProfile||!progress||!Number.isInteger(progress.level))return;
  const previousLevel=state.level,previousXp=state.xp,previousGold=state.gold;
  state.level=progress.level;
  state.xp=progress.experience;
  state.gold=progress.gold;
  if(Array.isArray(progress.inventory))syncServerBag(progress.inventory);
  if(progress.equipment&&typeof progress.equipment==='object')
   state.equipment=progress.equipment;
  if(progress.quests?.mentor?.step!==undefined)
   state.quest=progress.quests.mentor.step;
  if(progress.quests?.gather?.stage!==undefined){
   state.gatherStage=progress.quests.gather.stage;
   state.gatherAvailable=progress.quests.gather.stage>=1&&progress.quests.gather.stage<=3
    &&!progress.quests.gather.accepted;
  }
  if(progress.quests?.mentor?.kills!==undefined)state.kills=progress.quests.mentor.kills;
  if(progress.quests?.bandit)state.banditQuest={...progress.quests.bandit};
  if(progress.quests?.banditChief)state.banditChiefQuest={...progress.quests.banditChief};
  state.banditWeaponsQuest=progress.quests?.banditWeapons?{...progress.quests.banditWeapons}:
   {stage:progress.quests?.banditChief?.stage>0?2:0};
  if(source==='welcome'){chiefRewardSubmitting=false;chiefRewardRenderSnapshot=null;}
  if(source==='welcome'||source==='usePotion'){
   state.hp=progress.health;
   if(source==='welcome')state.resource=progress.resource;
  }
  state.hotbar=normalizeHotbar(progress.actionBar?.length?progress.actionBar:DEFAULT_HOTBAR,'warrior',state.level);
  void updateEquipmentVisuals();
  draw();
  if(!modal.hidden&&['merchant','mentor','herbalist','bag','character','quests','chest','spells','banditQuest'].includes(modal.dataset.kind))renderModal();
  if(source==='mob'){
   // A saved revision can be rebroadcast during reconnect. Never animate it twice.
   if(Number.isInteger(progress.revision)&&progress.revision===lastMobXpRevision)return;
   if(Number.isInteger(progress.revision))lastMobXpRevision=progress.revision;
   let gained=state.xp-previousXp;
   for(let level=previousLevel;level<state.level&&level<60;level++)gained+=xpRequired(level);
   gained=Math.max(0,gained);
   xpFeedback.show(gained,{levelUp:state.level>previousLevel});
   msg(gained>0?
    'Получено +'+gained+' опыта. Осмотри тело для получения добычи.':
    'Противник слишком слаб: 0 опыта. Добыча остаётся на теле.',2.6);
  }
 }
 function onKillCredit(event){
  if(authenticatedProfile)return;
  const mob=mobs.find(e=>e.id===event?.mobId);
  if(!mob||!Number.isInteger(event.life))return;
  const key=event.mobId+':'+event.life;
  if(receivedCredits.has(key))return;
  receivedCredits.add(key);
  mob.loot=Array.isArray(event.loot)?event.loot.filter(row=>row&&((ITEM_CATALOG[row.id]&&Number.isInteger(row.qty)&&row.qty>0)||isValidCorpseCoins(row))).map(row=>({...row})):[];
  const gainedXp=monsterKillExperience(state.level,mob.level,mobBaseExperience(mob.level,mob.boss));
  state.xp+=gainedXp; // Coins are never awarded by a kill event.
  xpFeedback.show(gainedXp);
  mentorChain.killed(mob);levelCheck();persist();updateLootMarker(mob);draw();
  msg('Награда за '+mob.name+': опыт '+gainedXp);
 }
 function onMobAttack(event){
  if(!isOnline())return;
  // End the visual windup on the server-confirmed hit, not on client guesswork.
  const attacker=mobs.find(m=>m.id===event?.mobId);
  if(attacker){
   // A late hit from the mob's previous life may still arrive after respawn.
   // Never cancel the NEW life's windup or animate a phantom strike.
   if(Number.isInteger(event.life)&&event.life!==attacker.life)return;
   attacker.attackWindup=0;
   attacker.visualStrikeHitSequence=(attacker.visualStrikeHitSequence||0)+1;
  }
  if(Number.isFinite(event.hp))state.hp=Math.max(0,event.hp);
  if(event.blocked){blockRemaining=.65;hero.root.userData.blockRecoil=.65;combatVfx.trigger({root:hero.root},'block');}
  state.resource=changeResource(state.resource,5,'warrior');lastCombatAt=clock;draw(false);
 }
 function onMobTelegraph(event){
  if(!isOnline()||typeof event?.mobId!=='string')return;
  const mob=mobs.find(e=>e.id===event.mobId);
  if(!mob||mob.corpse||!mob.root.visible||event.life!==mob.life)return;
  // Drive both the bandit GLB Attack clip and the longstrider peck from the
  // authoritative windup. The next server hit/cancel or expiry ends this state.
  const seconds=Number.isFinite(event.windupMs)?
   Math.min(1,Math.max(.1,event.windupMs/1000)):.45;
  mob.attackWindup=Math.max(mob.attackWindup||0,seconds+.12);
  mob.visualStrikeCue=(mob.visualStrikeCue||0)+1;
  mob.visualStrikeWindupSeconds=seconds;
  if(mob.birdVisual)mob.birdVisual.attackRemaining=Math.max(
   mob.birdVisual.attackRemaining||0,Math.min(1.05,Math.max(.8,seconds+.12)));
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
   if(!remote||(remote.id&&remote.id!==mob.id)||!['alive','corpse','hidden'].includes(remote.phase)||
    !Number.isFinite(remote.x)||!Number.isFinite(remote.z)||!Number.isFinite(remote.hp))continue;
   const wasCorpse=mob.corpse,wasHidden=!mob.root.visible,changedLife=mob.life!==remote.life;
   mob.x=remote.x;mob.z=remote.z;mob.yaw=Number.isFinite(remote.yaw)?remote.yaw:0;
   if(!Number.isFinite(mob.renderX)||wasHidden||wasCorpse||changedLife){
    mob.renderX=mob.x;mob.renderZ=mob.z;mob.renderYaw=mob.yaw;
   }
   mob.hp=remote.hp;mob.life=remote.life;mob.aggro=remote.aggro===true;mob.returning=false;
   if(remote.phase!=='alive'||changedLife){
    mob.attackWindup=0;mob.animationPending=0;mob.animationTravel=0;
   }
   // Creature levels are canonical; a malformed snapshot must not invent levels.
   if(remote.level===creatureByIndex(mob.index)?.level)mob.level=remote.level;
   mob.corpse=remote.phase==='corpse';mob.dead=mob.corpse?6:0;
   mob.root.visible=remote.phase!=='hidden';
   if(mob.corpse&&!wasCorpse){
    mob.deathAnimation.begin(playerNormal());
    if(target===mob){target=null;autoplay=false;approach=null;timeline.clear();}
   }else if(remote.phase==='alive'&&(wasCorpse||wasHidden)){
    mob.deathAnimation.reset();if(mob.family!=='bandit')resetPlainstriderVisual(mob);
    resetCreatureImpact(mob);
    if(mob.pendingBanditAsset){attachBanditVisual(mob,mob.pendingBanditAsset);mob.pendingBanditAsset=null;}
    mob.loot=null;mob.lootKnown=false;mob.lootInspectAt=0;mob.navigation=null;
   }else if(remote.phase==='hidden'){
    mob.loot=null;if(pendingLoot===mob)closeWindow();
   }
   if(mob.corpse||wasHidden||changedLife)setModelAt(mob);
   updateLootMarker(mob);
  }
 }
 const hotbar=$('actionsBar'),modal=$('modal'),toast=$('toast');
 const feedbackLayer=$('combatFeedback');
 if(!feedbackLayer)throw Error('Отсутствует слой чисел урона');
 const combatFeedback=createSphereCombatFeedback({THREE,document,camera,layer:feedbackLayer});
 const xpFeedback=createXpFeedback({document,layer:$('xpFeedback')});
 let lastMobXpRevision=null;
  const combatVfx=createSphericalCombatVfx({THREE,parent:scene,
   getViewerNormal:playerNormal,getRadius});
  const questMarkers=createQuestMarkerFactory(THREE,{document,camera});
 const nameEl=$('playerName'),objective=$('qtext');
 const originalControls=$('labSettingsSources');
 const settingsControls=[...originalControls.children];
 if(!hotbar||!modal||!toast||!nameEl||!$('playerFrame')||!$('minimap'))throw Error('Не загружен оригинальный интерфейс NexGame');
 const bind=(el,ev,fn)=>el.addEventListener(ev,fn);
 const stats=()=>deriveStats(state.level,state.equipment);
 if(state.hp==null)state.hp=stats().maxHp;
 function persist(){if(preview||authenticatedProfile)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(state))}catch{}}
 function msg(text,seconds=2.35){
  toast.textContent=text;toast.hidden=false;toast.classList.add('show');
  messageUntil=clock+Math.min(4,Math.max(1,seconds));
 }
 function setModelAt(entity,x=entity.x,z=entity.z,yaw=entity.yaw){
  const normal=toNormal(x,z,getRadius());
  entity.root.position.copy(normal).multiplyScalar(getRadius()+heightAt(normal)+.09);
  anchorQuat.setFromUnitVectors(up,normal);
  entity.root.quaternion.copy(anchorQuat).multiply(spinQuat.setFromAxisAngle(up,yaw||0));
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
  const tag=makeLabel(name,'#d9e2a1',25);tag.position.y=4.45;
  if(kind==='mentor'){tag.name='mentor-name';tag.material.depthTest=false;tag.renderOrder=20;}
  root.add(tag);
  const e={kind,name,x,z,yaw:.2,root,radius:1.5,actor:npcActor};entities.push(e);citizens.push(e);setModelAt(e);return e;
 }
 const banditGuide=npc('banditQuest',BANDIT_QUEST_GIVER.x,BANDIT_QUEST_GIVER.z,'Следопыт Медная Стрела');
 for(const glyph of ['!','?','·'])banditGuide.root.add(questMarkers.create(glyph,5.55));
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
  const entity={kind:'mob',id:'dolgonog-'+i,index:i,family:'dolgonog',level:mobLevelForIndex(i),name:'Равнинный долгоног',lootId:'dolgonog',root,x,z,yaw:.1,
   spawnX:x,spawnZ:z,creatureType:creatureTypeForMob(i),hp:monsterMaxHealth(mobLevelForIndex(i)),maxHp:monsterMaxHealth(mobLevelForIndex(i)),aggro:false,attackCd:1.2,stun:0,dead:0,loot:null,corpse:false,
   respawn:0,returning:false,walk:0,visual:null,hit:0,attackWindup:0,alertRemaining:0,corpseAge:0,boss:false,contactShadow,roamTime:i*1.73,navigation:null};
  const tag=makeLabel(entity.name+' · ур. '+entity.level,'#f9df91',26);tag.position.y=4.25;root.add(tag);entity.nameTag=tag;
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
 giant.name='Грозоклюв — огромный долгоног';giant.boss=true;giant.family='stormbeak';giant.lootId='stormbeak';
 giant.hp=giant.maxHp=monsterMaxHealth(giant.level,true);giant.root.scale.setScalar(1.8);
 const oldTag=giant.root.children.find(child=>child.isSprite&&child!==giant.alertTag);
 if(oldTag)oldTag.visible=false;
 const bossTag=makeLabel('Грозоклюв · ур. 3 · Элитный','#f9bd91',27);
 bossTag.position.y=3.4;bossTag.scale.set(4.7,.84,1);
 giant.root.add(bossTag);giant.nameTag=bossTag;giant.alertTag.position.y=4.0;
 function createBandit(x,z,i){
  const spec=creatureByIndex(DOLGONOG_SPAWNS.length+i);
  const root=new THREE.Group();group.add(root);
  const contactShadow=addContactShadow(root,.83),visual=createBanditVisual(THREE);
  root.add(visual.root);
  const hp=(64+(spec.level-2)*14)*(spec.boss?2:1);
  const mob={kind:'mob',id:spec.id,index:spec.index,family:'bandit',level:spec.level,
   name:spec.name,lootId:'bandit',creatureType:spec.type,root,x,z,yaw:0,
   spawnX:x,spawnZ:z,hp,maxHp:hp,aggro:false,attackCd:1.2,stun:0,dead:0,loot:null,corpse:false,
   respawn:0,returning:false,walk:0,hit:0,attackWindup:0,alertRemaining:0,corpseAge:0,
   boss:spec.boss,contactShadow,roamTime:spec.index*1.73,navigation:null,banditVisual:visual};
  if(spec.boss){visual.root.scale.setScalar(BANDIT_BOSS_SCALE);contactShadow.scale.setScalar(BANDIT_BOSS_SCALE);contactShadow.position.y=.02;}
  const nameTag=makeLabel(spec.name+' · ур. '+spec.level,'#e4c68f',24);
  nameTag.position.y=spec.boss?4.9:3.7;root.add(nameTag);mob.nameTag=nameTag;
  const alertTag=makeLabel('!','#ffc978',78);alertTag.position.y=spec.boss?5.35:4.25;alertTag.scale.set(1.55,1.4,1);
  alertTag.visible=false;root.add(alertTag);mob.alertTag=alertTag;
  const lootMarker=makeLabel('◆','#fff7df',68);lootMarker.position.y=1.45;
  lootMarker.scale.set(1.3,1.06,1);lootMarker.visible=false;root.add(lootMarker);mob.lootMarker=lootMarker;
  mob.fallbackVisual=visual.root;
  mob.deathAnimation=createMobDeath({THREE,entity:mob,visual:visual.root,getRadius,heightAt});
  mobs.push(mob);entities.push(mob);setModelAt(mob);return mob;
 }
 BANDIT_SPAWNS.forEach(([x,z],i)=>createBandit(x,z,i));
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
 const banditWeapons=createBanditWeaponWorld({THREE,parent:group,place:e=>{entities.push(e);setModelAt(e);}});
 // Two-line live label; keep one canvas and update pixels without replacing meshes.
 const chestCanvas=document.createElement('canvas');
 chestCanvas.width=512;chestCanvas.height=160;
 const chestContext=chestCanvas.getContext('2d');
 const chestTexture=new THREE.CanvasTexture(chestCanvas);
 chestTexture.colorSpace=THREE.SRGBColorSpace;
 const chestLabel=new THREE.Sprite(new THREE.SpriteMaterial({
  map:chestTexture,transparent:true,depthWrite:false
 }));
 chestLabel.position.y=2.75;chestLabel.scale.set(4.75,1.5,1);
 gathering.chest.root.add(chestLabel);
 let lastChestLabel=null,lastChestRevision=-1,knownChestUsed=null;
 function setChestUsed(slots,revision=null){
  if(!Array.isArray(slots)||slots.length!==OFFLINE_CHEST.slots)return;
  if(Number.isInteger(revision)&&revision<lastChestRevision)return;
  if(Number.isInteger(revision))lastChestRevision=revision;
  knownChestUsed=slots.filter(Boolean).length;
  paintChestLabel();
 }
 function paintChestLabel(){
  const occupied=isOnline()?knownChestUsed:state.chestInventory.length;
  const count=Number.isInteger(occupied)?occupied+'/'+OFFLINE_CHEST.slots:
   '—/'+OFFLINE_CHEST.slots;
  if(count===lastChestLabel)return;
  lastChestLabel=count;
  chestContext.clearRect(0,0,512,160);
  chestContext.textAlign='center';chestContext.textBaseline='middle';
  chestContext.lineJoin='round';chestContext.strokeStyle='#2d2017';
  chestContext.font='bold 33px Georgia,serif';chestContext.lineWidth=6;
  chestContext.strokeText('Общий сундук',256,55,476);
  chestContext.fillStyle='#ffe0a0';chestContext.fillText('Общий сундук',256,55,476);
  chestContext.font='bold 30px Georgia,serif';chestContext.lineWidth=5;
  chestContext.strokeText(count,256,112,440);
  chestContext.fillStyle='#d9cba9';chestContext.fillText(count,256,112,440);
  chestTexture.needsUpdate=true;
 }
 paintChestLabel();
 let nextChestStatusCheck=-1;
 // Atlas GLB: use the authored hinge node, opening angle and clip duration.
 // Atlas' current-pose transitions prevent Close snapping from the wrong pose.
 void (async()=>{
  try{
   const loader=await modelLoader;
   if(!loader)throw Error('GLTFLoader unavailable');
   const asset=await loader.loadAsync('../bestiary/models/village-chest-v0.1.glb?v=1');
   const openClip=asset.animations?.find(clip=>clip.name==='Open');
   const closeClip=asset.animations?.find(clip=>clip.name==='Close');
   if(!openClip||!closeClip)throw Error('Chest Open/Close clips missing');
   const rotation=openClip.tracks.find(track=>track.name.includes('Lid_Hinge')&&
    track.ValueTypeName==='quaternion');
   let openAngle=-1.65;
   if(rotation?.values?.length>=4){
    const values=rotation.values;
    const q=new THREE.Quaternion(...values.slice(values.length-4));
    openAngle=new THREE.Euler().setFromQuaternion(q,'XYZ').x;
   }
   if(!gathering.installChestModel(asset.scene,{openAngle,duration:openClip.duration}))
    throw Error('Chest hinge missing');
  }catch(error){console.warn('Shared chest Atlas GLB fallback:',error);}
 })();
 const mentorWorld=createMentorWorld({THREE,parent:group,
  place:e=>{entities.push(e);setModelAt(e);},getRadius,toNormal,heightAt});
 // Shared refined Raider GLB v0.3: Atlas and all three in-world humanoids display the same model.
 // The previous procedural geometry stays available only as a network fallback.
 void (async()=>{
  try{
   const loader=await modelLoader;
   if(!loader)throw Error('GLTFLoader unavailable');
   const asset=await loader.loadAsync('../bestiary/models/dust-trail-raider-v0.3.glb?v=0.3');
   if(!['Idle','Walk','Attack','Hurt','Death'].every(name=>asset.animations.some(a=>a.name===name))||
      !asset.scene.getObjectByName('Arm_R')||!asset.scene.getObjectByName('Leg_L'))
    throw Error('Raider GLB rig or animation missing');
   for(const mob of mobs.filter(m=>m.family==='bandit')){
    if(mob.corpse)mob.pendingBanditAsset=asset;
    else attachBanditVisual(mob,asset);
   }
  }catch(err){console.warn('Shared raider GLB fallback:',err);}
 })();
 function attachBanditVisual(mob,asset){
  if(mob.banditGltf){mob.banditGltf.mixer.stopAllAction();mob.banditGltf.container.removeFromParent();}
  const rig=asset.scene.clone(true);
  const container=new THREE.Group();container.name='dust-trail-raider-v0.3';
  const motionPivot=new THREE.Group();motionPivot.name='raider-secondary-motion';
  motionPivot.add(rig);container.add(motionPivot);
  mob.root.add(container);mob.fallbackVisual.visible=false;
  if(mob.boss)container.scale.setScalar(BANDIT_BOSS_SCALE);
  rig.traverse(part=>{if(part.isMesh){part.castShadow=true;part.receiveShadow=false;}});
  const mixer=new THREE.AnimationMixer(rig);
  const actions=Object.fromEntries(asset.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
  mob.banditGltf={container,rig,motionPivot,secondary:{},mixer,actions,mode:null,action:null,walkBlend:0,walkGrace:0,
   gait:{},wasWindup:false,attackRemaining:0,
   impact:{seen:mob.visualHitSequence||0,wasHit:false},
   strike:{cueSeen:mob.visualStrikeCue||0,hitSeen:mob.visualStrikeHitSequence||0,phase:'idle'}};
  mob.deathAnimation=createMobDeath({THREE,entity:mob,visual:container,getRadius,heightAt,mixer});
  banditAnimation(mob,0,0);
 }
 function resetCreatureImpact(mob){
  // Death poses freeze the mixer; reset cosmetic state for a new life.
  // Preserve server position, aggro, inventory, combat and equipment.
  mob.visualHitSequence=0;
  mob.visualStrikeCue=0;mob.visualStrikeHitSequence=0;mob.visualStrikeWindupSeconds=.4;
  mob.hit=0;
  if(mob.banditGltf){
   const gltf=mob.banditGltf;
   gltf.mixer.stopAllAction();
   gltf.mode=null;gltf.action=null;gltf.wasWindup=false;gltf.attackRemaining=0;
   gltf.impact={seen:0,wasHit:false};gltf.gait={};
   resetCreatureStrike(gltf.strike);
   gltf.container.rotation.set(0,0,0);
   gltf.container.position.set(0,0,0);
   resetCreatureSecondary(gltf.secondary,gltf.motionPivot);
  }
  if(mob.birdVisual){
   const bird=mob.birdVisual;
   bird.impact={seen:0,wasHit:false};
   resetCreatureStrike(bird.strike);
   bird.impactPivot?.rotation.set(0,0,0);
   bird.impactPivot?.position.set(0,0,0);
   bird.gait={};
   bird.attackRemaining=0;bird.lastAttackCd=mob.attackCd||0;bird.walkGrace=0;
   resetCreatureSecondary(bird.secondary,bird.motionPivot);
  }
 }
 function banditAnimation(mob,dt,moved=0){
  const gltf=mob.banditGltf;
  if(!gltf)return mob.banditVisual?.animate(clock,moved,mob.attackWindup>0?1:0);
  if(mob.corpse)return;
  const delta=Math.min(Math.max(0,dt),.12);
  // Animate from the actual rendered movement; network pauses retain a brief
  // walk grace instead of repeatedly resetting the raider's feet.
  const gait=advanceCreatureGait(gltf.gait,delta,moved,{
   nominalSpeed:2.05,holdSeconds:.22,strideLength:1.48
  });
  gltf.walkBlend=gltf.gait.rate;gltf.walkGrace=gltf.gait.hold;
  const windup=mob.attackWindup>0;
  if(windup&&!gltf.wasWindup){
   const duration=gltf.actions.Attack?.getClip?.()?.duration;
   gltf.attackRemaining=Number.isFinite(duration)?Math.max(.45,Math.min(1.05,duration)):.7;
  }
  gltf.wasWindup=windup;
  gltf.attackRemaining=Math.max(0,gltf.attackRemaining-delta);
  // Finish each authored strike instead of interrupting it when the server
  // clears its windup. Damage timing and target selection stay authoritative.
  const attacking=windup||gltf.attackRemaining>0;
  const impact=advanceMobImpact(gltf.impact,delta,{
   sequence:mob.visualHitSequence||0,hitRemaining:mob.hit,duration:.34
  });
  // Recoil is only visual: collision and server locations never change.
  gltf.container.rotation.x=-.085*impact.weight;
  gltf.container.rotation.z=.075*impact.weight*impact.side;
  gltf.container.position.z=-.09*impact.weight;
  const strike=advanceCreatureStrike(gltf.strike,delta,{
   cueSequence:mob.visualStrikeCue||0,hitSequence:mob.visualStrikeHitSequence||0,
   windupRemaining:mob.attackWindup,windupDuration:mob.visualStrikeWindupSeconds||.4
  });
  const mode=mobVisualMode({hit:impact.active&&!!gltf.actions.Hurt,
   attack:attacking,walking:gait.walking});
  // A second hit during Hurt restarts its clip instead of freezing on its last frame.
  if(mode!==gltf.mode||(mode==='Hurt'&&shouldReplayCreatureHurt(gltf.action,impact.started))){
   const fade=mode==='Attack'?.085:mode==='Hurt'?.10:.22;
   const nextAction=gltf.actions[mode]||gltf.actions.Idle;
   const replay=gltf.action===nextAction;
   if(gltf.action&&!replay)gltf.action.fadeOut(fade);
   gltf.action=nextAction;
   if(mode==='Attack'||mode==='Hurt'){
    gltf.action.setLoop(THREE.LoopOnce,1);
    gltf.action.clampWhenFinished=true;
   }else{
    gltf.action.setLoop(THREE.LoopRepeat,Infinity);
    gltf.action.clampWhenFinished=false;
   }
   if(mode==='Walk')resetWalkingClip(gltf.action);
   else gltf.action.reset();
   if(!replay)gltf.action.fadeIn(fade);
   gltf.action.play();
   gltf.mode=mode;
  }
  if(mode==='Walk')gltf.action?.setEffectiveTimeScale?.(gait.playbackRate);
  // Base animation first, then restrained weight transfer and turn inertia
  // on a parent pivot (no accumulated bone rotations or root movement).
  gltf.mixer.update(delta);
  const stance=advanceCreatureSecondary(gltf.secondary,delta,{
   kind:'raider',yaw:isOnline()?mob.renderYaw??mob.yaw:mob.yaw,
   walking:gait.walking,speed:Math.min(1,gltf.gait.rate||0),
   attacking,attackRemaining:gltf.attackRemaining,hitWeight:impact.weight,
   strikePrepare:strike.prepare,strikeImpact:strike.impact,strikeRecover:strike.recover,
   stridePhase:gait.stridePhase,stepWeight:gait.stepWeight
  });
  applyCreatureSecondary(gltf.motionPivot,stance);
 }
 // Use the exact approved longstrider model and clips when the shared GLB loads.
 // Procedural fallback remains available if the CDN or asset fails.
 void (async()=>{
  try{
   const loader=await modelLoader;
   if(!loader)throw Error('GLTFLoader unavailable');
   const asset=await loader.loadAsync('../bestiary/models/dolgonog-v0.1.glb?v=0.3.5.43');
   if(!validatePlainstriderGltf(asset))throw Error('Unexpected Dolgonog clips');
   for(const mob of mobs.filter(m=>m.family!=='bandit')){
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
  const impactPivot=new THREE.Group();impactPivot.name='dolgonog-hit-response';
  const motionPivot=new THREE.Group();motionPivot.name='dolgonog-secondary-motion';
  impactPivot.add(bird);motionPivot.add(impactPivot);container.add(motionPivot);
  mob.root.add(container);mob.fallbackVisual.visible=false;
  bird.traverse(obj=>{if(obj.isMesh){obj.castShadow=/^(Body|Head|Neck|Wing)/.test(obj.name);obj.receiveShadow=false;}});
  const mixer=new THREE.AnimationMixer(bird);
  const actions=Object.fromEntries(PLAINSTRIDER_REQUIRED_CLIPS.map(k=>[k,mixer.clipAction(asset.animations.find(a=>a.name===k))]));
  mob.birdVisual={container,bird,impactPivot,motionPivot,secondary:{},spherical:true,mixer,actions,mode:null,walkGrace:0,attackRemaining:0,
   lastAttackCd:mob.attackCd,impact:{seen:mob.visualHitSequence||0,wasHit:false},
   strike:{cueSeen:mob.visualStrikeCue||0,hitSeen:mob.visualStrikeHitSequence||0,phase:'idle'}};
  mob.deathAnimation=createMobDeath({THREE,entity:mob,visual:container,getRadius,heightAt,mixer});
  advancePlainstriderVisual(THREE,mob,1/60,0,false);
 }
 // Smooth original NexGame GLB Idle, Walk, Peck and hit reactions.
 function birdAnimation(mob,dt,moved=0){
  if(mob.banditVisual){banditAnimation(mob,dt,moved);return;}
  if(mob.birdVisual&&!mob.corpse){
   advancePlainstriderVisual(THREE,mob,dt,moved,false);
   const bird=mob.birdVisual;
   const gait=advanceCreatureGait(bird.gait??(bird.gait={}),dt,moved,{
    nominalSpeed:2.05,holdSeconds:.32,strideLength:1.72
   });
   if(bird.mode==='Walk')bird.actions.Walk?.setEffectiveTimeScale?.(gait.playbackRate);
   // Approved longstrider v0.1 contains no Hurt clip: apply visual-only
   // head/body flinch after the authored walk/peck pose has been evaluated.
   const impact=advanceMobImpact(bird.impact,dt,{
    sequence:mob.visualHitSequence||0,hitRemaining:mob.hit,duration:.30
   });
   bird.impactPivot.rotation.x=-.105*impact.weight;
   bird.impactPivot.rotation.z=.087*impact.weight*impact.side;
   bird.impactPivot.position.y=.04*impact.weight;
   bird.impactPivot.position.z=-.09*impact.weight;
   // Living wildlife has breathing and natural lean on turns; the authored
   // Walk/Peck GLB remains untouched and controls both legs.
   const strike=advanceCreatureStrike(bird.strike,dt,{
    cueSequence:mob.visualStrikeCue||0,hitSequence:mob.visualStrikeHitSequence||0,
    windupRemaining:mob.attackWindup,windupDuration:mob.visualStrikeWindupSeconds||.4
   });
   const stance=advanceCreatureSecondary(bird.secondary,dt,{
    kind:'longstrider',yaw:isOnline()?mob.renderYaw??mob.yaw:mob.yaw,
    walking:gait.walking,speed:Math.min(1,bird.gait?.rate||0),
    attacking:bird.mode==='Peck',attackRemaining:bird.attackRemaining,
    hitWeight:impact.weight,
    strikePrepare:strike.prepare,strikeImpact:strike.impact,strikeRecover:strike.recover,
    stridePhase:gait.stridePhase,stepWeight:gait.stepWeight
   });
   applyCreatureSecondary(bird.motionPivot,stance);
  }
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
  if(authenticatedProfile){
   const bagSlot=serverBagSlots.findIndex(row=>row?.id===id);
   if(bagSlot<0)return msg('Предмет отсутствует на сервере');
   return sendAccountAction('equip',{bagSlot,equipmentSlot:ITEM_CATALOG[id]?.slot});
  }
  const result=equipFromBag(state,id,inCombat());
  if(!result.ok)return msg(result.error);
  finishEquipmentChange(result.slot);msg('Надето: '+ITEM_CATALOG[id].name);
 }
 function updateLootMarker(mob){
  if(!mob?.lootMarker)return;
  const available=mob.corpse&&!mob.dying&&mob.root.visible&&
   (mob.loot?.length>0||authenticatedProfile&&!mob.lootKnown);
  mob.lootMarker.visible=!!available;
  if(!available)return;
  const rarity=mob.loot?.length?highestLootRarity(mob.loot,ITEM_CATALOG):'poor';
  mob.lootMarker.material.color.setHex(QUALITY_VISUALS[rarity].marker);
  mob.lootMarker.userData.rarity=rarity;
 }
 function showCorpseLoot(mob){
  if(!mob?.corpse||!mob.root.visible)return msg('Тело уже исчезло');
  if(distance(mob)>CORPSE_LOOT_RANGE)return msg('Подойди к телу ближе');
  if(authenticatedProfile){sendAccountAction('lootOpen',{mobId:mob.id,life:mob.life});return;}
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
  if(distance(mob)>CORPSE_LOOT_RANGE)return msg('Подойди к телу ближе');
  if(authenticatedProfile){
   if(pendingLootTake)return;
   const row=mob.loot?.[index];
   if(row&&sendAccountAction('lootTake',{mobId:mob.id,life:mob.life,itemId:row.id})){
    pendingLootTake={mobId:mob.index,life:mob.life,at:Date.now()};
    renderModal();
   }
   return;
  }
  const selected=mob.loot?.[index];
  if(selected?.id===CORPSE_COIN_ID){
   if(!isValidCorpseCoins(selected))return lootNotice('Некорректная сумма монет');
   state.gold+=selected.qty;mob.loot.splice(index,1);persist();updateLootMarker(mob);
   const received='Получено монет: '+selected.qty;
   if(!mob.loot.length){finishCorpseLoot(mob);msg(received);}
   else{renderModal();lootNotice(received);draw();}
   return;
  }
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
  if(distance(mob)>CORPSE_LOOT_RANGE)return msg('Подойди к телу ближе');
  if(authenticatedProfile){
   if(pendingLootTake)return;
   if(sendAccountAction('lootTake',{mobId:mob.id,life:mob.life})){
    pendingLootTake={mobId:mob.index,life:mob.life,at:Date.now()};
    renderModal();
   }
   return;
  }
  let collectedCoins=0;
  mob.loot=mob.loot.filter(row=>{
   if(row.id!==CORPSE_COIN_ID||!isValidCorpseCoins(row))return true;
   collectedCoins+=row.qty;return false;
  });
  if(collectedCoins){state.gold+=collectedCoins;persist();}
  const result=takeAllCorpseRows(mob,corpseLootServices());
  updateLootMarker(mob);
  if(!result.taken.length&&!collectedCoins)return lootNotice('Рюкзак заполнен — добыча осталась в теле');
  if(!result.remaining){
   finishCorpseLoot(mob);msg('Собрано предметов: '+result.taken.length+(collectedCoins?' · Монеты: +'+collectedCoins:''));
  }else{
   renderModal();lootNotice('Часть добычи осталась в теле — рюкзак заполнен');draw();
  }
 }
 const targetCycle=createHostileTargetCycle();
 function targetEntity(entity,fromCycle=false){
  if(!fromCycle)targetCycle.reset();
  if(entity&&!['mob','dummy'].includes(entity.kind))entity=null;
  if(entity&&(entity.hp<=0||entity.dead||!entity.root.visible))entity=null;
  if(target!==entity){autoplay=false;approach=null;}
  if(!entity&&timeline.current?.skill!=='thunderStomp')timeline.clear();
  target=entity;
  selectedAllyId=null;
  updateSelection();draw();
 }
 function targetNearest(step=1){
  if(!modal.hidden)return;
  const position=player(),normal=playerNormal();
  const facing=new THREE.Vector3(0,0,1).applyQuaternion(hero.root.quaternion);
  facing.addScaledVector(normal,-facing.dot(normal)).normalize();
  const start=normal.clone().multiplyScalar(getRadius()+heightAt(normal)+2);
  const inCamera=createCameraTargetFilter(THREE,camera);
  const canSee=entity=>{
   if(!inCamera(entity))return false;
   const n=toNormal(entity.x,entity.z,getRadius());
   const desired=n.clone().multiplyScalar(getRadius()+heightAt(n)+1.6);
   return !cameraObstruction(THREE,{start,desired,getRadius,toLocal,heightAt,
    heroLocal:position,clearance:.05,maxSamples:180});
  };
  const next=targetCycle.next({mobs,dummy,current:target,dist:distance,step,
   alignment:targetFacingAlignment,canSee,now:clock,position,facing});
  if(next)targetEntity(next,true);
  else if(!target)msg('В кадре нет доступных противников в радиусе 40 м');
 }

 const weaponsStage=()=>state.banditWeaponsQuest?.stage??(state.banditChiefQuest?.stage>0?2:0);
 const weaponsAvailable=node=>!!authenticatedProfile&&weaponsStage()===1&&
  itemCount(BANDIT_WEAPON_ITEM)<BANDIT_WEAPON_REQUIRED&&clock>=node.readyAt;
 function nearestInteraction(){
  return nearbyInteractable(entities,distance,node=>
   node.kind==='banditWeapon'?weaponsAvailable(node):camp.available(node),!!authenticatedProfile);
 }
 const chestSheet=createChestSheet({items:ITEM_CATALOG,qualityColors:QUALITY_VISUALS,
  move:(...args)=>isOnline()?multiplayer.moveChest(...args):false,notify:msg});
 function openWindow(kind){
  if(!modal.hidden&&modal.dataset.kind==='chest'&&kind!=='chest')closeWindow();
  if(kind==='chest'){clearChestRetry();chestSheet.reset();}
  if(kind==='character')selectedEquipmentSlot=null;
  if(kind==='banditQuest'&&(modal.hidden||modal.dataset.kind!=='banditQuest')){
   chiefRewardSelection=null;chiefRewardSubmitting=false;chiefRewardRenderSnapshot=null;
  }
  if(kind==='bag'&&(modal.hidden||modal.dataset.kind!=='bag')){
   selectedBagSlot=-1;selectedBagItemId=null;bagRenderSnapshot=null;
  }
  if(kind!=='gatherLoot')camp.cancel();
  modal.hidden=false;modal.dataset.kind=kind;
  if(kind==='chest'&&!isOnline()&&!authenticatedProfile){gathering.setChestOpen(true);chestLabel.visible=false;}
  if(kind==='chest'&&isOnline()){
   const items=authenticatedProfile?serverBagSlots.map(row=>row?{...row}:null):[...state.inventory];
   while(items.length<12)items.push(null);
   onlineChest={slots:null,inventory:items};
   if(multiplayer.openChest(items)===false){closeWindow();msg('Нет связи с сервером');return;}
  }
  renderModal();
 }
 function closeWindow(){
  pendingLootTake=null;
  characterPreview.release();
  if(modal.dataset.kind==='chest'){
   clearChestRetry();
   gathering.setChestOpen(false);chestLabel.visible=true;
   if(isOnline())multiplayer.closeChest();
  }
  modal.hidden=true;pendingLoot=null;
  selectedBagSlot=-1;selectedBagItemId=null;bagRenderSnapshot=null;
 }
 let resetProgressView=null;
 function onResetProgress(fn){resetProgressView=typeof fn==='function'?fn:null;}
 function resetProgress(){
  if(preview)return;
  if(authenticatedProfile)return msg('Прогресс этого героя хранится на сервере и не сбрасывается локально.');
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
  if(authenticatedProfile){
   if(!modal.hidden||pendingServerGather)return;
   if(!isOnline())return msg('Нет связи с сервером');
   const nearby=nearestInteraction();
   if(!nearby)return msg('Подойди ближе к жителю или предмету');
   if(nearby.kind==='banditWeapon'){
    const job={kind:'banditWeapon',index:nearby.index,phase:'request'};
    if(sendAccountAction('banditWeaponStart',{index:job.index})){
     pendingServerGather=job;msg('Собираем кинжал разбойника… 1,5 с');
    }
    return;
   }
   if(nearby.kind==='gather'){
    const job={kind:'gather',stage:nearby.stage,index:nearby.index,phase:'request'};
    // Never forward the local job.kind: it would override economyAction.kind
    // and turn the authenticated gatherStart request into an unsupported action.
    if(sendAccountAction('gatherStart',{stage:job.stage,index:job.index})){
     pendingServerGather=job;msg('Сбор растения… 1,5 с');
    }
    return;
   }
   if(nearby.kind==='relic'||nearby.kind==='scout'){
    sendAccountAction('mentorInteract',{interaction:nearby.kind});return;
   }
   if(nearby.kind==='mob')return showCorpseLoot(nearby);
   if(nearby.kind==='mentor'){openWindow('mentor');return}
   if(nearby.kind==='banditQuest'){openWindow('banditQuest');return}
   if(nearby.kind==='vendor'){openWindow('merchant');return}
   if(nearby.kind==='herbalist'){openWindow('herbalist');return}
   if(nearby.kind==='chest'){openWindow('chest');return}
   return msg('Сейчас взаимодействие недоступно');
  }
  if(!modal.hidden||camp.casting)return;
  // Approach alone enables NPC dialogue, gathering, storage and corpse loot.
  // It never requires a selected combat target.
  const nearby=nearestInteraction();
  if(!nearby)return msg('Подойди к жителю или предмету ближе');
  if(camp.interact(nearby)){draw();return;}
  if(nearby.kind==='mentor')openWindow('mentor');
  else if(nearby.kind==='banditQuest')openWindow('banditQuest');
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
  enemy.visualHitSequence=(enemy.visualHitSequence||0)+1;
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
   enemy.loot=[...rollCreatureLoot(enemy.lootId),...rollCreatureCoins(enemy.creatureType,enemy.level)];
   updateLootMarker(enemy);
   const gainedXp=monsterKillExperience(state.level,enemy.level,mobBaseExperience(enemy.level,enemy.boss));
   state.xp+=gainedXp; // Beasts drop no coins.
   xpFeedback.show(gainedXp);
   levelCheck();mentorChain.killed(enemy);
   if(!enemy.boss)msg('Долгоног повержен · '+(gainedXp?'+'+gainedXp+' опыта · ':'0 опыта · ')+'доступна добыча');
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
  if(id==='healingPotion'&&itemCount('healingPotion')===0){msg('Лечебных настоев нет в рюкзаке');return false;}
  if(authenticatedProfile&&id==='healingPotion')return sendAccountAction('usePotion');
  if(authenticatedProfile&&!isOnline()){
   msg('Связь с сервером отсутствует. Боевые действия приостановлены.');
   return false;
  }
  if(!modal.hidden||camp.casting||pendingServerGather||state.hp<=0)return false;
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
  if(authenticatedProfile&&!isOnline())return msg('Сервер недоступен — атаки временно отключены.');
  const action=actionDefinition(state.hotbar[slot],'warrior',state.level);
  if(!action)return msg('Пустая ячейка');
  return castAction(action.abilityId);
 }
 function draw(refreshInteractive=true){
  const s=stats();state.hp=clamp(state.hp,0,s.maxHp);
  nameEl.textContent=authenticatedProfile?.nickname||'Странник';$('levelBadge').textContent=state.level;
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
  const allySelected=paintAllyTarget();
  $('targetFrame').hidden=!hostile;$('targetPlaceholder').hidden=!!hostile||allySelected;
  if(hostile){
    const difficulty=target.kind==='mob'?monsterDifficulty(state.level,target.level):'yellow';
    // Keep the full creature name readable. The level is a separate compact
    // badge, so it never pushes the target name outside the fixed HUD slot.
    $('targetName').textContent=target.boss&&target.family==='stormbeak'?'Грозоклюв':target.name;
    $('targetName').title=target.name;
    $('targetLevel').hidden=target.kind!=='mob';
    if(target.kind==='mob'){
     $('targetLevel').textContent='ур. '+target.level;
     $('targetLevel').title='Уровень '+target.level+(target.boss?' · Элитный':'');
    }
    $('targetName').style.color='#'+MONSTER_LEVEL_COLORS[difficulty].toString(16).padStart(6,'0');
    $('targetFill').style.width=clamp(target.hp/target.maxHp*100,0,100)+'%';
    $('targetHp').textContent=Math.ceil(target.hp)+' / '+target.maxHp;
    $('targetDistance').textContent='Дистанция: '+pretty(distance(target))+' м';
    const status=target.corpse?'Доступна добыча':autoplay?'Автоатака':'Нажми 1 для автоатаки';
    $('targetStatus').textContent=target.kind==='mob'?
     (CREATURE_TYPE_LABELS[target.creatureType]||'Существо')+' · '+status:status;
    $('dummyStats').hidden=target.kind!=='dummy';
  }
  const stage=state.quest,lines=QUEST_LINES[stage]||QUEST_LINES[12];
  objective.textContent=stage===1?'Победи долгоногов: '+state.kills+' / 3':lines[1];
  $('qtitle').textContent=lines[0];
  $('mainQuestTracker').hidden=stage===12;
  $('quest-progress').textContent=stage===12?'Цепочка · 5 / 5 ✓':'Цепочка · '+mentorChainNumber(stage)+' / 5';
  const navigation=$('trackedQuestHint');
  if(navigation){
   const location=player();
   if(trackedQuestId&&!questWaypoint(trackedQuestId,state,state.inventory,location))trackedQuestId=null;
   const questId=trackedQuestId||preferredQuestId(state,state.inventory);
   const waypoint=questId?questWaypoint(questId,state,state.inventory,location):null;
   const route=questDirection(waypoint,location);
   navigation.hidden=!authenticatedProfile||!route;
   if(route)$('trackedQuestText').textContent=route.description;
   navigation.classList.toggle('is-pinned',!!trackedQuestId);
  }
  const guidance=$('questGuidance');
  guidance.hidden=stage!==7&&stage!==10;
  if(stage===7)guidance.textContent='Разведка: найди каменную развилку (12, 37).';
  if(stage===10)guidance.textContent='Красный пунктир ведёт к Грозоклюву · 108 HP';
  const glyph=mentorGlyph(state.quest);
  for(const child of mentor.root.children)if(child.userData.questMarker)child.visible=child.userData.glyph===glyph;
  const banditStage=state.banditQuest?.stage??0;
  const weaponStage=weaponsStage(),weaponCount=itemCount(BANDIT_WEAPON_ITEM);
  const chiefStage=state.banditChiefQuest?.stage??0;
  const banditGlyph=banditStage===0?(state.level>=BANDIT_QUEST_MIN_LEVEL?'!':null):
   banditStage===1?'·':banditStage===2?'?':
   weaponStage===0?'!':weaponStage===1?(weaponCount>=BANDIT_WEAPON_REQUIRED?'?':'·'):
   chiefStage===0?(state.level>=4?'!':null):chiefStage===1?'·':chiefStage===2?'?':null;
  for(const child of banditGuide.root.children)if(child.userData.questMarker)
   child.visible=child.userData.glyph===banditGlyph;
  const showWeapons=banditStage===3&&weaponStage===1;
  const showChief=banditStage===3&&weaponStage===2&&(chiefStage===1||chiefStage===2);
  $('banditQuestTracker').hidden=!authenticatedProfile||
   !(showChief||showWeapons||banditStage===1||banditStage===2);
  const banditTrackerTitle=$('banditQuestTitle');
  if(banditTrackerTitle)banditTrackerTitle.textContent=showChief?'Главарь · 3/3':
   showWeapons?'Оружие разбойников · 2/3':'Разведка лагеря · 1/3';
  if(authenticatedProfile&&showChief)
   $('banditQuestText').textContent=chiefStage===2?'Главарь повержен! Вернись к следопыту.':'Главарь: 0 / 1';
  else if(authenticatedProfile&&showWeapons)
   $('banditQuestText').textContent=weaponCount>=BANDIT_WEAPON_REQUIRED?
    'Кинжалы собраны! Вернись к следопыту.':'Кинжалы: '+weaponCount+' / '+BANDIT_WEAPON_REQUIRED;
  else if(authenticatedProfile&&banditStage>0&&banditStage<3)
   $('banditQuestText').textContent=banditStage===2?'Готово! Вернись к следопыту.':
    'Разбойники: '+(state.banditQuest?.kills??0)+' / '+BANDIT_QUEST_KILLS;
  const nearby=modal.hidden&&!camp.casting?nearestInteraction():null;
  $('interact').hidden=!nearby||!!pendingServerGather;
  if(nearby)$('interact').textContent=nearby.kind==='banditWeapon'?'Собрать кинжал':nearby.kind==='gather'?
    (nearby.pending?'Забрать':'Собрать'):nearby.kind==='relic'?'Взять перо':nearby.kind==='chest'?'Открыть сундук':
    nearby.kind==='mob'?'Обыскать':nearby.kind==='vendor'?'Торговец':'Поговорить';
  $('targetNext')?.classList.toggle('target-selected',!!target&&target.hp>0&&!target.dead);
  if(refreshInteractive){
  hotbar.replaceChildren();
  state.hotbar.forEach((entry,i)=>{
   const button=document.createElement('button');button.type='button';button.dataset.slot=String(i);
   button.className='ability';button.title=entry?.id||'Назначить умение';
   const key=document.createElement('kbd');key.textContent=String(i+1);
   const icon=document.createElement('span');icon.className='planetAbilityIcon';if(entry&&HOTBAR_ART[entry.id])icon.innerHTML=entry.id==='autoAttack'&&autoplay?HOTBAR_AUTO_ACTIVE:HOTBAR_ART[entry.id];else icon.textContent='＋';
   const caption=document.createElement('span');caption.className='planetAbilityName';
   const entryDef=entry?actionDefinition(entry,'warrior',state.level):null;
   caption.textContent=entry?HOTBAR_SHORT[entry.id]||entryDef?.name||'Умение':'Пусто';
   const cooldownShade=document.createElement('span');cooldownShade.className='planetCooldownShade';
   const gcdShade=document.createElement('span');gcdShade.className='planetGcdShade';
   const cooldownText=document.createElement('span');cooldownText.className='planetCooldownText';
   const quantity=document.createElement('span');quantity.className='planetItemQuantity';
   quantity.hidden=entry?.id!=='healingPotion';
   quantity.textContent=entry?.id==='healingPotion'?String(itemCount('healingPotion')):'';
   button.append(key,icon,caption,cooldownShade,gcdShade,cooldownText,quantity);
   button.classList.toggle('is-empty',!entry);
   if(entry?.id==='autoAttack'&&autoplay)button.classList.add('is-active');
   const ability=entry?getAbilityDefinition(entry.id==='healingPotion'?'healingPotion':entry.id):null;
   if(ability?.cooldown&&runtime.cooldowns[ability.id]>0)button.classList.add('is-cooldown');
   button.addEventListener('click',()=>{if(chooseSlot>=0){chooseSlot=i;openWindow('spells');}else useAbility(i)});
   hotbar.append(button);
  });
  if(!modal.hidden)renderModal();
  }
  // Refresh attack range and resource readiness from live state every 200 ms without recreating buttons.
  const selectedHostile=isLivingHostile(target);
  const targetRange=selectedHostile?distance(target):Infinity;
  let areaRange=Infinity;
  if(state.hotbar.some(entry=>getAbilityDefinition(entry?.id)?.kind==='area')){
   for(const enemy of [...mobs,dummy])if(isLivingHostile(enemy))areaRange=Math.min(areaRange,distance(enemy));
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
   const rangeIndicator=getAbilityRangeIndicator(def,{targetDistance:targetRange,nearestHostileDistance:areaRange,approachRange:APPROACH_RANGE});
   button.classList.toggle('is-out-of-range',rangeIndicator.outOfRange);
   button.dataset.inRange=String(!rangeIndicator.outOfRange);
   const resourceIndicator=getAbilityResourceIndicator(def,{resource:state.resource});
   button.classList.toggle('is-resource-unavailable',resourceIndicator.insufficient);
   button.dataset.hasResource=String(!resourceIndicator.insufficient);
   const autoActive=entry?.id==='autoAttack'&&autoplay;
   button.classList.toggle('is-active',autoActive);
   if(entry?.id==='autoAttack'){
    const art=button.querySelector('.planetAbilityIcon');
    if(art&&button.dataset.autoActive!==String(autoActive)){
     art.innerHTML=autoActive?HOTBAR_AUTO_ACTIVE:HOTBAR_ART.autoAttack;
     button.dataset.autoActive=String(autoActive);
    }
    button.setAttribute('aria-pressed',String(autoActive));
    button.title=rangeIndicator.outOfRange?(selectedHostile?'Автоатака: цель дальше 20 м':'Автоатака: выберите цель в радиусе 20 м'):(autoActive?'Автоатака включена':'Автоатака выключена');
   }
   const isPotion=entry?.id==='healingPotion',count=isPotion?itemCount('healingPotion'):0;
   const quantity=button.querySelector('.planetItemQuantity');
   if(quantity){quantity.hidden=!isPotion;quantity.textContent=isPotion?String(count):'';}
   button.classList.toggle('is-unavailable',isPotion&&count===0);
   // Keep physical buttons clickable for hotbar reassignment; failed casts are
   // still rejected by abilityFailure, including on keyboard and mobile.
   button.setAttribute('aria-disabled',String(resourceIndicator.insufficient||(isPotion&&count===0)));
   if(isPotion)button.title=count>0?'Лечебных настоев: '+count:'Лечебных настоев нет';
   else if(def&&entry?.id!=='autoAttack'){
    const problems=[];
    if(resourceIndicator.insufficient){
     const resourceType=getClassDefinition(state.classId||'warrior').resource;
     const resourceName=resourceType==='rage'?'ярости':resourceType==='mana'?'маны':'ресурса';
     problems.push('Недостаточно '+resourceName+': '+pretty(resourceIndicator.available)+' / '+pretty(resourceIndicator.required));
    }
    if(rangeIndicator.outOfRange)problems.push(def.requiresTarget&&!selectedHostile?
     'Сначала выберите противника':def.name+': вне радиуса '+String(rangeIndicator.limit).replace('.',',')+' м');
    button.title=problems.length?problems.join(' · '):def.name;
   }
   // Out-of-range strikes may still trigger auto-approach inside 20 m;
   // resource-starved casts are already refused by the shared combat validator.
  }
 }
 function renderModal(){
  const kind=modal.dataset.kind,title=$('mtitle'),body=$('mbody');
  // Keep the focused iPhone input mounted through HUD redraws and server/roster refreshes.
  if(kind==='party'&&isOnline()&&body.querySelector('.ngw-chat-message')){
   const roster=body.querySelector('.ngw-party-roster');
   if(roster){paintPartyRoster(roster);return;}
  }
  // iOS Safari scroll anchoring is disrupted whenever the inventory panel's
  // children are destroyed, even if scrollTop is restored synchronously.
  // Skip all DOM replacement when actual bag and equipment data are unchanged.
  // A checkpoint, combat HUD redraw or server ping must not scroll the sheet.
  if(kind==='battlefuryTuner'&&body.querySelector('.battlefury-tuner'))return;
  if(kind==='bag'){
   const snapshot=JSON.stringify([state.inventory,state.equipment,state.level,state.gold]);
   if(bagRenderSnapshot===snapshot&&body.querySelector('.inventory-grid'))return;
   bagRenderSnapshot=snapshot;
  }
  if(kind==='banditQuest'&&authenticatedProfile&&state.banditChiefQuest?.stage===2){
   const snapshot=JSON.stringify([state.banditQuest,state.banditWeaponsQuest,state.banditChiefQuest,
    state.level,chiefRewardSelection,chiefRewardSubmitting]);
   if(chiefRewardRenderSnapshot===snapshot&&body.querySelector('.ngw-quest-rewards'))return;
   chiefRewardRenderSnapshot=snapshot;
  }
  if(kind==='quests'){
   const snapshot=JSON.stringify([journalTab,trackedQuestId,state.quest,state.kills,state.level,
    state.gatherStage,state.gatherAvailable,state.banditQuest,state.banditWeaponsQuest,
    state.banditChiefQuest,state.inventory]);
   if(journalRenderSnapshot===snapshot&&body.querySelector('.planet-journal-tabs'))return;
   journalRenderSnapshot=snapshot;
  }
  // Save the scroll offset before clearing DOM. On iOS the old contents
  // may be removed by a server refresh while the player is comparing gear.
  const previousBagScroll=kind==='bag'?body.scrollTop:0;
  const previousJournalScroll=kind==='quests'?body.scrollTop:0;
  const characterReuse=kind==='character'?{
   viewport:body.querySelector('.character-preview-viewport'),
   gesture:body.querySelector('.character-rotate')}:null;
  const characterScroll=kind==='character'?body.scrollTop:0;
  if(kind!=='character'&&kind!=='battlefuryTuner')characterPreview.release();
  modal.classList.toggle('world-sheet',['chest','bag','loot','gatherLoot','merchant','mentor','herbalist','banditQuest','quests','spells'].includes(kind));
  $('panel').classList.toggle('chest-sheet',kind==='chest');
  $('panel').classList.toggle('character-modal',kind==='character');
  $('panel').classList.toggle('inventory-modal',kind==='bag');
  $('panel').classList.toggle('battlefury-modal',kind==='battlefuryTuner');
  $('msub').textContent=isOnline()?'NEXGAMEWORLD · ОБЩИЙ МИР':'NEXGAMEWORLD · ЛОКАЛЬНЫЙ РЕЖИМ';
  // Only the pause/settings menu may expose camera and graphics controls.
  // Dialogs, loot, backpack, quests and merchant must never inherit these.
  $('cameraControl').hidden=kind!=='menu';
  $('graphicsControl').hidden=kind!=='menu';
  title.textContent=({bag:'Рюкзак',character:'Персонаж',quests:'Журнал заданий',
   merchant:'Торговец',spells:'Книга способностей',loot:'Обыск тела',menu:'Меню',herbalist:'Травница Тихая Заря',chest:'Сундук',gatherLoot:'Собранный ресурс',mentor:'Наставник Каменный Рог',banditQuest:'Следопыт Медная Стрела',party:'Группа и чат',battlefuryTuner:'Тюнер · Боевой гнев'})[kind]||'NexGameWorld';
  body.replaceChildren();
  const line=(label,caption,actions=[])=>{
   const row=document.createElement('div');row.className='rpgRow';
   const name=document.createElement('div');name.innerHTML='<strong></strong><small></small>';
   name.querySelector('strong').textContent=label;name.querySelector('small').textContent=caption;
   row.append(name);for(const [caption,fn] of actions){const b=document.createElement('button');b.type='button';b.textContent=caption;b.addEventListener('click',fn);row.append(b);}
   body.append(row);
  };
  if(kind==='battlefuryTuner'){
   if(state.equipment.weapon?.id!==BATTLEFURY_ITEM_ID){
    line('Топор не экипирован','Надень «Боевой гнев», чтобы настроить его модель.');return;
   }
   const editor=document.createElement('section');editor.className='battlefury-tuner';
   const intro=document.createElement('p');intro.className='battlefury-tuner-description';
   intro.textContent='Поворачивай персонажа и настраивай положение, кисть и размер топора в 3D-просмотре.';
   editor.append(intro);
   const stage=document.createElement('div');stage.className='battlefury-tuner-stage';
   const viewport=document.createElement('div');viewport.className='character-preview-viewport';
   const gesture=document.createElement('div');gesture.className='character-rotate';
   const hint=document.createElement('span');hint.className='character-rotate-hint';
   hint.textContent='Проведи пальцем, чтобы повернуть персонажа';
   gesture.append(hint);stage.append(viewport,gesture);editor.append(stage);
   const inputs=new Map();
   for(const group of BATTLEFURY_TUNER_GROUPS){
    const section=document.createElement('section');section.className='battlefury-tuner-group';
    const heading=document.createElement('h3');heading.textContent=group.title;section.append(heading);
    for(const key of group.fields){
     const spec=BATTLEFURY_TUNER_FIELDS[key];
     const row=document.createElement('div');row.className='battlefury-tuner-field';
     const label=document.createElement('label');label.textContent=spec.label;
     const input=document.createElement('input');input.type='range';
     input.min=String(spec.min);input.max=String(spec.max);input.step=String(spec.step);
     input.id='battlefury-'+key;label.htmlFor=input.id;
     input.value=String(battlefuryTuning[key]);input.dataset.axis=key;
     const out=document.createElement('output');out.className='battlefury-tuner-value';
     const show=()=>{out.textContent=key==='scale'?Math.round(battlefuryTuning[key]*100)+'%':
      String(battlefuryTuning[key])+spec.unit};
     show();row.append(label,input,out);
     input.setAttribute('aria-label',group.title+' · '+spec.label);
     input.addEventListener('input',()=>{
      tuneBattlefury({...battlefuryTuning,[key]:Number(input.value)});
      show();
     });
     inputs.set(key,{input,show});section.append(row);
    }
    editor.append(section);
   }
   const actions=document.createElement('div');actions.className='battlefury-tuner-actions';
   const reset=document.createElement('button');reset.type='button';reset.textContent='Сбросить настройки';
   reset.addEventListener('click',()=>{
    tuneBattlefury(BATTLEFURY_TUNER_DEFAULTS);
    for(const [key,entry] of inputs){entry.input.value=String(battlefuryTuning[key]);entry.show();}
   });
   const back=document.createElement('button');back.type='button';back.textContent='К персонажу';
   back.addEventListener('click',()=>openWindow('character'));
   actions.append(reset,back);editor.append(actions);
   const note=document.createElement('p');note.className='battlefury-tuner-footnote';
   note.textContent='Настройки сохраняются только в этом браузере и влияют исключительно на «Боевой гнев». Исходный GLB и характеристики не изменяются.';
   editor.append(note);body.append(editor);
   characterPreview.mount(viewport,gesture);
   return;
  }
  if(kind==='party'){
   if(!isOnline()){line('Нет подключения','Группы и чат доступны при подключении к общему миру.');return;}
   const roster=document.createElement('section');roster.className='ngw-party-roster';
   body.append(roster);paintPartyRoster(roster);
   const log=document.createElement('div');
   log.id='partyChatLog';log.className='ngw-chat-log';log.setAttribute('role','log');
   log.setAttribute('aria-label','Последние сообщения чата');
   body.append(log);paintChatHistory();
   const message=document.createElement('input');message.type='text';message.maxLength=180;
   message.className='ngw-chat-message';
   message.placeholder='Написать сообщение…';message.style.cssText='width:100%;margin:8px 0;padding:9px';
   body.append(message);
   const sendMessage=channel=>{
    if(message.value.trim()&&multiplayer.sendChat(channel,message.value.trim())){
     message.value='';msg('Сообщение отправлено',1.2);
    }
   };
   message.addEventListener('keydown',event=>{
    if(event.key==='Enter'){event.preventDefault();sendMessage('world');}
   });
   line('Чат','Enter — в мир · сообщения текущей сессии',[
    ['В мир',()=>sendMessage('world')],['В группу',()=>sendMessage('party')]
   ]);
   return;
  }
  if(kind==='chest'&&(isOnline()||authenticatedProfile)){
   title.textContent='Общий сундук';
   chestSheet.render(body,onlineChest,{connected:isOnline(),syncing:chestRetryCount>0});
   return;
  }
  if(authenticatedProfile&&kind==='herbalist'){
   const quest=GATHER_QUESTS[state.gatherStage];
   if(state.gatherStage===0){
    line('Цветы равнин','Помоги собрать первые цветы для травницы.',
     [['Принять',()=>sendAccountAction('gatherAccept')]]);
   }else if(state.gatherStage>=4){
    line('Все поручения выполнены','Травница благодарит за помощь.');
   }else if(state.gatherAvailable){
    line(quest.title,'Готово следующее поручение. '+quest.hint,
     [['Принять',()=>sendAccountAction('gatherAccept')]]);
   }else{
    const count=itemCount(quest.item);
    line(quest.title,'Собрано '+count+' / '+quest.count+'. '+quest.hint,
     count>=quest.count?[['Сдать',()=>sendAccountAction('gatherTurnIn')]]:[]);
   }
   return;
  }
  if(authenticatedProfile&&kind==='banditQuest'){
   const q=state.banditQuest||{stage:0,kills:0};
   if(q.stage===0&&state.level<BANDIT_QUEST_MIN_LEVEL)
    line('Пока рано отправляться на тропу','Задание «Разбойники Пыльной тропы» доступно с 3-го уровня. Сейчас у тебя '+state.level+'-й уровень.');
   else if(q.stage===0)
    line('Разведка лагеря разбойников','Найди лагерь Пыльной тропы на западной границе долины, победи трёх разбойников и возвращайся. Награда: 85 опыта и 18 монет.',
     [['Принять задание',()=>sendAccountAction('banditAccept')]]);
   else if(q.stage===1)
    line('Разведка лагеря разбойников','Побеждено разбойников: '+q.kills+' / '+BANDIT_QUEST_KILLS+'. Ищи их в западном лагере.');
   else if(q.stage===2)
    line('Разведка лагеря разбойников','Трое разбойников побеждены. Награда: 85 опыта и 18 монет.',
     [['Сдать задание',()=>sendAccountAction('banditTurnIn')]]);
   else if(weaponsStage()===0)
    line('Оружие разбойников','Разбойники бросили кинжалы возле своего западного лагеря. Найди на земле и собери три кинжала, затем принеси их мне. Награда: 90 опыта и 20 монет.',
     [['Принять задание',()=>sendAccountAction('banditWeaponsAccept')]]);
   else if(weaponsStage()===1){
    const count=itemCount(BANDIT_WEAPON_ITEM);
    line('Оружие разбойников','Собрано кинжалов: '+count+' / '+BANDIT_WEAPON_REQUIRED+'. Осмотри землю вокруг лагеря Пыльной тропы. Награда: 90 опыта и 20 монет.',
     count>=BANDIT_WEAPON_REQUIRED?[['Сдать оружие',()=>sendAccountAction('banditWeaponsTurnIn')]]:[]);
   }
   else if((state.banditChiefQuest?.stage??0)===0&&state.level<4)
    line('Последний противник','Ты справился с разбойниками. Вернись на 4-м уровне, чтобы получить задание на главаря.');
   else if((state.banditChiefQuest?.stage??0)===0)
    line('Главарь Пыльной тропы','На отдельной площадке к северо-западу от лагеря стоит главарь 5-го уровня. Найди тропу, победи его и возвращайся. Награда: 180 опыта и 35 монет.',
     [['Принять задание',()=>sendAccountAction('banditChiefAccept')]]);
   else if(state.banditChiefQuest.stage===1)
    line('Главарь Пыльной тропы','Победи главаря разбойников у отдельной стоянки в конце тропы.');
   else if(state.banditChiefQuest.stage===2){
    renderChiefRewardChoice({
     document,body,items:ITEM_CATALOG,selectedId:chiefRewardSelection,
     pending:chiefRewardSubmitting,
     onSelect:id=>{
      chiefRewardSelection=id;
      chiefRewardRenderSnapshot=JSON.stringify([state.banditQuest,state.banditWeaponsQuest,state.banditChiefQuest,
       state.level,chiefRewardSelection,chiefRewardSubmitting]);
     },
     onSubmit:id=>{
      const sent=sendAccountAction('banditChiefTurnIn',{rewardItemId:id});
      if(sent)chiefRewardSubmitting=true;
      return sent;
     }
    });
   }
   else line('Тропа снова безопасна','Главарь повержен. Благодарю за службу.');
   return;
  }
  if(authenticatedProfile&&kind==='mentor'){
   const q=state.quest;
   if([0,3,6,9].includes(q))
    line((QUEST_LINES[q]||[])[0]||'Наставник',(QUEST_LINES[q]||[])[1]||'Начни новое испытание.',
     [['Принять испытание',()=>sendAccountAction('mentorAccept')]]);
   else if([2,5,8,11].includes(q))
    line('Испытание выполнено','Наставник готов вручить заслуженную награду.',
     [['Получить награду',()=>sendAccountAction('mentorTurnIn')]]);
   else if(q===12)line('Все испытания пройдены','Ты завершил обучение!');
   else line((QUEST_LINES[q]||[])[0]||'Испытание',
    q===1?'Долгоноги: '+state.kills+' / 3':(QUEST_LINES[q]||[])[1]||'Выполняется.');
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
   const summary=document.createElement('div');summary.className='planet-loot-summary';
   const summaryLeft=document.createElement('span');
   summaryLeft.textContent='На теле: '+corpse.loot.length+' '+(corpse.loot.length===1?'предмет':'предм.');
   const summaryRight=document.createElement('span');
   summaryRight.textContent='Рюкзак: '+state.inventory.length+' / 12';
   summary.append(summaryLeft,summaryRight);body.append(summary);
   const notice=document.createElement('p');notice.className='planet-loot-notice';
   notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
   notice.textContent=pendingLootTake?'Ожидаем подтверждение сервера…':'Нажми на предмет, чтобы забрать его.';
   body.append(notice);
   const list=document.createElement('div');list.className='loot-list';
   list.setAttribute('aria-label','Предметы, оставшиеся на теле');
   corpse.loot.forEach((item,index)=>{
    const isMoney=item.id===CORPSE_COIN_ID;
    const def=ITEM_CATALOG[item.id],rarity=itemRarity(def?.rarity);
    const button=document.createElement('button');button.type='button';button.className='loot-item';
    button.dataset.rarity=rarity;
    button.disabled=!!pendingLootTake;
    button.setAttribute('aria-label',isMoney?'Забрать '+item.qty+' монет':'Взять '+(def?.name||item.id)+', '+item.qty+' шт.');
    const icon=document.createElement('span');icon.className='loot-item-icon';
    icon.textContent=isMoney?'🪙':def?.icon||'◆';icon.setAttribute('aria-hidden','true');
    const copy=document.createElement('span');copy.className='loot-item-copy';
    const name=document.createElement('span');name.className='loot-item-name';
    name.textContent=isMoney?'Монеты':def?.name||item.id;
    name.style.color=QUALITY_VISUALS[rarity]?.color||'#e6d2aa';
    const sub=document.createElement('small');sub.className='loot-item-stats';
    const stats=[def?.armor?'Броня '+def.armor:null,def?.strength?'Сила +'+def.strength:null,
     def?.stamina?'Выносливость +'+def.stamina:null].filter(Boolean).join(' · ');
    sub.textContent=isMoney?'Зачисляются в кошелёк при получении':stats||(def?.slot?LABEL[def.slot]+' · '+(def.quality||'Снаряжение'):
     def?.description||'Предмет для продажи');
    copy.append(name,sub);
    const count=document.createElement('span');count.className='loot-item-count';
    count.textContent=isMoney?'+'+item.qty:item.qty>1?'×'+item.qty:'›';
    button.append(icon,copy,count);
    button.addEventListener('click',()=>takeLootFromCorpse(corpse,index));
    list.append(button);
   });
   body.append(list);
   const actions=document.createElement('div');actions.className='planet-loot-actions';
   const takeAll=document.createElement('button');takeAll.type='button';takeAll.className='choice';
   takeAll.textContent=pendingLootTake?'Получаем добычу…':'Забрать всё';
   takeAll.disabled=!!pendingLootTake;
   takeAll.addEventListener('click',()=>takeAllFromCorpse(corpse));
   const leave=document.createElement('button');leave.type='button';leave.className='choice planet-loot-leave';
   leave.textContent='Закрыть';leave.addEventListener('click',closeWindow);
   actions.append(takeAll,leave);body.append(actions);
   return;
  }
  if(kind==='menu'){
   line('Сферический мир','Исследуй планету NexGameWorld, настраивай камеру и графику в меню.');
   for(const item of settingsControls)body.append(item);
   line('Сетевая игра',isOnline()?'Общий мир: мобы, бой, награды и группы синхронизируются через Render.':
     authenticatedProfile?'Нет соединения: прогресс временно недоступен. Переподключение произойдёт автоматически.':
     'Локальный тестовый режим: прогресс сохраняется только на устройстве.');
   if(!preview&&!authenticatedProfile){
    line('Тестирование заданий','Начать заново: уровень, все задания, вещи и сундук. Графика, масштаб и режим слежения камеры сохранятся.',[['Сбросить прогресс',resetProgress]]);
    body.lastElementChild?.querySelector('button')?.classList.add('reset-progress-action');
   }
  }else if(kind==='bag'){
    // Periodic HUD and server inventory updates rebuild this panel. Keep the
    // inspected item selected, and preserve scroll position across redraws.
    const bagScroll=previousBagScroll;
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
          selectedBagSlot=i;selectedBagItemId=item.id;
          detail.replaceChildren();
          const name=document.createElement('strong');name.textContent=def?.name||'Лечебный настой';
     if(def)name.style.color=QUALITY_VISUALS[itemRarity(def.rarity)].color;
          const description=document.createElement('p');description.textContent=def?.description||'Восстанавливает здоровье';
          detail.append(name);
          if(def?.slot){
           const comparison=compareEquipment(item.id,state.level,state.equipment);
           const equipped=document.createElement('div');
           equipped.className='ngw-item-equipped';
           equipped.textContent='Сравнение с '+(comparison.current?.name||'пустой ячейкой')+
            ' · '+(LABEL[comparison.slot]||comparison.slot);
           detail.append(equipped);
           const stats=document.createElement('div');stats.className='ngw-item-stats';
           for(const stat of itemStatRows(item.id)){
            const row=document.createElement('div');row.className='ngw-item-stat';
            row.textContent=stat.label+': '+stat.value;
            stats.append(row);
           }
           if(stats.children.length)detail.append(stats);
           const box=document.createElement('div');
           box.className='ngw-gear-compare '+comparison.overall;
           const headline=document.createElement('strong');
           headline.textContent=comparison.overall==='better'?'Улучшение характеристик':
            comparison.overall==='worse'?'Характеристики ухудшатся':
            comparison.overall==='mixed'?'Есть улучшения и ухудшения':
            'Характеристики не изменятся';
           box.append(headline);
           if(comparison.meaningful.length){
            for(const stat of comparison.meaningful){
             const row=document.createElement('div');row.className='ngw-compare-row '+stat.trend;
             const label=document.createElement('span');label.textContent=stat.label;
             const values=document.createElement('span');
             const sign=stat.trend==='better'?'▲ ':stat.trend==='worse'?'▼ ':'';
             values.textContent=sign+stat.deltaText+' ('+
              Number(stat.before.toFixed(2)).toLocaleString('ru-RU')+' → '+
              Number(stat.after.toFixed(2)).toLocaleString('ru-RU')+')';
             row.append(label,values);box.append(row);
            }
           }else{
            const note=document.createElement('p');note.textContent='Бонусы и итоговые характеристики не изменятся.';
            box.append(note);
           }
           if(!comparison.requirementsMet){
            const levelNote=document.createElement('div');levelNote.className='ngw-compare-level';
            levelNote.textContent='Требуется уровень '+def.requiredLevel;
            box.append(levelNote);
           }
           detail.append(box);
          }
          detail.append(description);
          const commands=[...(def?.slot?[['Надеть',()=>equip(item.id)]]:[]),
            ...(authenticatedProfile?[]:[['🗑 Удалить',()=>{takeItem(item.id,1);draw();}]])];
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
    const selected=state.inventory[selectedBagSlot];
    if(selected&&selected.id===selectedBagItemId)
     grid.children[selectedBagSlot]?.click();
    else{selectedBagSlot=-1;selectedBagItemId=null;}
    body.scrollTop=bagScroll;
    // Safari may perform scroll anchoring during the next layout pass.
    // Restore only if this is still the same open bag, not after a user closes it.
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>{
      if(!modal.hidden&&modal.dataset.kind==='bag'&&Math.abs(body.scrollTop-bagScroll)>1)
       body.scrollTop=bagScroll;
    });
  }else if(kind==='character'){
    renderCharacterSheet({
     document,body,profile:authenticatedProfile,state,stats:stats(),items:ITEM_CATALOG,
     labels:LABEL,qualities:QUALITY_VISUALS,xpRequired,pretty,preview:characterPreview,
     reuse:characterReuse,selectedSlot:selectedEquipmentSlot,
     onSelectSlot:slot=>{selectedEquipmentSlot=slot},
     onOpenBag:()=>openWindow('bag'),
     onTuneWeapon:()=>openWindow('battlefuryTuner'),
     onUnequip:(slot,def)=>{
      if(!def)return msg('Пустой слот. Надеть предмет можно из рюкзака.');
      if(authenticatedProfile){
       const bagSlot=serverBagSlots.findIndex(row=>!row);
       if(bagSlot<0)return msg('В рюкзаке нет места');
       sendAccountAction('unequip',{equipmentSlot:slot,bagSlot});return;
      }
      const result=unequipToBag(state,slot,inCombat());
      if(!result.ok)return msg(result.error);
      finishEquipmentChange(slot);
     }
    });
    body.scrollTop=characterScroll;
  }else if(kind==='quests'){
   const tabs=document.createElement('div');tabs.className='planet-journal-tabs';tabs.setAttribute('role','tablist');
   const labels={current:'Текущие',available:'Доступные',completed:'Выполненные'};
   for(const [tab,label] of Object.entries(labels)){
    const button=document.createElement('button');button.type='button';button.className='choice'+(journalTab===tab?' is-selected':'');
    button.setAttribute('role','tab');button.setAttribute('aria-selected',String(journalTab===tab));
    button.textContent=label;button.addEventListener('click',()=>{journalTab=tab;renderModal();});tabs.append(button);
   }
   body.append(tabs);
   if(journalTab!=='completed'){
    const note=document.createElement('p');note.className='ngw-journal-help';
    note.textContent='Нажми «Отслеживать» возле задания, чтобы увидеть цель и расстояние прямо в игровом мире.';
    body.append(note);
   }
   const entries=mentorJournalRows(state).map(item=>({...item,routeId:'mentor',npc:'Наставник Каменный Рог'}));
   if(authenticatedProfile){
    const q=state.banditQuest||{stage:0,kills:0};
    entries.push({id:'bandit-trail',
     status:q.stage===0?(state.level>=BANDIT_QUEST_MIN_LEVEL?'available':'locked'):q.stage===3?'completed':'current',
     title:'1/3 · Разведка лагеря разбойников',objective:'Найти западный лагерь и победить 3 разбойников',
     progress:q.stage===3?'Сдано':q.stage===2?'Готово к сдаче':q.kills+' / '+BANDIT_QUEST_KILLS,
     reward:'85 опыта · 18 монет',npc:'Следопыт Медная Стрела'});
    if(q.stage===3){
     const weaponStage=weaponsStage(),collected=itemCount(BANDIT_WEAPON_ITEM);
     entries.push({id:'bandit-weapons',
      status:weaponStage===0?'available':weaponStage===2?'completed':'current',
      title:'2/3 · Оружие разбойников',objective:'Собрать 3 кинжала с земли у лагеря',
      progress:weaponStage===2?'Сдано':weaponStage===0?'Доступно у следопыта':
       collected>=BANDIT_WEAPON_REQUIRED?'Готово к сдаче':collected+' / '+BANDIT_WEAPON_REQUIRED,
      reward:'90 опыта · 20 монет',npc:'Следопыт Медная Стрела'});
     if(weaponStage===2){
      const chief=state.banditChiefQuest||{stage:0};
      entries.push({id:'bandit-chief',
       status:chief.stage===0?(state.level>=4?'available':'locked'):chief.stage===3?'completed':'current',
       title:'3/3 · Главарь Пыльной тропы',objective:'Победить главаря у отдельной стоянки',
       progress:chief.stage===3?'Сдано':chief.stage===2?'Готово к сдаче':chief.stage===1?'0 / 1':'Не принято',
       reward:'180 опыта · 35 монет',npc:'Следопыт Медная Стрела'});
     }
    }
   }
   for(let i=1;i<=3;i++){
    const quest=GATHER_QUESTS[i],stage=state.gatherStage;
    const status=stage>i?'completed':stage===i?(state.gatherAvailable?'available':'current'):i===1&&stage===0?'available':null;
    if(!status)continue;
    const count=status==='completed'?quest.count:state.inventory.filter(entry=>entry?.id===quest.item).reduce((sum,entry)=>sum+entry.qty,0);
    entries.push({id:'gather-'+i,status,title:quest.title,
     objective:'Собрать '+quest.count+' шт.: '+(ITEM_CATALOG[quest.item]?.name||quest.item),
     progress:status==='completed'?'Сдано травнице':status==='available'?'Доступно у травницы':'Собрано '+count+' / '+quest.count,
     reward:quest.gold+' монет · '+quest.xp+' опыта',npc:'Травница Тихая Заря'});
   }
   const visible=entries.filter(entry=>entry.status===journalTab);
   let hasHint=false;
   if(journalTab==='available'&&state.level<BANDIT_QUEST_MIN_LEVEL){
    line('Разбойники Пыльной тропы · ур. 3','Откроется на 3-м уровне у Следопыта Медной Стрелы.');
    hasHint=true;
   }
   if(journalTab==='available'&&entries.some(entry=>entry.status==='locked'&&entry.id==='bandit-chief')){
    line('Главарь Пыльной тропы · ур. 4','Для финального задания требуется 4-й уровень и сдача трёх кинжалов.');
    hasHint=true;
   }
   for(const entry of visible){
    const routeId=entry.routeId||entry.id;
    const waypoint=entry.status!=='completed'?
     questWaypoint(routeId,state,state.inventory,player()):null;
    const actions=waypoint?[[(trackedQuestId===routeId?'✓ Отслеживается':'Отслеживать'),
      ()=>{
       trackedQuestId=trackedQuestId===routeId?null:routeId;
       journalRenderSnapshot=null;
       draw(false);renderModal();
      }]]:[];
    line((entry.status==='completed'?'✓ ':entry.status==='available'?'! ':'• ')+entry.title,
     entry.objective+' · '+entry.progress+(entry.reward?' · '+entry.reward:'')+
     ' · '+entry.npc+(waypoint?' · Цель: '+waypoint.title:''),actions);
   }
   if(!visible.length&&!hasHint)line('Пока пусто','В этом разделе заданий пока нет.');
   body.scrollTop=previousJournalScroll;
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
       if(authenticatedProfile)return sendAccountAction('merchantBuy',{itemId:id,qty:1});
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
       if(authenticatedProfile)return sendAccountAction('merchantSell',{
        bagSlot:serverBagSlot(index),qty:row.qty});
       const result=sellInventorySlot(state,index);
       if(!result.ok)return msg('Этот предмет нельзя продать');
       persist();renderModal();draw();msg('Продано: '+item.name);
      }]]);
    });
    if(!available)line('Нет предметов на продажу','Квестовые вещи нельзя продавать.');
   }else{
    if(authenticatedProfile){line('Выкуп недоступен','Серверная история продаж появится позже.');return;}
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
       if(authenticatedProfile){sendAccountAction('hotbarSet',{slot,entry:{kind:info.kind,id:info.id}});chooseSlot=-1;return;}
       state.hotbar=assignHotbarSlot(state.hotbar,slot,{kind:info.kind,id:info.id},'warrior',state.level);
       chooseSlot=-1;persist();draw();msg('Назначено в ячейку '+(slot+1));
     });list.append(btn);
   }
   const clear=document.createElement('button');clear.type='button';
   clear.className='spellbook-entry spellbook-remove';clear.textContent='✕ Очистить выбранную ячейку';
   clear.addEventListener('click',()=>{
     if(chooseSlot<0)return msg('Сначала выбери ячейку панели');
     if(authenticatedProfile){sendAccountAction('hotbarSet',{slot:chooseSlot,entry:null});chooseSlot=-1;return;}
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
  ['allyClear',()=>{selectedAllyId=null;draw()}],
  ['allyInvite',inviteSelectedAlly],
  ['dummyReset',()=>{dummy.trainingStats=createTrainingStats();draw();}]
 ];
 for(const [id,fn] of actions){const node=$(id);if(node)bind(node,'click',fn);}
 bind($('modalClose'),'click',()=>{chooseSlot=-1;closeWindow();});
 document.addEventListener('keydown',e=>{
  if(e.target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/i.test(e.target?.tagName||''))return;
  const key=e.key.toLowerCase();
  if(key==='escape'&&!modal.hidden){closeWindow();e.preventDefault();}
  if(!modal.hidden)return;
  const shortcut={i:'bag',c:'character',j:'quests',b:'spells'};
  if(shortcut[key]&&!e.repeat){openWindow(shortcut[key]);e.preventDefault();}
  if(key==='tab'){if(!e.repeat)targetNearest(e.shiftKey?-1:1);e.preventDefault();}
  if(key==='e'){interact();e.preventDefault();}
 });
 // Tap actors by their actual Three.js shapes; ordinary terrain taps clear selection.
 const picker=new THREE.Raycaster(),startPointer=new Map();
 canvas.addEventListener('pointerdown',e=>{startPointer.set(e.pointerId,{x:e.clientX,y:e.clientY});});
 canvas.addEventListener('pointercancel',e=>startPointer.delete(e.pointerId));
 canvas.addEventListener('pointerup',e=>{
  const start=startPointer.get(e.pointerId);startPointer.delete(e.pointerId);
  if(!modal.hidden||!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)>14)return;
  const rect=canvas.getBoundingClientRect();
  const x=(e.clientX-rect.left)/rect.width*2-1,y=-((e.clientY-rect.top)/rect.height*2-1);
  picker.setFromCamera(new THREE.Vector2(x,y),camera);
  const visible=entities.filter(o=>o.root.visible&&!(o.kind==='mob'&&o.dead&&!o.corpse));
  const roots=visible.map(o=>o.root);
  const intersects=picker.intersectObjects(roots,true);
  const entityHit=intersects.find(v=>v.distance<100);
  const hit=entityHit?.object;
  const selected=hit?visible.find(o=>{let p=hit;while(p){if(p===o.root)return true;p=p.parent;}return false;}):null;
  const allyHit=multiplayer?.pickPlayer?.(picker,100);
  if(allyHit?.peer&&(!entityHit||allyHit.distance<entityHit.distance)){
   selectAlly(allyHit.peer.id);return;
  }
  if(selected?.kind==='mob'&&selected.corpse){
   if(distance(selected)<=CORPSE_LOOT_RANGE)showCorpseLoot(selected);
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
  updateServerGatherCast();
  characterPreview.tick(dt);
  // Recover a mobile connection that stopped responding after a loot request.
  if(pendingLootTake&&(!isOnline()||Date.now()-pendingLootTake.at>8500)){
   pendingLootTake=null;
   if(!modal.hidden&&modal.dataset.kind==='loot'){
    renderModal();
    lootNotice('Ответ сервера задержался. Проверь соединение и попробуй снова.');
   }
  }
  gathering.updateChestMotion(dt);
  if(isOnline()&&distance(gathering.chest)<12&&clock>=nextChestStatusCheck){
   // A lost/too-early proximity response must not leave the label at —/18
   // until the player opens the chest. Retry faster until a count is known.
   if(multiplayer.requestChestStatus())
    nextChestStatusCheck=clock+(knownChestUsed===null?1.5:8);
  }
  if(!isOnline()){
   knownChestUsed=null;lastChestRevision=-1;nextChestStatusCheck=-1;
  }
  paintChestLabel();
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
    if(isOnline()&&impact.target.kind==='mob')multiplayer.sendAttack(impact.skill,impact.target.id);
    else harm(impact.target,rollMeleeDamage(stats(),bonus),impact.skill);
   }else if(impact.skill!=='autoAttack')msg('Цель не перед вами',1.1);
  }
  if(!toast.hidden&&clock>messageUntil){toast.classList.remove('show');toast.hidden=true;}
  tickAbilityRuntime(runtime,dt);
  // Original NexGame regenerates +3 HP/s and loses 5 rage/s after five
  // seconds of peace. This local test does not depend on network snapshots.
  if(inCombat())lastCombatAt=clock;
  else if(!authenticatedProfile&&clock-lastCombatAt>5){
   const hpBefore=state.hp,rageBefore=state.resource;
   state.hp=Math.min(stats().maxHp,state.hp+3*dt);
   if(state.resource>0)state.resource=changeResource(state.resource,-WARRIOR_RAGE_DECAY*dt,'warrior');
   if((state.hp!==hpBefore||state.resource!==rageBefore)&&Math.floor(clock/2)!==Math.floor((clock-dt)/2))persist();
  }
  camp.update(dt);
  banditWeapons.update(clock,weaponsAvailable,distance);
  // The original inhabitants have subtle idle breathing instead of frozen T-poses.
  for(let i=0;i<citizens.length;i++){
   animateSphericalTauren(citizens[i].actor,{dt,time:clock+i*1.47,walk:0,phase:0});
  }
  mentorWorld.update(state,clock);
  if(state.quest===7&&distance(mentorWorld.scout)<5.5){
   if(authenticatedProfile){
    if(isOnline()&&(!lastServerScoutRequest||Date.now()-lastServerScoutRequest>4500)){
     lastServerScoutRequest=Date.now();
     sendAccountAction('mentorInteract',{interaction:'scout'});
    }
   }else mentorChain.discoveredScout();
  }
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
   if(isOnline())mob.attackWindup=Math.max(0,(mob.attackWindup||0)-dt);
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
   // Exactly one pose evaluation per living mob: the movement branch below
   // provides its actual travel distance to birdAnimation/banditAnimation.
   if(mob.nameTag){
    mob.nameTag.visible=mob.root.visible&&!mob.corpse;
    // Match the WoW-style relative-difficulty tint with target level.
    if(mob.nameTag.material?.color&&mob.level)
     mob.nameTag.material.color.setHex(MONSTER_LEVEL_COLORS[monsterDifficulty(state.level,mob.level)]);
   }
   if(mob.alertTag){
    mob.alertTag.visible=mob.alertRemaining>0&&mob.root.visible&&!mob.corpse;
    if(mob.alertTag.visible)mob.alertTag.position.y=(mob.family==='bandit'?4.25:mob.boss?4:4.95)+Math.sin(clock*7)*.1;
   }
   if(isOnline()||authenticatedProfile){
    if(authenticatedProfile&&isOnline()&&mob.corpse&&!mob.lootKnown&&distance(mob)<=CORPSE_LOOT_RANGE&&clock>=(mob.lootInspectAt||0)){
     mob.lootInspectAt=clock+3;
     sendAccountAction('lootInspect',{mobId:mob.id,life:mob.life});
    }
    if(mob.corpse){
     const wasDying=mob.dying;mob.deathAnimation.update(dt);
     if(wasDying&&!mob.dying)updateLootMarker(mob);
    }else if(mob.root.visible){
     // Smooth authoritative 100ms server snapshots without altering hit detection.
     const bx=mob.renderX??mob.x,bz=mob.renderZ??mob.z;
     const delta=Math.hypot(mob.x-bx,mob.z-bz);
     const t=delta>7?1:1-Math.exp(-Math.min(.1,Math.max(0,dt))*15);
     mob.renderX=bx+(mob.x-bx)*t;mob.renderZ=bz+(mob.z-bz)*t;
     const priorYaw=mob.renderYaw??mob.yaw;
     const turn=Math.atan2(Math.sin(mob.yaw-priorYaw),Math.cos(mob.yaw-priorYaw));
     mob.renderYaw=priorYaw+turn*t;
     setModelAt(mob,mob.renderX,mob.renderZ,mob.renderYaw);
     // Render the server-authoritative movement and turn on EVERY frame.
     // Only far-away, noncombat GLB pose updates may run at 15/30 Hz.
     mob.animationTravel=(mob.animationTravel||0)+Math.hypot(mob.renderX-bx,mob.renderZ-bz);
     const animationDt=consumeAnimationTime(mob,dt,distance(mob),{
      urgent:mob.aggro||mob.attackWindup>0||mob.hit>0||mob===target
     });
     if(animationDt>0){
      birdAnimation(mob,animationDt,mob.animationTravel);
      mob.animationTravel=0;
     }
    }
    continue;
   }
   if(!mob.root.visible){
    if(advanceRespawnTimer(mob,dt)){mob.dead=0;mob.corpse=false;mob.hp=mob.maxHp;mob.x=mob.spawnX;mob.z=mob.spawnZ;
     mob.navigation=null;
     mob.root.visible=true;mob.returning=false;mob.aggro=false;mob.attackCd=1.2;mob.attackWindup=0;mob.hit=0;mob.corpseAge=0;mob.alertRemaining=0;
     mob.deathAnimation.reset();
     if(mob.family!=='bandit')resetPlainstriderVisual(mob);
     resetCreatureImpact(mob);
     if(mob.pendingBirdAsset){attachBirdVisual(mob,mob.pendingBirdAsset);mob.pendingBirdAsset=null;}
     if(mob.pendingBanditAsset){attachBanditVisual(mob,mob.pendingBanditAsset);mob.pendingBanditAsset=null;}
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
    if(mob.attackWindup<=0){
     mob.attackWindup=mob.boss?.45:.4;
     mob.visualStrikeCue=(mob.visualStrikeCue||0)+1;
     mob.visualStrikeWindupSeconds=mob.attackWindup;
     if(mob.birdVisual)mob.birdVisual.attackRemaining=Math.max(
      mob.birdVisual.attackRemaining||0,.8);
    }
    else{
     mob.attackWindup=Math.max(0,mob.attackWindup-dt);
     // An attack cannot land until the bird is visibly facing the player.
     if(mob.attackWindup<=0&&sphereFacingError(mob.yaw,desiredYaw)>.32)
      mob.attackWindup=.09;
     else if(mob.attackWindup<=0){
      const result=incomingShieldHit({
       THREE,heroNormal:playerNormal(),heroRoot:hero.root,
       enemyNormal:toNormal(mob.x,mob.z,getRadius()),stats:stats(),
       raw:monsterAttackDamage(mob.level,mob.boss),attackerLevel:mob.level
      });
      lastCombatAt=clock;state.hp=Math.max(0,state.hp-result.damage);
      if(result.blocked){
       blockRemaining=result.blockSeconds;
       hero.root.userData.blockRecoil=.65;
       combatVfx.trigger({root:hero.root},'block');
       msg('Блок щитом · отражено '+result.absorbed+' урона',1.1);
      }
      mob.attackCd=mob.boss?1.8:2.1;
      mob.visualStrikeHitSequence=(mob.visualStrikeHitSequence||0)+1;
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
 function updateQuestMarkers(){
  const name=mentor.root.getObjectByName('mentor-name');
  if(name)name.material.depthTest=distance(mentor)>16;
  questMarkers.update(clock,questMarkerQuality);
 }
 function setVisualQuality(detail){
  combatVfx.setQuality(detail);
  camp.setVisualQuality(detail);
  questMarkerQuality=Number.isFinite(detail)?detail:.68;
 }
 function getAnimationState(){
  return {gather:camp.casting||['casting','finishing'].includes(pendingServerGather?.phase),combat:inCombat(),attack:timeline.attackProgress,
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
  setMultiplayer,networkCharacter,onOnlinePlayers,onPartyState,onPartyInvite,onPartyNotice,onChat,onChestState,onChestStatus,onChestResult,
  onVitals,onCombatEvent,onKillCredit,applyServerProgress,onEconomyResult,onMobAttack,onMobTelegraph,onNetworkRespawn,onMobSnapshot,
  // Only the active owner's cosmetic pose is sent; item entitlement remains on server.
  getBattlefuryPose:()=>authenticatedProfile&&state.equipment.weapon?.id===BATTLEFURY_ITEM_ID?
   {...battlefuryTuning}:null,
  get combatActive(){return !!inCombat()},
  get movementLocked(){return !modal.hidden||timeline.stompProgress>=0||
   ['casting','finishing'].includes(pendingServerGather?.phase)},
  getWindowView(){
   if(modal.hidden||!modal.className.split(' ').includes('world-sheet'))return null;
   let focus=null;
   if(modal.dataset.kind==='chest'&&(!(isOnline()||authenticatedProfile)||Array.isArray(onlineChest?.slots))){
    focus=gathering.chest.root.localToWorld(new THREE.Vector3(0,1.1,0));
    focus.lerp(hero.root.position.clone().addScaledVector(playerNormal(),1.8),.5);
   }
   return {height:$('panel').getBoundingClientRect().height,focus};
  },
  getAnimationState,getQuestMapState,setVisualQuality,updateQuestMarkers,draw,get state(){return state}};
}
