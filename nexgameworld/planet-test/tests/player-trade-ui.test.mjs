import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayerTradeUi,TRADE_BAG_MIME} from '../player-trade-ui.js';

class Element{
 constructor(tag){this.nodeType=1;this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.hidden=false;this.disabled=false;this.className='';this.textContent='';this.dataset={};this.attributes={};this.events={};this.style={setProperty:(key,value)=>{this.style[key]=value;}};
  this.classList={toggle:(name,on)=>{const list=new Set(this.className.split(' ').filter(Boolean));if(on)list.add(name);else list.delete(name);this.className=[...list].join(' ');}};}
 append(...children){for(const child of children){child.parentNode=this;this.children.push(child);}}
 replaceChildren(...children){for(const child of this.children)child.parentNode=null;this.children=[];this.append(...children);}
 setAttribute(key,value){this.attributes[key]=String(value);}
 addEventListener(type,handler){(this.events[type]??=[]).push(handler);}
 dispatch(type,event={}){for(const handler of this.events[type]||[])handler({target:this,preventDefault(){},...event});}
 click(){if(!this.disabled)this.dispatch('click');}
 focus(){this.focused=true;if(this.ownerDocument)this.ownerDocument.activeElement=this;}
 setSelectionRange(start,end,direction='none'){this.selectionStart=start;this.selectionEnd=end;this.selectionDirection=direction;}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);this.parentNode=null;}
 get lastChild(){return this.children.at(-1);}
}
const walk=node=>[node,...node.children.flatMap(walk)];
const classes=node=>new Set(node.className.split(' '));
function fixture({connected=true,art=false,tooltips=false}={}){
 const body=new Element('body'),events={};
 const document={body,activeElement:body,createElement:tag=>Object.assign(new Element(tag),{ownerDocument:document}),
  addEventListener:(type,handler)=>{(events[type]??=[]).push(handler);},
  removeEventListener:(type,handler)=>{events[type]=(events[type]||[]).filter(item=>item!==handler);},
  dispatch:(type,event)=>{for(const handler of events[type]||[])handler({preventDefault(){},...event});}};
 let inventory=[{id:'wornAxe',qty:1},{id:'feather',qty:12},{id:'healingPotion',qty:4},
  {id:'meadowFlower',qty:3},{id:'adminBattlefury',qty:1},null,null,null,null,null,null,null],gold=100;
 const calls={respond:[],offer:[],accept:[],cancel:[],notice:[],bag:0,art:[],tooltips:[]};
 const config={document,getInventory:()=>inventory,getGold:()=>gold,getPlayerName:()=>'<b>Вы</b>',isConnected:()=>connected,
  respond:(...args)=>{calls.respond.push(args);return connected;},offer:(...args)=>{calls.offer.push(args);return connected;},
  accept:(...args)=>{calls.accept.push(args);return connected;},cancel:(...args)=>{calls.cancel.push(args);return connected;},
  notice:text=>calls.notice.push(text),openInventory:()=>{calls.bag++;},
  ...(art?{renderItemIcon:(id,doc)=>{calls.art.push(id);const svg=doc.createElement('svg');svg.dataset.art=id;return svg;}}:{}),
  ...(tooltips?{bindItemTooltip:(node,id)=>calls.tooltips.push({node,id})}:{})};
 const ui=createPlayerTradeUi(config);
 const find=(predicate)=>walk(body).find(predicate);
 const all=(className)=>walk(body).filter(node=>classes(node).has(className));
 const get=className=>all(className)[0];
 const textButton=text=>find(node=>node.tagName==='BUTTON'&&node.textContent===text);
 const state=(overrides={})=>({type:'tradeState',tradeId:'trade-1',revision:2,phase:'open',
  self:{id:'self',name:'Вы',items:[],gold:0,accepted:false},
  other:{id:'other',name:'<img src=x onerror=alert(1)>',items:[],gold:0,accepted:false},...overrides});
 return {ui,document,body,calls,get,all,find,textButton,state,
  inventory:()=>inventory,setInventory:value=>{inventory=value;},setGold:value=>{gold=value;},
  setConnected:value=>{connected=value;},ownSlot:index=>all('ngw-trade-slot').find(node=>node.dataset.side==='self'&&node.dataset.tradeSlot===String(index)),
  bagItem:index=>all('ngw-trade-bag-item').find(node=>node.dataset.bagSlot===String(index))};
}

