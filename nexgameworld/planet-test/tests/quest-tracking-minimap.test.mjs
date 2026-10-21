import test from 'node:test';
import assert from 'node:assert/strict';
import {isAcceptedQuest,trackedQuestMap} from '../starter-quest-guidance.js';
import {paintTrackedQuestOnMinimap} from '../quest-map-overlay.js';
import {DOLGONOG_BOSS_INDEX} from '../mob-levels.js';
import {GATHER_QUESTS} from '../gather-world.js';
import {BANDIT_WEAPON_LOCATIONS} from '../bandit-weapons.js';
import {harness,descendants} from './harness.mjs';
const state=()=>({level:3,quest:0,gatherStage:0,gatherAvailable:true,
 banditQuest:{stage:0,kills:0},banditWeaponsQuest:{stage:0},banditChiefQuest:{stage:0}});
test('offered quests do not create tracking or reveal map markers',()=>{
 const s=state();
 for(const id of ['mentor','gather-1','bandit-trail','bandit-weapons','bandit-chief']){
  assert.equal(isAcceptedQuest(id,s),false,id);
  assert.equal(trackedQuestMap(id,s),null,id);
 }
 s.quest=3;assert.equal(isAcceptedQuest('mentor',s),false);
 s.quest=12;s.gatherStage=2;s.gatherAvailable=true;
 assert.equal(trackedQuestMap('gather-2',s),null);
 s.banditQuest.stage=3;
 assert.equal(trackedQuestMap('bandit-weapons',s),null);
});
test('accepted battle quests show only the correct static enemy spawn points',()=>{
 const s=state();s.quest=1;
 let m=trackedQuestMap('mentor',s);
 assert.equal(m.kind,'targets');assert.equal(m.points.length,DOLGONOG_BOSS_INDEX);
 assert.equal(m.points.some(p=>p.x===39&&p.z===47),false);
 s.quest=10;m=trackedQuestMap('mentor',s);
 assert.equal(m.points.length,1);assert.equal(m.bossRoute,true);
 s.quest=12;s.banditQuest.stage=1;
 assert.equal(trackedQuestMap('bandit-trail',s).points.length,3);
 s.banditQuest.stage=3;s.banditWeaponsQuest.stage=2;s.banditChiefQuest.stage=1;
 assert.deepEqual(trackedQuestMap('bandit-chief',s).points,[{x:-72,z:33}]);
 s.banditChiefQuest.stage=2;
 assert.equal(trackedQuestMap('bandit-chief',s).label,'Следопыт Медная Стрела');
 s.banditChiefQuest.stage=3;
 assert.equal(trackedQuestMap('bandit-chief',s),null);
});
test('gather tasks show search areas and then a turn-in dot',()=>{
 const s=state();s.quest=12;s.gatherAvailable=false;
 for(let stage=1;stage<=3;stage++){
  s.gatherStage=stage;
  const m=trackedQuestMap('gather-'+stage,s);
  assert.equal(m.kind,'area');
  for(const [x,z] of GATHER_QUESTS[stage].locations)
   assert.ok(Math.abs(x-m.center.x)<=m.radiusX&&Math.abs(z-m.center.z)<=m.radiusZ);
  const done=trackedQuestMap('gather-'+stage,s,[{id:GATHER_QUESTS[stage].item,qty:GATHER_QUESTS[stage].count}]);
  assert.equal(done.kind,'waypoint');assert.equal(done.points.length,1);
 }
 s.gatherStage=4;assert.equal(trackedQuestMap('gather-3',s),null);
 s.banditQuest.stage=3;s.banditWeaponsQuest.stage=1;
 const m=trackedQuestMap('bandit-weapons',s);
 assert.equal(m.kind,'area');
 for(const [x,z] of BANDIT_WEAPON_LOCATIONS)
  assert.ok(Math.abs(x-m.center.x)<=m.radiusX&&Math.abs(z-m.center.z)<=m.radiusZ);
});
test('minimap painter draws nothing when tracking is off, static dots or search ellipse otherwise',()=>{
 const events=[];
 const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:(...args)=>events.push([k,...args]),
  set:(o,k,v)=>{events.push([k,v]);o[k]=v;return true}});
 paintTrackedQuestOnMinimap(ctx,null,3.8);
 assert.equal(events.length,0);
 paintTrackedQuestOnMinimap(ctx,{kind:'targets',points:[{x:1,z:2},{x:3,z:4}]},3.8);
 assert.equal(events.filter(e=>e[0]==='arc').length,2);
 assert.equal(events.filter(e=>e[0]==='fillText'&&e[1]==='⚔').length,2);
 paintTrackedQuestOnMinimap(ctx,{kind:'area',center:{x:4,z:5},radiusX:8,radiusZ:9},3.8);
 assert.equal(events.filter(e=>e[0]==='ellipse').length,1);
 assert.equal(events.filter(e=>e[0]==='restore').length,2);
});
test('no accepted quest means no HUD; journal remains accessible',()=>{
 const h=harness({save:{quest:0,gatherStage:0,gatherAvailable:false}});
 assert.equal(h.get('quest').hidden,true);
 assert.equal(h.rpg.getQuestMapState(),null);
 h.get('journal').click();
 assert.equal(descendants(h.get('mbody')).filter(x=>x.textContent==='Отслеживать').length,0);
 h.get('modalClose').click();
});
test('gathering tracking and quick untrack clear all map hints immediately',()=>{
 const h=harness({save:{quest:12,gatherStage:1,gatherAvailable:false}});
 h.get('journal').click();
 assert.equal(h.rpg.getQuestMapState().kind,'area','accepted gathering auto-tracks at first load');
 const stop=descendants(h.get('mbody')).find(x=>String(x.textContent).startsWith('✓ Отслеживается'));
 assert.ok(stop,'journal can disable automatic tracking');
 assert.equal(h.get('quest').hidden,true,'no distance panel under any circumstances');
 h.get('untrackQuest').click();
 assert.equal(h.rpg.getQuestMapState(),null);
 assert.equal(h.get('quest').hidden,true);
});
test('off map and UI uses only tracked accepted objective, buttons work by touch',async()=>{
 const fs=await import('node:fs');
 const style=fs.readFileSync(new URL('../quest-tracking.css',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const js=fs.readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(style,/#quest\[hidden\]/);
 assert.match(style,/#quest\{display:none!important\}/);
 assert.match(html,/<aside id="quest" hidden>/);
 assert.match(html,/id="untrackQuest"/);
 assert.match(js,/paintTrackedQuestOnMinimap\(ctx,rpg.getQuestMapState\(\),scale\)/);
});

// Never draw swords for a turn-in destination, even if it follows a kill quest.
test('waypoint marker is not a sword, including the final quest turn-in',()=>{
 const events=[];
 const ctx=new Proxy({}, {get:(obj,key)=>key in obj?obj[key]:(...values)=>events.push([key,...values]),
  set:(obj,key,value)=>{obj[key]=value;return true}});
 paintTrackedQuestOnMinimap(ctx,{kind:'waypoint',points:[{x:3,z:4}]},3.8);
 assert.equal(events.filter(x=>x[0]==='fillText'&&x[1]==='⚔').length,0);
 assert.ok(events.some(x=>x[0]==='closePath'));
});
