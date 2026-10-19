import {ITEM_CATALOG,deriveStats} from '../items.js';

// Compare the actual character totals, not misleading isolated gear bonuses.
const FIELDS=Object.freeze([
 ['armor','Броня',0],['strength','Сила',0],['stamina','Выносливость',0],
 ['maxHp','Здоровье',0],['damageMin','Урон (мин.)',1],
 ['damageMax','Урон (макс.)',1],['dps','Урон в секунду',2],
 ['speed','Скорость оружия',2],['blockChance','Шанс блока',1],
 ['blockValue','Величина блока',0]
]);
const format=(n,digits=0)=>(Math.round(n*10**digits)/10**digits)
 .toLocaleString('ru-RU',{maximumFractionDigits:digits});
export function compareEquipment(itemId,level,equipment={},items=ITEM_CATALOG){
 const candidate=items[itemId];
 if(!candidate?.slot)return null;
 const slot=candidate.slot,currentId=equipment?.[slot]?.id||null;
 const current=items[currentId]||null;
 const before=deriveStats(level,equipment);
 const after=deriveStats(level,{...equipment,[slot]:{id:itemId,qty:1}});
 const rows=FIELDS.filter(([key])=>{
  if(key==='speed'||key==='damageMin'||key==='damageMax'||key==='dps')return slot==='weapon';
  if(key==='blockChance'||key==='blockValue')return slot==='shield';
  return true;
 }).map(([key,label,digits])=>{
  const delta=after[key]-before[key];
  const adjusted=key==='speed'?-delta:delta;
  return {key,label,before:before[key],after:after[key],delta,
   trend:Math.abs(adjusted)<1e-6?'same':adjusted>0?'better':'worse',
   text:format(after[key],digits),deltaText:(delta>0?'+':'')+format(delta,digits),
   unit:key==='blockChance'?' (доля)':''};
 });
 const meaningful=rows.filter(x=>Math.abs(x.delta)>1e-6);
 const improvement=meaningful.some(x=>x.trend==='better');
 const regression=meaningful.some(x=>x.trend==='worse');
 return {slot,candidate,currentId,current,before,after,rows,meaningful,
  overall:!meaningful.length?'same':improvement&&regression?'mixed':
   improvement?'better':'worse',
  requirementsMet:level>=(candidate.requiredLevel||1)};
}
export function itemStatRows(itemId,items=ITEM_CATALOG){
 const item=items[itemId];if(!item)return [];
 return [
  ['armor','Броня'],['strength','Сила'],['stamina','Выносливость'],
  ['damageMin','Урон от'],['damageMax','Урон до'],['speed','Скорость'],
  ['block','Блок']
 ].filter(([key])=>item[key]!==undefined)
  .map(([key,label])=>({key,label,value:format(item[key],key==='speed'?2:0)}));
}
