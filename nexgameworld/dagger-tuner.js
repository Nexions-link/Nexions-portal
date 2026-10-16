// W003 dagger pose approved in NexGame Alpha 0.3.5.58.
// Wrist and handle offsets match W002; the blade itself has its own angles.
// A new storage version retires earlier experimental poses.
export const DAGGER_TUNER_STORAGE_KEY='nexgame-dagger-tuner-v3';
export const DAGGER_TUNER_DEFAULTS=Object.freeze({
 handX:-180,handY:-67,handZ:-82,
 daggerX:-3,daggerY:-180,daggerZ:-60,
 posX:-0.225,posY:-0.19,posZ:-0.025
});
export const DAGGER_TUNER_GROUPS=[
 {title:'Правая кисть · поворот',fields:['handX','handY','handZ']},
 {title:'Кинжал · поворот относительно кисти',fields:['daggerX','daggerY','daggerZ']},
 {title:'Рукоять · смещение в кулаке',fields:['posX','posY','posZ']}
];
export const DAGGER_TUNER_FIELDS=Object.fromEntries(
 Object.keys(DAGGER_TUNER_DEFAULTS).map(key=>[key,{
  label:key.slice(-1),min:key.startsWith('pos')?-1.5:-180,
  max:key.startsWith('pos')?1.5:180,
  step:key.startsWith('pos')?.005:1,
  unit:key.startsWith('pos')?'':'°'
 }])
);
export function normalizeDaggerTuning(value){
 const input=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 const output={};
 for(const [key,fallback] of Object.entries(DAGGER_TUNER_DEFAULTS)){
  const {min,max,step}=DAGGER_TUNER_FIELDS[key];
  const number=typeof input[key]==='number'&&Number.isFinite(input[key])?input[key]:fallback;
  const clamped=Math.min(max,Math.max(min,number));
  const rounded=Math.round(clamped/step)*step;
  output[key]=key.startsWith('pos')?Number(rounded.toFixed(3)):rounded;
 }
 return output;
}
export function serializeDaggerTuning(value){return JSON.stringify(normalizeDaggerTuning(value),null,2)}
