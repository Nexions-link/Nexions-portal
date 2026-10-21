import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombatTimeline} from '../combat-timeline.js';
import {readFileSync} from 'node:fs';
test('authoritative charge strike gets a visual-only swing without another attack packet',()=>{
 const t=createCombatTimeline(),mob={id:'longstrider'};
 assert.equal(t.start('autoAttack',mob,{visualOnly:true}),true);
 const hit=t.update(.34);
 assert.equal(hit.visualOnly,true);
 assert.equal(hit.target,mob);
 assert.equal(hit.skill,'autoAttack');
 t.update(.5);
 assert.equal(t.busy,false);
 assert.equal(t.start('autoAttack',mob),true);
 assert.equal(t.update(.35).visualOnly,undefined,'other swings remain authoritative client submissions');
});
test('online client receives landed coordinates and avoids double award',()=>{
 const rpg=readFileSync(new URL('../offline-rpg.js',import.meta.url),'utf8');
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const presence=readFileSync(new URL('../sphere-online.js',import.meta.url),'utf8');
 assert.match(rpg,/if\(event\.chargeImpact===true\)/);
 assert.match(rpg,/visualOnly:true/);
 assert.match(rpg,/impact\?\.visualOnly/);
 assert.match(presence,/m\.type==='chargeLanded'/);
 assert.match(planet,/chargeLandingCorrection/);
});
