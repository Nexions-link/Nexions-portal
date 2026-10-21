import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,descendants} from './harness.mjs';
import {questWaypoint,questDirection,preferredQuestId,isAcceptedQuest,trackedQuestMap} from '../starter-quest-guidance.js';
import {BANDIT_QUEST_GIVER} from '../creature-registry.js';
import {GATHER_QUESTS} from '../gather-world.js';

test('mentor chain changes waypoint from combat to hand-in and exploration',()=>{
 const player={x:0,z:0};
 const state={level:1,quest:1};
 assert.equal(questWaypoint('mentor',state,[],player).title,'Равнинные долгоноги');
 state.quest=2;
 assert.equal(questWaypoint('mentor',state,[],player).title,'Наставник Каменный Рог');
 state.quest=4;
 assert.equal(questWaypoint('mentor',state,[],player).title,'Перо у восточного тотема');
 state.quest=7;
 assert.equal(questWaypoint('mentor',state,[],player).title,'Каменная развилка');
 state.quest=10;
 assert.equal(questWaypoint('mentor',state,[],player).title,'Грозоклюв');
 state.quest=12;
 assert.equal(questWaypoint('mentor',state,[],player),null);
});
test('gather chain uses closest resource and returns to herbalist once enough items collected',()=>{
 const state={level:2,quest:12,gatherStage:2,gatherAvailable:false};
 const resource=questWaypoint('gather-2',state,[],{x:14,z:30});
 assert.equal(resource.title,GATHER_QUESTS[2].title);
 assert.deepEqual({x:resource.x,z:resource.z},{x:13,z:31});
 assert.equal(questWaypoint('gather-2',state,[{id:'sunRoot',qty:3}],{x:13,z:31}).title,'Сдать растения травнице');
 state.gatherAvailable=true;
 assert.equal(questWaypoint('gather-2',state,[],{x:13,z:31}).title,'Травница Тихая Заря');
 state.gatherStage=3;state.gatherAvailable=false;
 assert.equal(questWaypoint('gather-2',state,[],{x:0,z:0}),null);
});
test('bandit objectives give real spawn waypoints and never route to a locked quest',()=>{
 const state={level:2,quest:12,banditQuest:{stage:0,kills:0},banditWeaponsQuest:{stage:0},banditChiefQuest:{stage:0}};
 assert.equal(questWaypoint('bandit-trail',state,[],{x:0,z:0}),null);
 state.level=3;
 assert.equal(questWaypoint('bandit-trail',state,[],{x:0,z:0}).title,'Следопыт Медная Стрела');
 state.banditQuest.stage=1;
 assert.equal(questWaypoint('bandit-trail',state,[],{x:-50,z:-17}).title,'Лагерь разбойников');
 state.banditQuest.stage=2;
 assert.deepEqual({x:questWaypoint('bandit-trail',state,[],{x:0,z:0}).x,
  z:questWaypoint('bandit-trail',state,[],{x:0,z:0}).z},
  {x:BANDIT_QUEST_GIVER.x,z:BANDIT_QUEST_GIVER.z});
 state.banditQuest.stage=3;state.banditWeaponsQuest.stage=1;
 assert.equal(questWaypoint('bandit-weapons',state,[],{x:-62,z:-10}).title,'Кинжалы у лагеря');
 assert.equal(questWaypoint('bandit-weapons',state,[{id:'banditDagger',qty:3}],{x:-62,z:-10}).title,'Следопыт Медная Стрела');
 state.banditWeaponsQuest.stage=2;
 assert.equal(questWaypoint('bandit-chief',state,[],{x:0,z:0}),null);
 state.level=4;state.banditChiefQuest.stage=1;
 assert.equal(questWaypoint('bandit-chief',state,[],{x:0,z:0}).title,'Главарь Пыльной тропы');
 state.banditChiefQuest.stage=2;
 assert.equal(questWaypoint('bandit-chief',state,[],{x:0,z:0}).title,'Следопыт Медная Стрела');
 state.banditChiefQuest.stage=3;
 assert.equal(questWaypoint('bandit-chief',state,[],{x:0,z:0}),null);
 assert.equal(preferredQuestId(state,[]),null);
});
test('directions show distance in meters and cardinal wayfinding near a target',()=>{
 assert.equal(questDirection({x:0,z:10,title:'Тотем'},{x:0,z:0}).description,'Тотем · С · ~10 м');
 assert.equal(questDirection({x:-10,z:0,title:'Лагерь'},{x:0,z:0}).description,'Лагерь · З · ~10 м');
 assert.equal(questDirection({x:0,z:0,title:'Следопыт'},{x:0,z:0}).description,'Рядом · Следопыт');
});
test('online journal pins a quest; progress update routes player back to quest giver and persists selection',()=>{
 const state={level:3,experience:0,gold:30,health:200,resource:0,revision:1,
  inventory:Array(12).fill(null),equipment:{},actionBar:[],
  quests:{mentor:{step:12,kills:3},gather:{stage:4,accepted:false},
   bandit:{stage:1,kills:1},banditWeapons:{stage:0},banditChief:{stage:0}}};
 const h=harness({x:-60,z:-15,authenticatedProfile:state});
 const hint=h.get('trackedQuestHint');
 assert.equal(hint.hidden,true,'no automatic tracking');
 assert.equal(h.get('quest').hidden,true,'no objective window without opt-in');
 assert.equal(h.rpg.getQuestMapState(),null);
 h.get('journal').click();
 const buttons=()=>descendants(h.get('mbody')).filter(x=>x.textContent==='Отслеживать'||x.textContent==='✓ Отслеживается · Выключить');
 assert.equal(buttons().length,1);
 buttons()[0].click();
 assert.equal(hint.hidden,false);
 assert.equal(h.get('quest').hidden,false);
 assert.match(h.get('trackedQuestText').textContent,/Лагерь разбойников/);
 assert.match(hint.className,/is-pinned/);
 assert.equal(buttons()[0].textContent,'✓ Отслеживается · Выключить');
 assert.equal(h.rpg.getQuestMapState().kind,'targets');
 assert.equal(h.rpg.getQuestMapState().points.length,3);
 const updated={...state,revision:2,quests:{...state.quests,bandit:{stage:2,kills:3}}};
 h.rpg.applyServerProgress(updated,'banditKill');
 assert.match(h.get('trackedQuestText').textContent,/Следопыт Медная Стрела/);
 assert.equal(buttons()[0].textContent,'✓ Отслеживается · Выключить');
 h.get('modalClose').click();
 assert.match(h.get('trackedQuestText').textContent,/Следопыт Медная Стрела/);
 assert.equal(h.rpg.getQuestMapState().kind,'targets');
 h.get('untrackQuest').click();
 assert.equal(h.get('quest').hidden,true);
 assert.equal(h.get('trackedQuestHint').hidden,true);
 assert.equal(h.rpg.getQuestMapState(),null);
});
test('relogged herbalist stage two without acceptance is available, not accidentally active',()=>{
 const p={level:3,experience:0,gold:30,health:200,resource:0,revision:1,
  inventory:Array(12).fill(null),equipment:{},actionBar:[],
  quests:{mentor:{step:12,kills:3},gather:{stage:2,accepted:false},
   bandit:{stage:0,kills:0},banditWeapons:{stage:0},banditChief:{stage:0}}};
 const h=harness({authenticatedProfile:p});
 h.get('journal').click();
 const buttons=descendants(h.get('mbody')).filter(x=>x.textContent==='Доступные');
 buttons[0].click();
 assert.ok(descendants(h.get('mbody')).some(x=>x.textContent.includes('Готово следующее')||x.textContent.includes('Доступно у травницы')));
});
