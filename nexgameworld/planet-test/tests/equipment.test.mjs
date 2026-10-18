import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITEM_CATALOG,deriveStats} from '../../items.js';
import {equipFromBag,unequipToBag} from '../equipment-rules.js';
import {harness,descendants} from './harness.mjs';
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


test('portrait character sheet exposes real slots beside model and weapon/shield below',()=>{
 const h=harness({save:{equipment:{weapon:{id:'wornAxe'},shield:{id:'batteredBuckler'},chest:{id:'chainVest'}}}});
 h.get('character').click();
 assert.equal(h.get('modal').dataset.kind,'character');
 const children=descendants(h.get('mbody'));
 const slots=children.filter(e=>typeof e.dataset?.slot==='string');
 assert.equal(slots.length,9);
 assert.deepEqual(slots.map(e=>e.dataset.slot),['head','chest','hands','wrists','waist','legs','feet','weapon','shield']);
 assert.equal(children.filter(e=>e.className==='character-preview-viewport').length,1);
 assert.equal(children.filter(e=>e.className==='character-rotate').length,1);
 assert.ok(slots.find(e=>e.dataset.slot==='weapon').className.includes('equipped'));
 assert.ok(slots.find(e=>e.dataset.slot==='shield').className.includes('equipped'));
 assert.ok(children.some(e=>e.textContent==='Основные характеристики'));
 assert.ok(children.some(e=>e.textContent==='Здоровье'));
 assert.equal(h.rpg.movementLocked,true);
 h.get('modalClose').click();
 assert.equal(h.rpg.movementLocked,false);
});
test('tapping character chest slot unequips through existing inventory rules',()=>{
 const h=harness({save:{equipment:{chest:{id:'chainVest'},weapon:{id:'wornAxe'}}}});
 h.get('character').click();
 const slot=descendants(h.get('mbody')).find(e=>e.dataset.slot==='chest');
 assert.ok(slot.className.includes('equipped'));
 slot.click();
 assert.equal(h.rpg.state.equipment.chest,undefined);
 assert.equal(h.rpg.state.inventory.some(e=>e.id==='chainVest'),true);
 assert.equal(descendants(h.get('mbody')).find(e=>e.dataset.slot==='chest').className,'character-socket');
 h.get('modalClose').click();
});
