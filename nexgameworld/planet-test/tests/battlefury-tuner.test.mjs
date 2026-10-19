import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {harness,descendants} from './harness.mjs';
import {BATTLEFURY_TUNER_DEFAULTS,readBattlefuryTuning,saveBattlefuryTuning,applyBattlefuryPose} from '../battlefury-tuner.js';

const FIXED={posX:-1.13,posY:-0.125,posZ:0.055,axeX:-21,axeY:180,axeZ:-120,handX:-180,handY:-67,handZ:-82,scale:2.3};
test('Battlefury retains the approved immutable pose on every browser',()=>{
 assert.deepEqual({...BATTLEFURY_TUNER_DEFAULTS},FIXED);
 const storage={getItem:()=>JSON.stringify({scale:0.25,posX:2}),setItem:()=>{throw Error('Must not write to storage')}};
 assert.deepEqual(readBattlefuryTuning(storage),FIXED);
 assert.deepEqual(saveBattlefuryTuning(storage,{scale:0.5}),FIXED);
});
test('Battlefury attaches with the published size and grip',()=>{
 const mesh=new THREE.Group(),hand=new THREE.Group();
 const grip=applyBattlefuryPose(mesh,hand,readBattlefuryTuning());
 assert.equal(mesh.scale.x,2.3);
 assert.equal(mesh.scale.y,2.3);
 assert.equal(mesh.scale.z,2.3);
 assert.equal(mesh.position.x,-1.13);
 assert.equal(mesh.position.y,-0.125);
 assert.equal(mesh.position.z,0.055);
 assert.equal(grip.order,'XYZ');
 assert.equal(hand.rotation.x,grip.x);
});
test('the admin axe no longer displays any tuning controls',()=>{
 const h=harness({save:{equipment:{weapon:{id:'adminBattlefury'}}}});
 const body=h.get('mbody');
 h.get('character').click();
 assert.equal(descendants(body).some(e=>e.className==='character-battlefury-tune'),false);
 const weapon=descendants(body).find(e=>e.dataset.slot==='weapon');
 assert.ok(weapon);
 weapon.click();
 assert.equal(descendants(body).some(e=>e.className==='character-detail-tune'),false);
});
test('updated scene invalidates cached grip and character sheet',()=>{
 const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
 assert.match(read('../offline-rpg.js'),/battlefury-tuner\.js\?v=2/);
 assert.match(read('../offline-rpg.js'),/character-sheet\.js\?v=6/);
 const planet=read('../planet.js'),html=read('../index.html');
 const gameModule=planet.match(/offline-rpg\.js\?v=(\d+)/);
 const entrypoint=html.match(/planet\.js\?v=(\d+)/);
 assert.ok(gameModule&&Number(gameModule[1])>=112,
  'latest game must invalidate cached equipment modules');
 assert.ok(entrypoint&&Number(entrypoint[1])>=136,
  'launch page must invalidate cached scene imports');
});
