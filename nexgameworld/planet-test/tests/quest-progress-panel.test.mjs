import test from 'node:test';
import assert from 'node:assert/strict';
import {questProgressSummary,renderQuestProgressPanel} from '../quest-progress-panel.js';
import {harness,descendants} from './harness.mjs';
const state=()=>({quest:1,kills:2,gatherStage:1,gatherAvailable:false,
 banditQuest:{stage:1,kills:2},banditWeaponsQuest:{stage:0},banditChiefQuest:{stage:0},
 inventory:[{id:'meadowFlower',qty:2}]});
test('short labels use real quest counters, not estimated map target counts',()=>{
 const s=state();
 assert.deepEqual(questProgressSummary('mentor',s).detail,'Убито 2 / 3');
 assert.deepEqual(questProgressSummary('gather-1',s).detail,'Собрано 2 / 4');
 assert.deepEqual(questProgressSummary('bandit-trail',s).detail,'Убито 2 / 3');
 s.quest=2;assert.equal(questProgressSummary('mentor',s).detail,'Убито 3 / 3 · Сдать');
 s.gatherStage=2;s.inventory=[{id:'sunRoot',qty:3}];
 assert.equal(questProgressSummary('gather-2',s).detail,'Собрано 3 / 3 · Сдать');
 s.banditQuest.stage=3;s.banditWeaponsQuest.stage=1;
 s.inventory=[{id:'banditDagger',qty:2}];
 assert.equal(questProgressSummary('bandit-weapons',s).detail,'Собрано 2 / 3');
 s.banditWeaponsQuest.stage=2;s.banditChiefQuest.stage=1;
 assert.equal(questProgressSummary('bandit-chief',s).detail,'Убито 0 / 1');
 s.banditChiefQuest.stage=2;
 assert.equal(questProgressSummary('bandit-chief',s).detail,'Убито 1 / 1 · Сдать');
});
test('scout and relic steps summarize state without invented numerical progress',()=>{
 const s=state();s.quest=4;
 assert.equal(questProgressSummary('mentor',s).detail,'Найти перо');
 s.quest=5;assert.match(questProgressSummary('mentor',s).detail,/Сдать/);
 s.quest=7;assert.equal(questProgressSummary('mentor',s).detail,'Разведать пастбище');
 s.quest=8;assert.match(questProgressSummary('mentor',s).detail,/Сдать/);
 s.quest=10;assert.equal(questProgressSummary('mentor',s).detail,'Убито 0 / 1');
 s.quest=11;assert.equal(questProgressSummary('mentor',s).detail,'Убито 1 / 1 · Сдать');
 s.quest=12;assert.equal(questProgressSummary('mentor',s),null);
});
test('renderer hides empty, enforces three rows and avoids DOM markup injection',()=>{
 const h=harness({save:{quest:0}});
 const p=h.get('questProgressPanel');
 const rows=['a','b','c','d'].map((id,n)=>({id,title:'Задание '+n,detail:'Собрано '+n+' / 4',complete:n===3}));
 renderQuestProgressPanel(document,p,rows);
 assert.equal(p.hidden,false);
 const entries=descendants(p).filter(el=>el.className.includes('ngw-quest-panel-item'));
 assert.equal(entries.length,3);
 assert.equal(descendants(p).find(el=>el.className==='ngw-quest-panel-heading').textContent,'ЗАДАНИЯ  3/3');
 renderQuestProgressPanel(document,p,[]);
 assert.equal(p.hidden,true);
 assert.equal(p.children.length,0);
});
test('live panel updates quest count on server kill credit with three quests',()=>{
 const profile={level:3,experience:0,gold:30,health:200,resource:0,revision:1,
  inventory:Array(12).fill(null),equipment:{},actionBar:[],
  quests:{mentor:{step:1,kills:0},gather:{stage:1,accepted:true},
   bandit:{stage:1,kills:2},banditWeapons:{stage:0},banditChief:{stage:0}}};
 const h=harness({authenticatedProfile:profile});
 const labels=()=>descendants(h.get('questProgressPanel')).map(x=>x.textContent);
 assert.ok(labels().includes('Убито 2 / 3'));
 assert.ok(labels().includes('Убито 0 / 3'));
 const quests={...profile.quests,mentor:{step:1,kills:1},bandit:{stage:2,kills:3}};
 h.rpg.applyServerProgress({...profile,revision:2,quests},'mob');
 assert.ok(labels().includes('Убито 1 / 3'));
 assert.ok(labels().includes('Убито 3 / 3 · Сдать'));
});
