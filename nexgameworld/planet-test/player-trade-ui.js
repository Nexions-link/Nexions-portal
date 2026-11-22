// Private, server-confirmed player exchange. Rendering never changes the bag
// or purse: only progressSaved can apply the completed transaction.
import {ITEM_CATALOG} from '../items.js';
import {QUALITY_VISUALS} from '../item-quality.js';

export const TRADE_BAG_MIME='application/x-ngw-bag-slot';
const MAX_GOLD=2147483647,SLOT_COUNT=6;
const potion={name:'Лечебное зелье',icon:'🧪',rarity:'common',description:'Восстанавливает здоровье.'};
const definition=id=>id==='healingPotion'?potion:ITEM_CATALOG[id];
const eligible=id=>{const item=definition(id);return !!item&&!item.quest&&!item.adminOnly;};
const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const reasons={
 not_authenticated:'Обмен доступен авторизованным персонажам.',
 trade_unavailable:'Игрок сейчас недоступен для обмена.',trade_busy:'Игрок уже занят обменом.',
 trade_too_far:'Для обмена подойдите друг к другу ближе.',interaction_too_far:'Вы отошли слишком далеко.',
 trade_in_combat:'Обмен недоступен во время боя.',trade_dead:'Обмен недоступен погибшему персонажу.',
 trade_player_dead:'Обмен недоступен погибшему персонажу.',
 trade_wrong_world:'Игрок находится в другом мире.',
 trade_declined:'Приглашение к обмену отклонено.',declined:'Приглашение к обмену отклонено.',
 trade_expired:'Время ожидания обмена истекло.',expired:'Время ожидания обмена истекло.',
 trade_disconnected:'Другой игрок отключился.',disconnected:'Другой игрок отключился.',
 trade_cancelled:'Обмен отменён.',cancelled:'Обмен отменён.',
 trade_stale_revision:'Предложение изменилось. Проверьте предметы ещё раз.',
 trade_stale_offer:'Предложение изменилось. Проверьте предметы ещё раз.',
 stale_trade_revision:'Предложение изменилось. Проверьте предметы ещё раз.',
 stale_revision:'Предложение изменилось. Проверьте предметы ещё раз.',
 trade_item_changed:'Один из предметов изменился. Проверьте предложение.',
 trade_item_unavailable:'Этот предмет нельзя передавать или его больше нет в рюкзаке.',
 item_not_owned:'Предмет больше не находится в рюкзаке.',
 inventory_full:'В рюкзаке одного из игроков не хватает места.',
 not_enough_gold:'Недостаточно монет.',gold_overflow:'Невозможно принять столько монет.',
 trade_not_enough_gold:'Недостаточно монет.',trade_gold_overflow:'Невозможно принять столько монет.',
 invalid_trade_offer:'Не удалось изменить предложение. Выберите предметы и количество ещё раз.',
 trade_empty:'Добавьте предмет или монеты в предложение.',
 trade_save_failed:'Не удалось подтвердить завершение обмена. Проверьте рюкзак после подключения.',
 trade_save_timeout:'Сервер не ответил вовремя. Проверьте рюкзак после подключения.',
 trade_invite_cooldown:'Подождите немного перед новым приглашением.',
 trade_item_forbidden:'Этот предмет нельзя передавать.',item_not_tradeable:'Этот предмет нельзя передавать.',
 trade_committing:'Обмен уже подтверждён. Дождитесь завершения.'
};
const messageFor=event=>reasons[event?.reason]||
 (typeof event?.message==='string'?event.message:'Не удалось выполнить обмен. Попробуйте снова.');

