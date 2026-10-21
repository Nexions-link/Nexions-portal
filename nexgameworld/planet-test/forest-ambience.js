// Opt-in Web Audio ambience: no downloaded sounds or auto-play on page load.
export const FOREST_SOUND_KEY='ngw-forest-ambience-v1';
export const forestAudioLevel=v=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):0;
export function createForestAmbience({storage,AudioContextClass}={}){
 const AC=AudioContextClass||globalThis.AudioContext||globalThis.webkitAudioContext;
 let enabled=false,ctx=null,source=null,wind=null,filter=null,callAt=0,mixedAt=-Infinity;
 try{enabled=storage?.getItem(FOREST_SOUND_KEY)==='true'}catch{}
 function unlock(){
  if(!enabled||!AC)return false;
  if(!ctx){
   try{
    ctx=new AC();
    const samples=Math.round(ctx.sampleRate*2),buffer=ctx.createBuffer(1,samples,ctx.sampleRate);
    const data=buffer.getChannelData(0);let seed=81123;
    for(let i=0;i<samples;i++){
     seed=(Math.imul(seed,1664525)+1013904223)>>>0;
     data[i]=(seed/2147483648-1)*.38;
    }
    source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;
    filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;
    wind=ctx.createGain();wind.gain.value=0;
    source.connect(filter);filter.connect(wind);wind.connect(ctx.destination);
    source.start();
   }catch{ctx=null;source=null;return false}
  }
  if(ctx.state==='suspended')void ctx.resume().catch(()=>{});
  return true;
 }
 function setEnabled(value){
  enabled=!!value;try{storage?.setItem(FOREST_SOUND_KEY,String(enabled))}catch{}
  if(enabled)unlock();
  else if(wind&&ctx)wind.gain.setTargetAtTime(0,ctx.currentTime,.12);
 }
 function chirp(t,volume){
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';
  const f=670+140*Math.abs(Math.sin(t*2));
  osc.frequency.setValueAtTime(f,t);
  osc.frequency.exponentialRampToValueAtTime(f*1.55,t+.12);
  osc.frequency.exponentialRampToValueAtTime(f*.9,t+.39);
  gain.gain.setValueAtTime(.00001,t);
  gain.gain.exponentialRampToValueAtTime(.007*volume+.00001,t+.055);
  gain.gain.exponentialRampToValueAtTime(.00001,t+.40);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.43);
  osc.onended=()=>{osc.disconnect();gain.disconnect()};
 }
 function update(time,forestMood,hidden=false){
  if(!enabled||!ctx||ctx.state!=='running')return;
  const mood=hidden?0:forestAudioLevel(forestMood),t=ctx.currentTime;
  if(time-mixedAt>.12){
   wind.gain.setTargetAtTime(mood*.045,t,.45);
   filter.frequency.setTargetAtTime(520+120*Math.sin(time*.19),t,.9);
   mixedAt=time;
  }
  if(mood>.54&&time>=callAt){chirp(t,mood);callAt=time+8+3*Math.abs(Math.sin(time*.8))}
 }
 function dispose(){enabled=false;try{source?.stop()}catch{}if(ctx)void ctx.close().catch(()=>{})}
 return {get enabled(){return enabled},setEnabled,unlock,update,dispose};
}