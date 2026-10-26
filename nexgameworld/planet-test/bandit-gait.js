// Procedural fallback raider's footfall planner. Only the visual rig changes;
// navigation, server positions and authoritative attack windups are untouched.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function createBanditGaitState(){
 return {lastTime:null,phase:0,speed:0,weight:0,steer:0};
}
export function advanceBanditGait(state,time,travelled=0,{turn=0,attacking=false}={}){
 const now=Number.isFinite(time)?time:state.lastTime??0;
 const seconds=state.lastTime===null?1/60:clamp(now-state.lastTime,0,.3);
 state.lastTime=now;
 const dt=Math.min(seconds,.09);
 const d=Number.isFinite(travelled)?clamp(travelled,0,1.3):0;
 const rawSpeed=seconds>.0001?Math.min(d/seconds,5):0;
 state.speed+=(rawSpeed-state.speed)*(1-Math.exp(-10*dt));
 const motion=clamp((state.speed-.12)/1.3);
 state.weight+=(motion-state.weight)*(1-Math.exp(-12*dt));
 state.steer+=((Number.isFinite(turn)?clamp(turn,-1,1):0)-state.steer)*
  (1-Math.exp(-8*dt));
 // Walking feet must stop at a wall, not continue on a clock-only sine wave.
 state.phase=(state.phase+d*Math.PI*2/1.47)%(Math.PI*2);
 const weight=state.weight*(attacking?.28:1),phase=state.phase;
 const legs=[0,1].map(i=>{
  const swing=Math.sin(phase+i*Math.PI);
  const hip=weight*.43*swing;
  // Fold the shin only during the forward swing; the planted foot straightens.
  const knee=weight*(.08+.53*Math.max(0,swing));
  return {hip,knee,foot:-hip*.7-knee*.76};
 });
 const drift=weight*(.009*Math.sin(phase*2)-.025*state.steer);
 return {phase,speed:state.speed,weight,legs,
  torsoRoll:drift,torsoPitch:.018*weight*Math.sin(phase*2),
  cape:.11+.045*weight+.035*Math.cos(phase*2)*weight,
  turn:state.steer,dt};
}
