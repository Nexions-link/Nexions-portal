import {test} from 'node:test';
import assert from 'node:assert/strict';
import {harness,descendants} from './harness.mjs';
import {CORPSE_DURATION_SECONDS,NORMAL_MOB_RESPAWN_SECONDS} from '../corpse-loot.js';
function kill(t){
 t.mock.method(Math,'random',()=>.5); // One feather via the shared table, no extra drops.
 const h=harness({x:-9,z:-25});h.rpg.state.level=60;h.rpg.state.resource=100;h.rpg.state.hp=10000;
 h.rpg.targetNearest();h.rpg.handleSlotKey('4');h.rpg.update(.35);
 const visual=h.scene.getObjectsByProperty('name','dolgonog-fallback')[0],root=visual.parent;
 const advance=seconds=>{for(let elapsed=0;elapsed<seconds-1e-8;elapsed+=.1)h.rpg.update(Math.min(.1,seconds-elapsed))};
 advance(1.2);assert.equal(root.visible,true);assert.equal(h.get('interact').hidden,false);
 return {...h,visual,root,advance};
}
function lootAll(h,mode='all'){
 h.get('interact').click();assert.equal(h.get('modal').dataset.kind,'loot');
 descendants(h.get('mbody')).find(el=>mode==='all'?el.textContent==='Забрать всё':el.className==='loot-item').click();
 assert.equal(h.get('modal').hidden,true);
}
test('normal timers are two independent 30-second phases',()=>{
 assert.equal(CORPSE_DURATION_SECONDS,30);assert.equal(NORMAL_MOB_RESPAWN_SECONDS,30);
});
for(const mode of ['all','single'])test(`taking ${mode} loot keeps the corpse, then waits 30 seconds to respawn`,t=>{
 const h=kill(t),fallen=h.visual.quaternion.clone();lootAll(h,mode);
 assert.equal(h.root.visible,true);assert.ok(h.visual.quaternion.angleTo(fallen)<1e-7);
 assert.equal(h.get('interact').hidden,true);
 h.position(0,9);h.advance(28);assert.equal(h.root.visible,true);
 h.advance(2);assert.equal(h.root.visible,false);
 h.advance(29);assert.equal(h.root.visible,false);
 h.advance(1.2);assert.equal(h.root.visible,true);
 assert.ok(h.visual.quaternion.angleTo(new (h.visual.quaternion.constructor)())<1e-7);
 assert.equal(h.rpg.state.inventory.filter(i=>i.id==='feather').reduce((n,i)=>n+i.qty,0),1);
});
test('unlooted corpse disappears after 30 seconds even with its loot window open',t=>{
 const h=kill(t);h.get('interact').click();assert.equal(h.get('modal').hidden,false);
 h.advance(28);assert.equal(h.root.visible,true);assert.equal(h.get('modal').hidden,false);
 h.advance(2);assert.equal(h.root.visible,false);assert.equal(h.get('modal').hidden,true);
 assert.equal(h.rpg.state.inventory.some(i=>i.id==='feather'),false);
 h.position(0,9);h.advance(29);assert.equal(h.root.visible,false);
 h.advance(1.2);assert.equal(h.root.visible,true);
});
test('late looting does not restart corpse lifetime or begin respawn early',t=>{
 const h=kill(t);h.advance(26);lootAll(h);assert.equal(h.root.visible,true);
 h.position(0,9);h.advance(2);assert.equal(h.root.visible,true);
 h.advance(2);assert.equal(h.root.visible,false);
 h.advance(29);assert.equal(h.root.visible,false);
 h.advance(1.2);assert.equal(h.root.visible,true);
});
