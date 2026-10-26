// Shared procedural wolf locomotion for forest mobs and the first riding mount.
// Pure pose planner: all movement distances are visual observations; hitboxes,
// network transforms, server-side collision and authoritative speed are untouched.
const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));
const smooth=(a,b,x)=>{const p=clamp((x-a)/(b-a));return p*p*(3-2*p)};
const TAU=Math.PI*2;
const WALK_PHASE=[0,Math.PI*1.5,Math.PI,Math.PI*.5];
const TROT_PHASE=[0,Math.PI,Math.PI,0]; // left hind + right fore
const GALLOP_PHASE=[0,Math.PI*1.09,.18,Math.PI*1.22]; // hind push, then fore reach

export function createWolfGaitState(variant=0){
 return {lastTime:null,phase:variant*.37,blend:0,velocity:0};
}
// Returns a smooth anatomically guided target; each instance keeps its own
// distance-driven phase, so wolves do not step in lockstep at a standstill.
export function advanceWolfGait(state,time,travelled=0,{mounted=false}={}){
 const now=Number.isFinite(time)?time:state.lastTime??0;
 const elapsed=state.lastTime===null?1/60:clamp(now-state.lastTime,0,.6);
 const dt=clamp(elapsed,0,.085);
 state.lastTime=now;
 const distance=Number.isFinite(travelled)?clamp(travelled,0,2.2):0;
 // Distant remote players animate less often. Calculate their speed over the
 // real elapsed interval, while bounding pose smoothing independently.
 const rawSpeed=elapsed>.0001?Math.min(distance/elapsed,12):0;
 const follow=1-Math.exp(-dt*11);
 state.velocity+=(rawSpeed-state.velocity)*follow;
 const speed=state.velocity;
 const targetMotion=smooth(.18,.95,speed);
 state.blend+=(targetMotion-state.blend)*(1-Math.exp(-dt*10));
 const moving=clamp(state.blend);
 const trot=smooth(mounted?2.0:1.7,mounted?4.0:3.8,speed);
 const gallop=smooth(mounted?4.9:4.5,mounted?7.6:7.0,speed);
 const walkWeight=1-trot,trotWeight=trot*(1-gallop),gallopWeight=gallop;
 // Every stride is distance-based: no marching on the spot in a blocked move.
 state.phase=(state.phase+distance*(2.72+.41*trot+.61*gallop))%TAU;
 const phase=state.phase;
 const legs=[];
 for(let i=0;i<4;i++){
  const front=i===1||i===3;
  const waveWalk=Math.sin(phase+WALK_PHASE[i]);
  const waveTrot=Math.sin(phase+TROT_PHASE[i]);
  const waveGallop=Math.sin(phase+GALLOP_PHASE[i]);
  const stride=walkWeight*waveWalk+trotWeight*waveTrot+gallopWeight*waveGallop;
  // Negative is swing/recovery, positive is planted push. The elbow/hock
  // folds in recovery so the foot clears the ground rather than scuffing it.
  const lift=Math.max(0,-stride);
  const amplitude=moving*(.34+.10*trot+.18*gallop);
  const hip=amplitude*stride*(front?1:-.9);
  const hock=lift*moving*(.27+.20*trot+.28*gallop)+(front?-.06:.08)*moving;
  const ankle=-.52*hip-.70*hock;
  legs.push({hip,hock,ankle});
 }
 // Gallop: a soft paired suspension, walk: modest diagonally shifting weight.
 const suspension=Math.max(0,Math.sin(phase*2-.45));
 const bounce=moving*((.012+.013*trot)*Math.sin(phase*2)+
   .085*gallop*(suspension-.32));
 const pitch=moving*(.012*Math.cos(phase)+.069*gallop*Math.sin(phase-.35));
 const roll=moving*(.014*(1-gallop)*Math.sin(phase));
 return {dt,phase,speed,moving,trot,gallop,legs,bounce,pitch,roll,mounted};
}
