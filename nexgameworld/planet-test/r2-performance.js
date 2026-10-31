// R2-04: opt-in iPhone-safe adaptive GPU budget.
// Observes frame intervals only; does not inspect player data or mutate gameplay.
const percentile=(a,n,p)=>{
 const sorted=Array.from(a.subarray(0,n)).sort((x,y)=>x-y);
 return sorted[Math.max(0,Math.ceil(n*p)-1)];
};
export function createR2AdaptiveRenderBudget({capacity=120,period=2.4}={}){
 if(!Number.isInteger(capacity)||capacity<30||capacity>600)throw RangeError('Invalid frame buffer');
 const frames=new Float32Array(capacity);
 let count=0,next=0,elapsed=0,stableSeconds=0,stage=0,qualityName='balanced';
 function reset(){
  count=0;next=0;elapsed=0;stableSeconds=0;stage=0;
 }
 function observe(frameMs,dt,{enabled=false,quality='balanced',hidden=false}={}){
  if(quality!==qualityName){qualityName=quality;reset();}
  if(!enabled||hidden||quality==='economy'){
   if(stage||count)reset();
   return false;
  }
  // When Safari resumes from the background, ignore the first stalled frames.
  if(!Number.isFinite(frameMs)||frameMs<=0||frameMs>250||
   !Number.isFinite(dt)||dt<=0||dt>.25)return false;
  frames[next]=frameMs;next=(next+1)%capacity;count=Math.min(count+1,capacity);
  elapsed+=dt;
  if(elapsed<period||count<30)return false;
  const seconds=elapsed;elapsed=0;
  const p95=percentile(frames,count,.95);
  let changed=false;
  if(p95>=39&&stage<2){stage=2;changed=true;stableSeconds=0;}
  else if(p95>=32&&stage<1){stage=1;changed=true;stableSeconds=0;}
  else if(p95<23){
   stableSeconds+=seconds;
   if(stableSeconds>=6&&stage>0){stage--;changed=true;stableSeconds=0;}
  }else stableSeconds=0;
  return changed;
 }
 function settings(quality='balanced',enabled=false){
  if(!enabled||quality==='economy')return {stage:0,pixelRatioCap:Infinity,shadowHz:0};
  const pixelRatioCap=stage===0?Infinity:
   quality==='high'?(stage===1?1.42:1.25):(stage===1?1.15:1.0);
  const shadowHz=stage===0?30:stage===1?24:18;
  return {stage,pixelRatioCap,shadowHz};
 }
 return {observe,settings,reset,get stage(){return stage}};
}
export function createR2SceneSnapshot({profile,quality,version='unknown',r2='',dpr=1}={}){
 if(!profile||typeof profile.stats!=='function')throw TypeError('Frame profiler required');
 const scenes=['world','camera','combat','house'],results={};
 for(const name of scenes){
  const s=profile.stats(name);
  if(s&&s.frames>=30){
   results[name]={frames:s.frames,fps:+s.fps.toFixed(1),
    p95Ms:+s.p95Ms.toFixed(1),slowFrames:s.slowFrames,
    maxDrawCalls:s.maxDrawCalls};
  }
 }
 return {version:String(version).slice(0,32),quality:String(quality).slice(0,32),
  r2:String(r2).slice(0,80),dpr:+Number(dpr).toFixed(2),
  results};
}
export function compareR2SceneSnapshots(before,after){
 if(!before?.results||!after?.results)return 'Нет пары замеров А/Б. Сохрани замер А, затем включи другую графику и нажми «Сравнить».';
 const titles={world:'Мир',camera:'Камера',combat:'Бой',house:'Дом'};
 const lines=[
  'NexGameWorld — сравнение R2-04 (то же устройство, одинаковая сцена и действия)',
  'А: '+before.version+' · '+before.quality+' · DPR '+before.dpr+' · '+before.r2,
  'Б: '+after.version+' · '+after.quality+' · DPR '+after.dpr+' · '+after.r2,
  'FPS выше лучше; P95 и draw calls ниже лучше. Замеры клиентские, не GPU-профиль.'
 ];
 for(const [key,title] of Object.entries(titles)){
  const a=before.results[key],b=after.results[key];
  if(!a||!b){lines.push(title+': недостаточно кадров в одной из версий (нужно ≥30).');continue;}
  const delta=+(b.fps-a.fps).toFixed(1),p95=+(b.p95Ms-a.p95Ms).toFixed(1);
  lines.push(title+': FPS '+a.fps+' → '+b.fps+' ('+(delta>=0?'+':'')+delta+')'+
   ', P95 '+a.p95Ms+' → '+b.p95Ms+' мс ('+(p95>=0?'+':'')+p95+')'+
   ', draw calls ≤'+a.maxDrawCalls+' → ≤'+b.maxDrawCalls);
 }
 return lines.join('\n');
}
