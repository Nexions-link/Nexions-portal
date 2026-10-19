import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {harness,descendants} from './harness.mjs';
import {readFileSync} from 'node:fs';
import {AXE_TUNER_DEFAULTS} from '../../axe-tuner.js';
import {BATTLEFURY_TUNER_DEFAULTS,BATTLEFURY_TUNER_GROUPS,BATTLEFURY_TUNER_STORAGE_KEY,
 normalizeBattlefuryTuning,readBattlefuryTuning,applyBattlefuryPose} from '../battlefury-tuner.js';

test('the client invalidates old cached equipment and scene modules on deployment',()=>{
 const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
 assert.ok(read('../offline-rpg.js').includes('character-sheet.js?v=5'));
 assert.ok(read('../planet.js').includes('offline-rpg.js?v=110'));
 assert.ok(read('../index.html').includes('planet.js?v=133'));
 assert.ok(read('../index.html').includes('character-sheet.css?v=4'));
});
test('the exclusive tuner offers nine pose axes plus independent uniform scale',()=>{
 assert.equal(BATTLEFURY_TUNER_GROUPS.flatMap(group=>group.fields).length,10);
 assert.deepEqual({...BATTLEFURY_TUNER_DEFAULTS},{...AXE_TUNER_DEFAULTS,scale:1});
 const n=normalizeBattlefuryTuning({scale:100,posX:-100,handY:-300,axeZ:9.34,other:77});
 assert.equal(n.scale,3);
 assert.equal(n.posX,-2);
 assert.equal(n.handY,-180);
 assert.equal(n.axeZ,9);
 assert.equal(n.posY,AXE_TUNER_DEFAULTS.posY);
 assert.equal('other' in n,false);
 assert.deepEqual(normalizeBattlefuryTuning({scale:NaN}),BATTLEFURY_TUNER_DEFAULTS);
});
test('Battlefury scaling updates only the dedicated mesh and wrist',()=>{
 const mesh=new THREE.Group(),hand=new THREE.Group();
 const grip=applyBattlefuryPose(mesh,hand,{...BATTLEFURY_TUNER_DEFAULTS,scale:1.8,posX:.21});
 assert.equal(mesh.scale.x,1.8);
 assert.equal(mesh.scale.y,1.8);
 assert.equal(mesh.scale.z,1.8);
 assert.equal(mesh.position.x,.21);
 assert.equal(grip.order,'XYZ');
 assert.equal(hand.rotation.x,grip.x);
});
test('the character inspector exposes one tuner only for equipped Battlefury',()=>{
 const h=harness({save:{equipment:{weapon:{id:'adminBattlefury'}}}});
 const body=h.get('mbody');
 h.get('character').click();
 const visible=descendants(body).find(e=>e.className==='character-battlefury-tune');
 assert.ok(visible,'visible entry is displayed before selecting any equipment');
 assert.equal(visible.textContent,'⚒ Настроить «Боевой гнев»');
 const weapon=descendants(body).find(e=>e.dataset.slot==='weapon');
 assert.ok(weapon);
 weapon.click();
 assert.ok(descendants(body).find(e=>e.className==='character-detail-tune'));
 visible.click();
 assert.equal(h.get('modal').dataset.kind,'battlefuryTuner');
 const current=descendants(body).filter(e=>e.dataset.axis);
 assert.equal(current.length,10);
 const size=current.find(e=>e.dataset.axis==='scale');
 assert.ok(size);
 size.value='1.65';size.events.input[0]();
 assert.equal(readBattlefuryTuning(localStorage).scale,1.65);
 assert.ok(localStorage.getItem(BATTLEFURY_TUNER_STORAGE_KEY));
 // Normal HUD redraw must preserve touch drag and the selected slider.
 h.rpg.draw();
 assert.equal(descendants(body).find(e=>e.dataset.axis==='scale'),size);
 const reset=descendants(body).find(e=>e.textContent==='Сбросить настройки');
 reset.click();
 assert.equal(readBattlefuryTuning(localStorage).scale,1);
 assert.equal(size.value,'1');
 h.get('modalClose').click();
 h.rpg.state.equipment.weapon={id:'wornAxe'};
 h.get('character').click();
 descendants(body).find(e=>e.dataset.slot==='weapon').click();
 assert.equal(descendants(body).some(e=>e.className==='character-detail-tune'),false);
 assert.equal(descendants(body).some(e=>e.className==='character-battlefury-tune'),false);
});
