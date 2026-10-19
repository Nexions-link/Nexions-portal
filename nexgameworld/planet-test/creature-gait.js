// Visual-only GLB locomotion filter for spherical PvE creatures.
// Distance is the motion of the displayed creature, not a server command.
// No position, attack cooldown, hitbox, or aggro state is changed here.
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function advanceCreatureGait(state,dt,travelled,{
 nominalSpeed=2.05,holdSeconds=.25,motionThreshold=.12
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
 // Keep GLB feet moving a little while decelerating, but never endlessly.
 return {
  walking:state.hold>0||state.rate>.24,
  clipRate:clamp(.73+.39*state.rate,.73,1.35),
  speed
 };
}