test('a private invitation uses literal names and waits for a server state after accepting',()=>{
 const h=fixture();h.ui.onInvite({tradeId:'invite-1',from:{name:'<img src=x>'}});
 assert.equal(h.ui.active,true);assert.equal(h.get('ngw-trade-invitation').hidden,false);
 assert.match(h.get('ngw-trade-invite-copy').textContent,/<img src=x>/);
 assert.equal(walk(h.body).some(node=>node.tagName==='IMG'),false);
 h.textButton('Принять').click();h.textButton('Принять').click();
 assert.deepEqual(h.calls.respond,[['invite-1',true]],'waiting prevents duplicate invitation replies');
 assert.equal(h.get('ngw-trade-window').hidden,true,'an invitation does not invent an editable trade');
 h.ui.onState(h.state({tradeId:'invite-1'}));
 assert.equal(h.get('ngw-trade-window').hidden,false);assert.equal(h.get('ngw-trade-invitation').hidden,true);
 assert.equal(h.all('ngw-trade-slot').length,12);assert.equal(walk(h.body).some(node=>node.tagName==='IMG'),false);
});

test('declining an invitation and unrelated close packets cannot affect another active exchange',()=>{
 const h=fixture();h.ui.onInvite({tradeId:'invite-1',from:{name:'Орк'}});
 h.textButton('Отклонить').click();assert.deepEqual(h.calls.respond,[['invite-1',false]]);assert.equal(h.ui.active,false);
 h.ui.onState(h.state());h.ui.onClosed({tradeId:'another-trade',status:'cancelled'});
 assert.equal(h.ui.active,true);assert.equal(h.calls.cancel.length,0);
});

test('a partial stack offer sends only physical bag references and never mutates owned items or money',()=>{
 const h=fixture(),before=structuredClone(h.inventory());h.ui.onState(h.state());
 h.ownSlot(0).click();h.bagItem(1).click();
 h.find(node=>node.attributes['aria-label']==='Количество предметов').value='3';h.textButton('Добавить').click();
 assert.deepEqual(h.calls.offer,[['trade-1',2,[{tradeSlot:0,bagSlot:1,qty:3}],0]]);
 assert.deepEqual(h.inventory(),before);assert.equal(h.get('ngw-trade-gold').value,'0');
 assert.equal(h.textButton('Обменяться').disabled,true,'cannot accept an offer still awaiting its server revision');
 h.ui.onState(h.state({revision:3,self:{id:'self',name:'Вы',items:[{tradeSlot:0,bagSlot:1,itemId:'feather',qty:3}],gold:0,accepted:false}}));
 assert.equal(h.textButton('Обменяться').disabled,false);assert.equal(h.ownSlot(0).attributes['aria-label'],'Перо долгонога ×3 — изменить');
});

test('quest and administrator items are unavailable, and one physical stack cannot occupy two trade slots',()=>{
 const h=fixture();h.ui.onState(h.state({self:{id:'self',items:[{tradeSlot:0,bagSlot:1,itemId:'feather',qty:4}],gold:0,accepted:false}}));
 h.ownSlot(1).click();assert.equal(h.bagItem(3).disabled,true);assert.equal(h.bagItem(4).disabled,true);
 assert.equal(h.bagItem(1).disabled,true);assert.equal(h.bagItem(0).disabled,false);assert.equal(h.bagItem(2).disabled,false);
 h.bagItem(3).click();h.bagItem(4).click();h.bagItem(1).click();assert.equal(h.calls.offer.length,0);
});

