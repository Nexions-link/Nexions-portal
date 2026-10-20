import test from 'node:test';
import assert from 'node:assert/strict';
import {itemStatRows,compareEquipment,formatBagEquipmentChanges} from '../equipment-comparison.js';
import {harness,descendants} from './harness.mjs';

test('backpack weapon specs show DPS rather than hit range/speed',()=>{
 const rows=itemStatRows('wornAxe');
 assert.ok(rows.some(r=>r.label==='ДПС'&&r.value==='1'));
 assert.ok(!rows.some(r=>['Урон от','Урон до','Скорость'].includes(r.label)));
});

test('equipment changes contain only signed compact stat deltas',()=>{
 const comparison=compareEquipment('feebleSword',10,{weapon:{id:'wornAxe'}});
 const rows=formatBagEquipmentChanges(comparison);
 assert.ok(rows.some(r=>r.key==='dps'&&r.text.includes('ДПС')));
 assert.ok(rows.every(r=>!['damageMin','damageMax','speed','maxHp'].includes(r.key)));
 const illustrative={
  meaningful:[
   {key:'strength',delta:1,trend:'better'},
   {key:'stamina',delta:-2,trend:'worse'},
   {key:'dps',delta:1.25,trend:'better'},
   {key:'blockChance',delta:.05,trend:'better'},
   {key:'maxHp',delta:-20,trend:'worse'}
  ]
 };
 assert.deepEqual(formatBagEquipmentChanges(illustrative).map(r=>r.text),[
  '+1 к силе','−2 к выносливости','+1,25 ДПС','+5 п. п. к шансу блока'
 ]);
});

test('selected weapon is displayed with short deltas, without comparison headings',()=>{
 const h=harness({save:{level:10,equipment:{weapon:{id:'wornAxe'}},inventory:[{id:'feebleSword',qty:1}]}});
 h.get('bag').click();
 const cell=descendants(h.get('mbody')).find(e=>String(e.className).includes('inventory-slot'));
 assert.ok(cell);cell.click();
 const text=descendants(h.get('mbody')).map(e=>e.textContent);
 assert.ok(text.some(t=>/ДПС/.test(t)));
 assert.ok(!text.some(t=>/Улучшение характеристик|Сравнение с|Урон от|Урон до|Скорость оружия|→/.test(t)));
 h.get('modalClose').click();
});
