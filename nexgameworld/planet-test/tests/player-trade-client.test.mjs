import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSphericalPresence} from '../sphere-online.js';
import {harness,descendants} from './harness.mjs';

test('trade transport uses authenticated synchronized sessions and private callback packets',()=>{
 const saved=Object.fromEntries(['WebSocket','document','setInterval','clearInterval','setTimeout','clearTimeout'].map(key=>[key,globalThis[key]]));
 let socket,presence;const sent=[],callbacks=[];
 class FakeSocket{
  static OPEN=1;
  constructor(){socket=this;this.readyState=1}
  send(raw){sent.push(JSON.parse(raw))}
  close(){this.readyState=3}
 }
 Object.assign(globalThis,{WebSocket:FakeSocket,document:{hidden:false,addEventListener(){},removeEventListener(){}},
  setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){}});
 try{
  const config={THREE,scene:new THREE.Scene(),createAvatar:()=>{throw Error('No remote actor expected')},animateAvatar(){},
   getPosition:()=>({normal:[0,0,1],radius:261,heading:0,moving:false}),getRadius:()=>261,heightAt:()=>0,
   onTradeInvite:event=>callbacks.push(event),onTradeState:event=>callbacks.push(event),
   onTradeClosed:event=>callbacks.push(event),onTradeNotice:event=>callbacks.push(event)};
  presence=createSphericalPresence({...config,auth:{sessionToken:'test-only',characterId:'owned-character'}});
  assert.equal(presence.tradeInvite('peer'),false,'an open socket alone cannot send a trade');
  socket.onopen();assert.equal(sent[0].type,'authJoin');
  socket.onmessage({data:JSON.stringify({type:'welcome',id:'self',world:'nexgameworld',protocol:2,radius:261,
   authenticated:true,progress:{revision:0,positionNormal:[0,0,1]},players:[],mobs:[]})});
  assert.equal(presence.tradeInvite('peer'),true);
  presence.tradeRespond('trade-id',true);
  presence.tradeOffer('trade-id',7,[{tradeSlot:1,bagSlot:5,qty:2}],9);
  presence.tradeAccept('trade-id',7,true);presence.tradeCancel('trade-id');
  assert.deepEqual(sent.slice(1),[
   {type:'tradeInvite',targetId:'peer'},
   {type:'tradeRespond',tradeId:'trade-id',accept:true},
   {type:'tradeOffer',tradeId:'trade-id',revision:7,items:[{tradeSlot:1,bagSlot:5,qty:2}],gold:9},
   {type:'tradeAccept',tradeId:'trade-id',revision:7,accept:true},
   {type:'tradeCancel',tradeId:'trade-id'}
  ]);
  const messages=['tradeInvite','tradeState','tradeClosed','tradeNotice'].map(type=>({type,tradeId:'trade-id'}));
  for(const event of messages)socket.onmessage({data:JSON.stringify(event)});
  assert.deepEqual(callbacks,messages);
  socket.onclose({code:1006});assert.equal(presence.tradeAccept('trade-id',7),false);
  presence.close();presence=createSphericalPresence(config);socket.onopen();
  socket.onmessage({data:JSON.stringify({type:'welcome',id:'guest',world:'nexgameworld',protocol:2,radius:261,players:[],mobs:[]})});
  const count=sent.length;assert.ok(!presence.tradeInvite('peer'));assert.equal(sent.length,count,'guest transport never emits a trade command');
 }finally{presence?.close();Object.assign(globalThis,saved)}
});

test('actual RPG offers physical server bag slots and applies inventory only through verified progress',()=>{
 const inventory=Array(12).fill(null);inventory[5]={id:'feather',qty:4};inventory[9]={id:'healingPotion',qty:2};
 const profile={level:2,classId:'warrior',raceId:'orc',nickname:'Игрок',gold:30,health:100,resource:0,
  inventory,equipment:{},actionBar:[],quests:{},experience:0};
 const h=harness({authenticatedProfile:profile}),calls=[];
 const transport={connected:true,selfId:'self',tradeInvite:id=>{calls.push(['invite',id]);return true},
  tradeOffer:(...args)=>{calls.push(['offer',...args]);return true},tradeRespond:()=>true,tradeAccept:()=>true,tradeCancel:()=>true};
 h.rpg.setMultiplayer(transport);h.rpg.onOnlinePlayers([{id:'peer',name:'Друг',level:2,normal:[0,0,1]}]);
 assert.equal(h.rpg.inviteTrade('peer'),true);assert.deepEqual(calls,[['invite','peer']]);
 const ownBefore=structuredClone(h.rpg.state.inventory);
 h.rpg.onTradeState({tradeId:'trade-id',revision:3,phase:'open',self:{name:'Вы',items:[],gold:0,accepted:false},
  other:{name:'Друг',items:[],gold:0,accepted:false}});
 const nodes=()=>descendants(h.get('ngwTradeHost'));
 const slot=nodes().find(node=>node.dataset.side==='self'&&node.dataset.tradeSlot==='0');
 assert.ok(slot);slot.click();
 nodes().find(node=>node.className.includes('ngw-trade-bag-item')&&node.dataset.bagSlot==='5').click();
 nodes().find(node=>node.attributes['aria-label']==='Количество предметов').value='2';
 nodes().find(node=>node.textContent==='Добавить').click();
 assert.deepEqual(calls.at(-1),['offer','trade-id',3,[{tradeSlot:0,bagSlot:5,qty:2}],0]);
 assert.deepEqual(h.rpg.state.inventory,ownBefore);assert.equal(h.rpg.state.gold,30);
 h.get('bag').click();
 const cell=descendants(h.get('mbody')).find(node=>node.className.includes('inventory-slot')&&node.className.includes('occupied'));
 assert.equal(cell.draggable,true);
 const previousTimer=globalThis.setTimeout;let scheduled=0;
 globalThis.setTimeout=()=>++scheduled;
 try{for(const handler of cell.events.pointerdown)handler({pointerId:1,pointerType:'mouse',button:0,clientX:10,clientY:10})}
 finally{globalThis.setTimeout=previousTimer}
 assert.equal(scheduled,0,'an active trade cannot arm hold-to-discard or capture a native item drag');
 const payload=[];
 for(const handler of cell.events.dragstart)handler({dataTransfer:{setData:(...args)=>payload.push(args)},preventDefault(){}});
 assert.deepEqual(payload,[['application/x-ngw-bag-slot','5']]);
 const updated=structuredClone(inventory);updated[5].qty=2;updated[0]={id:'wolfPelt',qty:1};
 h.rpg.applyServerProgress({...profile,inventory:updated,gold:33,revision:4},'trade');
 assert.equal(h.rpg.state.gold,33);assert.ok(h.rpg.state.inventory.some(row=>row.id==='wolfPelt'));
 h.rpg.onTradeClosed({tradeId:'trade-id',status:'completed'});
 assert.equal(nodes().find(node=>node.className==='ngw-trade-window').hidden,true);
 cell.events.pointerdown[0]();assert.equal(cell.draggable,false,'ordinary inventory discard remains the native behavior outside trade');
 h.rpg.onTradeInvite({tradeId:'next',from:{name:'Друг'}});
 assert.equal(nodes().find(node=>node.className==='ngw-trade-invitation').hidden,false);
 transport.connected=false;h.rpg.onNetworkDisconnect();
 assert.equal(nodes().find(node=>node.className==='ngw-trade-invitation').hidden,true);
});
