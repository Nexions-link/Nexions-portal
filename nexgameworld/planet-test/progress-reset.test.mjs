// Run with: node --test planet-test/progress-reset.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {OFFLINE_RPG_SAVE_KEY,clearOfflineProgress} from './progress-reset.js';
import {PLANET_VIEW_KEY} from './world-save.js';

const source=name=>readFileSync(fileURLToPath(new URL(name,import.meta.url)),'utf8');

test('reset removes only the isolated Planet Test RPG save',()=>{
 const graphics='nexgameworld-graphics-quality-v1',fps='nexgameworld-show-fps-v1';
 const otherGame='nexgame-production-progress';
 const values=new Map([
  [OFFLINE_RPG_SAVE_KEY,JSON.stringify({quest:11,gatherStage:3,level:8})],
  [PLANET_VIEW_KEY,JSON.stringify({zoom:20,cameraFollow:true})],
  [graphics,'high'],[fps,'true'],[otherGame,'do-not-touch']
 ]);
 const removed=[];
 const storage={removeItem(key){removed.push(key);values.delete(key);}};
 assert.equal(clearOfflineProgress(storage),true);
 assert.deepEqual(removed,[OFFLINE_RPG_SAVE_KEY]);
 assert.equal(values.has(OFFLINE_RPG_SAVE_KEY),false);
 assert.equal(values.get(graphics),'high');
 assert.equal(values.get(fps),'true');
 assert.ok(values.has(PLANET_VIEW_KEY));
 assert.equal(values.get(otherGame),'do-not-touch');
});

test('preview mode never erases progress',()=>{
 let called=false;
 assert.equal(clearOfflineProgress({removeItem(){called=true;}},{preview:true}),false);
 assert.equal(called,false);
});

test('storage access failures are handled without claiming a successful reset',()=>{
 assert.equal(clearOfflineProgress({removeItem(){throw new Error('Storage disabled');}}),false);
 assert.equal(clearOfflineProgress(null),false);
});

test('settings require a confirmation and reset the camera to the camp before reload',()=>{
 const rpg=source('./offline-rpg.js'),planet=source('./planet.js');
 assert.match(rpg,/if\(!window\.confirm\(/);
 assert.match(rpg,/if\(!clearOfflineProgress\(localStorage,\{preview\}\)\)/);
 assert.match(rpg,/if\(resetProgressView\)resetProgressView\(\)/);
 assert.match(rpg,/window\.location\.reload\(\)/);
 assert.match(rpg,/if\(!preview\)\{/);
 assert.match(rpg,/\['Сбросить прогресс',resetProgress\]/);
 assert.match(planet,/rpg\.onResetProgress\(\(\)=>\{/);
 assert.match(planet,/state\.orbit=false;\s+doReset\(\);/);
 assert.match(planet,/state\.normal\.copy\(unitAt\(0, 0\)\)/);
 assert.doesNotMatch(rpg,/localStorage\.clear\(\)/);
});
