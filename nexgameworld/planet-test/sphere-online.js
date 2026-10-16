// NexGameWorld Stage 1: spherical WebSocket presence and visual-only remote avatars.
// Combat, quests, loot and the player's local saves remain untouched.
const WORLD_URL='wss://nexgame-world.onrender.com/ws/nexgameworld';
const PROTOCOL=1;
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
 THREE,scene,createAvatar,animateAvatar,getPosition,getRadius,heightAt,onStatus,
 url=WORLD_URL
}){
 let socket=null,closed=false,selfId=null,joinedRadius=null,retry=null,sendLoop=null;
 const peers=new Map(),visuals=new Map();
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
  return {normal:p.normal,heading:p.heading,radius:p.radius,moving:!!p.moving};
 };
 function onSnapshot(rows){
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
  status('online',seen.size+1);
 }
 function connect(){
  if(closed||!url||typeof WebSocket==='undefined')return;
  status('connecting');
  let ws;
  try{ws=new WebSocket(url)}catch{status('offline');retry=setTimeout(connect,4000);return}
  socket=ws;
  ws.onopen=()=>{
   const p=position();
   if(!p){ws.close();return}
   joinedRadius=p.radius;
   ws.send(JSON.stringify({type:'join',name:'Странник',...p}));
   sendLoop=setInterval(()=>{
    if(ws.readyState!==WebSocket.OPEN)return;
    const p=position();if(p)ws.send(JSON.stringify({type:'move',...p}));
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
    onSnapshot(Array.isArray(m.players)?m.players:[]);
   }else if(m.type==='snapshot'&&m.protocol===PROTOCOL&&m.radius===p.radius){
    onSnapshot(m.players);
   }else if(m.type==='leave'&&typeof m.id==='string'){
    peers.delete(m.id);
    const visual=visuals.get(m.id);
    if(visual){disposeActor(visual.actor.root);visuals.delete(m.id)}
    status('online',peers.size+1);
   }
  };
  ws.onclose=()=>{
   if(socket!==ws)return;
   socket=null;selfId=null;joinedRadius=null;
   clearInterval(sendLoop);sendLoop=null;
   stopPeers();
   if(!closed){status('offline');retry=setTimeout(connect,4000)}
  };
  ws.onerror=()=>{if(ws.readyState<WebSocket.CLOSING)ws.close()};
 }
 function tick(dt,time){
  if(!visuals.size&&!peers.size)return;
  const own=position();
  if(!own)return;
  if(joinedRadius!==null&&joinedRadius!==own.radius){
   socket?.close();return;
  }
  const rows=[...peers.values()].map(peer=>({
   peer,distance:greatCircleDistance(own.normal,peer.normal,own.radius)
  })).filter(p=>p.distance<=VISIBLE_DISTANCE).sort((a,b)=>a.distance-b.distance)
   .slice(0,MAX_VISIBLE_PEERS);
  const needed=new Set(rows.map(row=>row.peer.id));
  for(const [id,model] of visuals)if(!needed.has(id)){
   disposeActor(model.actor.root);visuals.delete(id);
  }
  for(const {peer} of rows){
   let visual=visuals.get(peer.id);
   if(!visual){
    const colors=[0x836144,0x75513d,0x967055,0x695042];
    const color=colors[peer.id.charCodeAt(0)%colors.length];
    const actor=createAvatar({fur:color,player:false});
    actor.root.add(nameSprite(THREE,peer.name));
    visual={actor,normal:new THREE.Vector3(...peer.normal),heading:peer.heading,phase:0};
    visuals.set(peer.id,visual);
   }
   const factor=1-Math.exp(-Math.min(.1,Math.max(0,dt))*12);
   visual.normal.lerp(new THREE.Vector3(...peer.normal),factor).normalize();
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
   visual.phase+=dt*(peer.moving?9.1:1.1);
   animateAvatar(visual.actor,{dt,time,walk:peer.moving?1:0,phase:visual.phase});
  }
 }
 function close(){
  closed=true;clearTimeout(retry);clearInterval(sendLoop);
  if(socket)socket.close();
  socket=null;stopPeers();
 }
 if(url)connect();
 else status('offline');
 return {tick,close,get connected(){return socket?.readyState===WebSocket.OPEN&&!!selfId}};
}
