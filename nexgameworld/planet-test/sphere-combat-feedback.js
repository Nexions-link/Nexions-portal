// PT 0.3.0: the main NexGame's pooled damage-label animation adapted
// to a radial-up spherical world (native CSS from ../style.css).
import {DAMAGE_LABEL_LIMIT,DAMAGE_LABEL_SECONDS,damageText} from '../combat-feedback.js?v=0.3.7.0';
export function createSphereCombatFeedback({THREE,document,camera,layer}){
 const pool=Array.from({length:DAMAGE_LABEL_LIMIT},()=>{
  const node=document.createElement('span');
  node.className='combat-damage-number';node.hidden=true;layer.appendChild(node);
  return {node,entity:null,age:DAMAGE_LABEL_SECONDS};
 });
 const vector=new THREE.Vector3(),normal=new THREE.Vector3();
 let cursor=0;
 function hit(entity,amount,abilityId='autoAttack'){
  const text=damageText(amount);
  if(!text||!entity?.root)return false;
  const slot=pool[cursor];cursor=(cursor+1)%pool.length;
  slot.entity=entity;slot.age=0;slot.node.textContent=text;
  slot.node.className='combat-damage-number'+
   (abilityId==='heavyStrike'?' combat-damage-strong':abilityId==='thunderStomp'?' combat-damage-area':'');
  slot.node.hidden=false;return true;
 }
 function update(dt){
  const w=layer.clientWidth||document.documentElement.clientWidth,
        h=layer.clientHeight||document.documentElement.clientHeight;
  for(let i=0;i<pool.length;i++){
   const slot=pool[i];if(!slot.entity)continue;
   slot.age+=Math.max(0,dt);
   if(slot.age>=DAMAGE_LABEL_SECONDS||!slot.entity.root?.parent){
    slot.entity=null;slot.node.hidden=true;continue;
   }
   const obj=slot.entity;
   // Unlike the flat game, 'up' is the surface normal, not (0,1,0).
   normal.copy(obj.root.position).normalize();
   vector.copy(obj.root.position)
    .addScaledVector(normal,obj.trainingDummy?2.7:2.1)
    .project(camera);
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
 function clear(){for(const slot of pool){slot.entity=null;slot.age=DAMAGE_LABEL_SECONDS;slot.node.hidden=true;}}
 return {hit,update,clear};
}
