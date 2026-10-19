// Event-driven cosmetic strike accents for raiders and longstriders.
// The server decides if/when damage occurs: this never changes health,
// cooldowns, target acquisition, gameplay root positions or hitboxes.
const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const smooth=(a,b,x)=>{const p=clamp((x-a)/(b-a),0,1);return p*p*(3-2*p)};
const sequence=n=>Number.isSafeInteger(n)&&n>=0?n:0;
export function advanceCreatureStrike(state,dt,{
 cueSequence=0,hitSequence=0,windupRemaining=0,windupDuration=.4,dead=false
}={}){
 const zero={prepare:0,impact:0,recover:0,active:false,newCue:false,newHit:false};
 if(!state)return zero;
 const step=clamp(finite(dt),0,.12);
 const cue=sequence(cueSequence),hit=sequence(hitSequence);
 const windup=finite(windupRemaining)>0;
 if(dead){
  state.cueSeen=cue;state.hitSeen=hit;state.phase='idle';
  state.wasWindup=false;state.age=0;state.missingWindup=0;
  return zero;
 }
 let newCue=false,newHit=false;
 if(state.cueSeen===undefined)state.cueSeen=cue;
 else if(cue!==state.cueSeen){newCue=true;state.cueSeen=cue;}
 if(state.hitSeen===undefined)state.hitSeen=hit;
 else if(hit!==state.hitSeen){newHit=true;state.hitSeen=hit;}
 // Offline combat has the same real windup but no WebSocket telegraph event.
 // A positive-edge detector handles it without triggering every frame.
 if(windup&&!state.wasWindup&&!newCue)newCue=true;
 state.wasWindup=windup;
 if(newCue){
  state.phase='prepare';state.age=0;state.missingWindup=0;
  state.duration=clamp(finite(windupDuration,.4),.15,1.1);
 }
 // Server impact is a separate event: never invent a hit from a timer.
 if(newHit){state.phase='impact';state.age=0;state.missingWindup=0;}
 let prepare=0,impact=0,recover=0;
 if(state.phase==='prepare'){
  state.age+=step;
  // Soft windup plateau; do not freeze in raised stance if an event cancels.
  state.missingWindup=windup?0:(state.missingWindup||0)+step;
  prepare=smooth(0,Math.min(.19,state.duration*.58),state.age);
  if(state.age>1.2||state.missingWindup>.24){
   state.phase='cancel';state.age=0;
  }
 }else if(state.phase==='impact'){
  state.age+=step;
  prepare=1-smooth(.03,.23,state.age);
  impact=Math.sin(Math.PI*clamp(state.age/.26,0,1));
  recover=smooth(.09,.26,state.age)*(1-smooth(.32,.56,state.age));
  if(state.age>=.56){state.phase='idle';state.age=0;}
 }else if(state.phase==='cancel'){
  state.age+=step;
  prepare=1-smooth(0,.23,state.age);
  if(state.age>=.23){state.phase='idle';state.age=0;}
 }
 return {prepare:clamp(prepare,0,1),impact:clamp(impact,0,1),
  recover:clamp(recover,0,1),active:state.phase!=='idle',newCue,newHit};
}
export function resetCreatureStrike(state){
 if(!state)return;
 state.cueSeen=0;state.hitSeen=0;state.phase='idle';
 state.wasWindup=false;state.age=0;state.missingWindup=0;state.duration=.4;
}
