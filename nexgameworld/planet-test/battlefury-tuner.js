// Browser-local pose tuner for ONE exceptional item. Does not edit GLB, stats, or other axes.
import {AXE_TUNER_DEFAULTS} from '../axe-tuner.js';
import {applyEquipmentTransform} from './equipment-grip.js';

export const BATTLEFURY_ITEM_ID='adminBattlefury';
export const BATTLEFURY_TUNER_STORAGE_KEY='ngw-admin-battlefury-pose-v1';
export const BATTLEFURY_TUNER_DEFAULTS=Object.freeze({"posX":-1.13,"posY":-0.125,"posZ":0.055,"axeX":-21,"axeY":180,"axeZ":-120,"handX":-180,"handY":-67,"handZ":-82,"scale":2.3});
export const BATTLEFURY_TUNER_GROUPS=Object.freeze([
 {title:'Положение в руке',fields:['posX','posY','posZ']},
 {title:'Поворот модели',fields:['axeX','axeY','axeZ']},
 {title:'Поворот кисти',fields:['handX','handY','handZ']},
 {title:'Размер топора',fields:['scale']}
]);
export const BATTLEFURY_TUNER_FIELDS=Object.freeze(Object.fromEntries(
 Object.keys(BATTLEFURY_TUNER_DEFAULTS).map(key=>{
  const isPosition=key.startsWith('pos'),isScale=key==='scale';
  return [key,Object.freeze({
   label:isScale?'Масштаб':(isPosition?'Смещение ':'Поворот ')+key.slice(-1),
   min:isScale?.25:isPosition?-2:-180,
   max:isScale?3:isPosition?2:180,
   step:isScale?.05:isPosition?.005:1,
   unit:isScale?'×':isPosition?'':'°'
  })];
 })
));
export function normalizeBattlefuryTuning(raw){
 const value=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const out={};
 for(const [key,fallback] of Object.entries(BATTLEFURY_TUNER_DEFAULTS)){
  const spec=BATTLEFURY_TUNER_FIELDS[key],candidate=value[key];
  const v=typeof candidate==='number'&&Number.isFinite(candidate)?candidate:fallback;
  const bounded=Math.min(spec.max,Math.max(spec.min,v));
  out[key]=Number((Math.round(bounded/spec.step)*spec.step).toFixed(key.startsWith('pos')?3:key==='scale'?2:0));
 }
 return out;
}
// The unique admin axe has a published, immutable grip for every player and device.
// Deliberately ignore historical browser-local tuning values.
export function readBattlefuryTuning(){return {...BATTLEFURY_TUNER_DEFAULTS}}
export function saveBattlefuryTuning(){return {...BATTLEFURY_TUNER_DEFAULTS}}
export function applyBattlefuryPose(mesh,hand,values){
 const pose=normalizeBattlefuryTuning(values);
 const grip=applyEquipmentTransform(mesh,hand,{slot:'weapon',kind:'axe',tuning:pose,sourceId:null});
 mesh.scale.setScalar(pose.scale);
 return grip;
}
