// Visual-only GLB locomotion filter for spherical PvE creatures.
// Distance is the motion of the displayed creature, not a server command.
// No position, attack cooldown, hitbox, or aggro state is changed here.
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function advanceCreatureGait(state,dt,travelled,{
 nominalSpeed=2.05,holdSeconds=.25,motionThreshold=.12,strideLength=1.35
}={}){
 if(!state||!Number.isFinite(dt)||dt<=0)
  return {walking:(state?.hold||0)>0,clipRate:1,speed:0};
 const seconds=clamp(dt,0,.12);
 const speed=Number.isFinite(travelled)&&travelled>0
  ?clamp(travelled/Math.max(seconds,.016),0,nominalSpeed*1.8):0;
 const moving=speed>motionThreshold;
 state.hold=moving?holdSeconds:Math.max(0,(state.hold||0)-seconds);
 const wanted=clamp(speed/Math.max(.1,nominalSpeed),0,1.6);
 const previous=Number.isFinite(state.rate)?state.rate:0;
 const response=1-Math.exp(-seconds*(wanted>previous?12:9));
 state.rate=clamp(previous+(wanted-previous)*response,0,1.6);
 // Footfalls follow actual metres moved, not frame count or server cooldown.
 // A large correction/teleport must not cause dozens of instant strides.
 const distance=Number.isFinite(travelled)&&travelled>0?travelled:0;
 const maxStep=nominalSpeed*1.85*seconds+.02;
 const walkDistance=distance<=maxStep&&moving?distance:0;
 const previousWeight=Number.isFinite(state.stepWeight)?state.stepWeight:0;
 state.stepWeight=clamp(previousWeight+((moving?1:0)-previousWeight)*
  (1-Math.exp(-seconds*(moving?13:8))),0,1);
 const oldPhase=Number.isFinite(state.stridePhase)?state.stridePhase:0;
 const length=Number.isFinite(strideLength)?clamp(strideLength,.75,2.5):1.35;
 state.stridePhase=(oldPhase+walkDistance*Math.PI*2/length)%(Math.PI*2);
 // Keep GLB feet moving a little while decelerating, but never endlessly.
 return {
  walking:state.hold>0||state.rate>.24,
  clipRate:clamp(.73+.39*state.rate,.73,1.35),
  speed,
  stridePhase:state.stridePhase,
  stepWeight:state.stepWeight
 };
}
