import test from 'node:test';
import assert from 'node:assert/strict';
import {readForestHunt,forestHuntJournal,FOREST_DEN_SITES} from '../forest-hunt-quest.js';
import {acceptedQuestIds,trackedQuestMap} from '../starter-quest-guidance.js';
import {questProgressSummary} from '../quest-progress-panel.js';
import {canWalkCamp} from '../sphere-physics.js';
test('wolf hunt is trackable and markers follow hunting and clue phases',()=>{
 const s={level:5,expedition:{stage:2,visited:[false,false,false]},
  forestHunt:{stage:1,kills:1,traces:[false,false]}};
 assert.equal(forestHuntJournal(null,s).status,'available');
 assert.ok(acceptedQuestIds(s).includes('forest-hunt'));
 assert.equal(trackedQuestMap('forest-hunt',s).kind,'targets');
 assert.equal(questProgressSummary('forest-hunt',s).detail,'Убито 1 / 3');
 s.forestHunt.stage=3;
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
