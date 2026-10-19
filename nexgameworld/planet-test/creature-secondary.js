// Secondary cosmetic motion for NexGameWorld wildlife and raiders.
// The animated GLB remains authoritative for gait, pecks, sword strikes and
// flinches. This layer animates a parent pivot only: no pathfinding, root,
// hitbox, attack timing, equipment or server state is ever changed.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function advanceCreatureSecondary(state,dt,{
 kind='longstrider',yaw=0,walking=false,speed=0,attacking=false,
 attackRemaining=0,hitWeight=0
}={}){
 if(!state)return {pitch:0,roll:0,raise:0,forward:0};
 const delta=clamp(finite(dt),0,.12);
 const heading=finite(yaw,finite(state.lastYaw));
 const wasHeading=finite(state.lastYaw,heading);
 const turnDelta=angleDelta(heading,wasHeading);
 // Network corrections and teleports must not flick the cosmetic body.
 const turnRate=Math.abs(turnDelta)>.65||delta<=0?0:clamp(turnDelta/Math.max(delta,.016),-3,3);
 state.lastYaw=heading;
 const targetTurn=turnRate/3;
 const turning=1-Math.exp(-delta*9);
 state.turn=finite(state.turn)+(targetTurn-finite(state.turn))*turning;
 const targetMove=walking?clamp(finite(speed),.12,1):0;
 const moving=1-Math.exp(-delta*8);
 state.motion=finite(state.motion)+(targetMove-finite(state.motion))*moving;
 const targetAttack=attacking?1:0;
 const attackBlend=1-Math.exp(-delta*(targetAttack?15:9));
 state.attack=finite(state.attack)+(targetAttack-finite(state.attack))*attackBlend;
 state.time=finite(state.time)+delta;
 const calm=(1-state.motion)*(1-state.attack);
 const breath=Math.sin(state.time*(kind==='raider'?2.0:1.6))*.5+.5;
 const recoil=clamp(finite(hitWeight),0,1);
 // Avoid competing with the authored attack and Hurt clips. For each race,
 // the pivots slightly offset posture/weight transfer rather than retiming feet.
 if(kind==='raider')return {
  pitch:clamp(-.035*state.motion-.030*state.attack+.012*calm*breath,-.09,.035),
  roll:clamp(-.060*state.turn+.012*calm*Math.sin(state.time*.85),-.085,.085),
  raise:clamp(.013*calm*breath-.012*state.motion, -.025,.02),
  forward:clamp(.025*state.attack-.022*recoil,-.035,.04)
 };
 return {
  pitch:clamp(-.028*state.motion-.017*state.attack+.010*calm*breath,-.06,.03),
  roll:clamp(-.043*state.turn+.008*calm*Math.sin(state.time*.75),-.065,.065),
  raise:clamp(.013*calm*breath-.011*state.motion,-.02,.02),
  forward:clamp(.018*state.attack-.018*recoil,-.028,.032)
 };
}
export function applyCreatureSecondary(pivot,pose){
 if(!pivot)return;
 pivot.rotation.x=pose.pitch;
 pivot.rotation.z=pose.roll;
 pivot.position.y=pose.raise;
 pivot.position.z=pose.forward;
}
export function resetCreatureSecondary(state,pivot){
 if(state){state.turn=0;state.motion=0;state.attack=0;state.time=0;state.lastYaw=undefined;}
 if(pivot){pivot.position.set(0,0,0);pivot.rotation.set(0,0,0);}
}

/**
 * A second sword blow can arrive while Hurt is still playing. Keep its
 * existing GLB pose if the clip is still in the first half, and restart
 * only near the tail. The separate impact envelope still retriggers on
 * *every* authoritative hit, so repeated damage is never visually lost.
 */
export function shouldReplayCreatureHurt(action,newHit){
 if(!newHit||!action)return false;
 const duration=action.getClip?.()?.duration;
 if(!Number.isFinite(duration)||duration<=0)return true;
 return Number.isFinite(action.time)&&action.time>=duration*.70;
}
