import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,descendants} from './harness.mjs';
import {itemArtwork} from '../inventory-art.js';

const byClass=(root,name)=>descendants(root).filter(node=>String(node.className).split(' ').includes(name));
const hunter=level=>({nickname:'Следопыт',raceId:'orc',classId:'hunter',level,health:120,resource:100,
 gold:287,inventory:[{id:'wornBow',qty:1},{id:'feather',qty:7}],equipment:{},actionBar:[]});
const key=(node,value)=>{for(const fn of node.events.keydown||[])fn({key:value,altKey:true,preventDefault(){}});};

test('backpack shows real free capacity and wallet without introducing extra bag slots',()=>{
 const h=harness({authenticatedProfile:hunter(4)});h.get('bag').click();
 const body=h.get('mbody');
 assert.equal(byClass(body,'inventory-slot').length,12);
 assert.equal(byClass(body,'wow-bag-free')[0].textContent,'Свободно: 10 / 12');
 assert.equal(byClass(body,'wow-money')[0].textContent,'287');
 assert.equal(byClass(body,'wow-money')[0].attributes['aria-label'],'Монеты: 287');
 assert.match(byClass(body,'slot-icon')[0].innerHTML,/<svg/);
 const slot=byClass(body,'inventory-slot')[0];slot.click();
 assert.ok(descendants(body).some(node=>node.textContent==='Лук следопыта'));
 assert.ok(descendants(body).some(node=>node.textContent==='Надеть'));
 h.rpg.draw();assert.equal(byClass(body,'inventory-slot')[0],slot,'unrelated HUD refresh preserves inspected item DOM');
});

test('class book displays future skills as unavailable without attaching drag or assignment handlers',()=>{
 const h=harness({authenticatedProfile:hunter(1)});h.get('spellbookButton').click();
 const entries=h.get('spellbookAbilities').children;
 const future=entries.find(node=>node.dataset.abilityId==='aimedShot');
 assert.ok(future?.disabled);
 assert.equal(future.events.pointerdown,undefined,'future skill cannot be dragged onto the live action bar');
 assert.equal(future.events.keydown,undefined);
 assert.match(future.attributes['aria-label'],/Требуется 8 уровень/);
 assert.ok(descendants(future).some(node=>node.textContent==='Уровень 8'));
 const known=entries.find(node=>node.dataset.abilityId==='autoShot');
 assert.equal(known.disabled,false);assert.ok(known.events.pointerdown?.length);
});

test('book category tabs retain class identity and expose consumable drag sources separately',()=>{
 const h=harness({authenticatedProfile:hunter(4)});h.get('spellbookButton').click();
 const tabs=()=>h.get('spellbookTabs').children;
 assert.deepEqual(tabs().map(node=>node.textContent),['Охотник','Общие']);
 tabs().find(node=>node.dataset.spellbookTab==='general').click();
 assert.equal(tabs().find(node=>node.dataset.spellbookTab==='general').attributes['aria-selected'],'true');
 const items=h.get('spellbookAbilities').children;
 assert.deepEqual(items.map(node=>node.dataset.abilityId),['healingPotion']);
 assert.ok(items[0].events.pointerdown?.length);
 tabs().find(node=>node.dataset.spellbookTab==='class').click();
 assert.ok(h.get('spellbookAbilities').children.some(node=>node.dataset.abilityId==='multiShot'));
 assert.ok(!h.get('spellbookAbilities').children.some(node=>node.dataset.abilityId==='heavyStrike'));
});

test('Alt plus slot number assigns through the same authoritative hotbar action and waits for acknowledgement',()=>{
 const h=harness({authenticatedProfile:hunter(4)}),sent=[];
 h.rpg.setMultiplayer({connected:true,economy:(kind,args)=>{sent.push({kind,...args});return true;}});
 h.get('spellbookButton').click();
 const spell=h.get('spellbookAbilities').children.find(node=>node.dataset.abilityId==='multiShot');
 const original=h.rpg.state.hotbar[7];key(spell,'8');
 assert.deepEqual(sent.at(-1),{kind:'hotbarSet',slot:7,entry:{kind:'ability',id:'multiShot'}});
 assert.deepEqual(h.rpg.state.hotbar[7],original,'keyboard shortcut cannot predict persisted account changes');
 assert.equal(h.get('spellbookPopover').hidden,false);
 const actionBar=[...h.rpg.state.hotbar];actionBar[7]={kind:'ability',id:'multiShot'};
 h.rpg.applyServerProgress({...hunter(4),actionBar},'hotbarSet');
 assert.equal(h.rpg.state.hotbar[7].id,'multiShot');
 assert.equal(h.get('spellbookAbilities').children.find(node=>node.dataset.abilityId==='multiShot'),spell,
  'acknowledgement preserves the same live drag source');
});

test('item illustrations distinguish equipment and resources without injecting catalog text into SVG',()=>{
 const bow=itemArtwork('wornBow',{weaponKind:'bow'}),shield=itemArtwork('batteredBuckler',{slot:'shield'});
 assert.notEqual(bow,shield);
 assert.notEqual(itemArtwork('feather'),itemArtwork('wolfPelt'));
 assert.doesNotMatch(itemArtwork('unknown',{name:'<script>alert(1)</script>',icon:'<img onerror=x>'}),/script|onerror|<img/);
 for(const image of [bow,shield,itemArtwork('coins'),itemArtwork('healingPotion')]){
  assert.match(image,/^<svg/);assert.match(image,/<\/svg>$/);
  assert.doesNotMatch(image,/https?:|foreignObject/);
 }
});
