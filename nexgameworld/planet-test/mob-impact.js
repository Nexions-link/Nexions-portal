// One cosmetic hit-response envelope shared by humanoid and wildlife rigs.
// A sequence counter distinguishes consecutive hits during the same reaction;
// no HP, combat cooldown, movement root or authoritative state is touched.
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function advanceMobImpact(state,dt,{
 sequence=0,hitRemaining=0,dead=false,duration=.34
}={}){
 if(!state)return {started:false,active:false,weight:0,side:1};
 const step=Number.isFinite(dt)?clamp(dt,0,.12):0;
 const count=Number.isSafeInteger(sequence)&&sequence>=0?sequence:0;
 const hit=Number.isFinite(hitRemaining)&&hitRemaining>0;
 if(dead){
  state.elapsed=0;state.duration=duration;state.seen=count;state.wasHit=false;
  state.active=false;
  return {started:false,active:false,weight:0,side:1};
 }
 const started=(!Number.isInteger(state.seen)?hit:count!==state.seen||hit&&!state.wasHit);
 state.seen=count;
 state.wasHit=hit;
 if(started){
  state.elapsed=0;
  state.duration=Number.isFinite(duration)?clamp(duration,.12,.6):.34;
  state.active=true;
  state.side=count%2===0?1:-1;
 }
 if(!state.active)return {started:false,active:false,weight:0,side:state.side||1};
 state.elapsed=Math.min(state.duration,(state.elapsed||0)+step);
 const progress=clamp(state.elapsed/state.duration,0,1);
 // Controlled soft onset, a quick peak, and a fully settled final frame.
 const rise=Math.min(1,progress/.12);
 const decay=Math.pow(1-progress,1.5);
 const weight=rise*decay;
 if(progress>=1)state.active=false;
 return {started,active:state.active,weight,side:state.side||1};
}
export function mobVisualMode({dead=false,hit=false,attack=false,walking=false}={}){
 if(dead)return 'corpse';
 if(hit)return 'Hurt';
 if(attack)return 'Attack';
 return walking?'Walk':'Idle';
}
