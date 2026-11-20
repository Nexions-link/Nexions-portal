import test from 'node:test';
import assert from 'node:assert/strict';
import {partyView,partyActions,createPartyInterface} from '../party-interface.js';
import {harness,descendants,installDom} from './harness.mjs';

const hasClass=(node,name)=>String(node.className?.baseVal??node.className??'').split(' ').includes(name);
const find=(node,name)=>descendants(node).filter(child=>hasClass(child,name));
const profile={nickname:'Каменный Рог',raceId:'hornfolk',classId:'warrior',level:8,
 health:120,resource:45,inventory:[],equipment:{},actionBar:[]};
const peers=[
 {id:'hunter',name:'Лунная Стрела',raceId:'orc',classId:'hunter',level:8,hp:86,maxHp:140,resource:65},
 {id:'warrior',name:'Стальной Клык',raceId:'orc',classId:'warrior',level:7,hp:0,maxHp:138,resource:0},
 {id:'nearby',name:'Новый Друг',raceId:'hornfolk',classId:'hunter',level:4,hp:100,maxHp:100,resource:90}
];
const party=()=>({groupId:'party-1',leaderId:'self',members:[
 {id:'self',name:profile.nickname,level:8,online:true},
 {id:'hunter',name:peers[0].name,level:8,online:true},
 {id:'warrior',name:peers[1].name,level:7,online:true},
 {id:'distant',name:'Дальний Союзник',level:6,online:true},
 {id:'offline',name:'Тихий Лес',level:5,online:false}
]});
function game(){
 const h=harness({authenticatedProfile:profile}),sent=[];
 const transport={connected:true,selfId:'self',invite:id=>{sent.push(['invite',id]);return true;},
  respondInvite:(id,accept)=>{sent.push(['respond',id,accept]);return true;},
  promoteParty:id=>{sent.push(['promote',id]);return true;},
  kickParty:id=>{sent.push(['kick',id]);return true;},leaveParty:()=>{sent.push(['leave']);return true;},sendChat:()=>true};
 h.rpg.setMultiplayer(transport);h.rpg.onOnlinePlayers(peers);h.rpg.onPartyState(party());
 return {...h,sent,transport};
}

test('party view combines authoritative membership with actual nearby vitals without invented distant HP',()=>{
 const view=partyView({party:party(),players:peers,selfId:'self',connected:true,
  self:{...profile,name:profile.nickname,hp:120,maxHp:150},selectedId:'hunter'});
 assert.equal(view.members.length,5);assert.equal(view.others.length,4);
 assert.equal(view.others.some(row=>row.id==='self'),false);
 const hunter=view.members.find(row=>row.id==='hunter');
 assert.equal(hunter.className,'Охотник');assert.equal(hunter.resourceName,'Мана');
 assert.equal(hunter.resource,65);assert.equal(hunter.hp,86);assert.equal(hunter.selected,true);
 assert.equal(view.members.find(row=>row.id==='warrior').dead,true);
 const distant=view.members.find(row=>row.id==='distant');
 assert.equal(distant.hp,null);assert.equal(distant.maxHp,null);assert.equal(distant.healthPercent,0);
 assert.equal(distant.nearby,false);assert.equal(distant.className,'Класс неизвестен');
 assert.equal(view.members.find(row=>row.id==='offline').online,false);
 assert.deepEqual(view.nearby.map(row=>row.id),['nearby']);
});

test('only the leader gets member-management actions and a full party cannot invite',()=>{
 const transport={connected:true,invite(){},promoteParty(){},kickParty(){},leaveParty(){}};
 const view=partyView({party:party(),players:peers,selfId:'self',connected:true});
 const hunter=view.members.find(row=>row.id==='hunter'),distant=view.members.find(row=>row.id==='distant');
 assert.equal(partyActions(view,hunter,transport).promote,true);
 assert.equal(partyActions(view,hunter,transport).kick,true);
 assert.equal(partyActions(view,distant,transport).select,false);
 assert.equal(partyActions(view,view.nearby[0],transport).invite,false);
 const member=partyView({party:party(),players:peers,selfId:'hunter',connected:true});
 assert.equal(partyActions(member,member.members[0],transport).promote,false);
 assert.equal(partyActions(member,member.members[0],transport).kick,false);
 assert.equal(partyActions(member,member.nearby[0],transport).invite,false);
 assert.equal(partyActions(view,hunter,{connected:true}).kick,false,'old transport capabilities stay hidden');
 transport.connected=false;assert.equal(partyActions(view,hunter,transport).kick,false);
});