test('quantity validation rejects fractions, zero and unavailable quantities before transmission',()=>{
 const h=fixture();h.ui.onState(h.state());h.ownSlot(0).click();h.bagItem(2).click();
 const input=h.find(node=>node.attributes['aria-label']==='Количество предметов');
 for(const value of ['0','-1','1.5','5','NaN']){input.value=value;h.textButton('Добавить').click();}
 assert.equal(h.calls.offer.length,0);assert.equal(h.calls.notice.length,5);
 input.value='2';h.textButton('Добавить').click();assert.deepEqual(h.calls.offer[0][2],[{tradeSlot:0,bagSlot:2,qty:2}]);
});

test('a stale picker does not offer a replacement item that appeared in the selected bag position',()=>{
 const h=fixture();h.ui.onState(h.state());h.ownSlot(0).click();h.bagItem(1).click();
 const next=structuredClone(h.inventory());next[1]={id:'charm',qty:1};h.setInventory(next);
 h.textButton('Добавить').click();assert.equal(h.calls.offer.length,0);assert.match(h.calls.notice.at(-1),/изменился/);
});

test('changing offered money validates whole owned currency and retains the current item references',()=>{
 const h=fixture();h.ui.onState(h.state({self:{id:'self',items:[{tradeSlot:3,bagSlot:0,itemId:'wornAxe',qty:1}],gold:0,accepted:false}}));
 const input=h.get('ngw-trade-gold');
 for(const raw of ['-2','2.5','1e2','101','2147483648']){input.value=raw;input.dispatch('change');assert.equal(input.value,'0');}
 assert.equal(h.calls.offer.length,0);
 input.value='15';input.dispatch('change');
 assert.deepEqual(h.calls.offer,[['trade-1',2,[{tradeSlot:3,bagSlot:0,qty:1}],15]]);
 assert.equal(h.get('ngw-trade-gold').disabled,true);assert.equal(h.inventory()[0].id,'wornAxe');
});

test('acceptance uses the exact authoritative revision and can be withdrawn without optimistic completion',()=>{
 const h=fixture();h.ui.onState(h.state({revision:7}));h.textButton('Обменяться').click();
 assert.deepEqual(h.calls.accept,[['trade-1',7,true]]);assert.equal(h.ui.active,true);
 h.ui.onState(h.state({revision:6}));assert.equal(h.textButton('Обменяться').disabled,true,'older revisions cannot unlock a pending approval');
 h.ui.onState(h.state({revision:7,self:{id:'self',items:[],gold:0,accepted:true}}));
 assert.equal(h.all('ngw-trade-person').some(node=>classes(node).has('is-accepted')),true);
 h.textButton('Снять подтверждение').click();assert.deepEqual(h.calls.accept.at(-1),['trade-1',7,false]);
 assert.equal(h.ui.active,true,'only tradeClosed can complete an exchange');
});

test('editing a confirmed offer sends a new proposal rather than altering the counterparty confirmation locally',()=>{
 const h=fixture();h.ui.onState(h.state({revision:8,self:{id:'self',items:[{tradeSlot:0,bagSlot:0,itemId:'wornAxe',qty:1}],gold:10,accepted:true},
  other:{id:'other',name:'Охотник',items:[],gold:0,accepted:true}}));
 h.ownSlot(0).click();h.textButton('Убрать из обмена').click();
 assert.deepEqual(h.calls.offer,[['trade-1',8,[],10]]);assert.equal(h.get('ngw-trade-picker').hidden,true);
 assert.equal(h.textButton('Снять подтверждение').disabled,true);
 h.ui.onState(h.state({revision:9}));assert.equal(h.all('ngw-trade-person').some(node=>classes(node).has('is-accepted')),false);
});

