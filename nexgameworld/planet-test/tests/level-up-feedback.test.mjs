import test from 'node:test';
import assert from 'node:assert/strict';
import {createLevelUpFeedback} from '../level-up-feedback.js';
function stage(){
 const tasks=[],cancelled=[];
 const layer={children:[],append(item){this.children.push(item)},replaceChildren(...items){this.children=items}};
 const createElement=tag=>({
  tag,children:[],textContent:'',attributes:{},
  append(...items){this.children.push(...items)},
  setAttribute(k,v){this.attributes[k]=v},
  remove(){layer.children=layer.children.filter(x=>x!==this)}
 });
 const feedback=createLevelUpFeedback({document:{createElement},layer,
  schedule:fn=>(tasks.push(fn),tasks.length),cancel:id=>cancelled.push(id)});
 return {feedback,layer,tasks,cancelled};
}
test('single ornate level card shows large confirmed level, not fake XP',()=>{
 const {feedback,layer}=stage();
 const card=feedback.show(7);
 assert.equal(layer.children.length,1);
 assert.equal(card.children.find(x=>x.className==='ngw-levelup-title').textContent,'НОВЫЙ УРОВЕНЬ');
 assert.equal(card.children.find(x=>x.className==='ngw-levelup-number').textContent,'7');
 assert.equal(card.attributes['role'],'status');
 assert.match(card.attributes['aria-label'],/Новый уровень 7/);
 assert.equal(feedback.show(7),null,'same level replay has no duplicate banner');
 assert.equal(feedback.show(1),null,'character creation/login is not a level-up');
 assert.equal(feedback.show(61),null);
});
test('level eight reveals Charge; newer saves supersede old animation',()=>{
 const {feedback,layer,tasks}=stage();
 feedback.show(7);
 const older=tasks[0];
 const eight=feedback.show(8,{unlockedCharge:true});
 assert.equal(layer.children.length,1);
 assert.equal(layer.children[0],eight);
 assert.equal(eight.children.find(x=>x.className==='ngw-levelup-number').textContent,'8');
 assert.equal(eight.children.find(x=>x.className==='ngw-levelup-unlock').textContent,'Открыта способность «Рывок»');
 older();assert.equal(layer.children.length,1,'stale timer cannot hide a newer level');
 tasks.at(-1)();assert.equal(layer.children.length,0);
 assert.equal(feedback.show(8),null,'do not repeat latest level after animation expires');
});
test('offline and online level-up events use same standalone celebration',async()=>{
 const fs=await import('node:fs');
 const rpg=fs.readFileSync(new URL('../offline-rpg.js',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(rpg,/createLevelUpFeedback\(\{document,layer:\$\('levelUpFeedback'\)\}\)/);
 assert.match(rpg,/levelUpFeedback\.show\(state\.level/);
 assert.match(html,/id="levelUpFeedback"/);
 assert.match(html,/level-up-feedback\.css/);
});

// The compact banner must remain unobtrusive on iPhone and in landscape.
test('level-up notice stays compact, subtle and does not block world taps',async()=>{
 const fs=await import('node:fs');
 const css=fs.readFileSync(new URL('../level-up-feedback.css',import.meta.url),'utf8');
 const js=fs.readFileSync(new URL('../level-up-feedback.js',import.meta.url),'utf8');
 assert.match(css,/#levelUpFeedback\{[^}]*pointer-events:none/s);
 assert.match(css,/width:min\(188px,calc\(100vw - 46px\)\)/);
 assert.match(css,/font-size:clamp\(44px,13vw,54px\)/);
 assert.match(css,/animation:ngw-levelup-appear 2\.8s/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(js,/\},2800\);/);
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/level-up-feedback\.css\?v=2/);
});
