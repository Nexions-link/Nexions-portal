import {consumeAnimationTime} from './animation-budget.js?v=1';
import {syncForestWolfMount} from './mount-visual.js?v=4';
import {advanceStridePhase,movementStrength,turnStrength} from './locomotion.js?v=1';
import {beginPlayerHitReaction} from './player-hit-reaction.js?v=1';
import {sampleChargeMotion,chargeTravelHeading,easeChargeHeading} from './charge-motion.js?v=1';
import {BATTLEFURY_ITEM_ID,normalizeBattlefuryTuning,applyBattlefuryPose} from './battlefury-tuner.js?v=1';
import {remoteEquipmentSpec} from './remote-equipment.js?v=1';
import {equipmentGrip,applyEquipmentTransform} from './equipment-grip.js?v=1';
import {createEquipmentVisualSwitcher} from './equipment-visual-switcher.js?v=1';
import {applyWeaponQuality,applyShieldQuality} from '../item-quality.js?v=0.3.7.1';
import {styleShieldGlb} from '../shield-assets.js?v=0.3.7.1';
// NexGameWorld Stage 1: spherical WebSocket presence and visual-only remote avatars.
// Combat, quests, loot and the player's local saves remain untouched.
const WORLD_URL='wss://api.nexions.ru/ws/nexgameworld';
const PROTOCOL=2;
const MAX_VISIBLE_PEERS=16;
const VISIBLE_DISTANCE=85;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const validNormal=n=>Array.isArray(n)&&n.length===3&&n.every(finite)
 &&Math.abs(Math.hypot(...n)-1)<.015;
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function validateSpherePlayer(p,radius){
 return !!p&&typeof p.id==='string'&&p.id.length<100&&
 typeof p.name==='string'&&p.name.length<=24&&
 validNormal(p.normal)&&finite(p.heading)&&Math.abs(p.heading)<=Math.PI*4&&
 p.radius===radius&&typeof p.moving==='boolean';
}
export function greatCircleDistance(a,b,radius){
 if(!validNormal(a)||!validNormal(b)||!finite(radius))return Infinity;
 return radius*Math.acos(clamp(a[0]*b[0]+a[1]*b[1]+a[2]*b[2],-1,1));
}
// Apply the post-ack local travel to the verified server position instead of
// rewinding a live character to the time of an older server snapshot.
export function rebaseSphereCorrection(THREE,sentNormal,serverNormal,currentNormal){
 if(!validNormal(sentNormal)||!validNormal(serverNormal)||!validNormal(currentNormal))
  return serverNormal;
 const travelled=new THREE.Quaternion().setFromUnitVectors(
  new THREE.Vector3(...sentNormal),new THREE.Vector3(...currentNormal));
 return new THREE.Vector3(...serverNormal).applyQuaternion(travelled).normalize().toArray();
}
function nameSprite(THREE,label){
 const canvas=document.createElement('canvas');
 canvas.width=384;canvas.height=64;
 const ctx=canvas.getContext('2d');
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle='#f4dfb5';ctx.textAlign='center';
 ctx.font='bold 28px Georgia,serif';
 ctx.shadowColor='#1f1209';ctx.shadowBlur=5;
 ctx.fillText(label.slice(0,24),canvas.width/2,42,362);
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false});
 const sprite=new THREE.Sprite(material);
 sprite.scale.set(3.3,.55,1);sprite.position.set(0,3.7,0);
 return sprite;
}
function disposeActor(root){
 root.traverse(child=>{
  if(child.geometry)child.geometry.dispose();
  if(child.material){
   for(const material of (Array.isArray(child.material)?child.material:[child.material])){
    if(material.map)material.map.dispose();
    material.dispose();
   }
  }
 });
 root.parent?.remove(root);
}
export function createSphericalPresence({
 THREE,scene,createAvatar,animateAvatar,getPosition,getCharacter,getBattlefuryPose,getRadius,heightAt,onStatus,
 onPlayers,onMobs,onVitals,onCombat,onKillCredit,onMobAttack,onMobStrike,onMobTelegraph,onMobHowl,onRespawn,onChargeLanded,
 onPartyState,onPartyInvite,onPartyNotice,onChat,onChatRejected,
 onChestState,onChestStatus,onChestResult,onCombatRejected,onChargeAccepted,onDisconnect,
 onVerifiedProgress,onAuthRejected,onEconomyResult,onPositionCorrection,
 onMountChange=null,onMountRejected=null,onMountCast=null,
 auth=null,url=WORLD_URL,loadBattlefuryScene=null,loadEquipmentScene=null
}){
 let socket=null,closed=false,selfId=null,synced=false,joinedRadius=null,retry=null,sendLoop=null,pendingChestOpen=null,lastCorrection=0,onlineCount=1,reconnectAttempts=0,lastServerMessageAt=Date.now();
 let moveSeq=0;
 const sentMoves=[];
 const confirmedMove=seq=>Number.isSafeInteger(seq)?
  sentMoves.find(item=>item.seq===seq):null;
 const clearMoves=()=>{sentMoves.length=0;moveSeq=0;};
 const acknowledgedCorrection=(server,seq,reason)=>{
  const sample=confirmedMove(seq),current=position();
  if(!sample||!current)return {normal:server,reason};
  return {normal:reason==='collision'?server:
   rebaseSphereCorrection(THREE,sample.normal,server,current.normal),reason};
 };
 const peers=new Map(),visuals=new Map(),chargeEvents=new Map(),remoteAttacks=new Map();
 let selfMount={mountState:'foot',mountId:null,owned:false};
 const applyMount=mount=>{
  const validId=mount?.mountId==='forest_wolf';
  const state=validId&&mount.mountState==='riding'?'riding':
   validId&&mount.mountState==='casting'?'casting':'foot';
  const owned=typeof mount?.owned==='boolean'?mount.owned:selfMount.owned;
  if(state===selfMount.mountState&&
    (state==='foot'?null:'forest_wolf')===selfMount.mountId&&owned===selfMount.owned)return;
  selfMount={mountState:state,mountId:state==='foot'?null:'forest_wolf',owned};
  onMountChange?.({...selfMount});
 };
 let equipmentLoaderPromise=null;
 const cachedEquipmentGltf=new Map();
 async function loadEquipmentAsset(url){
  let loading=cachedEquipmentGltf.get(url);
  if(!loading){
   loading=(async()=>{
    // The public server supplies item IDs, never asset paths. Resolve both
    // ordinary and admin gear exclusively from the bundled item catalog.
    if(url==='../assets/weapons/admin-battlefury.glb'&&loadBattlefuryScene)
     return {scene:await loadBattlefuryScene()};
    if(loadEquipmentScene){
     const result=await loadEquipmentScene(url);
     return result?.scene?result:{scene:result};
    }
    if(!equipmentLoaderPromise)equipmentLoaderPromise=import(
     'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js'
    ).then(({GLTFLoader})=>new GLTFLoader());
    return await (await equipmentLoaderPromise).loadAsync(url);
   })();
   cachedEquipmentGltf.set(url,loading);
   loading.catch(()=>{if(cachedEquipmentGltf.get(url)===loading)cachedEquipmentGltf.delete(url);});
  }
  return loading;
 }
 const rightHand=visual=>visual.actor.arms[1]?.hand;
 const leftHand=visual=>visual.actor.arms[0]?.hand;
 function clearGear(visual,slot){
  visual.gearMeshes[slot]?.removeFromParent();
  visual.gearMeshes[slot]=null;
  visual.gearKeys[slot]=null;
  const hand=slot==='weapon'?rightHand(visual):leftHand(visual);
  const grip=equipmentGrip(slot);
  visual.actor.root.userData.equipmentGrip[slot]=grip;
  if(hand)hand.rotation.set(grip.x,grip.y,grip.z,grip.order);
  if(slot==='weapon')visual.actor.root.userData.weaponKind='none';
 }
 function equipRemoteGear(visual,slot,gltf,spec){
  if(visuals.get(visual.id)!==visual)return;
  const hand=slot==='weapon'?rightHand(visual):leftHand(visual);
  if(!hand||!gltf?.scene?.clone)return;
  // Each player owns an Object3D clone. The cached decoded GLB is never
  // re-parented from another player or moved by an asynchronous load.
  const asset=gltf.scene.clone(true);
  let mesh=asset;
  if(spec.battlefury){
   const bounds=new THREE.Box3().setFromObject(asset);
   const size=bounds.getSize(new THREE.Vector3());
   const factor=1.95/Math.max(.001,size.x,size.y,size.z);
   const center=bounds.getCenter(new THREE.Vector3());
   asset.scale.multiplyScalar(factor);
   asset.position.sub(center.multiplyScalar(factor));
   mesh=new THREE.Group();mesh.add(asset);
  }
  mesh.name='gear-'+(slot==='shield'?'shield':spec.kind);
  let grip;
  if(spec.battlefury){
   const current=peers.get(visual.id);
   const pose=normalizeBattlefuryTuning(current?.battlefury?.pose);
   grip=applyBattlefuryPose(mesh,hand,pose);
   visual.gearPoseKey=JSON.stringify(pose);
  }else grip=applyEquipmentTransform(mesh,hand,spec);
  // Mark shared GLB buffers before decorating, to keep peer disposal safe.
  mesh.traverse(node=>{node.userData.ngwSharedGear=true;});
  const old=visual.gearMeshes[slot];
  hand.add(mesh);
  visual.gearMeshes[slot]=mesh;
  visual.gearKeys[slot]=spec.key;
  visual.actor.root.userData.equipmentGrip[slot]=grip;
  old?.removeFromParent();
  if(slot==='weapon'){
   visual.actor.root.userData.weaponKind=spec.kind;
   applyWeaponQuality(THREE,visual.actor.root,spec.kind,spec.rarity);
  }else{
   styleShieldGlb(THREE,mesh,spec.rarity);
   applyShieldQuality(THREE,visual.actor.root,spec.rarity);
  }
 }
 function createRemoteGearSwitcher(visual){
  return createEquipmentVisualSwitcher({
   load:spec=>loadEquipmentAsset(spec.url),
   clear:slot=>clearGear(visual,slot),
   swap:(slot,gltf,spec)=>equipRemoteGear(visual,slot,gltf,spec),
   onError:(slot,error)=>console.warn('Remote equipment unavailable',slot,error)
  });
 }
 function syncRemoteGear(visual,peer){
  for(const slot of ['weapon','shield']){
   const spec=remoteEquipmentSpec(peer,slot);
   void visual.gearSwitcher.update(slot,spec?.key??null,spec);
  }
  const certified=remoteEquipmentSpec(peer,'weapon');
  if(!certified?.battlefury||visual.gearKeys.weapon!==certified.key||
     !visual.gearMeshes.weapon)return;
  const pose=normalizeBattlefuryTuning(peer.battlefury.pose);
  const key=JSON.stringify(pose);
  if(visual.gearPoseKey===key)return;
  visual.gearPoseKey=key;
  visual.actor.root.userData.equipmentGrip.weapon=
   applyBattlefuryPose(visual.gearMeshes.weapon,rightHand(visual),pose);
 }

 const east=new THREE.Vector3(),north=new THREE.Vector3(),fwd=new THREE.Vector3(),
  right=new THREE.Vector3(),matrix=new THREE.Matrix4();
 const stopPeers=()=>{for(const peer of visuals.values())disposeActor(peer.actor.root);
  visuals.clear();peers.clear();chargeEvents.clear();remoteAttacks.clear();};
 const status=(value,count=null)=>{
  onStatus?.(value,count);
 };
 const position=()=>{
  const p=getPosition?.();
  if(!p||!validNormal(p.normal)||!finite(p.heading))return null;
  if(![87,174,261].includes(p.radius))return null;
  // All rotations are equivalent modulo 2π. Send the canonical angle so a
  // long Safari session cannot cause server movement validation failures.
  return {normal:p.normal,heading:Math.atan2(Math.sin(p.heading),Math.cos(p.heading)),
   radius:p.radius,moving:!!p.moving};
 };
 function onSnapshot(rows,count=null){
  const p=position();
  if(!p||!Array.isArray(rows))return;
  const seen=new Set();
  for(const row of rows){
   if(!validateSpherePlayer(row,p.radius)||row.id===selfId)continue;
   seen.add(row.id);
   const old=peers.get(row.id);
   peers.set(row.id,{...row});
   if(old?.name!==row.name){
    const visual=visuals.get(row.id);
    if(visual){disposeActor(visual.actor.root);visuals.delete(row.id)}
   }
  }
  for(const id of peers.keys()){
   if(!seen.has(id)){
    peers.delete(id);
    const visual=visuals.get(id);
    if(visual){disposeActor(visual.actor.root);visuals.delete(id)}
   }
  }
  onPlayers?.([...peers.values()]);
  if(Number.isInteger(count)&&count>=1)onlineCount=count;
  status('online',onlineCount);
 }
 function scheduleReconnect(){
  if(closed||retry!==null)return;
  const delay=Math.min(12000,1500*Math.pow(1.65,Math.min(reconnectAttempts++,5)));
  retry=setTimeout(()=>{retry=null;connect()},delay);
 }
 function connect(){
  if(closed||!url||typeof WebSocket==='undefined')return;
  if(socket&&(socket.readyState===WebSocket.CONNECTING||socket.readyState===WebSocket.OPEN))return;
  status(reconnectAttempts?'reconnecting':'connecting');
  let ws;
  try{ws=new WebSocket(url)}catch{status('reconnecting');scheduleReconnect();return}
  socket=ws;
  synced=false;selfId=null;lastServerMessageAt=Date.now();clearMoves();
  const send=data=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data))};
  ws.onopen=()=>{
   const p=position();
   if(!p){ws.close();return}
   joinedRadius=p.radius;
   if(auth)send({type:'authJoin',sessionToken:auth.sessionToken,
    characterId:auth.characterId});
   else send({type:'join',name:'Странник',...p,...getCharacter?.()});
   sendLoop=setInterval(()=>{
    if(ws.readyState!==WebSocket.OPEN||(auth&&!synced))return;
    const p=position();if(p){
     const visualPose=auth?getBattlefuryPose?.():null;
     const seq=++moveSeq;
     sentMoves.push({seq,normal:[...p.normal]});
     if(sentMoves.length>64)sentMoves.shift();
     send({type:'move',...p,moveSeq:seq,...(auth?{}:getCharacter?.()),
      ...(auth&&visualPose?{battlefuryPose:visualPose}:{})});
     // Same socket preserves ordering: proximity checks see the latest movement.
     if(pendingChestOpen){send(pendingChestOpen);pendingChestOpen=null;}
    }
   },100);
  };
  ws.onmessage=event=>{
   if(socket!==ws)return;
   lastServerMessageAt=Date.now();
   let m;try{m=JSON.parse(event.data)}catch{return}
   if(!m||typeof m!=='object')return;
   const p=position();
   if(!p)return;
   if(m.type==='welcome'){
    if(m.protocol!==PROTOCOL||m.world!=='nexgameworld'||m.radius!==p.radius){
     closed=true;status('incompatible');ws.close();return;
    }
    // A socket alone is NOT a synchronized player. Read trusted Neon progress
    // before enabling combat, inventory, movement or other commands.
    if(auth){
     if(!m.authenticated||!m.progress||!Number.isInteger(m.progress.revision)){
      ws.close(1008,'Trusted character progress required');return;
     }
     status('syncing');
     try{
      onVerifiedProgress?.(m.progress,'welcome');
      if(validNormal(m.progress.positionNormal))
       onPositionCorrection?.({normal:m.progress.positionNormal,
        heading:m.progress.heading,reason:'resync'});
     }catch{
      ws.close(1011,'Could not apply server progress');return;
     }
    }
    selfId=m.id;synced=true;reconnectAttempts=0;
    applyMount(m.mount||{mountState:'foot',mountId:null,owned:false});
    onSnapshot(Array.isArray(m.players)?m.players:[],m.onlineCount);
    if(Array.isArray(m.mobs))onMobs?.(m.mobs);
    onVitals?.(m);
   }else if(m.type==='snapshot'&&synced&&m.protocol===PROTOCOL&&m.radius===p.radius){
    onSnapshot(m.players,m.onlineCount);
    if(Array.isArray(m.mobs))onMobs?.(m.mobs);
    const own=m.players?.find(player=>player.id===selfId);
    if(own){
     if(own.mountState!==undefined)applyMount(own);
     onVitals?.(own);
     const sample=confirmedMove(own.moveSeq);
     // The local character is ahead of a 5 Hz snapshot: compare the position
     // actually transmitted for the packet the server has acknowledged.
     const deviation=greatCircleDistance(sample?.normal||
      (p.moving?own.normal:p.normal),own.normal,p.radius);
     if(validNormal(own.normal)&&deviation>2.2&&Date.now()-lastCorrection>800){
      lastCorrection=Date.now();
      const correction=acknowledgedCorrection(own.normal,own.moveSeq,'snapshot');
      onPositionCorrection?.({...correction,heading:own.heading});
     }
    }
     }else if(m.type==='mountCasting'){
     applyMount({mountState:'casting',mountId:m.mountId});
     onMountCast?.(m);
    }
    else if(m.type==='mountChanged')applyMount(m);
    else if(m.type==='mountRejected')onMountRejected?.(m.reason);
    else if(m.type==='positionCorrection'&&validNormal(m.normal)){
    lastCorrection=Date.now();
    const correction=acknowledgedCorrection(m.normal,m.moveSeq,m.reason);
    onPositionCorrection?.({...m,normal:correction.normal});
   }else if(m.type==='leave'&&typeof m.id==='string'){
    peers.delete(m.id);chargeEvents.delete(m.id);
    const visual=visuals.get(m.id);
    if(visual){disposeActor(visual.actor.root);visuals.delete(m.id)}
    onPlayers?.([...peers.values()]);
    onlineCount=Math.max(1,onlineCount-1);
    status('online',onlineCount);
   }else if(m.type==='chargeVisual'&&typeof m.id==='string'&&m.id!==selfId&&
     validNormal(m.normal)&&validNormal(m.fromNormal)){
    chargeEvents.set(m.id,m);
   }else if(m.type==='combat'){
    // Only authoritative combat events can animate an observer's avatar.
    if(typeof m.fromId==='string'&&m.fromId!==selfId&&
       ['autoAttack','heavyStrike','thunderStomp'].includes(m.abilityId))
     remoteAttacks.set(m.fromId,{at:Date.now(),abilityId:m.abilityId});
    onCombat?.(m,selfId);
   }
   else if(m.type==='killCredit')onKillCredit?.(m);
   else if(m.type==='mobAttack')onMobAttack?.(m);
   else if(m.type==='mobStrike'){
    if(typeof m.targetId==='string'&&m.targetId!==selfId){
     const victim=visuals.get(m.targetId);
     if(victim)beginPlayerHitReaction(victim.actor.root.userData,{
      blocked:m.blocked===true,damage:m.blocked===true?0:1});
    }
    onMobStrike?.(m,selfId);
   }
   else if(m.type==='mobTelegraph')onMobTelegraph?.(m);
   else if(m.type==='mobHowl')onMobHowl?.(m);
   else if(m.type==='respawnAccepted')onRespawn?.(m);
   else if(m.type==='combatRejected')onCombatRejected?.(m);
   else if(m.type==='chargeAccepted')onChargeAccepted?.(m);
   else if(m.type==='chargeLanded')onChargeLanded?.(m);
   else if(m.type==='playerVitals')onVitals?.(m);
   else if(m.type==='partyState')onPartyState?.(m);
   else if(m.type==='partyInvite')onPartyInvite?.(m);
   else if(m.type==='partyNotice')onPartyNotice?.(m);
   else if(m.type==='chat')onChat?.(m);
   else if(m.type==='chatRejected')onChatRejected?.(m);
   else if(m.type==='chestState')onChestState?.(m);
   else if(m.type==='chestStatus')onChestStatus?.(m);
   else if(m.type==='chestResult')onChestResult?.(m);
   else if(m.type==='progressSaved')onVerifiedProgress?.(m.progress,m.source);
   else if(m.type==='progressError')onAuthRejected?.(m.reason||'Ошибка сохранения');
   else if(m.type==='economyResult')onEconomyResult?.(m);
   else if(m.type==='nameChanged')onPartyNotice?.({message:'Имя обновлено'});
  };
  ws.onclose=event=>{
   if(socket!==ws)return;
   socket=null;selfId=null;synced=false;joinedRadius=null;pendingChestOpen=null;
   applyMount({mountState:'foot',mountId:null,owned:false});
   clearInterval(sendLoop);sendLoop=null;
   stopPeers();
   onPlayers?.([]);onMobs?.(null);onDisconnect?.();
   if(closed)return;
   if(auth&&event.code===1008){
    closed=true;status('auth_required');
    onAuthRejected?.('Сессия персонажа недействительна. Войдите в аккаунт заново.');
   }else{status(auth?'reconnecting':'offline');scheduleReconnect()}
  };
  ws.onerror=()=>{if(ws.readyState<WebSocket.CLOSING)ws.close()};
 }
 // iOS Safari can suspend timers; resync on return from background.
 const wake=()=>{
  if(closed)return;
  if(socket?.readyState===WebSocket.OPEN&&auth&&
    Date.now()-lastServerMessageAt>45000){
   synced=false;selfId=null;status('reconnecting');
   socket.close(1000,'Resync after background');
  }else if(!socket){
   clearTimeout(retry);retry=null;connect();
  }
 };
 const visible=()=>{if(!globalThis.document?.hidden)wake()};
 globalThis.document?.addEventListener?.('visibilitychange',visible);
 globalThis.addEventListener?.('online',wake);
 function tick(dt,time){
  const own=position();
  if(!own)return;
  if(joinedRadius!==null&&joinedRadius!==own.radius){
   socket?.close();return;
  }
  if(!visuals.size&&!peers.size)return;
  const rows=[...peers.values()].map(peer=>({
   peer,distance:greatCircleDistance(own.normal,peer.normal,own.radius)
  })).filter(p=>p.distance<=VISIBLE_DISTANCE).sort((a,b)=>a.distance-b.distance)
   .slice(0,MAX_VISIBLE_PEERS);
  const needed=new Set(rows.map(row=>row.peer.id));
  for(const [id,model] of visuals)if(!needed.has(id)){
   disposeActor(model.actor.root);visuals.delete(id);
  }
  let detailedAvatarSlots=0,simpleAvatarSlots=0;
  for(const {peer,distance} of rows){
   let visual=visuals.get(peer.id);
   if(!visual){
    const colors=[0x836144,0x75513d,0x967055,0x695042];
    const color=colors[peer.id.charCodeAt(0)%colors.length];
    const actor=createAvatar({fur:color,player:false,remotePlayer:true});
    actor.root.add(nameSprite(THREE,peer.name));
    const hint=chargeEvents.get(peer.id);
    visual={id:peer.id,actor,normal:new THREE.Vector3(...(hint?.fromNormal||peer.normal)),
     targetNormal:new THREE.Vector3(),heading:peer.heading,phase:0,charge:null,recovery:0,
     gearMeshes:{weapon:null,shield:null},gearKeys:{weapon:null,shield:null},
     gearPoseKey:null};
    actor.root.userData.equipmentGrip={weapon:equipmentGrip('weapon'),
     shield:equipmentGrip('shield')};
    actor.root.userData.weaponKind='none';
    visual.gearSwitcher=createRemoteGearSwitcher(visual);
    visuals.set(peer.id,visual);
   }
   // Keep the face and main silhouette near the camera, but avoid the
   // additional sculpt batches for distant peers on mobile Safari.
   // Cap additional draw calls even if sixteen players crowd onto a
   // single phone screen. Nearest peers win the cosmetic quality slots.
   let modelDetail=0;
   if(distance<12&&detailedAvatarSlots<4){
    modelDetail=.68;detailedAvatarSlots++;
   }else if(distance<22&&simpleAvatarSlots<8){
    modelDetail=.24;simpleAvatarSlots++;
   }
   if(visual.actor.anatomy&&visual.actor.anatomy.quality!==modelDetail)
    visual.actor.anatomy.setQuality(modelDetail);
   syncRemoteGear(visual,peer);
   const nextCharge=chargeEvents.get(peer.id);
   if(nextCharge){
    const end=new THREE.Vector3(...nextCharge.normal);
    visual.charge={from:visual.normal.clone(),to:end,
     duration:Math.max(.1,Math.min(1,Number(nextCharge.durationMs||550)/1000)),
     elapsed:0,fraction:0,distance:visual.normal.angleTo(end)*getRadius(),
     finalHeading:nextCharge.heading};
    chargeEvents.delete(peer.id);
    visual.recovery=0;
   }
   const factor=1-Math.exp(-Math.min(.1,Math.max(0,dt))*12);
   visual.targetNormal.set(...peer.normal);
   const oldAngle=Math.acos(clamp(visual.normal.dot(visual.targetNormal),-1,1));
   const previousHeading=visual.heading;
   let visualMetres,chargePose=null;
   if(visual.charge){
    const motion=visual.charge;
    motion.elapsed+=dt;
    const sample=sampleChargeMotion(motion.elapsed,motion.duration);
    visual.normal.lerpVectors(motion.from,motion.to,sample.distanceFraction).normalize();
    visualMetres=Math.min(Math.max(0,(sample.distanceFraction-motion.fraction)*motion.distance),dt*8.2);
    motion.fraction=sample.distanceFraction;
    const desired=chargeTravelHeading(visual.normal.toArray(),motion.to.toArray());
    if(desired!==null)visual.heading=easeChargeHeading(visual.heading,desired,dt);
    chargePose={drive:sample.drive,landing:sample.landing};
    if(sample.finished){
     visual.normal.copy(motion.to);
     if(Number.isFinite(motion.finalHeading))visual.heading=motion.finalHeading;
     visual.charge=null;visual.recovery=.15;
    }
   }else{
    visual.normal.lerp(visual.targetNormal,factor).normalize();
    const newAngle=Math.acos(clamp(visual.normal.dot(visual.targetNormal),-1,1));
    visualMetres=Math.min(Math.max(0,oldAngle-newAngle)*getRadius(),4.05*dt*2);
    visual.heading+=angle(peer.heading,visual.heading)*factor;
   }
   if(!visual.charge&&visual.recovery>0){
    visual.recovery=Math.max(0,visual.recovery-dt);
    if(!chargePose)chargePose={drive:0,landing:.52*visual.recovery/.15};
   }
   const normal=visual.normal;
   const lon=Math.atan2(normal.x,normal.z);
   east.set(Math.cos(lon),0,-Math.sin(lon)).normalize();
   north.crossVectors(normal,east).normalize();
   fwd.copy(east).multiplyScalar(Math.cos(visual.heading))
    .addScaledVector(north,Math.sin(visual.heading)).normalize();
   right.crossVectors(normal,fwd).normalize();
   matrix.makeBasis(right,normal,fwd);
   visual.actor.root.quaternion.setFromRotationMatrix(matrix);
   visual.actor.root.position.copy(normal).multiplyScalar(getRadius()+heightAt(normal)+.06);
   visual.phase=advanceStridePhase(visual.phase,visualMetres);
   const recentAttack=remoteAttacks.get(peer.id);
   const attackAge=recentAttack?(Date.now()-recentAttack.at)/1000:Infinity;
   if(attackAge>=.9&&recentAttack)remoteAttacks.delete(peer.id);
   const attackPhase=attackAge>=0&&attackAge<.8?attackAge/.8:-1;
   const combatAttack=recentAttack?.abilityId==='thunderStomp'
    ?{attack:-1,stomp:attackPhase}:{attack:attackPhase,stomp:-1};
   const weaponKind=remoteEquipmentSpec(peer,'weapon')?.kind||'none';
   const poseWalk=chargePose?Math.max(chargePose.drive,.2):
    Math.max(movementStrength(visualMetres,dt,4.05),peer.moving?.55:0);
   const poseTurn=turnStrength(previousHeading,visual.heading,dt);
   // Always interpolate the remote actor transform; throttle only the bone
   // pose for distant avatars that cannot be the local combatant.
   // Distant actors animate at a lower rate. Retain their accumulated
   // visual travel so the mount does not lose strides between animation ticks.
   visual.mountTravel=(visual.mountTravel||0)+visualMetres;
   const animationDt=consumeAnimationTime(visual,dt,distance);
   if(animationDt>0){
    animateAvatar(visual.actor,{dt:animationDt,time,walk:poseWalk,turn:poseTurn,
     phase:visual.phase,charge:chargePose,
     combat:attackPhase>=0||!!visual.actor.root.userData.incomingCombatHit,
     ...combatAttack,weaponKind});
    syncForestWolfMount(THREE,visual.actor,{riding:peer.mountState==='riding'&&peer.mountId==='forest_wolf',time,travelled:visual.mountTravel,heading:peer.heading});
    visual.mountTravel=0;
   }
  }
 }
 function pickPlayer(raycaster,maxDistance=100){
  // Ray-test only live, visible remote avatars; never use an NPC/combat target.
  const roots=[...visuals.values()].map(visual=>visual.actor.root);
  if(!roots.length)return null;
  const hit=raycaster.intersectObjects(roots,true).find(hit=>hit.distance<=maxDistance);
  if(!hit)return null;
  for(const [id,visual] of visuals){
   let node=hit.object;
   while(node){
    if(node===visual.actor.root)return {peer:peers.get(id)||null,distance:hit.distance};
    node=node.parent;
   }
  }
  return null;
 }
 function close(){
  closed=true;synced=false;selfId=null;clearTimeout(retry);clearInterval(sendLoop);
  globalThis.document?.removeEventListener?.('visibilitychange',visible);
  globalThis.removeEventListener?.('online',wake);
  if(socket)socket.close();
  socket=null;stopPeers();
 }
 if(url)connect();
 else status('offline');
 const send=data=>{
  if(!synced||!selfId||socket?.readyState!==WebSocket.OPEN)return false;
  socket.send(JSON.stringify(data));return true;
 };
 return {tick,close,pickPlayer,
  sendAttack:(abilityId,mobId=null)=>send({type:'attack',abilityId,mobId}),
  sendCharge:mobId=>send({type:'charge',mobId}),
  sendHeal:()=>send({type:'heal'}),
   summonMount:()=>send({type:'mountSummon'}),
   dismount:()=>send({type:'mountDismount'}),
   get mount(){return {...selfMount}},
  rename:name=>send({type:'rename',name}),
  invite:targetId=>send({type:'partyInvite',targetId}),
  respondInvite:(fromId,accept)=>send({type:'partyRespond',fromId,accept}),
  promoteParty:targetId=>send({type:'partyPromote',targetId}),
  leaveParty:()=>send({type:'partyLeave'}),
  sendChat:(channel,text)=>send({type:'chatSend',channel,text}),
  requestChestStatus:()=>send({type:'chestStatus'}),
  openChest:inventory=>{
   if(!synced||!selfId||socket?.readyState!==WebSocket.OPEN)return false;
   pendingChestOpen={type:'chestOpen',...(auth?{}:{inventory})};return true;
  },
  moveChest:(action,slot,requestId)=>send({type:'chestMove',action,slot,requestId}),
  economy:(kind,params={})=>auth&&send({type:'economyAction',kind,...params}),
  closeChest:()=>{pendingChestOpen=null;return send({type:'chestClose'});},
  get players(){return [...peers.values()]},
  get selfId(){return selfId},
  get connected(){return synced&&socket?.readyState===WebSocket.OPEN&&!!selfId}
 };
}
