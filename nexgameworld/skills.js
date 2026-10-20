// NexGame Alpha 0.3.5 — class and ability rules independent of Three.js and the DOM.
// Additional classes are defined but intentionally LOCKED until character creation.
export const CLASS_DEFINITIONS=Object.freeze({
 warrior:Object.freeze({id:'warrior',name:'Воин',resource:'rage',resourceName:'Ярость',resourceMax:100,startingResource:0,resourceColor:'#b75b38',playable:true}),
 shaman:Object.freeze({id:'shaman',name:'Шаман',resource:'mana',resourceName:'Мана',resourceMax:100,startingResource:100,resourceColor:'#417fbf',playable:false}),
 hunter:Object.freeze({id:'hunter',name:'Охотник',resource:'mana',resourceName:'Мана',resourceMax:100,startingResource:100,resourceColor:'#417fbf',playable:false})
});
export const ABILITY_DEFINITIONS=Object.freeze({
 autoAttack:Object.freeze({id:'autoAttack',classId:'warrior',name:'Автоатака',description:'Автоматические удары оружием в ближнем бою.',kind:'toggle',level:1,hotkey:'1',cooldown:0,gcd:0,resourceCost:0,range:3.45,requiresTarget:true,requiresFacing:true}),
 thunderStomp:Object.freeze({id:'thunderStomp',classId:'warrior',name:'Громовая поступь',description:'Оглушает ближайших врагов и наносит урон по области.',kind:'area',level:1,hotkey:'2',cooldown:8,gcd:1.5,resourceCost:0,range:4.5,requiresTarget:false,requiresFacing:false}),
 healingPotion:Object.freeze({id:'healingPotion',classId:'all',name:'Лечебный настой',description:'Восстанавливает 55 здоровья. Между применениями требуется отдых.',kind:'consumable',level:1,hotkey:'3',cooldown:0,gcd:0,resourceCost:0,range:0,requiresTarget:false,requiresFacing:false}),
 charge:Object.freeze({id:'charge',classId:'warrior',name:'Рывок',
  description:'Быстро сближает с выбранным противником на расстоянии до 30 м и включает автоатаку. Первое успешное попадание после рывка даёт 20 ярости вместо обычного количества.',
  kind:'charge',level:8,cooldown:15,gcd:1.5,resourceCost:0,range:30,requiresTarget:true,requiresFacing:false}),
 heavyStrike:Object.freeze({id:'heavyStrike',classId:'warrior',name:'Рубящий удар',description:'Сильный удар оружием. Требует 20 ярости и наносит дополнительный урон.',kind:'melee',level:1,hotkey:'4',cooldown:3,gcd:1.5,resourceCost:20,damageBonus:8,range:3.45,requiresTarget:true,requiresFacing:true})
});
export const WARRIOR_RAGE_PER_HIT=12;
export const WARRIOR_RAGE_ON_HURT=5;
export const WARRIOR_RAGE_DECAY=5; // per second after exiting combat
const safeNumber=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
export function getClassDefinition(id){return CLASS_DEFINITIONS[id]||CLASS_DEFINITIONS.warrior}
export function getAbilityDefinition(id){return ABILITY_DEFINITIONS[id]||null}
export function getClassAbilities(classId,level=1){
 return Object.values(ABILITY_DEFINITIONS).filter(a=>(a.classId===classId||a.classId==='all')&&level>=a.level);
}
export function normalizeClassId(id){return CLASS_DEFINITIONS[id]?.playable?id:'warrior'}
export function normalizeResource(value,classId='warrior'){
 const klass=getClassDefinition(classId);
 const n=safeNumber(value,klass.startingResource);
 return Math.max(0,Math.min(klass.resourceMax,n));
}
export function changeResource(value,delta,classId='warrior'){
 return normalizeResource(normalizeResource(value,classId)+safeNumber(delta),classId);
}
export function createAbilityRuntime(){return {gcd:0,cooldowns:Object.create(null)}}
export function tickAbilityRuntime(runtime,dt){
 dt=Math.max(0,safeNumber(dt));
 runtime.gcd=Math.max(0,runtime.gcd-dt);
 for(const id of Object.keys(runtime.cooldowns)){
  runtime.cooldowns[id]=Math.max(0,safeNumber(runtime.cooldowns[id])-dt);
  if(runtime.cooldowns[id]<=0)delete runtime.cooldowns[id];
 }
 return runtime;
}
export function abilityCooldown(runtime,id){return Math.max(0,safeNumber(runtime.cooldowns[id]))}
export function abilityFailure(def,context={}){
 if(!def)return 'Неизвестная способность';
 const classId=context.classId||'warrior';
 if(def.classId!=='all'&&classId!==def.classId)return 'Недоступно этому классу';
 if((context.level||1)<def.level)return 'Необходим '+def.level+' уровень';
 if(context.silenced)return 'Сейчас нельзя применять способности';
 if(abilityCooldown(context.runtime||createAbilityRuntime(),def.id)>0)return 'Способность восстанавливается';
 if(def.gcd>0&&safeNumber(context.runtime?.gcd)>0)return 'Общая перезарядка';
 if(def.resourceCost>0&&normalizeResource(context.resource,classId)+1e-7<def.resourceCost)return 'Недостаточно '+(getClassDefinition(classId).resource==='rage'?'ярости':'маны');
 if(def.requiresTarget&&!context.hasTarget)return 'Нет цели';
 if(def.requiresTarget&&context.range!=null&&safeNumber(context.range,Infinity)>def.range)return 'Цель слишком далеко';
 if(def.requiresFacing&&context.facing===false)return 'Цель не перед вами';
 if(def.kind==='consumable'&&!context.hasConsumable)return 'Лечебные настои закончились';
 if(def.kind==='consumable'&&!context.needsHealing)return 'Здоровье уже полное';
 return '';
}
export function activateAbility(def,context){
 const error=abilityFailure(def,context);
 if(error)return {ok:false,error};
 const classId=context.classId||'warrior';
 const runtime=context.runtime;
 if(!runtime)return {ok:false,error:'Нет состояния способностей'};
 const resource=changeResource(context.resource,-def.resourceCost,classId);
 runtime.gcd=Math.max(runtime.gcd,def.gcd);
 if(def.cooldown>0)runtime.cooldowns[def.id]=def.cooldown;
 return {ok:true,error:'',resource};
}
