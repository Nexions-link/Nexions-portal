// NexGameWorld: tactile mobile-first choice of one server-owned quest reward.
// IDs mirror the authoritative whitelist in server/bandit-quest.js; this module
// only renders the options and submits the selected ID, never grants items.
export const CHIEF_REWARD_OPTIONS=Object.freeze([
 Object.freeze({id:'trailbreakerAxe',image:'./reward-art/trailbreaker-axe.svg',kind:'Оружие',bonus:'Сила +1'}),
 Object.freeze({id:'trailwardenShield',image:'./reward-art/trailwarden-shield.svg',kind:'Щит',bonus:'Выносливость +1'})
]);
export function renderChiefRewardChoice({document,body,items,selectedId=null,pending=false,onSelect,onSubmit}){
 const section=document.createElement('section');
 section.className='ngw-quest-rewards';
 section.setAttribute('aria-label','Награда за задание «Главарь Пыльной тропы»');
 const description=document.createElement('p');
 description.className='ngw-quest-reward-intro';
 description.textContent='Главарь повержен! Следопыт предлагает забрать одну из трофейных вещей.';
 const heading=document.createElement('div');
 heading.className='ngw-quest-reward-heading';
 const title=document.createElement('strong');title.textContent='Выберите одну награду';
 const count=document.createElement('span');count.textContent='1 из 2';
 heading.append(title,count);
 const grid=document.createElement('div');
 grid.className='ngw-quest-reward-grid';
 grid.setAttribute('role','radiogroup');
 grid.setAttribute('aria-label','Выбор предмета');
 const controls=[];
 for(const option of CHIEF_REWARD_OPTIONS){
  const item=items[option.id];
  if(!item)throw Error('Unknown chief reward item: '+option.id);
  const card=document.createElement('button');
  card.type='button';card.className='ngw-quest-reward-card';
  card.dataset.rewardId=option.id;
  card.setAttribute('role','radio');
  const visual=document.createElement('span');visual.className='ngw-reward-art';
  const picture=document.createElement('img');picture.src=option.image;
  picture.alt=item.name;picture.loading='eager';picture.decoding='async';
  visual.append(picture);
  const check=document.createElement('span');
  check.className='ngw-reward-check';check.textContent='✓';
  check.setAttribute('aria-hidden','true');
  const quality=document.createElement('span');
  quality.className='ngw-reward-quality';quality.textContent='НЕОБЫЧНЫЙ · УР. '+item.requiredLevel;
  const name=document.createElement('strong');name.className='ngw-reward-name';name.textContent=item.name;
  const type=document.createElement('span');type.className='ngw-reward-type';type.textContent=option.kind;
  const stats=document.createElement('span');stats.className='ngw-reward-stats';
  stats.textContent=option.id==='trailbreakerAxe'?
   'Урон '+item.damageMin+'–'+item.damageMax+' · скорость '+item.speed:
   'Броня '+item.armor+' · блок '+item.block;
  const bonus=document.createElement('span');bonus.className='ngw-reward-bonus';
  bonus.textContent=option.bonus;
  card.append(visual,check,quality,name,type,stats,bonus);
  card.addEventListener('click',()=>{
   if(pending)return;
   selectedId=option.id;onSelect(option.id);refresh();
  });
  controls.push({option,card});grid.append(card);
 }
 const footer=document.createElement('div');footer.className='ngw-quest-reward-footer';
 const fixed=document.createElement('div');fixed.className='ngw-quest-reward-fixed';
 fixed.textContent='+180 опыта  ·  +35 монет';
 const submit=document.createElement('button');submit.type='button';
 submit.className='ngw-quest-reward-submit';
 submit.addEventListener('click',()=>{
  if(pending||!selectedId)return;
  if(onSubmit(selectedId)!==false){pending=true;refresh();}
 });
 const help=document.createElement('span');help.className='ngw-quest-reward-help';
 help.setAttribute('aria-live','polite');
 footer.append(fixed,submit,help);
 section.append(description,heading,grid,footer);
 body.append(section);
 function refresh(){
  controls.forEach(({option,card})=>{
   const active=option.id===selectedId;
   card.classList.toggle('is-selected',active);
   card.setAttribute('aria-checked',String(active));
   card.disabled=pending;
  });
  submit.disabled=pending||!selectedId;
  submit.textContent=pending?'Выдаём награду…':'Завершить задание';
  help.textContent=pending?'Сохраняем награду на сервере…':
   selectedId?'Выбранный предмет будет добавлен в рюкзак.':'Нажмите на один из предметов.';
 }
 refresh();
 return section;
}
