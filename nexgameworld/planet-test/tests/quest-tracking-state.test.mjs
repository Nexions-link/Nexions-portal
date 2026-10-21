import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuestTracking} from '../quest-tracking-state.js';
import {acceptedQuestIds} from '../starter-quest-guidance.js';
import {harness,descendants} from './harness.mjs';
const data=()=>({quest:0,gatherStage:0,gatherAvailable:false,
 banditQuest:{stage:0,kills:0},banditWeaponsQuest:{stage:0},banditChiefQuest:{stage:0}});
function tracker(state,values=new Map(),key='char-a'){
 const storage={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,v)};
 return {choice:createQuestTracking({state,storage,key}),values};
}
test('taking a quest tracks it immediately; taking a second switches to that one',()=>{
 const state=data(),{choice,values}=tracker(state);
 assert.equal(choice.sync(),null);
 state.quest=1;assert.equal(choice.sync(),'mentor');
 state.gatherStage=1;assert.equal(choice.sync(),'gather-1');
 assert.equal(values.get('char-a'),'gather-1');
 choice.select('mentor');assert.equal(choice.sync(),'mentor','journal selection persists on redraw');
 state.banditQuest.stage=1;assert.equal(choice.sync(),'bandit-trail','new quest replaces manual choice');
 assert.equal(acceptedQuestIds(state).length,3);
 choice.select('gather-1');assert.equal(choice.sync(),'gather-1');
 choice.select(null);
 assert.equal(choice.sync(),null,'manual off is respected until new acceptance');
 state.banditQuest.stage=2;assert.equal(choice.sync(),null,'mob kills do not re-enable');
 state.gatherStage=2;state.gatherAvailable=true;
 assert.equal(choice.sync(),null,'available new quest is not accepted');
 state.gatherAvailable=false;
 assert.equal(choice.sync(),'gather-2','accepting later gather stage enables it');
 state.gatherStage=3;state.gatherAvailable=true;
 assert.equal(choice.sync(),null,'turn-in clears completed tracked quest');
 state.gatherAvailable=false;
 assert.equal(choice.sync(),'gather-3');
});
test('saved selected or disabled state survives reload without forced re-enable',()=>{
 let state=data();state.quest=1;state.gatherStage=1;
 const values=new Map([['hero-1','mentor']]);
 let t=tracker(state,values,'hero-1').choice;
 assert.equal(t.sync(),'mentor');
 t.select('gather-1');
 t=tracker(state,values,'hero-1').choice;
 assert.equal(t.sync(),'gather-1');
 t.select(null);
 t=tracker(state,values,'hero-1').choice;
 assert.equal(t.sync(),null);
 state.banditQuest.stage=1;
 assert.equal(t.sync(),'bandit-trail','future acceptance overrides previous opt-out');
 const other=tracker(state,values,'hero-2').choice;
 assert.equal(other.sync(),'bandit-trail','separate character has independent preference');
});
test('online acceptance from server switches minimap swords and collection area',()=>{
 const base={level:3,experience:0,gold:30,health:200,resource:0,revision:1,
  inventory:Array(12).fill(null),equipment:{},actionBar:[],
  quests:{mentor:{step:1,kills:0},gather:{stage:0,accepted:false},
   bandit:{stage:0,kills:0},banditWeapons:{stage:0},banditChief:{stage:0}}};
 const h=harness({authenticatedProfile:base});
 assert.equal(h.rpg.getQuestMapState().kind,'targets');
 assert.equal(h.get('quest').hidden,true);
 h.rpg.applyServerProgress({...base,revision:2,
  quests:{...base.quests,gather:{stage:1,accepted:true}}},'gatherAccept');
 assert.equal(h.rpg.getQuestMapState().kind,'area','accepted gather takes over');
 h.rpg.applyServerProgress({...base,revision:3,
  quests:{...base.quests,gather:{stage:1,accepted:true},
   bandit:{stage:1,kills:0}}},'banditAccept');
 assert.equal(h.rpg.getQuestMapState().kind,'targets');
 assert.equal(h.rpg.getQuestMapState().points.length,3);
 h.get('journal').click();
 const buttons=descendants(h.get('mbody')).filter(x=>x.textContent==='Отслеживать');
 assert.ok(buttons.length>=2,'both accepted quests can be selected');
 buttons[0].click();
 assert.equal(h.get('quest').hidden,true,'no distance label even when switching');
});
