import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPEDITION_SITES,EXPEDITION_SCOUT,readExpedition,expeditionJournal} from '../expedition-quest.js';
import {acceptedQuestIds,trackedQuestMap} from '../starter-quest-guidance.js';
import {blocksForestAtLocal,forestTrailLatitude} from '../whispering-forest.js';
test('landmarks are reachable on clearings beyond the path',()=>{
 assert.equal(EXPEDITION_SITES.length,3);
 for(const p of EXPEDITION_SITES){
  assert.ok(Math.abs(p.lat-forestTrailLatitude(p.lon))*261>18);
  assert.equal(blocksForestAtLocal(p.x,p.z),false);
 }
 assert.equal(blocksForestAtLocal(EXPEDITION_SCOUT.x,EXPEDITION_SCOUT.z),false);
});
test('expedition appears in journal, tracker and map and disappears on completion',()=>{
 const s={expedition:{stage:2,visited:[true,false,false]}};
 assert.ok(acceptedQuestIds(s).includes('expedition'));
 assert.equal(trackedQuestMap('expedition',s).points.length,2);
 assert.equal(expeditionJournal(s.expedition,5).progress,'Исследовано 1 / 3');
 s.expedition.stage=4;
 assert.ok(!acceptedQuestIds(s).includes('expedition'));
 assert.equal(expeditionJournal(s.expedition,5).status,'completed');
 assert.deepEqual(readExpedition(null),{stage:0,visited:[false,false,false]});
});