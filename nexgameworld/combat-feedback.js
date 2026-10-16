// Shared client-only visual feedback for solo and server-confirmed combat hits.
// A fixed pool of labels avoids allocating canvases/textures on every strike.
export const HIT_REACTION_SECONDS=.32;
export const DAMAGE_LABEL_SECONDS=.92;
export const DAMAGE_LABEL_LIMIT=14;
export function hitReaction(remaining){
 if(!Number.isFinite(remaining)||remaining<=0)return 0;
 const t=1-Math.min(1,remaining/HIT_REACTION_SECONDS);
 return Math.max(0,Math.sin(t*Math.PI))*(1-.15*t);
}
export function damageText(amount){
 return Number.isFinite(amount)&&amount>0?String(Math.round(amount)):'';
}
export function createCombatFeedback({THREE,document,camera,layer}){
 const slots=Array.from({length:DAMAGE_LABEL_LIMIT},()=>{
  const node=document.createElement('span');
  node.className='combat-damage-number';
  node.hidden=true;
  layer.appendChild(node);
  return {node,enemy:null,age:DAMAGE_LABEL_SECONDS,amount:0};
 });
 const vector=new THREE.Vector3();
 let cursor=0;
 function hit(enemy,amount,abilityId='autoAttack'){
  const text=damageText(amount);
  if(!text||!enemy?.root)return false;
  const slot=slots[cursor];cursor=(cursor+1)%slots.length;
  slot.enemy=enemy;slot.age=0;slot.amount=Number(amount);
  slot.node.textContent=text;
  slot.node.className='combat-damage-number'+
   (abilityId==='heavyStrike'?' combat-damage-strong':abilityId==='thunderStomp'?' combat-damage-area':'');
  slot.node.hidden=false;
  return true;
 }
 function update(dt){
  const w=layer.clientWidth||document.documentElement.clientWidth;
  const h=layer.clientHeight||document.documentElement.clientHeight;
  for(let i=0;i<slots.length;i++){
   const slot=slots[i];if(!slot.enemy)continue;
   slot.age+=Math.max(0,dt);
   if(slot.age>=DAMAGE_LABEL_SECONDS||!slot.enemy.root?.parent){
    slot.enemy=null;slot.node.hidden=true;continue;
   }
   const e=slot.enemy,p=e.root.position;
   const height=e.trainingDummy?2.7:e.boss?3.3:2.1;
   vector.set(p.x,p.y+height*(e.baseScale||1),p.z).project(camera);
   if(vector.z>1||vector.z< -1||Math.abs(vector.x)>1.25||Math.abs(vector.y)>1.25){
    slot.node.hidden=true;continue;
   }
   slot.node.hidden=false;
   const progress=slot.age/DAMAGE_LABEL_SECONDS,shift=(i%5-2)*13;
   slot.node.style.left=((vector.x+1)*.5*w+shift)+'px';
   slot.node.style.top=((1-vector.y)*.5*h-22-progress*52)+'px';
   slot.node.style.opacity=String(progress<.6?1:Math.max(0,(1-progress)/.4));
   slot.node.style.transform='translate(-50%,-50%) scale('+(progress<.15?1+.16*(1-progress/.15):1)+')';
  }
 }
 function clear(){for(const slot of slots){slot.enemy=null;slot.age=DAMAGE_LABEL_SECONDS;slot.node.hidden=true}}
 return {hit,update,clear};
}
