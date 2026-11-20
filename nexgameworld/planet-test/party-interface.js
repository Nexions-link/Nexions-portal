// Original Classic-style party frames. Membership and actions stay server owned.
const CLASSES={warrior:{name:'Воин',color:'#c79c6e',resource:'Ярость',resourceColor:'#bd3330'},
 hunter:{name:'Охотник',color:'#aad372',resource:'Мана',resourceColor:'#427cdb'}};
const UNKNOWN={name:'Класс неизвестен',color:'#b5ad98',resource:'Ресурс',resourceColor:'#69727a'};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=value=>typeof value==='number'&&Number.isFinite(value);
export const partyClassInfo=id=>CLASSES[id]||UNKNOWN;

export function partyView({party={},players=[],self={},selfId=null,selectedId=null,connected=false}={}){
 const peers=new Map(players.filter(row=>row&&typeof row.id==='string').map(row=>[row.id,row]));
 const members=(Array.isArray(party.members)?party.members:[]).slice(0,5);
 const ids=new Set(members.map(row=>row.id));
 const own=id=>id===selfId;
 const row=(member,isMember)=>{
  const nearby=peers.get(member.id),data=own(member.id)?{...member,...self}:{...member,...nearby};
  const online=connected&&member.online!==false;
  const known=online&&finite(data.hp)&&finite(data.maxHp)&&data.maxHp>0;
  const hp=known?clamp(data.hp,0,data.maxHp):null;
  const resource=online&&finite(data.resource)?clamp(data.resource,0,100):null;
  const info=partyClassInfo(data.classId);
  return {id:member.id,name:String(data.name||member.name||'Странник').slice(0,24),
   level:Number.isInteger(data.level)&&data.level>0?data.level:1,classId:data.classId,
   raceId:data.raceId,className:info.name,color:info.color,resourceName:info.resource,
   resourceColor:info.resourceColor,resource,hp,maxHp:known?data.maxHp:null,
   healthPercent:known?hp/data.maxHp*100:0,online,nearby:online&&(own(member.id)||!!nearby),
   dead:known&&hp<=0,self:own(member.id),member:isMember,leader:member.id===party.leaderId,
   selected:member.id===selectedId};
 };
 const roster=members.map(member=>row(member,true));
 return {connected,groupId:party.groupId||null,leaderId:party.leaderId||null,selfId,
  leader:connected&&!!selfId&&party.leaderId===selfId,members:roster,
  others:roster.filter(member=>!member.self),
  nearby:[...peers.values()].filter(peer=>!ids.has(peer.id)&&peer.id!==selfId).map(peer=>row(peer,false))};
}

export function partyActions(view,member,transport={}){
 const live=view.connected&&transport.connected===true;
 return {select:live&&!member.self&&member.online&&member.nearby,
  invite:live&&!member.member&&member.nearby&&member.online&&view.members.length<5&&
   (!view.groupId||view.leader)&&typeof transport.invite==='function',
  promote:live&&view.leader&&member.member&&!member.self&&member.online&&typeof transport.promoteParty==='function',
  kick:live&&view.leader&&member.member&&!member.self&&typeof transport.kickParty==='function',
  leave:live&&!!view.groupId&&member.self&&typeof transport.leaveParty==='function'};
}

function element(doc,tag,className,text){
 const node=doc.createElement(tag);if(className)node.className=className;
 if(text!==undefined)node.textContent=text;return node;
}
function button(doc,className,text,action){
 const node=element(doc,'button',className,text);node.type='button';
 node.addEventListener('click',action);return node;
}
function portrait(doc,raceId){
 const host=element(doc,'span','wow-party-portrait');host.setAttribute('aria-hidden','true');
 if(!['orc','hornfolk'].includes(raceId)){host.textContent='?';return host;}
 const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 64 64');svg.setAttribute('focusable','false');
 const path=(d,fill)=>{const p=doc.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);p.setAttribute('fill',fill);svg.append(p);};
 if(raceId==='orc'){
  path('M15 18 8 12 10 30 16 37 20 52 44 52 49 37 54 30 56 12 48 18 44 10 21 10Z','#477233');
  path('M19 18 28 12 42 16 47 35 42 47 24 47 16 35Z','#719647');
  path('M17 25 29 28 28 31 18 29M36 28 47 25 46 29 37 31M24 39 40 39 39 43 25 43Z','#23311d');
  path('M20 35 27 42 21 42ZM44 35 43 42 37 42Z','#ece0b2');
 }else{
  path('M18 22Q1 25 3 5 10 18 20 14M46 22Q63 25 61 5 54 18 44 14','#d6c79b');
  path('M14 29 20 13 31 9 47 16 51 35 43 52 23 52Z','#765035');
  path('M18 33 23 19 41 19 48 35 42 49 24 49Z','#a77b50');
  path('M20 29 30 32 27 36 20 34M44 29 34 32 37 36 44 34','#30271e');
  path('M21 40Q32 34 45 40L45 49Q32 57 20 49Z','#c4a278');
  path('M26 44h3v3h-3ZM36 44h3v3h-3Z','#443124');
 }
 host.append(svg);return host;
}