test('a committing exchange disables close, edit and approval while Escape cannot claim cancellation',()=>{
 const h=fixture();h.ui.onState(h.state({phase:'committing'}));
 assert.equal(h.get('ngw-trade-close').disabled,true);assert.equal(h.textButton('Отмена').disabled,true);
 assert.equal(h.textButton('Обмен…').disabled,true);assert.equal(h.get('ngw-trade-gold').disabled,true);
 h.document.dispatch('keydown',{key:'Escape'});assert.equal(h.calls.cancel.length,0);assert.equal(h.ui.active,true);
 h.ui.onClosed({tradeId:'trade-1',status:'completed'});assert.equal(h.ui.active,false);assert.match(h.calls.notice.at(-1),/завершён/);
});

test('ordinary native bag drops propose the whole stack and Shift-drop reviews a partial amount',()=>{
 const h=fixture();h.ui.onState(h.state());let prevented=false;
 const owned=structuredClone(h.inventory());
 const transfer={types:[TRADE_BAG_MIME],getData:type=>type===TRADE_BAG_MIME?JSON.stringify({bagSlot:2}):''};
 h.ownSlot(4).dispatch('dragover',{dataTransfer:transfer,preventDefault:()=>{prevented=true;}});assert.equal(prevented,true);
 h.ownSlot(4).dispatch('drop',{dataTransfer:transfer});
 assert.equal(h.get('ngw-trade-picker').hidden,true);
 assert.deepEqual(h.calls.offer[0],[ 'trade-1',2,[{tradeSlot:4,bagSlot:2,qty:4}],0]);
 assert.deepEqual(h.inventory(),owned,'a drop is still only a server proposal');
 const partial=fixture();partial.ui.onState(partial.state());
 partial.ownSlot(4).dispatch('drop',{dataTransfer:transfer,shiftKey:true});
 assert.equal(partial.get('ngw-trade-picker').hidden,false);assert.equal(partial.calls.offer.length,0);
 partial.find(node=>node.attributes['aria-label']==='Количество предметов').value='2';
 partial.textButton('Добавить').click();
 assert.deepEqual(partial.calls.offer[0],['trade-1',2,[{tradeSlot:4,bagSlot:2,qty:2}],0]);
});

test('disconnect closes the private UI without replaying or pretending the transfer failed',()=>{
 const h=fixture();h.ui.onState(h.state({phase:'committing'}));h.setConnected(false);h.ui.disconnect();
 assert.equal(h.ui.active,false);assert.equal(h.get('ngw-trade-window').hidden,true);
 assert.match(h.calls.notice.at(-1),/Проверьте рюкзак/);assert.equal(h.calls.cancel.length,0);assert.equal(h.calls.accept.length,0);
 h.setConnected(true);h.ui.refreshInventory();assert.equal(h.ui.active,false);
});

test('a server notice releases pending controls while an actual cancel waits for tradeClosed',()=>{
 const h=fixture();h.ui.onState(h.state());h.textButton('Отмена').click();
 assert.deepEqual(h.calls.cancel,[['trade-1']]);assert.equal(h.ui.active,true);assert.equal(h.textButton('Отмена').disabled,true);
 h.ui.onNotice({reason:'trade_stale_revision'});assert.match(h.get('ngw-trade-status').textContent,/Предложение изменилось/);
 assert.equal(h.textButton('Обменяться').disabled,false);
 h.ui.onClosed({tradeId:'trade-1',status:'cancelled',reason:'trade_too_far'});assert.equal(h.ui.active,false);
 assert.match(h.calls.notice.at(-1),/ближе/);
});

