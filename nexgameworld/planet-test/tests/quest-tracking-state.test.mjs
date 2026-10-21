import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuestTracking,MAX_TRACKED_QUESTS} from '../quest-tracking-state.js';
import {acceptedQuestIds} from '../starter-quest-guidance.js';
import {harness,descendants} from './harness.mjs';
const data=()=>({quest:0,gatherStage:0,gatherAvailable:false,
 banditQuest:{stage:0,kills:0},banditWeaponsQuest:{stage:0},banditChiefQuest:{stage:0}});
function tracker(state,values=new Map(),key='char-a'){
 const storage={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,v)};
 return {choice:createQuestTracking({state,storage,key}),values};
}
test('acceptance adds up to three; fourth replaces oldest, no quest is abandoned',()=>{
 const state=data(),{choice,values}=tracker(state);
 assert.equal(MAX_TRACKED_QUESTS,3);
 assert.equal(choice.sync(),null);
 state.quest=1;assert.deepEqual((choice.sync(),choice.trackedIds),['mentor']);
 state.gatherStage=1;assert.deepEqual((choice.sync(),choice.trackedIds),['gather-1','mentor']);
 state.banditQuest.stage=1;
 assert.deepEqual((choice.sync(),choice.trackedIds),['bandit-trail','gather-1','mentor']);
 assert.equal(acceptedQuestIds(state).length,3);
 state.banditQuest.stage=3;state.banditWeaponsQuest.stage=1;
 assert.deepEqual((choice.sync(),choice.trackedIds),['bandit-weapons','gather-1','mentor']);
 assert.equal(choice.trackedIds.length,3);
 assert.deepEqual(JSON.parse(values.get('char-a')),choice.trackedIds);
 choice.toggle('mentor');
 assert.equal(choice.trackedIds.includes('mentor'),false);
 choice.toggle('mentor');
 assert.equal(choice.trackedIds[0],'mentor');
 choice.sync();assert.equal(choice.trackedIds[0],'mentor','draws do not re-pin');
 choice.toggle('mentor');choice.toggle('bandit-weapons');choice.toggle('gather-1');
 assert.deepEqual(choice.trackedIds,[],'manual opt-out is respected');
 state.banditWeaponsQuest.stage=2;state.banditChiefQuest.stage=1;
 choice.sync();assert.deepEqual(choice.trackedIds,['bandit-chief']);
});
test('stored ordered list and v1 value migrate, old or completed quests are filtered',()=>{
 let state=data();state.quest=1;state.gatherStage=1;
 const values=new Map([['hero-a','mentor']]);
 let t=tracker(state,values,'hero-a').choice;
 assert.deepEqual(t.trackedIds,['mentor']);
 t.toggle('gather-1');
 t=tracker(state,values,'hero-a').choice;
 assert.deepEqual(t.trackedIds,['gather-1','mentor']);
 t.toggle('mentor');t.toggle('gather-1');
 t=tracker(state,values,'hero-a').choice;
 assert.deepEqual(t.trackedIds,[],'explicitly disabled stays disabled across reload');
 state.banditQuest.stage=1;t.sync();
 assert.deepEqual(t.trackedIds,['bandit-trail'],'future acceptance takes precedence');
 const other=tracker(state,values,'hero-b').choice;
 assert.deepEqual(other.trackedIds,['bandit-trail','gather-1','mentor'],'per-character settings');
 values.set('hero-c','["fake","mentor","mentor","gather-1","bandit-trail","bandit-chief"]');
 assert.deepEqual(tracker(state,values,'hero-c').choice.trackedIds,['mentor','gather-1','bandit-trail']);
});
test('server progress updates all three quests without changing user selections',()=>{
 const base={level:3,experience:0,gold:30,health:200,resource:0,revision:1,
  inventory:Array(12).fill(null),equipment:{},actionBar:[],
  quests:{mentor:{step:1,kills:1},gather:{stage:0,accepted:false},
   bandit:{stage:0,kills:0},banditWeapons:{stage:0},banditChief:{stage:0}}};
 const h=harness({authenticatedProfile:base});
 const panel=h.get('questProgressPanel');
 assert.equal(panel.hidden,false);
 assert.equal(descendants(panel).filter(x=>x.className==='ngw-quest-panel-item').length,1);
 assert.ok(descendants(panel).some(x=>x.textContent==='Убито 1 / 3'));
 const gather={...base.quests,gather:{stage:1,accepted:true}};
 h.rpg.applyServerProgress({...base,revision:2,quests:gather},'gatherAccept');
 assert.equal(h.rpg.getQuestMapState().kind,'area');
 assert.equal(h.rpg.getQuestMapState().overlays.length,1);
 const bandit={...gather,bandit:{stage:1,kills:0}};
 h.rpg.applyServerProgress({...base,revision:3,quests:bandit},'banditAccept');
 assert.equal(h.rpg.getQuestMapState().kind,'targets');
 assert.equal(h.rpg.getQuestMapState().overlays.length,2);
 assert.equal(descendants(panel).filter(x=>x.className==='ngw-quest-panel-item').length,3);
 assert.equal(h.get('quest').hidden,true,'old full objective block stays gone');
 h.get('journal').click();
 const buttons=()=>descendants(h.get('mbody')).filter(x=>x.textContent==='✓ Выключить');
 assert.equal(buttons().length,3);
 buttons()[0].click();
 assert.equal(descendants(panel).filter(x=>x.className==='ngw-quest-panel-item').length,2);
 assert.equal(h.rpg.getQuestMapState().overlays.length,1);
 const again=descendants(h.get('mbody')).find(x=>x.textContent==='Отслеживать');
 assert.ok(again);again.click();
 assert.equal(descendants(panel).filter(x=>x.className==='ngw-quest-panel-item').length,3);
 h.get('modalClose').click();
 h.rpg.applyServerProgress({...base,revision:4,quests:{...bandit,bandit:{stage:2,kills:3}}},'banditKill');
 assert.ok(descendants(panel).some(x=>x.textContent==='Убито 3 / 3 · Сдать'));
 h.get('untrackQuest').click();
 assert.equal(panel.hidden,true);
 assert.equal(h.rpg.getQuestMapState(),null);
});
test('no accepted quests -> no visible progress panel',()=>{
 const h=harness({save:{quest:0,gatherStage:0,gatherAvailable:false}});
 assert.equal(h.get('questProgressPanel').hidden,true);
 assert.equal(h.rpg.getQuestMapState(),null);
});
