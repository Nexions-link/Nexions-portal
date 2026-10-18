// NexGameWorld opt-in frame stability diagnostics for mobile Safari.
// Stores ONLY bounded frame timings and scene labels in memory. No telemetry,
// user identifiers, game actions, credentials or network requests.
export const FRAME_SCENES=Object.freeze({
 world:'Мир',camera:'Камера',combat:'Бой',house:'Дом'
});
const DEFAULT_SAMPLES=600;
function makeWindow(n){
 return {gaps:new Float32Array(n),cpu:new Float32Array(n),
  calls:new Uint16Array(n),count:0,next:0};
}
export function selectFrameScene({orbit=false,combat=false,house=false,dragging=false}={}){
 if(combat)return 'combat';
 if(house)return 'house';
 if(dragging&&!orbit)return 'camera';
 return 'world';
}
export function createFrameProfiler({capacity=DEFAULT_SAMPLES,slowMs=50}={}){
 if(!Number.isInteger(capacity)||capacity<2||capacity>3600)throw Error('Invalid frame capacity');
 const windows=Object.fromEntries(Object.keys(FRAME_SCENES).map(k=>[k,makeWindow(capacity)]));
 const reset=()=>{for(const row of Object.values(windows)){row.count=0;row.next=0;}};
 function record(frameMs,cpuMs,scene='world',drawCalls=0){
  // A suspended Safari page or app switch must not count as a several-second
  // rendering hitch. Never mutate state for an invalid frame.
  if(!Number.isFinite(frameMs)||frameMs<=0||frameMs>250||
    !Number.isFinite(cpuMs)||cpuMs<0)return false;
  const row=windows[scene]||windows.world,i=row.next;
  row.gaps[i]=frameMs;
  row.cpu[i]=Math.min(cpuMs,500);
  row.calls[i]=Number.isFinite(drawCalls)?Math.min(65535,Math.max(0,Math.round(drawCalls))):0;
  row.next=(i+1)%capacity;
  row.count=Math.min(capacity,row.count+1);
  return true;
 }
 function stats(scene){
  const row=windows[scene];
  if(!row||!row.count)return null;
  const n=row.count;
  const sorted=Array.from(row.gaps.subarray(0,n)).sort((a,b)=>a-b);
  let sum=0,cpuSum=0,slow=0,maxCalls=0;
  for(let i=0;i<n;i++){
   const gap=row.gaps[i];
   sum+=gap;
   cpuSum+=row.cpu[i];
   if(gap>=slowMs)slow++;
   maxCalls=Math.max(maxCalls,row.calls[i]);
  }
  const p95=sorted[Math.ceil(n*.95)-1],mean=sum/n;
  return {frames:n,fps:1000/mean,p95Ms:p95,maxMs:sorted[n-1],
   slowFrames:slow,avgCpuMs:cpuSum/n,maxDrawCalls:maxCalls};
 }
 function format(scene='world'){
  const row=stats(scene);
  if(!row)return 'FPS — · '+FRAME_SCENES[scene];
  return 'FPS '+Math.round(row.fps)+' · P95 '+Math.round(row.p95Ms)+'мс · '+
   FRAME_SCENES[scene];
 }
 function report({version='unknown',quality='balanced'}={}){
  const parts=['NexGameWorld Alpha '+version,
   'Качество: '+quality,'Локальный отчёт кадров (видеокарта/GPU измеряется косвенно)',
   'Сценарии: вручную поворачивайте камеру, сражайтесь и входите в дом.',
   'Просадка: интервал между кадрами ≥'+slowMs+' мс. P95 — 95-й процентиль интервала.',
   'Среднее время JS и отправки WebGL-команд не равно времени выполнения на GPU.'];
  for(const [scene,label] of Object.entries(FRAME_SCENES)){
   const s=stats(scene);
   parts.push(label+': '+(s?
    'кадров '+s.frames+', FPS '+s.fps.toFixed(1)+', P95 '+s.p95Ms.toFixed(1)+
    ' мс, максимум '+s.maxMs.toFixed(1)+' мс, просадки '+s.slowFrames+
    ', JS/WebGL '+s.avgCpuMs.toFixed(1)+' мс, draw calls ≤'+s.maxDrawCalls:
    'нет замеров'));
  }
  return parts.join('\n');
 }
 return {record,stats,format,report,reset};
}
