// Cosmetic charge pacing shared by local and remote avatars.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=t=>{const x=clamp(t,0,1);return x*x*(3-2*x)};
const ACCEL=.16,BRAKE=.83;
const SPEED=1/(ACCEL/2+BRAKE-ACCEL+(1-BRAKE)/2);
export function sampleChargeMotion(elapsed,duration){
 const total=Math.max(.1,Number.isFinite(duration)?duration:.55);
 const t=clamp((Number.isFinite(elapsed)?elapsed:0)/total,0,1);
 let distanceFraction;
 if(t<ACCEL)distanceFraction=SPEED*t*t/(2*ACCEL);
 else if(t<BRAKE)distanceFraction=SPEED*(ACCEL/2+t-ACCEL);
 else{const d=t-BRAKE,w=1-BRAKE;distanceFraction=SPEED*(ACCEL/2+BRAKE-ACCEL+d-d*d/(2*w));}
 const drive=smooth(t/.13)*(1-smooth((t-.82)/.18));
 const landing=smooth((t-.77)/.16)*(1-.48*smooth((t-.96)/.04));
 return {t,distanceFraction:clamp(distanceFraction,0,1),drive,landing,finished:t>=1};
}
export function chargeTravelHeading(from,to){
 if(!Array.isArray(from)||!Array.isArray(to)||from.length!==3||to.length!==3||
    !from.every(Number.isFinite)||!to.every(Number.isFinite))return null;
 const lon=Math.atan2(from[0],from[2]),east=[Math.cos(lon),0,-Math.sin(lon)];
 const north=[from[1]*east[2]-from[2]*east[1],from[2]*east[0]-from[0]*east[2],from[0]*east[1]-from[1]*east[0]];
 const dot=from.reduce((sum,v,i)=>sum+v*to[i],0),v=to.map((n,i)=>n-dot*from[i]);
 if(Math.hypot(...v)<1e-6)return null;
 return Math.atan2(v.reduce((s,n,i)=>s+n*north[i],0),v.reduce((s,n,i)=>s+n*east[i],0));
}
export function easeChargeHeading(from,to,dt){
 if(!Number.isFinite(from)||!Number.isFinite(to))return Number.isFinite(from)?from:0;
 const delta=Math.atan2(Math.sin(to-from),Math.cos(to-from));
 return from+delta*(1-Math.exp(-Math.max(0,Number.isFinite(dt)?dt:0)*14));
}
