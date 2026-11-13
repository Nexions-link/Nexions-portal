import test from 'node:test';
import assert from 'node:assert/strict';
import {readForestHunt,forestHuntJournal,FOREST_DEN_SITES} from '../forest-hunt-quest.js';
import {acceptedQuestIds,trackedQuestMap} from '../starter-quest-guidance.js';
import {questProgressSummary} from '../quest-progress-panel.js';
import {canWalkCamp} from '../sphere-physics.js';
import {paintTrackedQuestOnMinimap} from '../quest-map-overlay.js';
test('wolf hunt is trackable and markers follow hunting and clue phases',()=>{
 const s={level:5,expedition:{stage:2,visited:[false,false,false]},
  forestHunt:{stage:1,kills:1,traces:[false,false]}};
 assert.equal(forestHuntJournal(null,s).status,'available');
 assert.ok(acceptedQuestIds(s).includes('forest-hunt'));
 assert.equal(trackedQuestMap('forest-hunt',s).kind,'targets');
 assert.equal(questProgressSummary('forest-hunt',s).detail,'Убито 1 / 3');
 s.forestHunt.stage=3;
 assert.equal(trackedQuestMap('forest-hunt',s).kind,'landmarks');
 assert.equal(trackedQuestMap('forest-hunt',s).points.length,2);
 s.forestHunt.traces[0]=true;
 assert.equal(trackedQuestMap('forest-hunt',s).points.length,1);
 s.forestHunt.stage=5;
 assert.ok(!acceptedQuestIds(s).includes('forest-hunt'));
 assert.equal(forestHuntJournal(s.forestHunt,s).status,'completed');
 assert.deepEqual(readForestHunt(null),{stage:0,kills:0,traces:[false,false]});
});
test('wolf den sites are walkable without additional invisible colliders',()=>{
 for(const p of FOREST_DEN_SITES)assert.equal(canWalkCamp(p.x,p.z,2.3,261),true);
});

// Clue locations must remain visible as directional edge arrows when the
// player is outside the small tangent minimap; completed clues disappear.
test('pack tracks stay discoverable from afar and only uninspected clues show',()=>{
 const state={level:5,forestHunt:{stage:3,kills:3,traces:[false,false]}};
 const calls=[];
 const ctx=new Proxy({},{
  get:(obj,key)=>key in obj?obj[key]:(...args)=>calls.push([key,...args]),
  set:(obj,key,value)=>{obj[key]=value;return true}
 });
 const viewport={center:{x:100000,z:100000},size:240,rotation:0};
 const paint=()=>{calls.length=0;paintTrackedQuestOnMinimap(ctx,
  trackedQuestMap('forest-hunt',state),3.8,viewport);
  return calls.filter(row=>row[0]==='rotate').length;};
 assert.equal(paint(),2,'both distant traces must have edge arrows');
 state.forestHunt.traces[0]=true;
 assert.equal(paint(),1,'inspected trace must be removed immediately');
 state.forestHunt.traces[1]=true;
 assert.equal(paint(),0,'no arrows remain after both traces are inspected');
 state.forestHunt.stage=4;
 assert.equal(trackedQuestMap('forest-hunt',state).kind,'waypoint','turn-in uses the scout marker');
});
