import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ART_MODE_KEY,ART_MODES,readArtMode,createArtSafetyController} from '../art-safety.js';

function fakeStorage(initial){
 const values=new Map(Object.entries(initial||{}));
 return {values,getItem:key=>values.get(key)??null,
  setItem:(key,value)=>values.set(key,value)};
}
function fakeScene(){
 return {children:[],add(object){this.children.push(object)},
  remove(object){this.children=this.children.filter(item=>item!==object)}};
}
const silent={warn(){}};
test('G-04 default enhanced mode, explicit base preference and storage denial fallback',()=>{
 const storage=fakeStorage();
 assert.equal(readArtMode(storage),ART_MODES.enhanced);
 assert.equal(readArtMode(storage,true),ART_MODES.base);
 assert.equal(readArtMode(fakeStorage({[ART_MODE_KEY]:'base'})),ART_MODES.base);
 assert.equal(readArtMode({getItem(){throw Error('denied')}}),ART_MODES.enhanced);
 assert.equal(readArtMode(fakeStorage({[ART_MODE_KEY]:'corrupted'})),ART_MODES.enhanced);
 assert.throws(()=>createArtSafetyController({scene:null}),TypeError);
});
test('enhanced/legacy toggle preserves the core scene, original player and quality presets',()=>{
 const scene=fakeScene(),hero={visible:true,id:'hero'},globe={visible:true,id:'globe'};
 scene.add(hero);scene.add(globe);
 const storage=fakeStorage(),updates=[];
 const guard=createArtSafetyController({scene,storage,logger:silent,onChange:row=>updates.push(row)});
 const leaf={visible:true};
 let qualityCalls=0,builds=0;
 guard.register('foliage',()=>{builds++;scene.add(leaf);return {
  setQuality(preset){qualityCalls++;leaf.visible=preset!=='economy';}
 }});
 assert.equal(guard.update('high'),true);
 assert.equal(guard.layerCount,1);
 assert.equal(leaf.visible,true);
 assert.equal(qualityCalls,1);
 assert.equal(guard.getLayer('foliage')!==null,true);
 guard.setMode('base','high');
 assert.equal(storage.getItem(ART_MODE_KEY),'base');
 assert.equal(leaf.visible,false);
 assert.equal(hero.visible,true);
 assert.equal(globe.visible,true);
 assert.equal(scene.children.length,3);
 assert.equal(guard.getLayer('foliage'),null);
 assert.equal(guard.setMode('enhanced','balanced'),'enhanced');
 assert.equal(builds,1);
 assert.equal(leaf.visible,true);
 assert.equal(guard.update('economy'),true);
 assert.equal(leaf.visible,false);
 assert.equal(guard.update('high'),true);
 assert.equal(leaf.visible,true);
 assert.equal(hero.visible,true);
 assert.equal(updates.at(-1).mode,'enhanced');
});
test('failure during asset creation removes partial objects and persists safe base mode',()=>{
 const scene=fakeScene(),core={visible:true};scene.add(core);
 const storage=fakeStorage();
 let errors=[];
 const guard=createArtSafetyController({scene,storage,logger:{warn:(...args)=>errors.push(args)}});
 guard.register('good',()=>{const item={visible:true};scene.add(item);return {setQuality(){}}});
 guard.register('broken',()=>{scene.add({visible:true});throw Error('simulated GPU texture failure')});
 assert.equal(guard.update('high'),false);
 assert.equal(guard.mode,'base');
 assert.equal(guard.fault.stage,'asset:broken');
 assert.equal(guard.getLayer('good'),null);
 assert.equal(core.visible,true);
 assert.equal(scene.children.length,2);
 assert.equal(scene.children[1].visible,false);
 assert.equal(storage.getItem(ART_MODE_KEY),'base');
 assert.equal(readArtMode(storage),'base');
 assert.equal(errors.length,1);
});
test('quality and animation exceptions disable optional effects without affecting core',()=>{
 const scene=fakeScene();const core={visible:true};scene.add(core);
 const guard=createArtSafetyController({scene,logger:silent});
 const plant={visible:true};
 guard.register('plant',()=>{scene.add(plant);return {
  setQuality(p){if(p==='high')throw Error('shader failed')},
  animate(){throw Error('invalid animation attribute')}
 }});
 assert.equal(guard.update('balanced'),true);
 assert.equal(guard.update('high'),false);
 assert.equal(guard.mode,'base');
 assert.equal(plant.visible,false);
 assert.equal(core.visible,true);
 guard.setMode('enhanced','balanced');
 guard.animate('plant',3);
 assert.equal(guard.mode,'base');
 assert.equal(guard.fault.stage,'animation:plant');
});
test('economy preset avoids high-cost asset construction, but still works with remaster',()=>{
 const scene=fakeScene(),guard=createArtSafetyController({scene,logger:silent});
 let count=0;
 guard.register('big-material',()=>{count++;return{setQuality(){}}},{when:preset=>preset!=='economy'});
 guard.update('economy');
 assert.equal(count,0);
 assert.equal(guard.mode,'enhanced');
 guard.update('high');
 assert.equal(count,1);
 guard.update('economy');
 assert.equal(count,1);
});
test('lost/restored WebGL context activates persistent safe base and reports failure',()=>{
 const storage=fakeStorage(),scene=fakeScene(),notices=[];
 const guard=createArtSafetyController({scene,storage,logger:silent,onChange:x=>notices.push(x)});
 guard.register('plants',()=>{const object={visible:true};scene.add(object);return{setQuality(){}}});
 guard.update('high');
 guard.onContextLost();
 assert.equal(guard.isContextLost,true);
 assert.equal(guard.mode,'base');
 assert.equal(storage.getItem(ART_MODE_KEY),'base');
 assert.equal(guard.update('high'),false);
 guard.onContextRestored();
 assert.equal(guard.isContextLost,false);
 assert.equal(guard.mode,'base');
 assert.equal(guard.update('balanced'),false);
 assert.ok(notices.some(x=>x.contextLost));
 guard.renderError(new Error('device render error'));
 assert.equal(guard.fault.stage,'render');
});
test('real G-04 integration isolates visuals without changing movement, cameras or networking',()=>{
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const token of [
  'createArtSafetyController(',"artSafety.register('painterly'",'artSafety.update(qualityName,isPortalPreview)',
  "artSafety.setMode(event.target.checked?'enhanced':'base',qualityName)",
  "artSafety.animate('ecology',elapsed)",'Promise.allSettled',
  "canvas.addEventListener('webglcontextlost'", "canvas.addEventListener('webglcontextrestored'",
  'artSafety.renderError(renderError)','renderer.render(scene,camera)'
 ])assert.ok(planet.includes(token),'Missing integration '+token);
 for(const id of ['artRemasterToggle','artRemasterStatus','graphicsFailure','graphicsReload'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(planet,/new THREE\.PerspectiveCamera\(58, innerWidth \/ innerHeight, \.48, 1300\)/);
 assert.match(planet,/cameraPitch:previousWorld\?\.cameraPitch\?\?\.36/);
 assert.match(planet,/cameraFollow:previousWorld\?\.cameraFollow\?\?cameraSettings\?\.follow\?\?false/);
 const controller=readFileSync(new URL('../art-safety.js',import.meta.url),'utf8');
 const executable=controller.split('\n').filter(line=>!line.trimStart().startsWith('//')).join('\n');
 assert.doesNotMatch(executable,/(?:player|account|quest|WebSocket|fetch\(|location\.replace|camera\.position)/);
});
