// Original item panels with WoW-style hover/focus and Shift comparison.
// Behaviour reference: Blizzard's game manual (inventory) and Starter Guide:
// https://worldofwarcraft.blizzard.com/en-us/news/20165398
import {ITEM_CATALOG} from '../items.js?v=64604';
import {getAbilityDefinition} from '../skills.js?v=64604';
import {compareEquipment,itemStatRows,formatBagEquipmentChanges} from './equipment-comparison.js?v=64604';
const SLOT={weapon:'Оружие',shield:'Щит',chest:'Грудь',legs:'Ноги',feet:'Ступни',hands:'Кисти рук',waist:'Пояс',wrists:'Запястья'};
const WEAPON={bow:'Лук',axe:'Топор',sword:'Меч',dagger:'Кинжал'};
const COLORS={poor:'#9d9d9d',common:'#f5f0df',uncommon:'#1eff00',rare:'#71aaff',epic:'#c58aff'};
const number=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:2});
function definitionFor(id,items){
 if(items[id])return items[id];
 if(id==='healingPotion')return {...getAbilityDefinition(id),rarity:'common',useItem:true};
 if(id==='coins')return {name:'Монеты',rarity:'common',description:'После получения зачисляются в кошелёк персонажа.'};
 return null;
}
export function itemTooltipData(id,{items=ITEM_CATALOG,level=1,equipment={}}={}){
 const def=definitionFor(id,items);if(!def)return null;
 const comparison=def.slot?compareEquipment(id,level,equipment,items):null;
 const stats=itemStatRows(id,items).map(row=>({label:row.label,value:row.value}));
 if(def.slot==='weapon'&&Number.isFinite(def.damageMin)&&Number.isFinite(def.damageMax))
  stats.unshift({label:'Урон',value:number(def.damageMin)+'–'+number(def.damageMax)},
   {label:'Скорость',value:number(def.speed)+' с'});
 return {id,name:def.name,rarity:def.rarity||'common',description:def.description||'',
  type:def.weaponKind?(def.twoHanded?'Двуручное':'Одноручное')+' · '+(WEAPON[def.weaponKind]||'Оружие'):
   SLOT[def.slot]||(def.quest?'Предмет для задания':def.useItem?'Расходуемый предмет':''),
  stats,price:Number.isFinite(def.sell)&&def.sell>0?def.sell:null,
  requirement:comparison?.requirementMessage||'',
  action:def.slot?'Надеть':def.useItem?'Использовать':null,
  currentId:comparison?.currentId||null,changes:formatBagEquipmentChanges(comparison)};
}
const clamp=(value,min,max)=>Math.min(Math.max(min,max),Math.max(min,value));
export function tooltipPosition(anchor,size,viewport){
 const pad=8,gap=12,width=Math.min(size.width,Math.max(0,viewport.width-pad*2));
 const right=(anchor.right??anchor.left+anchor.width)+gap;
 const left=anchor.left-size.width-gap;
 const x=right+width<=viewport.width-pad?right:left>=pad?left:
  clamp(anchor.left,pad,viewport.width-width-pad);
 return {x,y:clamp(anchor.top,pad,viewport.height-size.height-pad)};
}
function element(doc,tag,className,text){
 const node=doc.createElement(tag);node.className=className;
 if(text!==undefined)node.textContent=text;return node;
}
export function createItemTooltip({document:doc=globalThis.document,items=ITEM_CATALOG,
 getLevel=()=>1,getEquipment=()=>({}),qualities={}}={}){
 const layer=element(doc,'div','wow-item-tooltip-layer');layer.id='ngwItemTooltip';
 layer.hidden=true;layer.setAttribute('role','tooltip');
 doc.body?.append(layer);
 let active=null,shift=false,snapshot='';
 const view=doc.defaultView||globalThis.window;
 const color=rarity=>qualities[rarity]?.color||COLORS[rarity]||COLORS.common;
 function hide(){
  active?.source.removeAttribute?.('aria-describedby');active=null;snapshot='';layer.hidden=true;
 }
 function card(data,{equipped=false,compare=false}={}){
  const panel=element(doc,'article','wow-item-tooltip-card');
  if(equipped)panel.append(element(doc,'small','wow-tooltip-equipped','Сейчас надето'));
  const name=element(doc,'strong','wow-tooltip-name',data.name);name.style.color=color(data.rarity);panel.append(name);
  if(data.type)panel.append(element(doc,'span','wow-tooltip-type',data.type));
  for(const stat of data.stats){
   const row=element(doc,'div','wow-tooltip-stat');
   row.append(element(doc,'span','',stat.label),element(doc,'span','',stat.value));panel.append(row);
  }
  if(data.requirement)panel.append(element(doc,'p','wow-tooltip-requirement',data.requirement));
  if(compare&&data.changes.length){
   const changes=element(doc,'div','wow-tooltip-changes');
   for(const change of data.changes)changes.append(element(doc,'span','wow-tooltip-change '+change.trend,change.text));
   panel.append(changes);
  }
  if(data.description)panel.append(element(doc,'p','wow-tooltip-description',data.description));
  if(data.price!==null)panel.append(element(doc,'span','wow-tooltip-price','Цена продажи: '+number(data.price)+' мон.'));
  if(!equipped&&data.action)panel.append(element(doc,'small','wow-tooltip-hint','ПКМ — '+data.action.toLowerCase()));
  if(!equipped&&data.currentId&&!compare)panel.append(element(doc,'small','wow-tooltip-hint','Удерживайте Shift для сравнения'));
  return panel;
 }
 function render(){
  if(!active)return;
  const options={items,level:getLevel(),equipment:getEquipment()},data=itemTooltipData(active.id,options);
  if(!data){hide();return;}
  const current=shift&&data.currentId?itemTooltipData(data.currentId,options):null;
  layer.replaceChildren(card(data,{compare:!!current}));
  if(current)layer.append(card(current,{equipped:true}));
  layer.classList.toggle('has-compare',!!current);layer.hidden=false;
  active.source.setAttribute('aria-describedby',layer.id);
  const rect=active.source.getBoundingClientRect(),size=layer.getBoundingClientRect();
  const at=tooltipPosition(rect,size,{width:doc.documentElement?.clientWidth||844,
   height:doc.documentElement?.clientHeight||390});
  layer.style.left=at.x+'px';layer.style.top=at.y+'px';
  snapshot=JSON.stringify([options.level,options.equipment,active.id,shift]);
 }
 function refresh(){
  if(!active)return;
  if(active.source.isConnected===false){hide();return;}
  const next=JSON.stringify([getLevel(),getEquipment(),active.id,shift]);
  if(next!==snapshot)render();
 }
 function bind(source,id){
  let focused=false,hovered=false,touchFocus=false;
  const show=event=>{
   if(event?.shiftKey!==undefined)shift=!!event.shiftKey;
   if(active?.source!==source)active?.source.removeAttribute?.('aria-describedby');
   active={source,id};render();
  };
  source.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;hovered=true;show(event);});
  source.addEventListener('pointerleave',()=>{hovered=false;if(!focused&&active?.source===source)hide();});
  source.addEventListener('pointerdown',event=>{touchFocus=event.pointerType==='touch';if(touchFocus)hide();});
  source.addEventListener('focus',()=>{focused=true;if(!touchFocus)show();});
  source.addEventListener('blur',()=>{focused=false;touchFocus=false;if(!hovered&&active?.source===source)hide();});
  return source;
 }
 const onKeyDown=event=>{
  if(event.key==='Escape'){hide();return;}
  if(event.key==='Shift'&&!shift){shift=true;if(active)render();}
 };
 const onKeyUp=event=>{if(event.key==='Shift'){shift=false;if(active)render();}};
 const onPointer=event=>{if(active&&event.target!==active.source&&!active.source.contains?.(event.target))hide();};
 doc.addEventListener('keydown',onKeyDown);doc.addEventListener('keyup',onKeyUp);
 doc.addEventListener('pointerdown',onPointer,true);doc.addEventListener('scroll',hide,true);
 view?.addEventListener?.('resize',hide);view?.addEventListener?.('blur',hide);
 return {bind,hide,refresh,element:layer,dispose(){hide();layer.remove?.();
  doc.removeEventListener?.('keydown',onKeyDown);doc.removeEventListener?.('keyup',onKeyUp);
  doc.removeEventListener?.('pointerdown',onPointer,true);doc.removeEventListener?.('scroll',hide,true);
  view?.removeEventListener?.('resize',hide);view?.removeEventListener?.('blur',hide);
 }};
}
