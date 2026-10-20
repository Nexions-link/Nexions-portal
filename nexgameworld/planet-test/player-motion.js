// Purely visual motion smoothing for the player and other Tauren actors.
// This module never writes to root transforms, controls, combat timers,
// equipment joints or movement commands.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x,fallback=0)=>Number.isFinite(x)?x:fallback;
const approach=(from,to,rate,seconds)=>from+(to-from)*(1-Math.exp(-rate*seconds));
export function advancePlayerMotion(state,dt,{
 walk=0,turn=0,gather=false,combat=false,attack=-1,blockRemaining=0
}={}){
 const seconds=clamp(finite(dt),0,.1);
 if(!state)return {walk:0,turn:0,turnLag:0,turnFeet:0,guard:0,gather:0,inertia:0};
 const previousWalk=clamp(finite(state.walkBlend),0,1);
 const desiredWalk=clamp(finite(walk),0,1);
 state.walkBlend=clamp(approach(previousWalk,desiredWalk,
  desiredWalk>previousWalk?11:8.5,seconds),0,1);
 const desiredTurn=clamp(finite(turn),-1,1);
 state.turnBlend=clamp(approach(finite(state.turnBlend),desiredTurn,
  Math.abs(desiredTurn)>Math.abs(finite(state.turnBlend))?12:13,seconds),-1,1);
 // Torso follows the pelvis a beat later. The offset settles to zero at rest.
 state.turnLag=clamp(approach(finite(state.turnLag),state.turnBlend,6.5,seconds),-1,1);
 const movementImpulse=seconds>0?
  clamp((state.walkBlend-previousWalk)/seconds,-1.8,1.8):0;
 state.motionImpulse=clamp(approach(finite(state.motionImpulse),movementImpulse,11,seconds),-1.8,1.8);
 const attacking=Number.isFinite(attack)&&attack>=0&&attack<=1;
 const blocking=finite(blockRemaining)>0;
 const armed=(!gather||attacking||blocking)&&(combat===true||attacking||blocking);
 state.combatBlend=clamp(approach(finite(state.combatBlend),armed?1:0,
  armed?10:6,seconds),0,1);
 state.gatherBlend=clamp(approach(finite(state.gatherBlend),gather?1:0,13,seconds),0,1);
 const moving=state.walkBlend;
 return {
  walk:moving,turn:state.turnBlend,
  turnLag:state.turnBlend-state.turnLag,
  // Small in-place heel/toe shift only, not real root rotation.
  turnFeet:clamp(Math.abs(state.turnBlend)*(1-.78*moving)*(1-state.gatherBlend),0,1),
  guard:state.combatBlend*(1-.38*moving)*(1-state.gatherBlend),
  gather:state.gatherBlend,inertia:state.motionImpulse
 };
}
export function resetPlayerMotion(state){
 if(!state)return;
 for(const key of ['walkBlend','turnBlend','turnLag','motionImpulse','combatBlend','gatherBlend'])
  state[key]=0;
}
