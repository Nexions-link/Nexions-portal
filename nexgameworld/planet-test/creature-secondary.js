// Secondary cosmetic motion for NexGameWorld wildlife and raiders.
// The animated GLB remains authoritative for gait, pecks, sword strikes and
// flinches. This layer animates a parent pivot only: no pathfinding, root,
// hitbox, attack timing, equipment or server state is ever changed.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function advanceCreatureSecondary(state,dt,{
 kind='longstrider',yaw=0,walking=false,speed=0,attacking=false,
 attackRemaining=0,hitWeight=0,hitSide=1,strikePrepare=0,strikeImpact=0,strikeRecover=0,
 stridePhase=0,stepWeight=0
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
 const previousMotion=finite(state.motion);
 state.motion=previousMotion+(targetMove-previousMotion)*moving;
 // Short, damped anticipation/settle impulse follows visual acceleration.
 // It never alters the server-controlled transform.
 const acceleration=delta>0?clamp((state.motion-previousMotion)/Math.max(delta,.016),-2,2):0;
 state.inertia=finite(state.inertia)+(acceleration-finite(state.inertia))*(1-Math.exp(-delta*10));
 const targetAttack=attacking?1:0;
 const attackBlend=1-Math.exp(-delta*(targetAttack?15:9));
 state.attack=finite(state.attack)+(targetAttack-finite(state.attack))*attackBlend;
 state.time=finite(state.time)+delta;
 const calm=(1-state.motion)*(1-state.attack);
 const breath=Math.sin(state.time*(kind==='raider'?2.0:1.6))*.5+.5;
 const recoil=clamp(finite(hitWeight),0,1);
 const recoilSide=clamp(finite(hitSide,1),-1,1);
 // A small visual action accent makes server-confirmed impact readable while
 // authored GLB clips still drive limbs. All values are visual-only weights.
 const prepare=clamp(finite(strikePrepare),0,1);
 const strike=clamp(finite(strikeImpact),0,1);
 const recover=clamp(finite(strikeRecover),0,1);
 // A bounded, footfall-synchronous weight shift belongs on the visual pivot.
 // The GLB owns the actual feet; these offsets are sub-centimetre at rest.
 const stride=finite(stridePhase);
 const step=clamp(finite(stepWeight),0,1)*clamp(finite(state.motion),0,1);
 const footfall=Math.sin(stride*2),sideStep=Math.sin(stride);
 // Avoid competing with the authored attack and Hurt clips. For each race,
 // the pivots slightly offset posture/weight transfer rather than retiming feet.
 if(kind==='raider')return {
  pitch:clamp(-.035*state.motion-.030*state.attack-.010*state.inertia+.012*calm*breath-.030*prepare-.050*strike+.018*recover+.023*recoil,-.14,.055),
  roll:clamp(-.060*state.turn+.012*calm*Math.sin(state.time*.85)+.010*step*sideStep+.024*recoil*recoilSide,-.11,.11),
  raise:clamp(.013*calm*breath-.012*state.motion+.012*strike-.010*prepare+.009*step*Math.abs(footfall),-.035,.035),
  forward:clamp(.025*state.attack-.022*recoil+.008*state.inertia+.018*prepare+.052*strike-.026*recover,-.06,.10)
 };
 return {
  pitch:clamp(-.028*state.motion-.017*state.attack-.008*state.inertia+.010*calm*breath-.024*prepare-.050*strike+.018*recover+.016*recoil,-.12,.055),
  roll:clamp(-.043*state.turn+.008*calm*Math.sin(state.time*.75)+.013*step*sideStep+.018*recoil*recoilSide,-.085,.085),
  raise:clamp(.013*calm*breath-.011*state.motion+.013*strike-.007*prepare+.010*step*Math.abs(footfall),-.03,.035),
  forward:clamp(.018*state.attack-.018*recoil+.006*state.inertia+.018*prepare+.056*strike-.026*recover,-.05,.10)
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
 if(state){state.turn=0;state.motion=0;state.inertia=0;state.attack=0;state.time=0;state.lastYaw=undefined;}
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
