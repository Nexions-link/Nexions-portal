// NexGameWorld P2.4.1 — independent world art proving ground.
// This original landmark is far from the starter camp, quests and Whispering
// Forest and never becomes an authoritative multiplayer location.
export const ART_LAB=Object.freeze({
 name:'Сад Каменного ветра',lon:2.42,lat:.22,radius:261,halfSize:17,
 materialNames:['Луговая почва','Лесная почва','Живой мох','Опавшая листва','Утоптанная тропа'],
 treeSites:Object.freeze([[.85,10.2],[-9.7,10.4],[10.8,-8.2],[-11.4,-7.8],[9.4,9.2]]),
 rockSites:Object.freeze([[6.0,-5.0],[-5.7,5.8],[10.9,2.1]])
});
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=(a,b,t)=>{const v=clamp((t-a)/(b-a));return v*v*(3-2*v)};
const mix=(a,b,t)=>a+(b-a)*clamp(t);
export function artLabNormal(x,z,lon=ART_LAB.lon,lat=ART_LAB.lat){
 if(![x,z,lon,lat].every(Number.isFinite))throw new RangeError('Invalid art-lab coordinates');
 const center=[Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)],
  east=[Math.cos(lon),0,-Math.sin(lon)],
  north=[-Math.sin(lat)*Math.sin(lon),Math.cos(lat),-Math.sin(lat)*Math.cos(lon)];
 const d=Math.hypot(x,z),theta=d/ART_LAB.radius;
 const k=d>1e-8?Math.sin(theta)/d:1;
 return center.map((v,i)=>v*Math.cos(theta)+k*(x*east[i]+z*north[i]));
}
export function artLabBiomeHeight(n){
 // Matches the ordinary global sphere height without changing the sphere.
 const lon=Math.atan2(n[0],n[2]);
 const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 const weights=Array.from({length:4},(_,i)=>
  Math.exp(-Math.pow(angleDelta(lon,i*Math.PI/2)/.80,4)));
 const sum=weights.reduce((a,b)=>a+b,0),b=weights.map(x=>x/sum);
 const rough=Math.sin(n[0]*21+n[2]*7)*Math.cos(n[1]*27-n[2]*18)*.58+
  Math.sin(n[2]*14+n[1]*11)*.68;
 const ridge=Math.pow(Math.abs(Math.sin(n[0]*28+n[2]*13)*
  Math.cos(n[1]*12+n[0]*5)),1.6);
 const mountain=b[3]*(ridge*8.5+1.2*Math.sin(n[2]*8));
 const dunes=b[2]*(1.5*Math.cos(n[0]*23+n[2]*18)+.5);
 const ice=smooth(.78,.94,Math.abs(n[1]))*2.5;
 return rough+mountain+dunes+ice;
}
// One continuous local displacement field: it fades before meeting the
// unmodified global planet. Every stone, tree and ground mesh calls artLabHeight.
export function artLabScenicRelief(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))throw new RangeError('Invalid terrain');
 const d=Math.hypot(x,z),edge=1-smooth(11.8,17,d);
 if(edge<=0)return 0;
 const high=.86*Math.exp(-((x+9)*(x+9)/110+(z-8)*(z-8)/78));
 const rocky=.81*Math.exp(-((x-8)*(x-8)/60+(z+8)*(z+8)/95));
 const hummocks=.31*Math.sin(x*.26+z*.14)*Math.cos(z*.19-x*.09);
 const hollow=-.52*Math.exp(-(x*x/64+(z-3.2)*(z-3.2)/24));
 const road=1-smooth(.6,3.4,Math.abs(z-artLabPathZ(x)));
 return (high+rocky+hummocks+hollow-.12*road)*edge;
}
export function artLabHeight(x,z){
 const n=artLabNormal(x,z);
 const base=artLabBiomeHeight(n);
 const xDetail=.085*Math.sin(x*.63+Math.cos(z*.47))*
  Math.sin(z*.61-x*.21);
 const smoothing=1-smooth(12,18,Math.hypot(x,z));
 return base+xDetail*smoothing+artLabScenicRelief(x,z);
}
export function artLabWorldPoint(x,z,offset=0){
 const n=artLabNormal(x,z),h=ART_LAB.radius+artLabHeight(x,z)+offset;
 return n.map(c=>c*h);
}
export function artLabPathZ(x){
 return 1.95*Math.sin(x*.138+.35)+.55*Math.sin(x*.39-1.8);
}
function patchNoise(x,z){
 return .5+.24*Math.sin(x*.27+z*.071)*Math.sin(z*.23-x*.16)+
  .14*Math.cos(x*.49-z*.33)+.09*Math.sin(z*.77+x*.83);
}
export function artLabMaterialWeights(x,z){
 if(![x,z].every(Number.isFinite))throw new RangeError('Invalid material sample');
 const pathDistance=Math.abs(z-artLabPathZ(x)+.26*Math.sin(x*.67+z*.51));
 const path=1-smooth(1.15,3.65,pathDistance);
 const forest=smooth(-7,7,x+.75*Math.sin(z*.16));
 const wet=smooth(.39,.72,patchNoise(x+3,z-5));
 const leaf=smooth(.36,.69,patchNoise(x*.88-6,z*.88+4))*forest;
 const stones=ART_LAB.rockSites.reduce((best,[a,b])=>
  Math.max(best,1-smooth(2.0,5.0,Math.hypot(x-a,z-b))),0);
 const roots=ART_LAB.treeSites.reduce((best,[a,b])=>
  Math.max(best,1-smooth(1.4,6.2,Math.hypot(x-a,z-b))),0);
 const moss=clamp((wet*.61+stones*.55+roots*.41)*forest*.83);
 const litter=clamp((leaf*.65+roots*.37)*forest*(1-.20*moss));
 const meadow=(1-forest)*(.74+.20*(1-wet));
 const darkSoil=.19+forest*.67*(1-.42*moss);
 const trail=path*2.3;
 const weights=[meadow,darkSoil,moss*1.75,litter*1.45,trail];
 const sum=weights.reduce((a,b)=>a+b,0);
 return weights.map(v=>v/sum);
}
export function artLabSurfaceQuality(preset='balanced'){
 if(preset==='economy')return {atlas:512,dpr:1,details:.28,shadows:false};
 if(preset==='high')return {atlas:1536,dpr:1.65,details:1,shadows:true};
 return {atlas:896,dpr:1.3,details:.66,shadows:true};
}
export function seededRandom(seed=742033){
 let n=seed>>>0;
 return ()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
}
export function artLabGroundDetails(seed=397427){
 const rand=seededRandom(seed),grasses=[],leaves=[],pebbles=[];
 for(let i=0;i<1180;i++){
  const x=(rand()-.5)*32,z=(rand()-.5)*32;
  const w=artLabMaterialWeights(x,z);
  const choice=rand(),size=.42+rand()*1.3;
  const meta={x,z,size,angle:rand()*Math.PI*2,tint:rand()};
  if(Math.hypot(x,z)>15.5)continue;
  if(w[4]>.32)continue;
  if(ART_LAB.treeSites.some(([tx,tz])=>Math.hypot(x-tx,z-tz)<1.8))continue;
  if(choice<.43&&w[0]+w[2]>.29)grasses.push(meta);
  else if(choice<.84&&w[1]+w[3]>.2)leaves.push(meta);
  else if(w[1]+w[4]+w[2]>.27)pebbles.push(meta);
 }
 return {grasses,leaves,pebbles};
}
