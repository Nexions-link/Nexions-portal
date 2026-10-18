import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITEM_CATALOG,deriveStats} from '../../items.js';
import {equipFromBag,unequipToBag} from '../equipment-rules.js';
import {harness,descendants} from './harness.mjs';
import {createEmptyEquipmentSilhouette} from '../character-sheet.js';
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
 assert.ok(children.some(e=>e.textContent==='ОСНОВНЫЕ ХАРАКТЕРИСТИКИ'));
 assert.ok(children.some(e=>e.textContent==='Здоровье'));
 assert.equal(h.rpg.movementLocked,true);
 h.get('modalClose').click();
 assert.equal(h.rpg.movementLocked,false);
});
test('archived-style inspector selects first; requires explicit removal from backpack',()=>{
 const h=harness({save:{equipment:{chest:{id:'chainVest'},weapon:{id:'wornAxe'}}}});
 h.get('character').click();
 const slot=descendants(h.get('mbody')).find(e=>e.dataset.slot==='chest');
 assert.ok(slot.className.includes('equipped'));
 slot.click();
 assert.equal(h.rpg.state.equipment.chest?.id,'chainVest','selection does not automatically unequip');
 assert.equal(slot.attributes['aria-pressed'],'true');
 assert.ok(descendants(h.get('mbody')).some(e=>e.textContent==='Тонкий кольчужный нагрудник'));
 const remove=descendants(h.get('mbody')).find(e=>e.textContent==='Снять в рюкзак');
 assert.ok(remove,'explicit unequip action in the original inspector');
 remove.click();
 assert.equal(h.rpg.state.equipment.chest,undefined);
 assert.equal(h.rpg.state.inventory.some(e=>e.id==='chainVest'),true);
 assert.equal(descendants(h.get('mbody')).find(e=>e.dataset.slot==='chest').className,'character-socket active',
  'inspector keeps the currently selected slot even after the item is removed');
 h.get('modalClose').click();
});

test('original flat UI empty-slot silhouettes and explicit 3D rotation controls are present',()=>{
 const h=harness({save:{equipment:{weapon:{id:'wornAxe'}}}});
 h.get('character').click();
 const el=descendants(h.get('mbody'));
 const empty=el.find(e=>e.dataset?.slot==='head');
 assert.equal(empty.className,'character-socket');
 assert.ok(empty.children.some(c=>c.className?.baseVal==='character-empty-silhouette'));
 const buttons=el.filter(e=>['Спереди','↶','↷'].includes(e.textContent));
 assert.deepEqual(buttons.map(b=>b.textContent),['↶','Спереди','↷']);
 buttons.forEach(button=>button.click());
 const armor=el.find(e=>e.dataset?.slot==='chest');
 armor.click();
 assert.ok(el.some(e=>e.className==='character-item-detail'));
 assert.equal(h.rpg.movementLocked,true);
 h.get('modalClose').click();
});
test('character sheet can navigate to the existing backpack without stale preview',()=>{
 const h=harness();
 h.get('character').click();
 const open=descendants(h.get('mbody')).find(e=>e.textContent==='Открыть рюкзак');
 assert.ok(open);
 open.click();assert.equal(h.get('modal').dataset.kind,'bag');
 h.get('modalClose').click();
});

test('empty equipment SVG works with browser-like readonly SVGAnimatedString className',()=>{
 const h=harness();
 const documentSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 assert.equal(typeof documentSvg.className,'object');
 assert.throws(()=>{documentSvg.className='character-empty-silhouette'},/read-only/);
 const icon=createEmptyEquipmentSilhouette(document,'head');
 assert.equal(icon.className.baseVal,'character-empty-silhouette');
 assert.equal(icon.children[0].attributes.d.startsWith('M10'),true);
 h.get('character').click();
 assert.equal(h.get('modal').hidden,false);
 assert.equal(h.get('modal').dataset.kind,'character');
 assert.ok(descendants(h.get('mbody')).some(e=>e.className?.baseVal==='character-empty-silhouette'));
 h.get('modalClose').click();
});

test('authenticated menu never offers resetting progress or false offline mode',()=>{
 const h=harness({authenticatedProfile:{nickname:'Герой',level:10,health:80,inventory:[],equipment:{}}});
 h.get('pause').click();
 const lines=descendants(h.get('mbody')).map(e=>e.textContent);
 assert.ok(lines.some(text=>text.includes('Нет соединения: прогресс временно недоступен')));
 assert.equal(lines.includes('Сбросить прогресс'),false);
 h.get('modalClose').click();
});
test('server-owned hero does not regenerate health when the socket is offline',()=>{
 const h=harness({authenticatedProfile:{nickname:'Герой',level:10,health:80,inventory:[],equipment:{}}});
 const before=h.rpg.state.hp;
 for(let i=0;i<90;i++)h.rpg.update(.1);
 assert.equal(h.rpg.state.hp,before);
});

test('3D inspector remains mounted and selection survives server progress refresh',()=>{
 const profile={nickname:'Герой',level:10,experience:10,gold:30,health:90,
  inventory:Array(12).fill(null),equipment:{chest:{id:'chainVest'}},quests:{},actionBar:[]};
 const h=harness({authenticatedProfile:profile});
 h.get('character').click();
 const old=descendants(h.get('mbody'));
 const canvas=old.find(e=>e.className==='character-preview-viewport');
 const turn=old.find(e=>e.className==='character-rotate');
 old.find(e=>e.dataset.slot==='chest').click();
 h.rpg.applyServerProgress({...profile,gold:35,revision:1},'checkpoint');
 const next=descendants(h.get('mbody'));
 assert.equal(next.find(e=>e.className==='character-preview-viewport'),canvas);
 assert.equal(next.find(e=>e.className==='character-rotate'),turn);
 assert.equal(next.find(e=>e.dataset.slot==='chest').attributes['aria-pressed'],'true');
 h.get('modalClose').click();
});
