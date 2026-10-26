import test from 'node:test';
import assert from 'node:assert/strict';
import {goToCharacterSelection,CHARACTER_SELECTION_PATH,ACTIVE_CHARACTER_KEY} from '../character-navigation.js';
import {harness,descendants} from './harness.mjs';
import {readFileSync} from 'node:fs';

test('character selection drops only the selected hero, not authentication',()=>{
 const map=new Map([[ACTIVE_CHARACTER_KEY,'hero'],['ngw-alpha-session','test-session']]);
 const storage={removeItem:key=>map.delete(key)};
 let navigated=null;
 assert.equal(goToCharacterSelection(storage,{assign:path=>{navigated=path}}),CHARACTER_SELECTION_PATH);
 assert.equal(navigated,'/nexgameworld/account.html');
 assert.equal(map.has(ACTIVE_CHARACTER_KEY),false);
 assert.equal(map.get('ngw-alpha-session'),'test-session');
});
test('the pause menu includes mount collection and keeps settings separate',()=>{
 const h=harness();
 h.get('pause').click();
 const menu=h.get('mbody');
 const actions=descendants(menu).filter(node=>node.className==='ngw-menu-action');
 assert.equal(actions.length,3);
 assert.equal(actions[0].children[0].textContent,'Выбор персонажа');
 assert.equal(actions[1].children[0].textContent,'Маунты');
 assert.equal(actions[2].children[0].textContent,'Настройки');
 assert.equal(h.get('cameraControl').hidden,true);
 assert.equal(h.get('graphicsControl').hidden,true);
 actions[2].click();
 assert.equal(h.get('modal').dataset.kind,'settings');
 assert.equal(h.get('cameraControl').hidden,false);
 assert.equal(h.get('graphicsControl').hidden,false);
 descendants(h.get('mbody')).find(node=>node.className==='ngw-settings-back').click();
 assert.equal(h.get('modal').dataset.kind,'menu');
 assert.equal(h.get('cameraControl').hidden,true);
 assert.equal(h.get('graphicsControl').hidden,true);
});
test('camera slider, follow switch, three original presets and FPS switch stay wired',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 for(const id of ['cameraDistance','cameraFollow','graphicsQuality','showFps'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/<option value="economy">Экономичное/);
 assert.match(html,/<option value="balanced" selected>Сбалансированное/);
 assert.match(html,/<option value="high">Высокое/);
 assert.match(planet,/cameraDistanceInput\?\.addEventListener\('input'/);
 assert.match(planet,/cameraFollowSwitch.addEventListener\('change'/);
 assert.match(planet,/graphicsSelect\?\.addEventListener\('change'/);
 assert.match(planet,/fpsToggle.addEventListener\('change'/);
 assert.doesNotMatch(html,/id="orbitButton"|id="zoomButton"|id="resetButton"/);
 assert.doesNotMatch(planet,/orbitButton|zoomButton|resetButton/);
});
test('real character selection URL remains the one used by the NGW portal',()=>{
 const link='/nexgameworld/account.html';
 assert.equal(CHARACTER_SELECTION_PATH,link);
});
