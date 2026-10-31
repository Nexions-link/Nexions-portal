// NGW R3 — original painted world colours, baked into the EXISTING maps.
// No meshes, shaders, external assets, frame-time JS or additional draw calls.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
const mix=(a,b,t)=>a+(b-a)*clamp(t);
const rgb=(r,g,b)=>[Math.round(clamp(r,0,255)),Math.round(clamp(g,0,255)),Math.round(clamp(b,0,255))];
export function paintVillageGround(original,{worn=0,earth=0,moss=0,dry=0,
 moisture=0,clump=0,mineral=0,flecks=0,grit=0,roadEdge=0}={}){
 const wear=clamp(worn),soils=clamp(earth),green=clamp(moss);
 const level=clamp(.22+.5*clump+.28*mineral);
 // Distinct cool blades / warm meadow soil, even where the grass geometry
 // is sparse. Existing low-poly grass inherits the same environmental palette.
 const meadow=[
  mix(48+25*dry,101+22*dry,soils*.32),
  mix(104+37*level,114,soils*.28),
  mix(38+22*green,66+9*dry,soils*.37)
 ];
 const highlight=clamp((flecks-.46)*.90+(grit-.5)*.38);
 meadow[0]+=highlight*17;meadow[1]+=highlight*21;meadow[2]+=highlight*10;
 // Narrow warm worn track, soft dark compressed wheel ruts and gravel.
 const trackNoise=(flecks-.5)*12+(grit-.5)*8;
 const muddy=clamp(moisture*.55+clump*.45);
 const rut=Math.exp(-Math.pow((roadEdge-1.05)/.34,2))*wear;
 const trail=[
  163+24*dry+trackNoise-26*rut*moody(muddy),
  117+16*dry+trackNoise*.79-19*rut*moody(muddy),
  69+12*dry+trackNoise*.56-12*rut*moody(muddy)
 ];
 const shade=1-.12*clamp(moisture)*clamp(moss);
 // Retain the native terrain map's micrograin, but clearly separate paths.
 const t=wear*.94;
 return rgb(
  mix(meadow[0],trail[0],t)*shade,
  mix(meadow[1],trail[1],t)*shade,
  mix(meadow[2],trail[2],t)*shade);
}
const moody=v=>.65+.35*v;
export function paintForestGround(original,{wear=0,ruts=0,edge=0,moss=0,leaves=0,
 wet=0,earth=0,canopy=0,broad=0,patch=0,grit=0,scratch=0}={}){
 const path=clamp(wear),leaf=clamp(leaves),soft=clamp(moss);
 // Ground layer: cool mossy pockets, brown decomposed leaf mats, brighter
 // pockets beside the trail. Same input world-space noise as the old map.
 const variation=clamp(.4*broad+.6*patch),damp=clamp(wet);
 const soil=[81+26*earth+19*variation,95+12*variation,55+11*variation];
 const mossColor=[48+10*variation,91+21*variation,48+10*damp];
 const leafColor=[143-17*damp,101-11*damp,61+7*variation];
 const mossMix=soft*.69,leafMix=leaf*(1-mossMix)*.71;
 let r=mix(mix(soil[0],mossColor[0],mossMix),leafColor[0],leafMix);
 let g=mix(mix(soil[1],mossColor[1],mossMix),leafColor[1],leafMix);
 let b=mix(mix(soil[2],mossColor[2],mossMix),leafColor[2],leafMix);
 const mottling=(grit-.5)*18+(scratch-.5)*12;
 const shade=1-.19*clamp(canopy)*(1-path);
 r=r*shade+mottling;g=g*shade+mottling*.86;b=b*shade+mottling*.69;
 const tracks=(grit-.5)*18+(scratch-.5)*10;
 const groove=clamp(ruts)*(.45+.55*damp);
 const trail=[184+21*(1-damp)+tracks-35*groove,
  132+18*(1-damp)+tracks*.81-26*groove,
  78+12*(1-damp)+tracks*.61-17*groove];
 const blend=path*.96;
 r=mix(r,trail[0],blend);g=mix(g,trail[1],blend);b=mix(b,trail[2],blend);
 const verge=clamp(edge)*(.18+.2*soft)*(1-path);
 return rgb(mix(r,60,verge),mix(g,89,verge),mix(b,52,verge));
}