export function createPartyInterface({document:doc=globalThis.document,getTransport,getSelf,
 getParty,getPlayers,getSelected,onSelect,onOpenRoster,onTrade=null,onNotice=()=>{},now=Date.now}={}){
 const hud=doc.getElementById('ngwPartyFrames'),menu=doc.getElementById('ngwPartyMenu'),
  prompt=doc.getElementById('ngwPartyPrompt');
 let view=partyView(),rosterHost=null,rosterParts=null,invite=null,confirmation=null,
  menuTarget=null,returnFocus=null,lastPromptSecond=-1,collapsed=(globalThis.innerHeight||800)<520;
 const hudCards=new Map(),rosterCards=new Map(),nearbyCards=new Map();
 const stack=element(doc,'div','wow-party-stack');
 const heading=button(doc,'wow-party-heading','Группа',()=>onOpenRoster?.());
 const collapse=button(doc,'wow-party-collapse','−',()=>{collapsed=!collapsed;paintHud();});
 collapse.setAttribute('aria-label','Свернуть или развернуть рамки группы');
 const top=element(doc,'div','wow-party-top');top.append(heading,collapse);hud.replaceChildren(top,stack);
 hud.hidden=true;menu.hidden=true;prompt.hidden=true;
 hud.setAttribute('aria-label','Участники группы');
 menu.setAttribute('role','menu');prompt.setAttribute('role','alertdialog');
 prompt.setAttribute('aria-modal','true');prompt.setAttribute('aria-label','Действие группы');
 let promptButtons=[];
 const current=()=>getTransport?.()||{};
 const find=id=>[...view.members,...view.nearby].find(row=>row.id===id);
 function hideMenu(){menu.hidden=true;menuTarget=null;returnFocus?.focus?.();returnFocus=null;}
 function hidePrompt(){prompt.hidden=true;invite=null;confirmation=null;promptButtons=[];lastPromptSecond=-1;}
 function dispatch(kind,id){
  update();const member=find(id),transport=current();
  if(kind==='trade'){
   if(member&&view.connected&&member.online&&member.nearby&&!member.self&&typeof onTrade==='function')onTrade(id);
   return;
  }
  if(!member||!partyActions(view,member,transport)[kind])return onNotice('Действие больше недоступно');
  const sent=kind==='select'?(onSelect?.(id),true):kind==='invite'?transport.invite(id):
   kind==='promote'?transport.promoteParty(id):kind==='kick'?transport.kickParty(id):transport.leaveParty();
  if(sent===false)onNotice('Не удалось отправить действие. Проверьте подключение.');
 }
 function confirm(kind,id){
  const member=find(id);if(!member)return;
  hideMenu();hidePrompt();confirmation={kind,id};
  const text=kind==='promote'?'Передать лидерство игроку «'+member.name+'»?':
   kind==='kick'?'Исключить игрока «'+member.name+'» из группы?':'Покинуть группу?';
  showPrompt(kind==='promote'?'Передача лидерства':kind==='kick'?'Исключение из группы':'Выход из группы',text,
   kind==='promote'?'Назначить':kind==='kick'?'Исключить':'Покинуть',()=>{
    const pending=confirmation;hidePrompt();if(pending)dispatch(pending.kind,pending.id);
   },'Отмена',hidePrompt);
 }
 function openMenu(id,anchor){
  const member=find(id);if(!member)return;
  hideMenu();menuTarget=id;returnFocus=anchor;
  menu.replaceChildren();
  const title=element(doc,'strong','wow-party-menu-title',member.name);menu.append(title);
  menu.append(element(doc,'small','wow-party-menu-subtitle','Уровень '+member.level+' · '+member.className));
  const actions=partyActions(view,member,current());let count=0;
  for(const [kind,label] of [['select','Выбрать игрока'],['invite','Пригласить в группу'],
   ['promote','Назначить лидером'],['kick','Исключить из группы'],['leave','Покинуть группу']]){
   if(!actions[kind])continue;count++;
   const action=button(doc,'wow-party-menu-action'+(kind==='kick'||kind==='leave'?' is-danger':''),label,()=>{
    if(['promote','kick','leave'].includes(kind))confirm(kind,id);
    else{hideMenu();dispatch(kind,id);}
   });action.setAttribute('role','menuitem');menu.append(action);
  }
  if(typeof onTrade==='function'&&view.connected&&member.online&&member.nearby&&!member.self){
   const trade=button(doc,'wow-party-menu-action','Обмен',()=>{hideMenu();dispatch('trade',id);});
   trade.setAttribute('role','menuitem');menu.append(trade);count++;
  }
  if(!count)menu.append(element(doc,'p','wow-party-menu-empty',member.online?'Действия недоступны':'Игрок не в сети'));
  menu.append(button(doc,'wow-party-menu-action wow-party-menu-close','Закрыть',hideMenu));
  menu.hidden=false;
  const box=anchor?.getBoundingClientRect?.()||{right:20,top:140};
  const width=globalThis.visualViewport?.width||globalThis.innerWidth||doc.documentElement.clientWidth||390;
  const height=globalThis.visualViewport?.height||globalThis.innerHeight||doc.documentElement.clientHeight||844;
  menu.style.left=clamp(box.right+6,8,Math.max(8,width-236))+'px';
  menu.style.top=clamp(box.top,8,Math.max(8,height-(menu.getBoundingClientRect?.().height||260)-8))+'px';
  menu.querySelector('button')?.focus?.();
 }
 function createCard(id,compact){
  const root=element(doc,'div',compact?'wow-party-unit':'wow-party-row');root.dataset.memberId=id;
  const select=button(doc,'wow-party-select','',()=>dispatch('select',id));
  const portraitSlot=element(doc,'span','wow-party-portrait-slot');
  const level=element(doc,'span','wow-party-level');portraitSlot.append(level);
  const data=element(doc,'span','wow-party-data'),name=element(doc,'strong','wow-party-name');
  const crown=element(doc,'span','wow-party-crown','♛');crown.setAttribute('aria-label','Лидер группы');
  const nameRow=element(doc,'span','wow-party-name-row');nameRow.append(name,crown);
  const health=element(doc,'span','wow-party-health'),fill=element(doc,'i','wow-party-health-fill'),
   healthText=element(doc,'span','wow-party-health-text');health.append(fill,healthText);
  health.setAttribute('role','progressbar');health.setAttribute('aria-valuemin','0');
  const resource=element(doc,'span','wow-party-resource'),resourceFill=element(doc,'i','wow-party-resource-fill');
  resource.append(resourceFill);const status=element(doc,'small','wow-party-status');
  data.append(nameRow,health,resource,status);select.append(portraitSlot,data);
  const more=button(doc,'wow-party-more','⋮',()=>openMenu(id,more));
  more.setAttribute('aria-haspopup','menu');root.append(select,more);
  select.addEventListener('contextmenu',event=>{event.preventDefault();openMenu(id,more);});
  const card={root,select,portraitSlot,level,data,name,crown,health,fill,healthText,resource,resourceFill,status,more,race:null};
  return card;
 }
 function paintCard(card,member){
  card.root.style.setProperty('--party-class',member.color);
  for(const [name,active] of [['is-selected',member.selected],['is-offline',!member.online],
   ['is-distant',member.online&&!member.nearby],['is-dead',member.dead]])card.root.classList.toggle(name,active);
  if(card.race!==member.raceId||!card.portrait){
   card.race=member.raceId;card.portrait=portrait(doc,member.raceId);
   card.portraitSlot.replaceChildren(card.portrait,card.level);
  }
  card.level.textContent=String(member.level);card.name.textContent=member.name+(member.self?' (вы)':'');
  card.crown.hidden=!member.leader;
  card.fill.style.width=member.healthPercent+'%';
  card.health.classList.toggle('is-unknown',member.hp===null);
  card.healthText.textContent=!member.online?'Не в сети':member.dead?'Мёртв':
   member.hp===null?'Здоровье —':Math.ceil(member.hp)+' / '+member.maxHp;
  card.health.setAttribute('aria-label',card.healthText.textContent);
  card.health.setAttribute('aria-valuemax',String(member.maxHp||100));
  card.health.setAttribute('aria-valuenow',String(member.hp??0));
  card.health.setAttribute('aria-valuetext',card.healthText.textContent);
  card.resource.classList.toggle('is-unknown',member.resource===null);
  card.resourceFill.style.width=(member.resource??0)+'%';card.resourceFill.style.background=member.resourceColor;
  card.resource.setAttribute('aria-label',member.resourceName+(member.resource===null?' —':' '+Math.floor(member.resource)+' / 100'));
  card.status.textContent=!member.online?'Переподключается':!member.nearby?'Вне видимости':member.className;
  card.select.disabled=!partyActions(view,member,current()).select;
  card.select.setAttribute('aria-pressed',String(member.selected));
  card.select.setAttribute('aria-label',member.name+', уровень '+member.level+', '+card.healthText.textContent);
  card.more.setAttribute('aria-label','Действия: '+member.name);
 }
 function syncCards(host,cache,rows,compact){
  const ids=new Set(rows.map(row=>row.id));let changed=false;
  for(const [id] of cache)if(!ids.has(id)){cache.delete(id);changed=true;}
  for(const row of rows){let card=cache.get(row.id);if(!card){card=createCard(row.id,compact);cache.set(row.id,card);changed=true;}paintCard(card,row);}
  if(changed)host.replaceChildren(...rows.map(row=>cache.get(row.id).root));
 }
 function paintHud(){
  hud.hidden=!view.connected||!view.groupId||!view.others.length;
  heading.textContent='Группа '+view.members.length+' / 5';
  collapse.textContent=collapsed?'+':'−';collapse.setAttribute('aria-expanded',String(!collapsed));
  stack.hidden=collapsed;syncCards(stack,hudCards,view.others,true);
 }
 function paintRoster(){
  if(!rosterHost||!rosterParts)return;
  const p=rosterParts;p.title.textContent=view.groupId?'Участники группы · '+view.members.length+' / 5':'Соберите группу';
  p.note.textContent=!view.connected?'Группы доступны при подключении к общему миру.':
   view.groupId?(view.leader?'Вы лидер группы. Действия участника — в меню ⋮.':
    'Выберите союзника или откройте его меню ⋮.'):'Пригласите игроков поблизости. До пяти участников.';
  syncCards(p.members,rosterCards,view.members,false);
  syncCards(p.nearby,nearbyCards,view.nearby,false);
  p.nearbyTitle.hidden=!view.connected;p.empty.hidden=!view.connected||view.nearby.length>0;
  p.empty.textContent='Других игроков поблизости нет.';
  p.leave.hidden=!view.groupId||!view.connected;
 }
 function renderRoster(host){
  if(!host)return;
  if(host!==rosterHost){
   rosterHost=host;rosterCards.clear();nearbyCards.clear();
   const title=element(doc,'h3','wow-party-roster-title'),note=element(doc,'p','wow-party-roster-note'),
    members=element(doc,'div','wow-party-roster-members'),nearbyTitle=element(doc,'h4','wow-party-nearby-title','Игроки поблизости'),
    nearby=element(doc,'div','wow-party-nearby'),empty=element(doc,'p','wow-party-roster-note'),
    leave=button(doc,'wow-party-button is-danger','Покинуть группу',()=>confirm('leave',view.selfId));
   host.replaceChildren(title,note,members,nearbyTitle,nearby,empty,leave);
   rosterParts={title,note,members,nearbyTitle,nearby,empty,leave};
  }
  update();
 }
 function update(){
  const old=view,transport=current();view=partyView({party:getParty?.(),players:getPlayers?.(),
   self:getSelf?.(),selfId:transport.selfId,selectedId:getSelected?.(),connected:transport.connected===true});
  if(!view.connected){hideMenu();hidePrompt();}
  else if(view.groupId&&invite)hidePrompt();
  if(menuTarget&&!find(menuTarget))hideMenu();
  if(confirmation){const member=find(confirmation.id);if(!member||!partyActions(view,member,transport)[confirmation.kind])hidePrompt();}
  if(menuTarget&&(old.leaderId!==view.leaderId||old.groupId!==view.groupId))hideMenu();
  paintHud();paintRoster();return view;
 }
 function showPrompt(title,text,acceptLabel,accept,declineLabel,decline){
  const panel=element(doc,'section','wow-party-dialog'),heading=element(doc,'h3','wow-party-dialog-title',title),
   message=element(doc,'p','wow-party-dialog-message',text),timer=element(doc,'small','wow-party-dialog-timer'),
   actions=element(doc,'div','wow-party-dialog-actions');
  const yes=button(doc,'wow-party-button',acceptLabel,accept),no=button(doc,'wow-party-button',declineLabel,decline);
  actions.append(yes,no);panel.append(heading,message,timer,actions);prompt.replaceChildren(panel);
  promptButtons=[yes,no];prompt.hidden=false;yes.focus?.();tick();
 }
 function respond(accepted){
  const pending=invite;hidePrompt();if(pending&&view.connected&&current().connected===true&&now()<pending.expiresAt)
   current().respondInvite?.(pending.fromId,accepted);
 }
 function receiveInvite(event){
  update();if(!view.connected||view.groupId||typeof event?.fromId!=='string'||event.fromId===view.selfId)return false;
  hideMenu();hidePrompt();invite={fromId:event.fromId,expiresAt:now()+clamp(Number(event.expiresIn)||60,1,60)*1000};
  showPrompt('Приглашение в группу',String(event.fromName||'Игрок').slice(0,24)+' приглашает вас в группу.',
   'Принять',()=>respond(true),'Отклонить',()=>respond(false));return true;
 }
 function tick(){
  if(!invite||prompt.hidden)return;
  const remaining=Math.max(0,Math.ceil((invite.expiresAt-now())/1000));
  if(!remaining){hidePrompt();return;}
  if(remaining!==lastPromptSecond){lastPromptSecond=remaining;
   const timer=prompt.querySelector('.wow-party-dialog-timer');if(timer)timer.textContent='Приглашение истечёт через '+remaining+' с';}
 }
 const outside=event=>{if(!menu.hidden&&!menu.contains?.(event.target)&&event.target!==returnFocus)hideMenu();};
 const keyboard=event=>{
  if(event.key==='Escape'&&(!prompt.hidden||!menu.hidden)){
   event.preventDefault();event.stopPropagation?.();if(!prompt.hidden){if(invite)respond(false);else hidePrompt();}else hideMenu();
  }else if(event.key==='Tab'&&!prompt.hidden&&promptButtons.length){
   event.preventDefault();event.stopPropagation?.();
   const active=doc.activeElement,index=promptButtons.indexOf(active);
   promptButtons[(index+(event.shiftKey?-1:1)+promptButtons.length)%promptButtons.length].focus?.();
  }else if(!menu.hidden&&event.key==='Tab'){
   event.stopPropagation?.();hideMenu();
  }else if(!menu.hidden&&['ArrowUp','ArrowDown','Home','End'].includes(event.key)){
   event.preventDefault();event.stopPropagation?.();
   const items=Array.from(menu.querySelectorAll?.('button')||[]).filter(item=>!item.disabled);
   if(!items.length)return;
   const at=Math.max(0,items.indexOf(doc.activeElement));
   const next=event.key==='Home'?0:event.key==='End'?items.length-1:
    (at+(event.key==='ArrowUp'?-1:1)+items.length)%items.length;
   items[next].focus?.();
  }
 };
 doc.addEventListener?.('pointerdown',outside);doc.addEventListener?.('keydown',keyboard,true);
 return {update,renderRoster,receiveInvite,tick,openMenu,closeMenu:hideMenu,
  reset(){hideMenu();hidePrompt();hud.hidden=true;},
  close(){hideMenu();hidePrompt();hud.hidden=true;doc.removeEventListener?.('pointerdown',outside);doc.removeEventListener?.('keydown',keyboard,true);}};
}
