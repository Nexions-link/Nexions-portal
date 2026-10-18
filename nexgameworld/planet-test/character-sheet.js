// Vertical character sheet, backed by the SAME inventory and equipment
// objects used by the authoritative game. No cosmetic placeholder slots.
export const CHARACTER_ARMOR_COLUMNS=Object.freeze({
 left:['head','chest','hands','wrists'],
 right:['waist','legs','feet']
});
export const CHARACTER_WEAPONS=Object.freeze(['weapon','shield']);
const EMPTY_ICONS={head:'♜',chest:'◇',hands:'✥',wrists:'▣',
 waist:'⊟',legs:'▥',feet:'⌑',weapon:'⚔',shield:'◈'};
export function renderCharacterSheet({
 document,body,profile,state,stats,items,labels,qualities,xpRequired,pretty,
 onUnequip,preview
}){
 const shell=document.createElement('section');shell.className='character-sheet';
 const identity=document.createElement('header');identity.className='character-identity';
 const name=document.createElement('strong');name.textContent=profile?.nickname||'Странник';
 const subtitle=document.createElement('span');
 subtitle.textContent='Таурен · Воин · '+state.level+' ур. · '+state.xp+'/'+xpRequired(state.level)+' опыта';
 identity.append(name,subtitle);shell.append(identity);
 const stage=document.createElement('div');stage.className='character-stage';
 const viewport=document.createElement('div');viewport.className='character-preview-viewport';
 viewport.setAttribute('aria-hidden','true');stage.append(viewport);
 const socket=slot=>{
  const id=state.equipment[slot]?.id,def=items[id];
  const button=document.createElement('button');button.type='button';
  button.className='character-socket'+(def?' equipped':'');button.dataset.slot=slot;
  button.style.setProperty('--item-color',qualities[def?.rarity]?.color||'#c3b596');
  button.setAttribute('aria-label',labels[slot]+': '+(def?.name||'пусто')+(def?'. Снять снаряжение':''));
  button.title=def?'Снять: '+def.name:labels[slot]+' — пусто';
  const icon=document.createElement('span');icon.className='character-socket-icon';
  icon.textContent=def?.icon||EMPTY_ICONS[slot];
  const caption=document.createElement('small');caption.className='character-socket-label';
  caption.textContent=labels[slot];button.append(icon,caption);
  button.addEventListener('click',()=>onUnequip(slot,def));
  return button;
 };
 const left=document.createElement('div');left.className='character-slot-column left';
 for(const slot of CHARACTER_ARMOR_COLUMNS.left)left.append(socket(slot));
 const rotate=document.createElement('div');rotate.className='character-rotate';
 rotate.tabIndex=0;rotate.setAttribute('role','group');
 rotate.setAttribute('aria-label','Вращение модели персонажа: проведи пальцем или используй стрелки');
 const hint=document.createElement('span');hint.className='character-rotate-hint';
 hint.textContent='↺  Поверни для осмотра  ↻';rotate.append(hint);
 const right=document.createElement('div');right.className='character-slot-column right';
 for(const slot of CHARACTER_ARMOR_COLUMNS.right)right.append(socket(slot));
 stage.append(left,rotate,right);shell.append(stage);
 const weapons=document.createElement('div');weapons.className='character-weapon-row';
 for(const slot of CHARACTER_WEAPONS)weapons.append(socket(slot));shell.append(weapons);
 const summary=document.createElement('section');summary.className='character-stats-summary';
 const title=document.createElement('h3');title.textContent='Основные характеристики';summary.append(title);
 const list=document.createElement('dl');
 for(const [label,value] of [
  ['Здоровье',Math.ceil(state.hp)+' / '+stats.maxHp],
  ['Урон',pretty(stats.damageMin)+'–'+pretty(stats.damageMax)],
  ['Броня',pretty(stats.armor)],
  ['Сила',pretty(stats.strength)],
  ['Выносливость',pretty(stats.stamina)],
  ['Скорость атаки',pretty(stats.speed)+' с']]){
  const cell=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
  dt.textContent=label;dd.textContent=value;cell.append(dt,dd);list.append(cell);
 }
 summary.append(list);
 const note=document.createElement('p');note.className='character-summary-note';
 note.textContent='Монеты: '+pretty(state.gold)+' · Снять вещь — нажать на занятую ячейку';
 summary.append(note);shell.append(summary);body.append(shell);
 preview.mount(viewport,rotate);
}
