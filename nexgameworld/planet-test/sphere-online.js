import {consumeAnimationTime} from './animation-budget.js?v=1';
import {advanceStridePhase,movementStrength,turnStrength} from './locomotion.js?v=1';
import {BATTLEFURY_ITEM_ID,normalizeBattlefuryTuning,applyBattlefuryPose} from './battlefury-tuner.js?v=1';
// NexGameWorld Stage 1: spherical WebSocket presence and visual-only remote avatars.
// Combat, quests, loot and the player's local saves remain untouched.
const WORLD_URL='wss://nexgame-world.onrender.com/ws/nexgameworld';
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
 onPlayers,onMobs,onVitals,onCombat,onKillCredit,onMobAttack,onMobTelegraph,onRespawn,
 onPartyState,onPartyInvite,onPartyNotice,onChat,onChatRejected,
 onChestState,onChestStatus,onChestResult,onCombatRejected,onDisconnect,
 onVerifiedProgress,onAuthRejected,onEconomyResult,onPositionCorrection,
 auth=null,url=WORLD_URL,loadBattlefuryScene=null
}){
 let socket=null,closed=false,selfId=null,joinedRadius=null,retry=null,sendLoop=null,pendingChestOpen=null,lastCorrection=0,onlineCount=1;
 const peers=new Map(),visuals=new Map();
 let weaponLoaderPromise=null;
 const fetchWeaponScene=loadBattlefuryScene||(async()=>{
  if(!weaponLoaderPromise)weaponLoaderPromise=import(
   'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js'
  ).then(({GLTFLoader})=>new GLTFLoader());
  const loader=await weaponLoaderPromise;
  const gltf=await loader.loadAsync('../assets/weapons/admin-battlefury.glb');
  return gltf.scene;
 });
 function clearWeapon(visual){
  const mesh=visual.weaponMesh;
  if(mesh)disposeActor(mesh);
  visual.weaponMesh=null;visual.weaponKey=null;
  visual.actor.root.userData.weaponKind='none';
  visual.actor.root.userData.equipmentGrip={};
 }
 function syncBattlefury(visual,peer){
  const appearance=peer.battlefury;
  if(appearance?.itemId!==BATTLEFURY_ITEM_ID||!appearance.pose){
   if(visual.weaponMesh||visual.weaponKey)clearWeapon(visual);
   return;
  }
  // The server has certified ownership. The pose is cosmetic and clamped again
  // before it ever reaches the Three.js scene or remote wrist animation.
  const pose=normalizeBattlefuryTuning(appearance.pose);
  const key=JSON.stringify(pose);
  if(visual.weaponMesh){
   if(visual.weaponKey!==key){
    const grip=applyBattlefuryPose(visual.weaponMesh,visual.actor.arms[1]?.hand,pose);
    visual.actor.root.userData.equipmentGrip.weapon=grip;
    visual.weaponKey=key;
   }
   return;
  }
  if(visual.weaponLoading||visual.weaponFailed)return;
  const hand=visual.actor.arms[1]?.hand;
  if(!hand)return;
  visual.weaponLoading=true;
  void (async()=>{
   try{
    const asset=await fetchWeaponScene();
    if(visuals.get(peer.id)!==visual||peers.get(peer.id)?.battlefury?.itemId!==BATTLEFURY_ITEM_ID)return;
    // Match the owner's GLB normalization, while retaining the full geometry.
    const group=new THREE.Group(),bbox=new THREE.Box3().setFromObject(asset);
    const dim=bbox.getSize(new THREE.Vector3());
    const scale=1.95/Math.max(.001,dim.x,dim.y,dim.z);
    const center=bbox.getCenter(new THREE.Vector3());
    asset.scale.multiplyScalar(scale);
    asset.position.sub(center.multiplyScalar(scale));
    group.add(asset);
    group.name='gear-axe';
    hand.add(group);
    visual.weaponMesh=group;
    visual.actor.root.userData.weaponKind='axe';
    const latest=peers.get(peer.id);
    const latestPose=normalizeBattlefuryTuning(latest.battlefury.pose);
    visual.weaponKey=JSON.stringify(latestPose);
    visual.actor.root.userData.equipmentGrip??={};
    visual.actor.root.userData.equipmentGrip.weapon=applyBattlefuryPose(group,hand,latestPose);
   }catch(err){
    visual.weaponFailed=true;
    console.warn('Remote Battlefury model unavailable',err);
   }finally{visual.weaponLoading=false}
  })();
 }

 const east=new THREE.Vector3(),north=new THREE.Vector3(),fwd=new THREE.Vector3(),
  right=new THREE.Vector3(),matrix=new THREE.Matrix4();
 const stopPeers=()=>{for(const peer of visuals.values())disposeActor(peer.actor.root);
  visuals.clear();peers.clear();};
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
 function connect(){
  if(closed||!url||typeof WebSocket==='undefined')return;
  status('connecting');
  let ws;
  try{ws=new WebSocket(url)}catch{status('offline');retry=setTimeout(connect,4000);return}
  socket=ws;
  const send=data=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data))};
  ws.onopen=()=>{
   const p=position();
   if(!p){ws.close();return}
   joinedRadius=p.radius;
   if(auth)send({type:'authJoin',sessionToken:auth.sessionToken,
    characterId:auth.characterId});
   else send({type:'join',name:'Странник',...p,...getCharacter?.()});
   sendLoop=setInterval(()=>{
    if(ws.readyState!==WebSocket.OPEN||(auth&&!selfId))return;
    const p=position();if(p){
     const visualPose=auth?getBattlefuryPose?.():null;
     send({type:'move',...p,...(auth?{}:getCharacter?.()),
      ...(auth&&visualPose?{battlefuryPose:visualPose}:{})});
     // Same socket preserves ordering: proximity checks see the latest movement.
     if(pendingChestOpen){send(pendingChestOpen);pendingChestOpen=null;}
    }
   },100);
  };
  ws.onmessage=event=>{
   let m;try{m=JSON.parse(event.data)}catch{return}
   if(!m||typeof m!=='object')return;
   const p=position();
   if(!p)return;
   if(m.type==='welcome'){
    if(m.protocol!==PROTOCOL||m.world!=='nexgameworld'||m.radius!==p.radius){
     status('incompatible');ws.close();return;
    }
    selfId=m.id;
    onSnapshot(Array.isArray(m.players)?m.players:[],m.onlineCount);
    if(Array.isArray(m.mobs))onMobs?.(m.mobs);
    onVitals?.(m);
    if(auth&&m.authenticated&&m.progress)onVerifiedProgress?.(m.progress,'welcome');
   }else if(m.type==='snapshot'&&m.protocol===PROTOCOL&&m.radius===p.radius){
    onSnapshot(m.players,m.onlineCount);
    if(Array.isArray(m.mobs))onMobs?.(m.mobs);
    const own=m.players?.find(player=>player.id===selfId);
    if(own){
     onVitals?.(own);
     const deviation=greatCircleDistance(p.normal,own.normal,p.radius);
     if(validNormal(own.normal)&&deviation>2.2&&Date.now()-lastCorrection>800){
      lastCorrection=Date.now();
      onPositionCorrection?.({normal:own.normal,heading:own.heading,reason:'snapshot'});
     }
    }
    }else if(m.type==='positionCorrection'&&validNormal(m.normal)){
    lastCorrection=Date.now();
    onPositionCorrection?.(m);
   }else if(m.type==='leave'&&typeof m.id==='string'){
    peers.delete(m.id);
    const visual=visuals.get(m.id);
    if(visual){disposeActor(visual.actor.root);visuals.delete(m.id)}
    onPlayers?.([...peers.values()]);
    onlineCount=Math.max(1,onlineCount-1);
    status('online',onlineCount);
   }else if(m.type==='combat')onCombat?.(m,selfId);
   else if(m.type==='killCredit')onKillCredit?.(m);
   else if(m.type==='mobAttack')onMobAttack?.(m);
   else if(m.type==='mobTelegraph')onMobTelegraph?.(m);
   else if(m.type==='respawnAccepted')onRespawn?.(m);
   else if(m.type==='combatRejected')onCombatRejected?.(m);
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
   socket=null;selfId=null;joinedRadius=null;pendingChestOpen=null;
   clearInterval(sendLoop);sendLoop=null;
   stopPeers();
   onPlayers?.([]);onMobs?.(null);onDisconnect?.();
   if(auth&&event.code===1008){
    closed=true;status('auth_required');
    onAuthRejected?.('Не удалось авторизовать персонажа. Вернитесь на экран аккаунта.');
   }else if(!closed){status('offline');retry=setTimeout(connect,4000)}
  };
  ws.onerror=()=>{if(ws.readyState<WebSocket.CLOSING)ws.close()};
 }
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
  for(const {peer,distance} of rows){
   let visual=visuals.get(peer.id);
   if(!visual){
    const colors=[0x836144,0x75513d,0x967055,0x695042];
    const color=colors[peer.id.charCodeAt(0)%colors.length];
    const actor=createAvatar({fur:color,player:false});
    actor.root.add(nameSprite(THREE,peer.name));
    visual={actor,normal:new THREE.Vector3(...peer.normal),targetNormal:new THREE.Vector3(),heading:peer.heading,phase:0};
    visuals.set(peer.id,visual);
   }
   syncBattlefury(visual,peer);
   const factor=1-Math.exp(-Math.min(.1,Math.max(0,dt))*12);
   visual.targetNormal.set(...peer.normal);
   const oldAngle=Math.acos(clamp(visual.normal.dot(visual.targetNormal),-1,1));
   const previousHeading=visual.heading;
   visual.normal.lerp(visual.targetNormal,factor).normalize();
   const newAngle=Math.acos(clamp(visual.normal.dot(visual.targetNormal),-1,1));
   // Travel from the rendered transform, bounded against teleport corrections.
   const visualMetres=Math.min(Math.max(0,oldAngle-newAngle)*getRadius(),4.05*dt*2);
   visual.heading+=angle(peer.heading,visual.heading)*factor;
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
   const poseWalk=Math.max(movementStrength(visualMetres,dt,4.05),peer.moving?.55:0);
   const poseTurn=turnStrength(previousHeading,visual.heading,dt);
   // Always interpolate the remote actor transform; throttle only the bone
   // pose for distant avatars that cannot be the local combatant.
   const animationDt=consumeAnimationTime(visual,dt,distance);
   if(animationDt>0)
    animateAvatar(visual.actor,{dt:animationDt,time,walk:poseWalk,turn:poseTurn,phase:visual.phase});
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
  closed=true;clearTimeout(retry);clearInterval(sendLoop);
  if(socket)socket.close();
  socket=null;stopPeers();
 }
 if(url)connect();
 else status('offline');
 const send=data=>{
  if(!selfId||socket?.readyState!==WebSocket.OPEN)return false;
  socket.send(JSON.stringify(data));return true;
 };
 return {tick,close,pickPlayer,
  sendAttack:(abilityId,mobId=null)=>send({type:'attack',abilityId,mobId}),
  sendHeal:()=>send({type:'heal'}),
  rename:name=>send({type:'rename',name}),
  invite:targetId=>send({type:'partyInvite',targetId}),
  respondInvite:(fromId,accept)=>send({type:'partyRespond',fromId,accept}),
  leaveParty:()=>send({type:'partyLeave'}),
  sendChat:(channel,text)=>send({type:'chatSend',channel,text}),
  requestChestStatus:()=>send({type:'chestStatus'}),
  openChest:inventory=>{
   if(!selfId||socket?.readyState!==WebSocket.OPEN)return false;
   pendingChestOpen={type:'chestOpen',...(auth?{}:{inventory})};return true;
  },
  moveChest:(action,slot,requestId)=>send({type:'chestMove',action,slot,requestId}),
  economy:(kind,params={})=>auth&&send({type:'economyAction',kind,...params}),
  closeChest:()=>{pendingChestOpen=null;return send({type:'chestClose'});},
  get players(){return [...peers.values()]},
  get selfId(){return selfId},
  get connected(){return socket?.readyState===WebSocket.OPEN&&!!selfId}
 };
}
