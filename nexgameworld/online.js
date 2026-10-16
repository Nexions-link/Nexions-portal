// Shared-world presence transport. Networking is opt-in until the server is deployed.
// Rendering and gameplay are not coupled to socket lifecycle.
export function createWorldPresence({url,onStatus,onPlayers,onMobs,onLeave,onWelcome,onCombat,onMobAttack,onRespawnAccepted,onKillCredit,onCombatRejected,onPartyState,onPartyInvite,onPartyNotice,onNameChanged,onChat,onChatRejected,onPopulation,onChestState,onChestResult,getPosition}){
 let socket=null,closed=false,retry=null,interval=null,selfId=null;
 const send=json=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(json))};
 const status=value=>onStatus?.(value);
 const connect=()=>{
  if(closed||!url)return;
  status('connecting');
  const ws=new WebSocket(url);socket=ws;
  ws.onopen=()=>{status('online');send({type:'join',name:'Странник',...getPosition?.()});
   interval=setInterval(()=>{const p=getPosition?.();if(p)send({type:'move',...p})},100);
  };
  ws.onmessage=e=>{
   let m;try{m=JSON.parse(e.data)}catch{return}
   if(!m||typeof m!=='object')return;
   if(m.type==='welcome'){selfId=m.id;onWelcome?.(m);
    // Welcome includes all OTHER connected players. Include our own connection.
    if(Array.isArray(m.players))onPopulation?.(m.players.length+1);
    onMobs?.(Array.isArray(m.mobs)?m.mobs:[]);
   }
   else if(m.type==='snapshot'){
    if(Array.isArray(m.players)){
     onPlayers?.(m.players.filter(p=>p.id!==selfId));
     // Authoritative snapshot contains ALL connected players, including ourselves.
     onPopulation?.(m.players.length);
    }
    onMobs?.(Array.isArray(m.mobs)?m.mobs:[]);
   }
   else if(m.type==='combat')onCombat?.(m,selfId);
   else if(m.type==='mobAttack')onMobAttack?.(m,selfId);
   else if(m.type==='respawnAccepted')onRespawnAccepted?.(m);
   else if(m.type==='mobSnapshot')onMobs?.(Array.isArray(m.mobs)?m.mobs:[]);
   else if(m.type==='killCredit')onKillCredit?.(m,selfId);
   else if(m.type==='combatRejected')onCombatRejected?.(m);
   else if(m.type==='partyState')onPartyState?.(m);
   else if(m.type==='partyInvite')onPartyInvite?.(m);
   else if(m.type==='partyNotice')onPartyNotice?.(m);
   else if(m.type==='nameChanged')onNameChanged?.(m);
   else if(m.type==='chat')onChat?.(m,selfId);
   else if(m.type==='chatRejected')onChatRejected?.(m);
   else if(m.type==='chestState')onChestState?.(m);
   else if(m.type==='chestResult')onChestResult?.(m);
   else if(m.type==='leave'&&typeof m.id==='string')onLeave?.(m.id);
  };
  ws.onclose=()=>{if(socket!==ws)return;socket=null;clearInterval(interval);interval=null;
   onPlayers?.([]);onPopulation?.(null);onMobs?.(null);onChestState?.(null);onPartyState?.({groupId:null,leaderId:null,members:[]});status('offline');if(!closed)retry=setTimeout(connect,3000);
  };
  ws.onerror=()=>{if(ws.readyState<2)ws.close()};
 };
 if(!url){status('solo');return {close(){},sendAttack(){return false},sendRespawn(){return false},rename(){return false},invite(){return false},respondInvite(){return false},leaveParty(){return false},sendChat(){return false},openChest(){return false},moveChest(){return false},closeChest(){return false},connected:()=>false}}
 connect();
 return {close(){closed=true;clearTimeout(retry);clearInterval(interval);socket?.close();},
  sendRespawn(){
   if(socket?.readyState!==WebSocket.OPEN)return false;
   send({type:'respawn'});return true;
  },
  sendAttack(abilityId,mobId=null){
   if(socket?.readyState!==WebSocket.OPEN)return false;
   send({type:'attack',abilityId,mobId});return true;
  },
  rename(name){if(socket?.readyState!==WebSocket.OPEN)return false;send({type:'rename',name});return true},
  invite(targetId){if(socket?.readyState!==WebSocket.OPEN)return false;send({type:'partyInvite',targetId});return true},
  respondInvite(fromId,accept){if(socket?.readyState!==WebSocket.OPEN)return false;send({type:'partyRespond',fromId,accept});return true},
  leaveParty(){if(socket?.readyState!==WebSocket.OPEN)return false;send({type:'partyLeave'});return true},
  sendChat(channel,text){
   if(socket?.readyState!==WebSocket.OPEN)return false;
   send({type:'chatSend',channel,text});return true;
  },
  openChest(inventory){
   if(socket?.readyState!==WebSocket.OPEN)return false;
   send({type:'chestOpen',inventory});return true;
  },
  moveChest(action,slot,requestId){
   if(socket?.readyState!==WebSocket.OPEN)return false;
   send({type:'chestMove',action,slot,requestId});return true;
  },
  closeChest(){
   if(socket?.readyState!==WebSocket.OPEN)return false;
   send({type:'chestClose'});return true;
  },
  connected:()=>socket?.readyState===WebSocket.OPEN};
}