test('party HUD shows four allies, retains frame nodes through vitals changes and never claims unknown HP is full',()=>{
 const h=game(),hud=h.get('ngwPartyFrames');
 assert.equal(hud.hidden,false);const rows=find(hud,'wow-party-unit');assert.equal(rows.length,4);
 assert.equal(rows.some(row=>row.dataset.memberId==='self'),false);
 const hunter=rows.find(row=>row.dataset.memberId==='hunter'),select=find(hunter,'wow-party-select')[0];
 const health=find(hunter,'wow-party-health-text')[0];assert.equal(health.textContent,'86 / 140');
 const distant=rows.find(row=>row.dataset.memberId==='distant');
 assert.equal(find(distant,'wow-party-health-text')[0].textContent,'Здоровье —');
 assert.equal(find(distant,'wow-party-select')[0].disabled,true);
 h.rpg.onOnlinePlayers(peers.map(peer=>peer.id==='hunter'?{...peer,hp:30,resource:20}:peer));
 assert.equal(find(hud,'wow-party-unit').find(row=>row.dataset.memberId==='hunter'),hunter);
 assert.equal(find(hunter,'wow-party-select')[0],select,'server vitals keep focused frame nodes mounted');
 assert.equal(health.textContent,'30 / 140');
 select.click();assert.equal(h.get('allyName').textContent,'Лунная Стрела');
 assert.match(h.get('allyLevel').textContent,/Орк · Охотник/);
 assert.equal(hasClass(hunter,'is-selected'),true);
});

test('leader context actions require explicit custom confirmation and wait for server membership state',()=>{
 const h=game(),hunter=find(h.get('ngwPartyFrames'),'wow-party-unit').find(row=>row.dataset.memberId==='hunter');
 find(hunter,'wow-party-more')[0].click();
 const menu=h.get('ngwPartyMenu');assert.equal(menu.hidden,false);
 const promote=descendants(menu).find(node=>node.textContent==='Назначить лидером');
 const kick=descendants(menu).find(node=>node.textContent==='Исключить из группы');
 assert.ok(promote&&kick);kick.click();assert.deepEqual(h.sent,[]);
 const prompt=h.get('ngwPartyPrompt');assert.equal(prompt.hidden,false);
 const yes=descendants(prompt).find(node=>node.textContent==='Исключить');yes.click();yes.click();
 assert.deepEqual(h.sent,[['kick','hunter']],'a double tap cannot send the same confirmed action twice');
 assert.equal(find(h.get('ngwPartyFrames'),'wow-party-unit').length,4,'membership is never removed optimistically');
 h.rpg.onPartyState({...party(),members:party().members.filter(row=>row.id!=='hunter')});
 assert.equal(find(h.get('ngwPartyFrames'),'wow-party-unit').length,3);
});

test('a leadership change invalidates an already open management confirmation',()=>{
 const h=game(),hunter=find(h.get('ngwPartyFrames'),'wow-party-unit').find(row=>row.dataset.memberId==='hunter');
 find(hunter,'wow-party-more')[0].click();
 descendants(h.get('ngwPartyMenu')).find(node=>node.textContent==='Назначить лидером').click();
 const yes=descendants(h.get('ngwPartyPrompt')).find(node=>node.textContent==='Назначить');
 h.rpg.onPartyState({...party(),leaderId:'hunter'});
 assert.equal(h.get('ngwPartyPrompt').hidden,true);yes.click();assert.deepEqual(h.sent,[]);
});

test('custom group invitations respond only after the player chooses, then clear on disconnect',()=>{
 const h=game();h.rpg.onPartyState({groupId:null,leaderId:null,members:[]});
 h.rpg.onPartyInvite({fromId:'hunter',fromName:'<img onerror=alert(1)>',expiresIn:60});
 const prompt=h.get('ngwPartyPrompt');assert.equal(prompt.hidden,false);assert.deepEqual(h.sent,[]);
 assert.equal(descendants(prompt).some(node=>String(node.tagName).toLowerCase()==='img'),false);
 const accept=descendants(prompt).find(node=>node.textContent==='Принять');accept.click();accept.click();
 assert.deepEqual(h.sent,[['respond','hunter',true]]);assert.equal(prompt.hidden,true);
 h.rpg.onPartyInvite({fromId:'hunter',fromName:'Друг',expiresIn:60});
 const stale=descendants(prompt).find(node=>node.textContent==='Принять');
 h.transport.connected=false;h.rpg.onNetworkDisconnect();
 assert.equal(prompt.hidden,true);assert.equal(h.get('ngwPartyFrames').hidden,true);
 stale.click();assert.equal(h.sent.length,1,'stale invitation buttons cannot replay after disconnect');
});

test('an expired invitation closes locally and cannot send a late acceptance',()=>{
 const dom=installDom();let time=1000;const sent=[],transport={connected:true,selfId:'self',respondInvite:(...args)=>sent.push(args)};
 const ui=createPartyInterface({getTransport:()=>transport,getParty:()=>({members:[]}),getPlayers:()=>[],
  getSelf:()=>({}),now:()=>time});
 ui.receiveInvite({fromId:'other',fromName:'Друг',expiresIn:2});
 const prompt=dom.nodes.get('ngwPartyPrompt'),accept=descendants(prompt).find(node=>node.textContent==='Принять');
 time+=2001;ui.tick();assert.equal(prompt.hidden,true);accept.click();assert.deepEqual(sent,[]);
});
