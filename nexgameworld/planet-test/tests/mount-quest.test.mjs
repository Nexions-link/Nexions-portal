import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultMountQuest,readMountQuest,mountQuestOffer,mountQuestJournal,
 mountQuestWaypoint,MOUNT_QUEST_SCOUT,MOUNT_QUEST_SITES} from '../mount-quest.js';
import {isAcceptedQuest,questWaypoint,trackedQuestMap,acceptedQuestIds} from '../starter-quest-guidance.js';
import {questProgressSummary} from '../quest-progress-panel.js';
const state=(mountQuest=defaultMountQuest())=>({
 level:10,expedition:{stage:4,visited:[true,true,true]},
 forestHunt:{stage:5,kills:3,traces:[true,true]},
 mountQuest,mounts:[],quest:12,inventory:[]
});
test('quest offer is at level 10 after prior forest service',()=>{
 const s=state();
 assert.equal(mountQuestOffer(s),true);
 assert.equal(mountQuestOffer({...s,level:9}),false);
 assert.equal(mountQuestOffer({...s,forestHunt:{stage:4}}),false);
 assert.equal(mountQuestOffer({...s,mounts:['forest_wolf']}),false);
 assert.equal(mountQuestJournal(s.mountQuest,s).status,'available');
});
test('quest targets follow the two unvisited trace locations',()=>{
 const s=state({stage:1,traces:[false,false]});
 assert.equal(isAcceptedQuest('forest-wolf',s),true);
 assert.ok(acceptedQuestIds(s).includes('forest-wolf'));
 assert.deepEqual(questWaypoint('forest-wolf',s),{
  title:MOUNT_QUEST_SITES[0].title,x:MOUNT_QUEST_SITES[0].x,z:MOUNT_QUEST_SITES[0].z
 });
 const markers=trackedQuestMap('forest-wolf',s);
 assert.equal(markers.kind,'landmarks');
 assert.equal(markers.points.length,2);
 assert.equal(questProgressSummary('forest-wolf',s).detail,'Изучено 0 / 2');
 s.mountQuest.traces[0]=true;
 assert.equal(mountQuestWaypoint(s.mountQuest).index,1);
 assert.equal(trackedQuestMap('forest-wolf',s).points.length,1);
 s.mountQuest={stage:2,traces:[true,true]};
 assert.equal(questWaypoint('forest-wolf',s).x,MOUNT_QUEST_SCOUT.x);
 assert.equal(questProgressSummary('forest-wolf',s).complete,true);
});
test('collection persists after quest completion, no active waypoint',()=>{
 const s=state({stage:3,traces:[true,true]});s.mounts=['forest_wolf'];
 assert.equal(isAcceptedQuest('forest-wolf',s),false);
 assert.equal(questWaypoint('forest-wolf',s),null);
 assert.equal(mountQuestJournal(s.mountQuest,s).status,'completed');
 assert.deepEqual(readMountQuest(null),defaultMountQuest());
 assert.deepEqual(readMountQuest({stage:1,traces:['fake',true]}),defaultMountQuest());
});
