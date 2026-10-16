// Developer-only local pose tuning. No gameplay stats or multiplayer data use this.
// Confirmed visual alignment from the in-game tuner, Alpha 0.3.5.52.
// Increment the storage key when built-in defaults change so older local
// experiments never override the corrected pose after updating.
export const AXE_TUNER_STORAGE_KEY='nexgame-axe-tuner-v2';
export const AXE_TUNER_DEFAULTS=Object.freeze({
 handX:-180,handY:-67,handZ:-82,
 axeX:-165,axeY:-1,axeZ:-101,
 posX:-0.555,posY:-0.19,posZ:-0.025
});
export const AXE_TUNER_GROUPS=[
 {title:'Правая кисть · добавочный поворот',fields:['handX','handY','handZ']},
 {title:'Топор · поворот относительно кулака',fields:['axeX','axeY','axeZ']},
 {title:'Рукоять · смещение в кулаке',fields:['posX','posY','posZ']}
];
export const AXE_TUNER_FIELDS=Object.fromEntries(
 Object.keys(AXE_TUNER_DEFAULTS).map(key=>[key,{
  label:key.slice(-1),minimum:key.startsWith('pos')?-1.5:-180,
  maximum:key.startsWith('pos')?1.5:180,
  step:key.startsWith('pos')?0.005:1,
  unit:key.startsWith('pos')?'':'°'
 }])
);
export function normalizeAxeTuning(input){
 const obj=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 const out={};
 for(const [key,original] of Object.entries(AXE_TUNER_DEFAULTS)){
  const {minimum,maximum,step}=AXE_TUNER_FIELDS[key];
  const value=typeof obj[key]==='number'&&Number.isFinite(obj[key])?obj[key]:original;
  const limited=Math.max(minimum,Math.min(maximum,value));
  out[key]=Math.round(limited/step)*step;
  if(key.startsWith('pos'))out[key]=Number(out[key].toFixed(3));
 }
 return out;
}
export function serializeAxeTuning(values){
 return JSON.stringify(normalizeAxeTuning(values),null,2);
}
