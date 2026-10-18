import {test} from 'node:test';
import assert from 'node:assert/strict';
import {harness,descendants} from './harness.mjs';

test('account hotbar is saved through server action and restored on a fresh login',()=>{
 const profile={level:1,inventory:Array(12).fill(null),actionBar:[]};
 const h=harness({authenticatedProfile:profile}),sent=[];
 h.rpg.setMultiplayer({connected:true,economy:(kind,args)=>{sent.push({kind,...args});return true}});
 assert.equal(h.rpg.state.hotbar[0].id,'autoAttack');
 h.get('spellbookButton').click();
 const nodes=()=>descendants(h.get('mbody'));
 // Pick the eighth slot through the real spellbook slot selector.
 const slots=nodes().find(e=>e.className==='planet-hotbar-slot-picker').children;
 assert.equal(slots.length,8);slots[7].click();
 nodes().find(e=>e.className==='spellbook-entry').click();
 assert.equal(sent.at(-1).kind,'hotbarSet');assert.equal(sent.at(-1).slot,7);
 assert.equal(h.rpg.state.hotbar[7],null,'Wait for persisted server response');
 const actionBar=[...h.rpg.state.hotbar];actionBar[7]=sent.at(-1).entry;
 const saved={...profile,actionBar};h.rpg.applyServerProgress(saved,'hotbarSet');
 assert.deepEqual(h.rpg.state.hotbar[7],actionBar[7]);
 const fresh=harness({authenticatedProfile:saved});
 assert.deepEqual(fresh.rpg.state.hotbar,actionBar);
 const empty=harness({authenticatedProfile:{...profile,actionBar:Array(8).fill(null)}});
 assert.deepEqual(empty.rpg.state.hotbar,Array(8).fill(null));
});
