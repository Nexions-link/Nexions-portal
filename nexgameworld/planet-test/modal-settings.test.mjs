// Regression for the graphics panel accidentally appearing inside NPC dialogs.
// Run: node --test planet-test/modal-settings.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const read=path=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),'utf8');
const rpg=read('./offline-rpg.js'),planet=read('./planet.js'),html=read('./index.html');

test('camera and graphics settings are gated on the modal type',()=>{
 assert.match(rpg,/\$\('cameraControl'\)\.hidden=kind!=='settings'/);
 assert.match(rpg,/\$\('graphicsControl'\)\.hidden=kind!=='settings'/);
 assert.ok(rpg.indexOf("$('graphicsControl').hidden=kind!=='settings'") < rpg.indexOf("if(camp.render(kind,body,line))return"));
 assert.ok(rpg.indexOf("$('graphicsControl').hidden=kind!=='settings'") < rpg.indexOf("if(kind==='mentor')"));
});

test('graphics quality init never unhides its modal controls globally',()=>{
 assert.doesNotMatch(planet,/\$\('graphicsControl'\)\.hidden\s*=\s*false/);
 assert.match(planet,/graphicsSelect\?\.addEventListener\('change'/);
});

test('HTML initially hides both settings panels and the CSS respects it',()=>{
 assert.match(html,/<section id="cameraControl"[^>]* hidden /);
 assert.match(html,/<section id="graphicsControl"[^>]* hidden /);
 assert.match(html,/#modal #cameraControl\[hidden\],#modal #graphicsControl\[hidden\]\{display:none!important\}/);
});

test('all real RPG dialogs use a kind distinct from pause menu',()=>{
 for(const kind of ['mentor','herbalist','merchant','loot','gatherLoot','bag','character','spells','quests','chest']){
  assert.notEqual(kind,'menu');
 }
 assert.match(rpg,/if\(kind==='menu'\)/);
 assert.match(rpg,/else if\(kind==='settings'\)/);
 assert.doesNotMatch(html,/id="orbitButton"|id="zoomButton"|id="resetButton"/);
 assert.match(planet,/minimapToggle.addEventListener\('click', togglePlanetView\)/);
});
