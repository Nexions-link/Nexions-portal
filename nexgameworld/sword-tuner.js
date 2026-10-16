// Sword grip approved in-game for NexGame Alpha 0.3.5.54.
// Keep separate from the axe; versioned key retires old experimental poses.
export const SWORD_TUNER_STORAGE_KEY='nexgame-sword-tuner-v2';
export const SWORD_TUNER_DEFAULTS=Object.freeze({
 handX:-180,handY:-67,handZ:-82,
 swordX:-8,swordY:-169,swordZ:-101,
 posX:-0.225,posY:-0.19,posZ:-0.025
});
export const SWORD_TUNER_GROUPS=[
 {title:'Кисть · поворот',fields:['handX','handY','handZ']},
 {title:'Меч · поворот',fields:['swordX','swordY','swordZ']},
 {title:'Рукоять · смещение',fields:['posX','posY','posZ']}
];
export const SWORD_TUNER_FIELDS=Object.fromEntries(
 Object.keys(SWORD_TUNER_DEFAULTS).map(key=>[key,{
  label:key.slice(-1),min:key.startsWith('pos')?-1.5:-180,
  max:key.startsWith('pos')?1.5:180,step:key.startsWith('pos')?.005:1,
  unit:key.startsWith('pos')?'':'°'
 }])
);
export function normalizeSwordTuning(data){
 const input=data&&typeof data==='object'&&!Array.isArray(data)?data:{},out={};
 for(const [key,initial] of Object.entries(SWORD_TUNER_DEFAULTS)){
  const {min,max,step}=SWORD_TUNER_FIELDS[key],n=Number.isFinite(input[key])?input[key]:initial;
  const value=Math.round(Math.min(max,Math.max(min,n))/step)*step;
  out[key]=key.startsWith('pos')?Number(value.toFixed(3)):value;
 }
 return out;
}
export const serializeSwordTuning=values=>JSON.stringify(normalizeSwordTuning(values),null,2);