export function createPlayerTradeUi({getInventory=()=>[],getGold=()=>0,getPlayerName=()=> 'Вы',
 isConnected=()=>false,respond=()=>false,offer=()=>false,accept=()=>false,cancel=()=>false,
 notice=()=>{},openInventory=()=>{},renderItemIcon=null,bindItemTooltip=null,document:doc=globalThis.document,host=null}={}){
 if(!doc?.createElement)return {onInvite(){},onState(){},onClosed(){},onNotice(){},disconnect(){},refreshInventory(){},dispose(){},get active(){return false;}};
 const make=(tag,className='',text='')=>{
  const node=doc.createElement(tag);node.className=className;if(text)node.textContent=text;return node;
 };
 const button=(text,className,action)=>{
  const node=make('button',className,text);node.type='button';node.addEventListener('click',action);return node;
 };
 const itemIcon=(id,className)=>{
  const art=renderItemIcon?.(id,doc);
  const icon=make('span',className);icon.setAttribute('aria-hidden','true');
  if(art&&typeof art==='object'&&art.nodeType)icon.append(art);
  else icon.textContent=definition(id)?.icon||'◇';
  return icon;
 };
 const money=value=>Math.max(0,Number(value)||0).toLocaleString('ru-RU');
 const root=make('div','ngw-trade-dock');root.id='playerTradeDock';
 const window=make('section','ngw-trade-window');window.hidden=true;
 window.tabIndex=-1;
 window.setAttribute('role','dialog');window.setAttribute('aria-modal','false');window.setAttribute('aria-labelledby','playerTradeTitle');
 const header=make('header','ngw-trade-header'),crest=make('span','ngw-trade-crest','⇄');crest.setAttribute('aria-hidden','true');
 const title=make('h2','','Обмен');title.id='playerTradeTitle';
 const close=button('×','ngw-trade-close',()=>requestCancel());close.setAttribute('aria-label','Закрыть обмен');
 header.append(crest,title,close);
 const subtitle=make('p','ngw-trade-subtitle');
 const columns=make('div','ngw-trade-columns');
 const status=make('p','ngw-trade-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const footer=make('footer','ngw-trade-footer');
 const bagButton=button('Рюкзак','ngw-trade-secondary',()=>openInventory());
 const acceptButton=button('Обменяться','ngw-trade-action',()=>{
  if(!editable())return;
  if(accept(state.tradeId,state.revision,!state.self.accepted)===false)return tell('Нет связи с сервером.');
  pending=true;render();focusDialog();
 });
 const cancelButton=button('Отмена','ngw-trade-secondary',()=>requestCancel());
 footer.append(bagButton,acceptButton,cancelButton);
 const picker=make('section','ngw-trade-picker');picker.hidden=true;picker.setAttribute('aria-label','Предметы для обмена');
 window.append(header,subtitle,columns,status,picker,footer);
 const invitation=make('section','ngw-trade-invitation');invitation.hidden=true;
 invitation.tabIndex=-1;
 invitation.setAttribute('role','dialog');invitation.setAttribute('aria-labelledby','tradeInvitationTitle');
 const inviteTitle=make('h3','','Приглашение к обмену');inviteTitle.id='tradeInvitationTitle';
 const inviteText=make('p','ngw-trade-invite-copy');
 const inviteActions=make('div','ngw-trade-invite-actions');
 const yes=button('Принять','ngw-trade-action',()=>reply(true));
 const no=button('Отклонить','ngw-trade-secondary',()=>reply(false));
 inviteActions.append(yes,no);invitation.append(inviteTitle,inviteText,inviteActions);
 root.append(window,invitation);(host||doc.body||doc.getElementById?.('ngwTradeHost'))?.append(root);
 let state=null,invite=null,pending=false,disposed=false,rendering=false,pickerSlot=null,pickerBag=null,lastMessage='',returnFocus=null;
 const contains=(parent,node)=>{for(let current=node;current;current=current.parentNode)if(current===parent)return true;return false;};
 const visible=node=>{
  if(!node||node.disabled)return false;
  for(let current=node;current&&current!==root.parentNode;current=current.parentNode)if(current.hidden)return false;
  return true;
 };
 const controls=parent=>Array.from(parent.children||[]).flatMap(node=>[
  ...(['BUTTON','INPUT'].includes(String(node.tagName).toUpperCase())&&visible(node)?[node]:[]),...controls(node)]);
 const rememberFocus=()=>{if(!state&&!invite)returnFocus=doc.activeElement;};
 function focusDialog(){
  if(contains(root,doc.activeElement)&&visible(doc.activeElement))return;
  const target=invite?(yes.disabled?invitation:yes):!picker.hidden?
   controls(picker)[0]||window:!acceptButton.disabled?acceptButton:!cancelButton.disabled?cancelButton:
    controls(window)[0]||window;
  target.focus?.();
 }
 function restoreFocus(){
  const fallback=doc.getElementById?.('allyActions')||doc.getElementById?.('viewport')||doc.body;
  const target=returnFocus&&(returnFocus.isConnected??contains(doc.body,returnFocus))&&visible(returnFocus)?returnFocus:fallback;
  returnFocus=null;target?.focus?.();
 }
 const inventory=()=>{const rows=getInventory();return Array.isArray(rows)?rows:[];};
 const purse=()=>{const value=getGold();return integer(value,0,MAX_GOLD)?value:0;};
 const connected=()=>!disposed&&isConnected();
 const editable=()=>!!state&&state.phase==='open'&&connected()&&!pending;
 function tell(text,external=true){
  lastMessage=text;status.textContent=text;if(external)notice(text);
 }
 function clearPicker(){pickerSlot=null;pickerBag=null;picker.hidden=true;picker.replaceChildren();}
 function requestCancel(){
  if(state?.phase==='committing')return tell('Обмен уже подтверждён. Дождитесь завершения.');
  if(invite)return reply(false);
  if(!state)return;
  if(cancel(state.tradeId)===false)return tell('Нет связи с сервером.');
  pending=true;clearPicker();render();focusDialog();
 }
 function reply(accepted){
  if(!invite||pending||!connected())return;
  if(respond(invite.tradeId,accepted)===false)return tell('Нет связи с сервером.');
  pending=true;yes.disabled=true;no.disabled=true;invitation.focus?.();
  if(!accepted){invite=null;invitation.hidden=true;pending=false;restoreFocus();}
 }
 function sendOffer(items,gold){
  if(!editable())return false;
  const refs=items.map(({tradeSlot,bagSlot,qty})=>({tradeSlot,bagSlot,qty}));
  if(offer(state.tradeId,state.revision,refs,gold)===false){tell('Нет связи с сервером.');return false;}
  pending=true;lastMessage='Обновляем предложение…';clearPicker();render();focusDialog();return true;
 }
 function chooseBag(bagSlot){
  const row=inventory()[bagSlot];
  if(!row||!eligible(row.id)||!integer(row.qty,1,20)||
    state.self.items.some(item=>item.bagSlot===bagSlot&&item.tradeSlot!==pickerSlot))return;
  pickerBag=bagSlot;renderPicker();
 }
 function renderPicker(){
  picker.replaceChildren();picker.hidden=pickerSlot===null;
  if(pickerSlot===null)return;
  const heading=make('div','ngw-trade-picker-heading');
  heading.append(make('strong','','Выберите предмет'),button('×','ngw-trade-picker-close',clearPicker));
  heading.lastChild?.setAttribute('aria-label','Закрыть выбор предмета');picker.append(heading);
  const current=state.self.items.find(row=>row.tradeSlot===pickerSlot);
  if(current){
   const remove=button('Убрать из обмена','ngw-trade-remove',()=>
    sendOffer(state.self.items.filter(row=>row.tradeSlot!==pickerSlot),state.self.gold));
   remove.disabled=!editable();picker.append(remove);
  }
  const list=make('div','ngw-trade-bag-list');
  let occupied=0;
  inventory().forEach((row,bagSlot)=>{
   if(!row)return;occupied++;
   const def=definition(row.id),used=state.self.items.some(item=>item.bagSlot===bagSlot&&item.tradeSlot!==pickerSlot);
   const item=button('','ngw-trade-bag-item',()=>chooseBag(bagSlot));
   item.dataset.bagSlot=String(bagSlot);
   item.disabled=!editable()||!eligible(row.id)||used||!integer(row.qty,1,20);
   item.setAttribute('aria-pressed',String(pickerBag===bagSlot));
   const icon=itemIcon(row.id,'ngw-trade-bag-icon');
   const copy=make('span','ngw-trade-bag-copy');copy.append(make('strong','',def?.name||'Неизвестный предмет'),
    make('small','',used?'Уже предложено':!eligible(row.id)?'Нельзя передавать':'В рюкзаке: '+row.qty));
   item.append(icon,copy);list.append(item);
  });
  if(!occupied)list.append(make('p','ngw-trade-empty','Рюкзак пуст.'));
  picker.append(list);
  if(pickerBag!==null){
   const row=inventory()[pickerBag];if(!row||!eligible(row.id)){pickerBag=null;return;}
   const quantity=make('div','ngw-trade-quantity');
   const label=make('label','','Количество');const input=make('input');
   input.type='number';input.inputMode='numeric';input.min='1';input.max=String(row.qty);input.step='1';
   input.value=String(current?.bagSlot===pickerBag?current.qty:row.qty);input.setAttribute('aria-label','Количество предметов');
   const add=button(current?'Заменить':'Добавить','ngw-trade-action',()=>{
    const qty=Number(input.value);
    if(!integer(qty,1,row.qty))return tell('Укажите целое количество от 1 до '+row.qty+'.');
    // Re-read the live bag: selection can outlive an authoritative inventory update.
    const live=inventory()[pickerBag];
    if(!live||live.id!==row.id||live.qty<qty)return tell('Предмет изменился. Выберите его снова.');
    const next=state.self.items.filter(item=>item.tradeSlot!==pickerSlot&&item.bagSlot!==pickerBag);
    next.push({tradeSlot:pickerSlot,bagSlot:pickerBag,qty});
    sendOffer(next,state.self.gold);
   });
   input.disabled=!editable();add.disabled=!editable();label.append(input);quantity.append(label,add);picker.append(quantity);
  }
 }
 function showPicker(slot){
  if(!editable())return;
  pickerSlot=slot;pickerBag=state.self.items.find(row=>row.tradeSlot===slot)?.bagSlot??null;renderPicker();
 }
 function inspectOther(row){
  if(!row)return;clearPicker();picker.hidden=false;
  const def=definition(row.itemId),heading=make('div','ngw-trade-picker-heading');
  heading.append(make('strong','','Предмет другого игрока'),button('×','ngw-trade-picker-close',clearPicker));
  const name=make('strong','ngw-trade-inspect-name',(def?.name||'Предмет')+' ×'+row.qty);
  name.style.color=QUALITY_VISUALS[def?.rarity]?.color||'#e8dfc8';
  picker.append(heading,name,make('p','ngw-trade-inspect-copy',def?.description||'Предложен другим игроком.'));
 }
 function dropSlot(event,slot){
  if(!editable())return;
  const transfer=event.dataTransfer;let raw='';
  try{raw=transfer?.getData(TRADE_BAG_MIME)||'';}catch{return;}
  if(!raw)return;
  event.preventDefault?.();
  let bagSlot;
  try{const value=JSON.parse(raw);bagSlot=typeof value==='object'?value?.bagSlot:value;}catch{bagSlot=Number(raw);}
  if(!integer(bagSlot,0,inventory().length-1))return;
  const row=inventory()[bagSlot];
  if(!row||!eligible(row.id)||!integer(row.qty,1,20)||
    state.self.items.some(item=>item.bagSlot===bagSlot&&item.tradeSlot!==slot))return;
  if(!event.shiftKey){
   const next=state.self.items.filter(item=>item.tradeSlot!==slot);
   next.push({tradeSlot:slot,bagSlot,qty:row.qty});
   sendOffer(next,state.self.gold);return;
  }
  pickerSlot=slot;pickerBag=null;chooseBag(bagSlot);
 }
 function column(person,self){
  const pane=make('section','ngw-trade-person'+(person.accepted?' is-accepted':''));
  const top=make('div','ngw-trade-person-heading');
  top.append(make('h3','',self?getPlayerName()||'Вы':person.name||'Игрок'),
   make('span','ngw-trade-ready',person.accepted?'✓ Подтверждено':self?'Ваше предложение':'Предложение игрока'));
  const grid=make('div','ngw-trade-slots');grid.setAttribute('aria-label',self?'Ваши предметы':'Предметы другого игрока');
  for(let slot=0;slot<SLOT_COUNT;slot++){
   const row=person.items.find(item=>item.tradeSlot===slot),def=definition(row?.itemId);
   const cell=button('','ngw-trade-slot',()=>self?showPicker(slot):inspectOther(row));
   cell.dataset.tradeSlot=String(slot);cell.dataset.side=self?'self':'other';
   cell.disabled=self?!editable():!row;
   cell.classList.toggle('is-empty',!row);
   cell.setAttribute('aria-label',row?(def?.name||'Предмет')+' ×'+row.qty+(self?' — изменить':''):'Пустая ячейка '+(slot+1));
   if(row){
    cell.style.setProperty('--trade-quality',QUALITY_VISUALS[def?.rarity]?.color||'#e8dfc8');
    const icon=itemIcon(row.itemId,'ngw-trade-item-icon');
    const name=make('span','ngw-trade-item-name',def?.name||'Предмет');
    const qty=make('span','ngw-trade-item-quantity',row.qty>1?String(row.qty):'');
    cell.append(icon,name,qty);cell.title=(def?.name||'Предмет')+' ×'+row.qty;
    if(def)bindItemTooltip?.(cell,row.itemId);
   }else cell.append(make('span','ngw-trade-slot-number',String(slot+1)));
   if(self){
    cell.addEventListener('dragover',event=>{
     if(editable()&&Array.from(event.dataTransfer?.types||[]).includes(TRADE_BAG_MIME))event.preventDefault?.();
    });cell.addEventListener('drop',event=>dropSlot(event,slot));
   }
   grid.append(cell);
  }
  const coins=make('div','ngw-trade-coins');
  const label=make('label','ngw-trade-money-label','Монеты');
  const gold=self?make('input','ngw-trade-gold'):make('strong','ngw-trade-gold-readonly',money(person.gold));
  if(self){
   gold.type='text';gold.inputMode='numeric';gold.pattern='[0-9]*';gold.maxLength=10;gold.value=String(person.gold);
   gold.disabled=!editable()||person.accepted;gold.setAttribute('aria-label','Монеты в вашем предложении');
   gold.addEventListener('change',()=>{
    // Replacing a focused input can emit a native change event. A remote
    // update must preserve that draft rather than submit it as a new offer.
    if(rendering||!contains(root,gold))return;
    if(!editable()||state.self.accepted){gold.value=String(state.self.gold);return;}
    const raw=gold.value.trim(),value=raw===''?0:/^\d+$/.test(raw)?Number(raw):NaN;
    if(!integer(value,0,MAX_GOLD)||value>purse()){
     gold.value=String(state.self.gold);tell('Укажите целое число монет от 0 до '+money(purse())+'.');return;
    }
    if(value!==state.self.gold)sendOffer(state.self.items,value);
   });
  }
  label.append(gold);coins.append(label,make('span','ngw-trade-coin','●'));
  pane.append(top,grid,coins);
  if(self)pane.append(make('p','ngw-trade-purse','У вас: '+money(purse())+' монет'));
  return pane;
 }
 function render(){
  if(!state){window.hidden=true;return;}
  const focusedGold=contains(root,doc.activeElement)&&String(doc.activeElement?.className||'').split(' ').includes('ngw-trade-gold');
  const draftGold=focusedGold&&!pending?doc.activeElement.value:null;
  const selection=focusedGold?{start:doc.activeElement.selectionStart,end:doc.activeElement.selectionEnd,direction:doc.activeElement.selectionDirection}:null;
  window.hidden=false;invitation.hidden=true;
  const waiting=state.phase==='invited',committing=state.phase==='committing';
  subtitle.textContent=waiting?'Ожидаем ответа '+(state.other.name||'игрока')+'…':committing?
   'Оба предложения подтверждены. Завершаем обмен…':'Проверьте оба предложения перед подтверждением.';
  rendering=true;
  try{columns.replaceChildren(column(state.self,true),column(state.other,false));}
  finally{rendering=false;}
  acceptButton.textContent=committing?'Обмен…':state.self.accepted?'Снять подтверждение':'Обменяться';
  acceptButton.disabled=!editable();cancelButton.disabled=committing||pending;close.disabled=committing||pending;
  bagButton.disabled=committing||waiting||!connected();
  status.textContent=!connected()?'Нет связи с сервером.':pending?lastMessage||'Ожидаем подтверждения сервера…':
   committing?'Не закрывайте окно до ответа сервера.':state.self.accepted?
   'Вы подтвердили предложение. Ожидаем другого игрока.':lastMessage||'Предметы и монеты останутся у вас до завершения обмена.';
  if(focusedGold&&editable()&&!state.self.accepted){
   const input=controls(columns).find(node=>String(node.className||'').split(' ').includes('ngw-trade-gold'));
   if(input){
    if(draftGold!==null)input.value=draftGold;
    input.focus?.();
    if(draftGold!==null&&Number.isInteger(selection?.start)&&Number.isInteger(selection?.end))
     input.setSelectionRange?.(selection.start,selection.end,selection.direction||'none');
   }
  }
 }
 function normalizePerson(person={}){
  return {id:String(person.id||''),name:typeof person.name==='string'?person.name:'Игрок',gold:integer(person.gold,0,MAX_GOLD)?person.gold:0,
   accepted:person.accepted===true,items:(Array.isArray(person.items)?person.items:[]).filter(row=>
    row&&integer(row.tradeSlot,0,5)&&integer(row.qty,1,20)&&typeof row.itemId==='string').slice(0,6).map(row=>({...row}))};
 }
 const keydown=event=>{
  if(!state&&!invite)return;
  if(!contains(root,event.target)&&!contains(root,doc.activeElement)&&event.target)return;
  if(event.key==='Shift')return; // The shared item tooltip observes comparison mode.
  // Capture before world-target and hotbar handlers. Native text editing still
  // works because ordinary keys retain their default action inside inputs.
  event.stopPropagation?.();
  const editing=['INPUT','TEXTAREA'].includes(String(event.target?.tagName||doc.activeElement?.tagName).toUpperCase())||event.target?.isContentEditable;
  if(!editing&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&
    (['KeyB','KeyI'].includes(event.code)||['b','i'].includes(String(event.key).toLowerCase()))){
   event.preventDefault?.();if(!invite&&!bagButton.disabled)openInventory();
  }else if(event.key==='Escape'){
   event.preventDefault?.();if(!picker.hidden){clearPicker();focusDialog();}else requestCancel();
  }else if(event.key==='Tab'){
   event.preventDefault?.();
   const items=controls(invite?invitation:!picker.hidden?picker:window),index=items.indexOf(doc.activeElement);
   const next=event.shiftKey?(index<=0?items.length-1:index-1):(index+1)%Math.max(1,items.length);
   (items[next]||window).focus?.();
  }
 };
 doc.addEventListener?.('keydown',keydown,true);
 return {
  onInvite(event){
   if(disposed||!event?.tradeId)return;
   rememberFocus();
   invite={...event};pending=false;state=null;clearPicker();window.hidden=true;invitation.hidden=false;
   inviteText.textContent=(event.from?.name||'Игрок')+' предлагает обменяться предметами и монетами.';
   yes.disabled=!connected();no.disabled=!connected();yes.focus?.();
  },
  onState(event){
   if(disposed||!event?.tradeId||!integer(event.revision,0,Number.MAX_SAFE_INTEGER)||
     !['invited','open','committing'].includes(event.phase))return;
   if(state?.tradeId===event.tradeId&&event.revision<state.revision)return;
   const shouldFocus=!state||!!invite||contains(root,doc.activeElement);
   rememberFocus();
   state={tradeId:event.tradeId,revision:event.revision,phase:event.phase,
    self:normalizePerson(event.self),other:normalizePerson(event.other)};
   invite=null;pending=false;lastMessage='';clearPicker();render();if(shouldFocus)focusDialog();
  },
  onClosed(event){
   const id=state?.tradeId||invite?.tradeId;if(!id||event?.tradeId!==id)return;
   state=null;invite=null;pending=false;window.hidden=true;invitation.hidden=true;clearPicker();
   tell(event.status==='completed'?'Обмен завершён.':messageFor(event));
   restoreFocus();
  },
  onNotice(event){if(disposed)return;const focused=contains(root,doc.activeElement);pending=false;tell(messageFor(event));render();if(focused)focusDialog();},
  disconnect(){
   if(!state&&!invite)return;state=null;invite=null;pending=false;clearPicker();window.hidden=true;invitation.hidden=true;
   tell('Связь потеряна. Проверьте рюкзак после подключения.');
   restoreFocus();
  },
  refreshInventory(){if(state){render();if(pickerSlot!==null)renderPicker();}},
  dispose(){if(disposed)return;disposed=true;state=null;invite=null;doc.removeEventListener?.('keydown',keydown,true);root.remove?.();restoreFocus();},
  get active(){return !disposed&&!!(state||invite);}
 };
}
