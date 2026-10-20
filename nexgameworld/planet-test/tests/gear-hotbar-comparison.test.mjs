import test from 'node:test';
import assert from 'node:assert/strict';
import {compareEquipment,itemStatRows} from '../equipment-comparison.js';
import {deriveStats} from '../../items.js';
import {harness,descendants} from './harness.mjs';

test('equipment replacement compares real totals including DPS, health and defense',()=>{
 const gear={weapon:{id:'wornAxe'},chest:{id:'raggedVest'}};
 const upgrade=compareEquipment('feebleSword',4,gear);
 assert.equal(upgrade.slot,'weapon');
 assert.equal(upgrade.currentId,'wornAxe');
 assert.ok(upgrade.after.dps>upgrade.before.dps);
 assert.equal(upgrade.rows.find(r=>r.key==='dps').trend,'better');
 const armor=compareEquipment('chainVest',4,gear);
 assert.equal(armor.currentId,'raggedVest');
 assert.equal(armor.rows.find(r=>r.key==='armor').delta,32);
 assert.equal(armor.overall,'better');
 const downgrade=compareEquipment('raggedVest',4,{chest:{id:'chainVest'}});
 assert.equal(downgrade.overall,'worse');
 assert.equal(compareEquipment('banditCloth',4,gear),null);
 assert.ok(itemStatRows('letterOpener').some(row=>row.key==='dps'));
 assert.ok(itemStatRows('infantryBear').some(row=>row.key==='stamina'));
 assert.deepEqual(armor.after,deriveStats(4,{...gear,chest:{id:'chainVest'}}));
});
test('level restrictions are shown separately from a potential upgrade',()=>{
 const result=compareEquipment('scalpingStrength',4,{weapon:{id:'wornAxe'}});
 assert.equal(result.requirementsMet,false);
 assert.ok(result.meaningful.length);
 assert.equal(compareEquipment('scalpingStrength',6,{weapon:{id:'wornAxe'}}).requirementsMet,true);
});
test('bag detail lists DPS and short signed replacement deltas',()=>{
 const h=harness({save:{level:4,inventory:[{id:'feebleSword',qty:1}],
   equipment:{weapon:{id:'wornAxe'}}}});
 h.get('bag').click();
 const cells=descendants(h.get('mbody')).filter(x=>x.className.includes('inventory-slot'));
 cells[0].click();
 const d=descendants(h.get('mbody'));
 assert.ok(d.some(x=>x.className.includes('ngw-item-stat')&&x.textContent.startsWith('ДПС:')));
 assert.ok(d.some(x=>x.className.includes('ngw-compare-row')&&/^[+−][0-9]+(?:,[0-9]+)? ДПС$/.test(x.textContent)));
 assert.ok(!d.some(x=>x.className==='ngw-item-equipped'||/Урон от|Урон до|Скорость оружия|Сравнение с/.test(x.textContent)));
});
test('bag comparison survives periodic HUD rerenders and server progress without collapsing',()=>{
 const h=harness({save:{level:4,inventory:[{id:'feebleSword',qty:1}],
  equipment:{weapon:{id:'wornAxe'}}}});
 h.get('bag').click();
 const bag=()=>h.get('mbody');
 const first=()=>descendants(bag()).find(x=>x.className?.includes('inventory-slot')&&x.className.includes('occupied'));
 first().click();
 const compare=()=>descendants(bag()).filter(x=>x.className?.includes('ngw-gear-compare'));
 assert.equal(compare().length,1);
 bag().scrollTop=165;
 const preservedGrid=bag().querySelector('.inventory-grid');
 const preservedDetail=bag().querySelector('.inventory-detail');
 for(let i=0;i<20;i++){
  h.rpg.update(.2);
  h.rpg.draw();
  assert.equal(compare().length,1,'comparison must not vanish at refresh '+i);
  assert.equal(first().className.includes('active'),true);
  assert.equal(bag().scrollTop,165);
  assert.equal(bag().querySelector('.inventory-grid'),preservedGrid,
   'Safari inventory nodes must never be detached during unchanged HUD refreshes');
  assert.equal(bag().querySelector('.inventory-detail'),preservedDetail,
   'comparison panel remains the same mounted element');
 }
});
test('bag selection follows item until removed, then clears safely',()=>{
 const h=harness({save:{level:4,inventory:[{id:'feebleSword',qty:1}],
  equipment:{weapon:{id:'wornAxe'}}}});
 h.get('bag').click();
 const bag=()=>h.get('mbody');
 descendants(bag()).find(x=>x.className?.includes('inventory-slot')&&x.className.includes('occupied')).click();
 assert.ok(descendants(bag()).some(x=>x.className?.includes('ngw-gear-compare')));
 h.rpg.state.inventory.splice(0,1);
 h.rpg.draw();
 assert.equal(descendants(bag()).some(x=>x.className?.includes('ngw-gear-compare')),false);
 assert.ok(descendants(bag()).some(x=>x.className==='inventory-detail'&&x.textContent.includes('Нажми')));
});
test('autoattack icon changes with active state and reverts when toggled off',()=>{
 const h=harness({x:-9,z:-26,save:{level:4}});
 h.rpg.draw();
 const auto=()=>h.get('actionsBar').children.find(b=>b.dataset.slot==='0');
 assert.ok(auto());
 const before=auto().querySelector('.planetAbilityIcon').innerHTML;
 h.rpg.targetNearest();auto().click();
 assert.equal(auto().attributes['aria-pressed'],'true');
 assert.equal(auto().className.includes('is-active'),true);
 assert.notEqual(auto().querySelector('.planetAbilityIcon').innerHTML,before);
 auto().click();
 assert.equal(auto().attributes['aria-pressed'],'false');
 assert.equal(auto().className.includes('is-active'),false);
 assert.equal(auto().querySelector('.planetAbilityIcon').innerHTML,before);
});
test('potion charges show 0 and disable action then recover when inventory has stock',()=>{
 const h=harness({save:{inventory:[{id:'wornAxe',qty:1}]}});
 const potion=()=>h.get('actionsBar').children.find(b=>b.dataset.slot==='2');
 assert.ok(potion());
 assert.equal(potion().querySelector('.planetItemQuantity').textContent,'0');
 assert.equal(potion().className.includes('is-unavailable'),true);
 assert.equal(potion().attributes['aria-disabled'],'true');
 const hp=h.rpg.state.hp;
 potion().click();
 assert.equal(h.rpg.state.hp,hp);
 h.rpg.state.inventory.push({id:'healingPotion',qty:3});
 h.rpg.draw();
 assert.equal(potion().querySelector('.planetItemQuantity').textContent,'3');
 assert.equal(potion().attributes['aria-disabled'],'false');
 assert.equal(potion().className.includes('is-unavailable'),false);
});
