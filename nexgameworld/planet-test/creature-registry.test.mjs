import test from 'node:test';
import assert from 'node:assert/strict';
import {BANDIT_QUEST_MIN_LEVEL,CREATURE_SPAWNS,creatureById,creatureSpawnHealth,creatureKillReward} from './creature-registry.js';
import {monsterKillExperience} from './mob-levels.js';

test('Dust Trail encounter progression targets levels 3 through 5',()=>{
 const bandits=CREATURE_SPAWNS.filter(m=>m.family==='bandit');
 assert.deepEqual(bandits.map(m=>m.id),['bandit-0','bandit-1','bandit-2','bandit-3']);
 assert.deepEqual(bandits.map(m=>m.level),[3,3,4,5]);
 assert.equal(BANDIT_QUEST_MIN_LEVEL,3);
 assert.equal(bandits.filter(m=>m.boss).length,1);
 for(const mob of bandits){
  assert.equal(creatureById(mob.id),mob);
  assert.ok(creatureSpawnHealth(mob)>0);
  assert.ok(creatureKillReward(mob).xp>0);
  assert.equal(creatureKillReward(mob).gold,0,'coins must be picked up, not auto-awarded');
 }
 assert.ok(creatureSpawnHealth(bandits[3])>creatureSpawnHealth(bandits[2]));
 assert.ok(monsterKillExperience(3,bandits[0].level,creatureKillReward(bandits[0]).xp)>0);
});
