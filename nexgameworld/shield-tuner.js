// NexGame shield poses approved for GLB S001 (round) and S002 (kite).
// Two independent factory defaults and local-device tweaks; no equipment changes.
export const SHIELD_TUNER_VARIANTS=Object.freeze(['round','kite']);
const SHARED_GRIP=Object.freeze({
 handX:0,handY:0,handZ:0,posX:-.12,posY:-.02,posZ:-.34
});
export const SHIELD_TUNER_DEFAULTS=Object.freeze({
 round:Object.freeze({...SHARED_GRIP,shieldX:0,shieldY:-140,shieldZ:0}),
 kite:Object.freeze({...SHARED_GRIP,shieldX:-16,shieldY:-160,shieldZ:-180})
});
export const SHIELD_TUNER_GROUPS=Object.freeze([
 {title:'Положение щита',fields:['posX','posY','posZ']},
 {title:'Поворот щита',fields:['shieldX','shieldY','shieldZ']},
 {title:'Левая кисть',fields:['handX','handY','handZ']}
]);
export const SHIELD_TUNER_FIELDS=Object.fromEntries(Object.keys(SHIELD_TUNER_DEFAULTS.round).map(key=>[key,{
 label:key.slice(-1),min:key.startsWith('pos')?-1.5:-180,
 max:key.startsWith('pos')?1.5:180,step:key.startsWith('pos')?.005:1,
 unit:key.startsWith('pos')?'':'°'
}]));
function assertVariant(kind){
 if(!SHIELD_TUNER_VARIANTS.includes(kind))throw Error('Unknown shield variant');
 return kind;
}
export function shieldTunerStorageKey(kind){
 // A new key discards old experimental v1 offsets, without wiping other settings.
 return 'nexgame-shield-'+assertVariant(kind)+'-tuner-v2';
}
export function normalizeShieldTuning(input,kind='round'){
 const fallback=SHIELD_TUNER_DEFAULTS[assertVariant(kind)];
 const value=input&&typeof input==='object'&&!Array.isArray(input)?input:{},result={};
 for(const [key,defaultValue] of Object.entries(fallback)){
  const spec=SHIELD_TUNER_FIELDS[key],raw=Number.isFinite(value[key])?value[key]:defaultValue;
  const rounded=Math.round(Math.max(spec.min,Math.min(spec.max,raw))/spec.step)*spec.step;
  result[key]=key.startsWith('pos')?Number(rounded.toFixed(3)):rounded;
 }
 return result;
}
export function serializeShieldTuning(value,kind='round'){
 return JSON.stringify(normalizeShieldTuning(value,kind),null,2);
}
