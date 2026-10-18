import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ITEM_CATALOG,itemStackLimit} from '../../items.js';
import {canWalkCamp} from '../sphere-physics.js';
import {canWadeAtLocal} from '../start-zone.js';
import {BANDIT_CAMP,BANDIT_SPAWNS} from '../creature-registry.js';
import {BANDIT_WEAPON_ITEM,BANDIT_WEAPON_REQUIRED,BANDIT_WEAPON_LOCATIONS,
 BANDIT_WEAPON_INTERACT_RANGE,BANDIT_WEAPON_CAST_SECONDS,banditWeaponNode} from '../bandit-weapons.js';

test('five unique pickable daggers are on solid detailed ground near western camp',()=>{
 assert.equal(BANDIT_WEAPON_REQUIRED,3);
 assert.ok(BANDIT_WEAPON_LOCATIONS.length>=BANDIT_WEAPON_REQUIRED+2);
 assert.equal(new Set(BANDIT_WEAPON_LOCATIONS.map(([x,z])=>x+','+z)).size,
  BANDIT_WEAPON_LOCATIONS.length);
 const nodeIds=new Set();
 for(const [i,[x,z]] of BANDIT_WEAPON_LOCATIONS.entries()){
  const node=banditWeaponNode(i);
  assert.equal(node.itemId,BANDIT_WEAPON_ITEM);
  assert.equal(node.index,i);assert.equal(node.x,x);assert.equal(node.z,z);
  assert.match(node.nodeId,/^gather:3:10[0-4]$/);
  nodeIds.add(node.nodeId);
  assert.ok(canWalkCamp(x,z,.52),'dagger '+i+' is on walkable ground');
  assert.ok(canWadeAtLocal(x,z),'dagger '+i+' is not underwater');
  assert.ok(Math.hypot(x,z)<83,'dagger '+i+' lies on painted terrain');
  assert.ok(Math.hypot(x-BANDIT_CAMP.x,z-BANDIT_CAMP.z)<26,
   'dagger '+i+' lies within the western quest area');
  for(const [mx,mz] of BANDIT_SPAWNS)
   assert.ok(Math.hypot(x-mx,z-mz)>BANDIT_WEAPON_INTERACT_RANGE+5,
    'dagger '+i+' may be collected without a forced pull');
 }
 assert.equal(nodeIds.size,BANDIT_WEAPON_LOCATIONS.length);
 assert.equal(banditWeaponNode(-1),null);
 assert.equal(banditWeaponNode(100),null);
 assert.equal(banditWeaponNode('0'),null);
});
test('dagger is a stackable, unsellable, non-equippable quest item',()=>{
 const item=ITEM_CATALOG[BANDIT_WEAPON_ITEM];
 assert.ok(item);
 assert.equal(item.quest,true);
 assert.equal(item.slot,undefined);
 assert.equal(item.sell,0);
 assert.ok(itemStackLimit(BANDIT_WEAPON_ITEM)>=BANDIT_WEAPON_REQUIRED);
 assert.equal(BANDIT_WEAPON_CAST_SECONDS,1.5);
});
test('portrait RPG actually wires 3D dagger nodes, interaction, and server gathering',()=>{
 const rpg=readFileSync(new URL('../offline-rpg.js',import.meta.url),'utf8');
 const target=readFileSync(new URL('../interaction-targeting.js',import.meta.url),'utf8');
 assert.match(rpg,/createBanditWeaponWorld/);
 assert.match(rpg,/banditWeapons\.update\(clock,weaponsAvailable,distance\)/);
 assert.match(rpg,/sendAccountAction\('banditWeaponStart'/);
 assert.match(rpg,/sendAccountAction\('banditWeaponFinish'/);
 assert.match(rpg,/sendAccountAction\('banditWeaponsTurnIn'/);
 assert.match(target,/banditWeapon:2\.8/);
});
