// NexGameWorld character sheet: preserve the item-inspection language of
// the archived flat NexGame window, with only the online game's real slots.
export const CHARACTER_ARMOR_COLUMNS=Object.freeze({
 left:['head','chest','hands','wrists'],
 right:['waist','legs','feet']
});
export const CHARACTER_WEAPONS=Object.freeze(['weapon','shield']);
// The same vector shapes used for empty sockets in the archived flat UI.
const SLOT_SHAPES={
 head:'M10 29V19a14 14 0 0 1 28 0v10l-8 5v-9H18v9z M24 5v13 M18 21h12',
 chest:'M16 7l8 5 8-5 10 12-8 6-3-5v21H17V20l-3 5-8-6z M19 17h10 M19 24h10 M19 31h10',
 wrists:'M6 17l13-5 7 22-13 5z M24 13l13-5 7 22-13 5z M9 24l13-4 M27 20l13-4',
 hands:'M14 40l-3-15-4-8 5-3 6 7V9h5v12V6h5v15V9h5v14l2-11 5 2-4 21-5 5z M15 33h19',
 waist:'M5 17h13v14H5z M30 17h13v14H30z M18 14h12v20H18z M22 20h5v8h-5z',
 legs:'M12 7h24l2 34H27l-3-23-3 23H10z M12 13h24 M14 33h7 M27 33h9',
 feet:'M7 7h13v23l5 5v6H5v-8l3-5z M28 7h13v23l4 5v6H26v-8l3-5z M8 16h12 M29 16h12 M6 35h16 M27 35h15',
 weapon:'M8 40L36 8l6-2-2 7L16 37z M10 26l12 12 M7 41l4-4',
 shield:'M8 10l16-5 16 5v14c0 10-16 20-16 20S8 34 8 24z M24 10v27 M14 16h20'
};
const SLOT_HINTS={
 head:'Шлемы и головные уборы',chest:'Нагрудники и кожаные куртки',
 hands:'Боевые перчатки',wrists:'Наручи',waist:'Кожаные и металлические пояса',
 legs:'Штаны и поножи',feet:'Сапоги и защита копыт',
 weapon:'Одноручные топоры, мечи и кинжалы',shield:'Щиты для левой руки'
};
export function equipmentPropertyRows(def,pretty=String){
 if(!def)return [];
 const out=[];
 if(Number.isFinite(def.armor)&&def.armor>0)out.push('Броня: '+pretty(def.armor));
 if(Number.isFinite(def.strength)&&def.strength>0)out.push('Сила: +'+pretty(def.strength));
 if(Number.isFinite(def.stamina)&&def.stamina>0)out.push('Выносливость: +'+pretty(def.stamina));
 if(Number.isFinite(def.damageMin)&&Number.isFinite(def.damageMax))
  out.push('Урон: '+pretty(def.damageMin)+'–'+pretty(def.damageMax));
 if(Number.isFinite(def.speed)&&def.speed>0)out.push('Скорость: '+pretty(def.speed)+' с');
 if(Number.isFinite(def.block)&&def.block>0)out.push('Блок: +'+pretty(def.block));
 if((def.requiredLevel||1)>1)out.push('Требуется '+def.requiredLevel+' уровень');
 return out;
}
export function createEmptyEquipmentSilhouette(document,slot){
 // DOM namespace also works in mobile Safari and in the lightweight test DOM.
 const svg=document.createElementNS?document.createElementNS('http://www.w3.org/2000/svg','svg'):document.createElement('svg');
 svg.setAttribute('viewBox','0 0 48 48');svg.setAttribute('aria-hidden','true');
 svg.classList.add('character-empty-silhouette'); // SVG.className is read-only SVGAnimatedString in Safari.
 const path=document.createElementNS?document.createElementNS('http://www.w3.org/2000/svg','path'):document.createElement('path');
 path.setAttribute('d',SLOT_SHAPES[slot]);
 path.setAttribute('fill','currentColor');path.setAttribute('fill-opacity','0.08');
 path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','2');
 path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');
 svg.append(path);return svg;
}
export function renderCharacterSheet({
 document,body,profile,state,stats,items,labels,qualities,xpRequired,pretty,
 onUnequip,onOpenBag,preview,reuse=null,selectedSlot=null,onSelectSlot=()=>{}
}){
 const sheet=document.createElement('section');sheet.className='character-sheet';
 const hero=document.createElement('header');hero.className='character-identity';
 const name=document.createElement('strong');name.textContent=profile?.nickname||'Странник';
 const subtitle=document.createElement('span');
 subtitle.textContent='ТАУРЕН · ВОИН · УРОВЕНЬ '+state.level;
 const progress=document.createElement('small');progress.textContent='Опыт '+state.xp+' / '+xpRequired(state.level)+' · '+pretty(state.gold)+' монет';
 hero.append(name,subtitle,progress);sheet.append(hero);
 const sectionLabel=document.createElement('div');sectionLabel.className='character-section-label';
 sectionLabel.textContent='✦  СНАРЯЖЕНИЕ  ✦';sheet.append(sectionLabel);
 const stage=document.createElement('div');stage.className='character-stage';
 const detail=document.createElement('section');detail.className='character-item-detail';
 detail.setAttribute('role','status');detail.setAttribute('aria-live','polite');
 function detailEmpty(){
  detail.replaceChildren();
  const line=document.createElement('p');
  line.textContent='Выбери ячейку, чтобы посмотреть свойства вещи. Новое снаряжение надевается из рюкзака.';
  detail.append(line);
 }
 detailEmpty();
 const allButtons=[];
 const choose=(button,slot,def)=>{
  onSelectSlot(slot);
  for(const old of allButtons){
   old.classList.remove('active');old.setAttribute('aria-pressed','false');
  }
  button.classList.add('active');button.setAttribute('aria-pressed','true');
  detail.replaceChildren();
  const label=document.createElement('strong');label.className='character-detail-name';
  label.textContent=def?.name||labels[slot]+' · пусто';
  if(def)label.style.color=qualities[def.rarity]?.color||'#e1d1a9';
  detail.append(label);
  if(def){
   const quality=document.createElement('small');quality.className='character-detail-quality';
   quality.textContent=[def.quality,labels[slot]].filter(Boolean).join(' · ');
   detail.append(quality);
   for(const lineText of equipmentPropertyRows(def,pretty)){
    const line=document.createElement('small');line.className='character-detail-property';
    line.textContent=lineText;detail.append(line);
   }
   if(def.description){
    const desc=document.createElement('p');desc.className='character-detail-description';
    desc.textContent=def.description;detail.append(desc);
   }
   const remove=document.createElement('button');remove.type='button';remove.className='character-detail-remove';
   remove.textContent='Снять в рюкзак';
   remove.addEventListener('click',()=>onUnequip(slot,def));
   detail.append(remove);
  }else{
   const hint=document.createElement('p');hint.textContent=SLOT_HINTS[slot]+'. Ячейка свободна.';
   detail.append(hint);
  }
 };
 const socket=slot=>{
  const id=state.equipment[slot]?.id,def=items[id];
  const button=document.createElement('button');button.type='button';
  button.className='character-socket'+(def?' equipped':'');
  button.dataset.slot=slot;
  button.setAttribute('aria-pressed','false');
  button.style.setProperty('--item-color',qualities[def?.rarity]?.color||'#cfb979');
  button.setAttribute('aria-label',labels[slot]+': '+(def?.name||'пусто'));
  button.title=def?.name||SLOT_HINTS[slot];
  if(def){
   const icon=document.createElement('span');icon.className='character-socket-icon';
   icon.textContent=def.icon||'◆';icon.setAttribute('aria-hidden','true');button.append(icon);
  }else{
   button.append(createEmptyEquipmentSilhouette(document,slot));
  }
  const label=document.createElement('span');label.className='character-socket-label';
  label.textContent=labels[slot];button.append(label);
  const status=document.createElement('small');status.className='character-socket-status';
  status.textContent=def?.name||'Пусто';button.append(status);
  button.addEventListener('click',()=>choose(button,slot,def));
  allButtons.push(button);return button;
 };
 const left=document.createElement('div');left.className='character-slot-column left';
 for(const slot of CHARACTER_ARMOR_COLUMNS.left)left.append(socket(slot));
 const view=document.createElement('div');view.className='character-view';
 const viewport=reuse?.viewport||document.createElement('div');viewport.className='character-preview-viewport';
 viewport.setAttribute('aria-hidden','true');view.append(viewport);
 const rotate=reuse?.gesture||document.createElement('div');rotate.className='character-rotate';
 rotate.setAttribute('role','group');rotate.tabIndex=0;
 rotate.setAttribute('aria-label','Вращай модель персонажа пальцем или стрелками клавиатуры');
 const hint=document.createElement('span');hint.className='character-rotate-hint';
 hint.textContent='Проведи пальцем для поворота';
 if(!reuse?.gesture)rotate.append(hint);
 view.append(rotate);
 const right=document.createElement('div');right.className='character-slot-column right';
 for(const slot of CHARACTER_ARMOR_COLUMNS.right)right.append(socket(slot));
 stage.append(left,view,right);sheet.append(stage);
 const turns=document.createElement('div');turns.className='character-turn-controls';
 for(const [label,title,delta] of [['↶','Повернуть влево',-.38],['Спереди','Вид спереди',null],['↷','Повернуть вправо',.38]]){
  const button=document.createElement('button');button.type='button';button.textContent=label;
  button.setAttribute('aria-label',title);button.addEventListener('click',()=>preview.rotate(delta));turns.append(button);
 }
 sheet.append(turns);
 const weaponTitle=document.createElement('div');weaponTitle.className='character-section-label character-weapons-label';
 weaponTitle.textContent='ОРУЖИЕ И ЗАЩИТА';sheet.append(weaponTitle);
 const weapons=document.createElement('div');weapons.className='character-weapon-row';
 for(const slot of CHARACTER_WEAPONS)weapons.append(socket(slot));
 sheet.append(weapons,detail);
 const statsSection=document.createElement('section');statsSection.className='character-stats-summary';
 const title=document.createElement('h3');title.textContent='ОСНОВНЫЕ ХАРАКТЕРИСТИКИ';statsSection.append(title);
 const list=document.createElement('dl');
 const statRows=[
  ['Здоровье',Math.ceil(state.hp)+' / '+stats.maxHp],['Сила',pretty(stats.strength)],
  ['Выносливость',pretty(stats.stamina)],['Броня',pretty(stats.armor)],
  ['Сила атаки',pretty(stats.attackPower)],['Урон',pretty(stats.damageMin)+'–'+pretty(stats.damageMax)],
  ['Скорость атаки',pretty(stats.speed)+' с'],['Урон / сек.',pretty(stats.dps)],
  ['Блок щитом',stats.blockChance?'5% · '+pretty(stats.blockValue):'Нет щита']
 ];
 for(const [label,value] of statRows){
  const cell=document.createElement('div');const dt=document.createElement('dt'),dd=document.createElement('dd');
  dt.textContent=label;dd.textContent=value;cell.append(dt,dd);list.append(cell);
 }
 statsSection.append(list);sheet.append(statsSection);
 const bag=document.createElement('button');bag.type='button';bag.className='character-open-bag';
 bag.textContent='Открыть рюкзак';bag.addEventListener('click',onOpenBag);
 sheet.append(bag);body.append(sheet);
 preview.mount(viewport,rotate);
 if(selectedSlot){
  const button=allButtons.find(node=>node.dataset.slot===selectedSlot);
  if(button)choose(button,selectedSlot,items[state.equipment[selectedSlot]?.id]);
 }
}