test('inventory refresh and injected original item artwork remain cosmetic and dispose removes listeners',()=>{
 const h=fixture({art:true});h.ui.onState(h.state({other:{id:'other',name:'Друг',items:[{tradeSlot:2,itemId:'charm',qty:1}],gold:20,accepted:false}}));
 assert.deepEqual(h.calls.art,['charm']);assert.equal(walk(h.body).some(node=>node.dataset.art==='charm'),true);
 h.setGold(61);h.ui.refreshInventory();assert.equal(h.get('ngw-trade-purse').textContent,'У вас: 61 монет');
 h.textButton('Рюкзак').click();assert.equal(h.calls.bag,1);
 h.ui.dispose();assert.equal(h.ui.active,false);assert.equal(h.body.children.length,0);
 h.document.dispatch('keydown',{key:'Escape'});assert.equal(h.calls.cancel.length,0);
 h.ui.onState(h.state());assert.equal(h.body.children.length,0,'disposed controllers cannot restore old windows');
});

test('touch and keyboard users can inspect the counterparty item without changing either offer',()=>{
 const h=fixture();h.ui.onState(h.state({other:{id:'other',name:'Друг',items:[{tradeSlot:2,itemId:'charm',qty:1}],gold:20,accepted:false}}));
 const cell=h.all('ngw-trade-slot').find(node=>node.dataset.side==='other'&&node.dataset.tradeSlot==='2');
 assert.equal(cell.tagName,'BUTTON');cell.click();assert.equal(h.get('ngw-trade-picker').hidden,false);
 assert.match(h.get('ngw-trade-inspect-name').textContent,/Полированная бусина/);
 assert.equal(h.calls.offer.length,0);assert.equal(h.calls.accept.length,0);
 h.document.dispatch('keydown',{key:'Escape'});assert.equal(h.get('ngw-trade-picker').hidden,true);assert.equal(h.ui.active,true);
});

