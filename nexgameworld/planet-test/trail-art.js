// NGW-ART-REMASTER-001 G-08: a single painted (never floating) fantasy trail
// style for the start village and Whispering Forest. Pure visual calculations.
// No changes to the physical route, camera, movement, ground heights or server.
export const PATH_ART_VERSION='R1-G08-1';
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*clamp(t);
function hash(x,z){
 let k=Math.imul(x,374761393)^Math.imul(z,668265263);
 k=Math.imul(k^(k>>>13),1274126177);
 return ((k^(k>>>16))>>>0)/4294967295;
}
function noise(x,z){
 const i=Math.floor(x),j=Math.floor(z);
 const u=smooth(0,1,x-i),v=smooth(0,1,z-j);
 return mix(mix(hash(i,j),hash(i+1,j),u),
  mix(hash(i,j+1),hash(i+1,j+1),u),v);
}
export function paintedTrailProfile(x,z,signedDistance,halfWidth=3.5){
 if(![x,z,signedDistance,halfWidth].every(Number.isFinite)||halfWidth<=.5)
  throw new RangeError('Invalid physical path geometry');
 // Uneven, correlated width and edge erosion, without modifying the actual
 // navigation line. Both regions sample the SAME metre-space coefficients.
 const b=noise(x*.052+11,z*.052-7)-.5;
 const m=noise(x*.19-31,z*.19+17)-.5;
 const s=noise(x*.61+9,z*.61-19)-.5;
 const tiny=noise(x*1.85-14,z*1.85+6)-.5;
 const variableWidth=halfWidth*(1+.18*b+.09*m);
 const distance=Math.abs(signedDistance);
 const irregular=distance+(m*.90+s*.42+tiny*.12);
 const core=1-smooth(variableWidth*.16,variableWidth*.72,irregular);
 const wear=1-smooth(variableWidth*.29,variableWidth*1.37,irregular);
 const ruts=Math.exp(-Math.pow((distance-variableWidth*.42-m*.11)/
  (variableWidth*.087+.11),2))*(.42+.58*noise(x*.32+5,z*.32+5))*wear;
 const verge=smooth(variableWidth*.58,variableWidth*.94,irregular)*
  (1-smooth(variableWidth*.99,variableWidth*1.55,irregular));
 const gravel=smooth(.885,.985,hash(Math.floor(x*4.7),Math.floor(z*4.7)))*
  wear*(.28+.72*noise(x*.84+17,z*.84+7));
 const flecks=smooth(.85,.986,hash(Math.floor(x*2.55+37),Math.floor(z*2.55-13)))*
  (.28*wear+.72*verge);
 const wet=clamp(noise(x*.115-14,z*.115+24)*.66+
  noise(x*.37+3,z*.37-17)*.34);
 const footsteps=wear*core*(.4+.6*noise(x*.9+4,z*.9+13));
 return {wear,core,ruts,verge,gravel,flecks,wet,footsteps,
  distance,width:variableWidth};
}
export function paintTrailSurface(rgb,profile,x,z){
 if(!Array.isArray(rgb)||rgb.length<3||rgb.slice(0,3).some(n=>!Number.isFinite(n)))
  throw new TypeError('Expected sRGB road texture pixel');
 const p=profile,grain=(noise(x*2.35+8,z*2.35+2)-.5)*15;
 // The uniform base wears into compacted ochre and warm mineral. Dark rain
 // grooves and side shade retain the underlying soil palette.
 const sunny=noise(x*.11-5,z*.11+19),shade=noise(x*.23+17,z*.23-12);
 const ochre=[147+sunny*20,118+sunny*19,79+sunny*14];
 const worn=clamp(p.wear*.65);
 let out=rgb.slice(0,3).map((v,i)=>mix(v,ochre[i]+grain*(1-i*.16),worn));
 const groove=p.ruts*(.10+.10*p.wet),center=p.footsteps*.046;
 const shoulder=p.verge*(.06+.06*shade);
 out=out.map((v,i)=>v*(1-groove-center-shoulder*(i===1?.68:1))+
  p.gravel*(i===0?22:i===1?20:15)+p.flecks*(i===0?12:i===1?10:8));
 return out.map(n=>Math.round(Math.max(0,Math.min(255,n))));
}
