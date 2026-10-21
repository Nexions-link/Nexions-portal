// Longstrider's head counterbalance runs after the approved GLB clips.
// Remove the previous additive angles before each mixer update, avoiding drift.
const finite=(x,f=0)=>Number.isFinite(x)?x:f;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function longstriderWalkPhase(action,fallback=0){
 const duration=action?.getClip?.()?.duration;
 return Number.isFinite(duration)&&duration>0&&Number.isFinite(action?.time)
  ?action.time/duration*2*Math.PI:finite(fallback);
}
export function advanceLongstriderHead(state,dt,{
 phase=0,stepWeight=0,motion=0,turn=0,attacking=false
}={}){
 const step=clamp(finite(dt),0,.12),target=clamp(finite(stepWeight)*finite(motion),0,1)*(attacking?.14:1);
 state.walk=finite(state.walk)+(target-finite(state.walk))*(1-Math.exp(-9*step));
 state.time=finite(state.time)+step;
 const w=state.walk,c=finite(phase),turnLag=clamp(finite(turn),-1,1);
 const nod=Math.sin(2*c-.35),stride=Math.sin(c);
 return {neckX:-.018*w+.044*w*nod+.010*(1-w)*Math.sin(state.time*1.45),
  neckY:-.045*turnLag-.013*w*stride,
  headX:.017*w-.062*w*nod,
  headY:-.050*turnLag+.012*w*stride,
  headZ:.022*w*Math.sin(c+.7)+.015*turnLag};
}
export function createLongstriderHeadRig(root){
 return {neck:root?.getObjectByName?.('Neck')||null,
  head:root?.getObjectByName?.('Head')||null,applied:null,motion:{}};
}
export function clearLongstriderHeadPose(rig){
 if(!rig?.applied)return;
 const p=rig.applied;
 if(rig.neck){rig.neck.rotation.x-=p.neckX;rig.neck.rotation.y-=p.neckY;}
 if(rig.head){rig.head.rotation.x-=p.headX;rig.head.rotation.y-=p.headY;rig.head.rotation.z-=p.headZ;}
 rig.applied=null;
}
export function applyLongstriderHeadPose(rig,pose){
 if(!rig)return;
 clearLongstriderHeadPose(rig);
 if(rig.neck){rig.neck.rotation.x+=pose.neckX;rig.neck.rotation.y+=pose.neckY;}
 if(rig.head){rig.head.rotation.x+=pose.headX;rig.head.rotation.y+=pose.headY;rig.head.rotation.z+=pose.headZ;}
 rig.applied={...pose};
}
export function resetLongstriderHeadRig(rig){
 clearLongstriderHeadPose(rig);
 if(rig)rig.motion={};
}