test('all authoritative trade rejection reasons have actionable copy without claiming a failed durable transfer',()=>{
 const h=fixture();h.ui.onState(h.state());
 for(const reason of ['trade_player_dead','trade_wrong_world','trade_stale_offer','trade_not_enough_gold',
  'trade_gold_overflow','trade_item_unavailable','invalid_trade_offer','trade_invite_cooldown']){
  h.ui.onNotice({reason});assert.doesNotMatch(h.calls.notice.at(-1),/Не удалось выполнить обмен/);
 }
 h.ui.onNotice({reason:'trade_save_failed'});assert.match(h.calls.notice.at(-1),/Проверьте рюкзак после подключения/);
 assert.doesNotMatch(h.calls.notice.at(-1),/Обмен отменён/);
});
test('trade keyboard focus traps Tab and Escape without leaking game hotkeys or blocking numeric typing',()=>{
 const h=fixture(),trigger=h.document.createElement('button');h.body.append(trigger);trigger.focus();
 h.ui.onState(h.state());assert.equal(h.document.activeElement,h.textButton('Обменяться'));
 let stopped=0,prevented=0;
 const press=(key,extra={})=>h.document.dispatch('keydown',{key,target:h.document.activeElement,
  stopPropagation(){stopped++},preventDefault(){prevented++},...extra});
 press('Tab');assert.equal(stopped,1);assert.equal(prevented,1);
 assert.ok(walk(h.get('ngw-trade-window')).includes(h.document.activeElement));
 const input=h.get('ngw-trade-gold');input.focus();
 press('1');press('ArrowLeft');assert.equal(stopped,3);assert.equal(prevented,1,'input editing retains native default actions');
 input.value='17';h.ui.onState(h.state({revision:3}));
 assert.equal(h.document.activeElement,h.get('ngw-trade-gold'));assert.equal(h.get('ngw-trade-gold').value,'17','other-side updates preserve a focused amount draft');
 press('Escape');assert.equal(stopped,4);assert.deepEqual(h.calls.cancel,[['trade-1']]);
 h.ui.onClosed({tradeId:'trade-1',status:'cancelled',reason:'trade_cancelled'});
 assert.equal(h.document.activeElement,trigger,'closing returns focus to the control that opened trade');
 press('1');assert.equal(stopped,4,'closed exchange does not swallow game input');
});
test('replacing a focused currency input does not submit its draft through native change',()=>{
 const h=fixture();h.ui.onState(h.state());
 const input=h.get('ngw-trade-gold');input.focus();input.value='17';input.setSelectionRange(1,1);
 const columns=h.get('ngw-trade-columns'),replace=columns.replaceChildren.bind(columns);
 columns.replaceChildren=(...children)=>{input.dispatch('change');replace(...children);};
 h.ui.onState(h.state({revision:3}));
 assert.deepEqual(h.calls.offer,[],'a remote render must not publish an uncommitted draft');
 const replacement=h.get('ngw-trade-gold');assert.equal(replacement.value,'17');
 assert.equal(replacement.selectionStart,1);assert.equal(h.document.activeElement,replacement);
 input.dispatch('change');assert.deepEqual(h.calls.offer,[],'detached fields cannot publish stale changes');
});
test('B and I open the bag from trade buttons while amount fields retain native typing',()=>{
 const h=fixture();h.ui.onState(h.state());let stopped=0,prevented=0;
 const press=(key,extra={})=>h.document.dispatch('keydown',{key,target:h.document.activeElement,
  stopPropagation(){stopped++},preventDefault(){prevented++},...extra});
 press('B');assert.equal(h.calls.bag,1);assert.equal(stopped,1);assert.equal(prevented,1);
 const input=h.get('ngw-trade-gold');input.focus();press('b');
 assert.equal(h.calls.bag,1);assert.equal(prevented,1,'typing an amount never opens another window');
 h.textButton('Обменяться').focus();press('i');assert.equal(h.calls.bag,2);assert.equal(stopped,3);
 press('и',{code:'KeyB'});assert.equal(h.calls.bag,3,'physical B remains a bag shortcut on a Cyrillic keyboard');
});
test('known offer rows share item tooltips and Shift comparison without binding empty slots',()=>{
 const h=fixture({tooltips:true});h.ui.onState(h.state({
  self:{name:'Вы',items:[{tradeSlot:1,bagSlot:0,itemId:'wornAxe',qty:1}],gold:0,accepted:false},
  other:{name:'Друг',items:[{tradeSlot:3,itemId:'charm',qty:2}],gold:5,accepted:false}}));
 assert.deepEqual(h.calls.tooltips.map(binding=>binding.id),['wornAxe','charm']);
 assert.equal(h.calls.tooltips[0].node.dataset.side,'self');assert.equal(h.calls.tooltips[1].node.dataset.side,'other');
 let stopped=false;h.document.dispatch('keydown',{key:'Shift',target:h.document.activeElement,stopPropagation(){stopped=true}});
 assert.equal(stopped,false,'shared tooltip listeners can observe Shift comparison mode');
});
test('accepted currency stays at the server amount until withdrawing approval is acknowledged',()=>{
 const h=fixture();
 h.ui.onState(h.state({self:{name:'Вы',items:[],gold:20,accepted:true}}));
 const approved=h.get('ngw-trade-gold');assert.equal(approved.disabled,true);assert.equal(approved.value,'20');
 approved.value='17';approved.dispatch('change');assert.equal(approved.value,'20');assert.equal(h.calls.offer.length,0);
 h.textButton('Снять подтверждение').click();assert.deepEqual(h.calls.accept,[['trade-1',2,false]]);
 assert.equal(h.get('ngw-trade-gold').disabled,true,'editing waits for the unaccept response');
 h.ui.onState(h.state({self:{name:'Вы',items:[],gold:20,accepted:false}}));
 const editable=h.get('ngw-trade-gold');assert.equal(editable.disabled,false);
 editable.value='17';editable.dispatch('change');assert.deepEqual(h.calls.offer,[['trade-1',2,[],17]]);
 h.ui.onState(h.state({revision:3,self:{name:'Вы',items:[],gold:17,accepted:false}}));
 assert.equal(h.get('ngw-trade-gold').value,'17');assert.equal(h.get('ngw-trade-gold').disabled,false);
});
