import test from 'node:test';
import assert from 'node:assert/strict';
import {BANDIT_SPAWNS,BANDIT_BOSS_INDEX,BANDIT_BOSS_SCALE,creatureById,creatureSpawnHealth,CREATURE_SPAWNS} from './creature-registry.js';
import {createSphericalMobs} from '../server/spherical-pve.js';

test('bandit chief uses the existing humanoid family and unique stable spawn ID',()=>{
 const chief=creatureById('bandit-'+BANDIT_BOSS_INDEX);
 assert.ok(chief);
 assert.equal(chief.family,'bandit');
 assert.equal(chief.boss,true);
 assert.equal(chief.level,5);
 assert.equal(chief.name,'Главарь Пыльной тропы');
 assert.ok(BANDIT_BOSS_SCALE>1&&BANDIT_BOSS_SCALE<1.8);
 assert.equal(BANDIT_SPAWNS.length,4);
 assert.equal(new Set(CREATURE_SPAWNS.map(m=>m.id)).size,CREATURE_SPAWNS.length);
});
test('server creates elite chief with more health than ordinary raiders',()=>{
 const chief=creatureById('bandit-3'),scout=creatureById('bandit-2');
 assert.ok(creatureSpawnHealth(chief)>creatureSpawnHealth(scout));
 const live=createSphericalMobs().find(m=>m.id===chief.id);
 assert.equal(live.boss,true);
 assert.equal(live.maxHp,creatureSpawnHealth(chief));
});
