import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITEM_CATALOG,deriveStats} from '../../items.js';
import {equipFromBag,unequipToBag} from '../equipment-rules.js';
const fresh=()=>({level:10,hp:60,equipment:{},inventory:[]});
test('equipping stamina does not heal; unequipping clamps HP to new maximum',()=>{
 const id=Object.keys(ITEM_CATALOG).find(id=>ITEM_CATALOG[id].slot!=='weapon'&&ITEM_CATALOG[id].stamina>0);
 const s=fresh();s.inventory.push({id,qty:1});
 assert.ok(equipFromBag(s,id).ok);assert.equal(s.hp,60);
 s.hp=deriveStats(s.level,s.equipment).maxHp;
 assert.ok(unequipToBag(s,ITEM_CATALOG[id].slot).ok);
 assert.equal(s.hp,deriveStats(s.level,{}).maxHp);
});
test('all armor slots and both shield kinds reject equip/unequip in combat without mutation',()=>{
 for(const [id,def] of Object.entries(ITEM_CATALOG).filter(([,d])=>d.slot&&d.slot!=='weapon')){
  const s=fresh();s.inventory.push({id,qty:1});const before=structuredClone(s);
  assert.equal(equipFromBag(s,id,true).ok,false,id);assert.deepEqual(s,before,id);
  s.inventory=[];s.equipment[def.slot]={id};const equipped=structuredClone(s);
  assert.equal(unequipToBag(s,def.slot,true).ok,false,id);assert.deepEqual(s,equipped,id);
 }
});
test('weapon swaps in combat exchange the same cell in a full bag',()=>{
 const s=fresh();s.equipment.weapon={id:'wornAxe'};
 s.inventory=[{id:'feebleSword',qty:1},...Array.from({length:11},()=>({id:'feather',qty:20}))];
 assert.ok(equipFromBag(s,'feebleSword',true).ok);
 assert.equal(s.inventory.length,12);assert.equal(s.inventory[0].id,'wornAxe');
 assert.equal(s.equipment.weapon.id,'feebleSword');assert.equal(s.hp,60);
 const before=structuredClone(s);assert.equal(unequipToBag(s,'weapon',true).ok,false);assert.deepEqual(s,before);
 s.inventory.pop();assert.ok(unequipToBag(s,'weapon',true).ok);assert.equal(s.equipment.weapon,undefined);
});
test('missing, invalid and level-locked pieces leave equipment and bag unchanged',()=>{
 for(const id of ['unknown','feather','feebleSword']){
  const s={...fresh(),level:1,inventory:[{id,qty:1}]},before=structuredClone(s);
  assert.equal(equipFromBag(s,id).ok,false);assert.deepEqual(s,before);
 }
 const s=fresh(),before=structuredClone(s);assert.equal(equipFromBag(s,'wornAxe').ok,false);assert.deepEqual(s,before);
});
