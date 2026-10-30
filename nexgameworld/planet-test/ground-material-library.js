// NexGameWorld G-06 — six original soil materials, in shared world-space metres.
// Pure CPU sRGB albedo synthesis; no shaders, network, physics, external textures.
// All six material families are sampled through continuous biome/environment weights.
import {WORLD_ART_PALETTE as ART} from './world-art-style.js?v=1';
const T=ART.terrain;
const freeze=(...v)=>Object.freeze(v);
export const GROUND_MATERIAL_LIBRARY_VERSION='R1-G06-1';
export const GROUND_MATERIALS=Object.freeze([
 Object.freeze({id:'humus',name:'Лесной гумус',base:freeze(105,78,54),roughness:.98,
  motif:'Коричневая рыхлая почва, тёмные листовые волокна'}),
 Object.freeze({id:'packed',name:'Плотная земля',base:T.meadowSoil,roughness:.93,
  motif:'Тёплые минералы, крупинки и уплотнённые участки'}),
 Object.freeze({id:'moss',name:'Мох',base:T.forestMoss,roughness:1,
  motif:'Мягкие влажные зелёные розетки'}),
 Object.freeze({id:'sand',name:'Песчаная почва',base:freeze(165,138,99),roughness:.89,
  motif:'Сухие золотистые песчинки, тёплые вкрапления'}),
 Object.freeze({id:'trail',name:'Растоптанная тропа',base:T.trailSun,roughness:.88,
  motif:'Охристые затёртости, мелкая галька, дождевые колеи'}),
 Object.freeze({id:'wet',name:'Влажная почва',base:freeze(70,69,54),roughness:.94,
  motif:'Тёмные земляные микролужицы и комочки ила'})
]);
const clamp=n=>Math.max(0,Math.min(1,n));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
function hash(x,z){
 const a=Math.imul(x,374761393)^Math.imul(z,668265263);
 const b=Math.imul(a^(a>>>13),1274126177);
 return ((b^(b>>>16))>>>0)/4294967295;
}
// Parameter object accepts existing per-biome low-frequency signals; no extra
// multi-octave sampling per pixel. One common family blending rule for all zones.
export function groundMaterialWeights({biome='forest',earth=.5,moisture=.5,moss=.4,
 leaves=.4,dry=.5,roadWear=0,roadRuts=0,shore=0}={}){
 if(biome!=='forest'&&biome!=='meadow')throw new RangeError('Unknown ground biome');
 const e=clamp(earth),wet=clamp(moisture),m=clamp(moss),leaf=clamp(leaves),
  dryness=clamp(dry),road=clamp(roadWear),ruts=clamp(roadRuts),bank=clamp(shore);
 // Smooth zones from humidity, canopy litter and local path wear, not circles
 // or hard material IDs. The composition always sums to exactly one.
 let humus=(biome==='forest'?.48:.23)+leaf*.34+e*.16;
 let packed=.48+e*.42+(biome==='meadow'?.12:0);
 let mossy=(.06+m*.78)*(biome==='forest'?1:.72)*(1-road*.88);
 let sandy=(.06+dryness*.20+bank*.95)*(1-road*.72);
 let trail=.02+road*(2.8+dryness*.35);
 let damp=(.05+wet*.48+ruts*.42)*(1-dryness*.34)*(1-road*.40);
 const otherFade=1-road*.88;
 humus*=otherFade;packed*=otherFade;
 mossy*=1-bank*.76;
 damp*=1-bank*.44;
 const sum=humus+packed+mossy+sandy+trail+damp;
 return [humus/sum,packed/sum,mossy/sum,sandy/sum,trail/sum,damp/sum];
}
// Local fractal-looking, *aperiodic* pigment from hashed metre-sized cells.
// Unlike a repeating 256x256 tile, no coordinate modulo or global UV pattern.
// Geometry and material alignment use metric coordinates in both biomes.
function pigment(x,z){
 const cx=Math.floor(x*2.6),cz=Math.floor(z*2.6);
 const coarse=hash(Math.floor(x*1.16),Math.floor(z*1.16));
 const fine=hash(cx,cz);
 const fleck=hash(Math.floor(x*5.4+13),Math.floor(z*5.4-11));
 return {coarse,fine,fleck};
}
export function groundMaterialPixel(x,z,signals){
 if(!Number.isFinite(x)||!Number.isFinite(z))throw new RangeError('Invalid ground metres');
 const weights=groundMaterialWeights(signals);
 const {coarse,fine,fleck}=pigment(x,z);
 const road=clamp(signals?.roadWear??0),wet=clamp(signals?.moisture??0);
 const moss=clamp(signals?.moss??0),leaves=clamp(signals?.leaves??0);
 // Small irregular pigments and physical identifiers vary by material.
 // Same global coordinates at any resolution -> no UV phase seam at biome edge.
 const materialMotifs=[
  (coarse-.5)*22+(fine-.5)*19-(fleck>.88?8:0),     // humus chips
  (fine-.5)*19+(fleck-.5)*12,                       // packed soil grains
  (coarse-.5)*13+(fine>.73?11:-2),                  // cushions of moss
  (fine-.5)*23+(fleck>.77?18:0),                    // sand specks
  (fine-.5)*19+(fleck-.5)*18-(wet>.62?5:0),         // trampled ochre
  (coarse-.5)*13+(fine-.5)*14-(fleck>.76?7:0)      // wet dark recesses
 ];
 const channels=[0,0,0],lightBias=[1,.87,.73];
 for(let k=0;k<GROUND_MATERIALS.length;k++){
  const w=weights[k],tone=materialMotifs[k];
  const base=GROUND_MATERIALS[k].base;
  for(let ch=0;ch<3;ch++)channels[ch]+=w*(base[ch]+tone*lightBias[ch]);
 }
 // Sparse bright quartz fragments and dark leaf fibres are not uniform noise.
 const pebble=(fleck>.977?12:0)*(road*.7+.3);
 const litter=(coarse>.83&&fine<.28?7:0)*leaves*(1-road);
 const mossHighlights=(fine>.88?4:0)*moss*(1-road);
 const color=channels.map((v,i)=>Math.round(Math.max(0,Math.min(255,
  v+pebble*(i===0?1:.82)-litter*(i===0?1:.8)+mossHighlights*(i===1?1:.6)))));
 return [color[0],color[1],color[2],255];
}
export function groundMaterialRoughness(signals){
 const weights=groundMaterialWeights(signals);
 return weights.reduce((value,w,i)=>value+w*GROUND_MATERIALS[i].roughness,0);
}
