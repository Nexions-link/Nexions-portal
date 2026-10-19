import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ITEM_CATALOG,MERCHANT_STOCK,GEAR_LOOT} from '../../items.js';
import {QUALITY_VISUALS} from '../../item-quality.js';
test('Battlefury is epic, unique and has the exact description',()=>{
 const d=ITEM_CATALOG.adminBattlefury;
 assert.equal(d.rarity,'epic');assert.equal(d.quality,'Эпический');
 assert.equal(d.description,'трудно быть богом, но вдруг…');
 assert.equal(d.adminOnly,true);assert.equal(d.oneHitKill,true);assert.equal(d.sell,0);
 assert.ok(QUALITY_VISUALS.epic.color.startsWith('#'));
 assert.ok(!MERCHANT_STOCK.includes('adminBattlefury'));
 assert.ok(Object.values(GEAR_LOOT).every(x=>!x.includes('adminBattlefury')));
 assert.equal(d.modelPath,'../assets/weapons/admin-battlefury.glb');
 assert.doesNotMatch(readFileSync(new URL('../../bestiary/atlas-catalog.js',import.meta.url),'utf8'),/adminBattlefury|admin-battlefury/i);
});
