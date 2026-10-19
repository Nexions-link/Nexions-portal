import {test} from 'node:test';
import assert from 'node:assert/strict';
import {harness,descendants} from './harness.mjs';

test('authenticated corpse opens the loot window and takes items only after server acknowledgement',()=>{
 const h=harness({x:-9,z:-24,authenticatedProfile:{}}),sent=[];
 h.rpg.setMultiplayer({connected:true,economy:(kind,args)=>{sent.push({kind,...args});return true;}});
 h.rpg.onMobSnapshot([{index:0,phase:'corpse',life:1,hp:0,x:-9,z:-23}]);
 for(let i=0;i<20;i++)h.rpg.update(.1);
 const loot=[{id:'feather',qty:1},{id:'batteredBuckler',qty:1}];
 h.rpg.onEconomyResult({ok:true,kind:'lootAvailable',mobId:'dolgonog-0',life:1,loot});
 const before=JSON.stringify(h.rpg.state.inventory);
 assert.equal(h.get('modal').hidden,true);
 h.get('interact').click();
 assert.equal(sent.at(-1).kind,'lootOpen');
 assert.equal(JSON.stringify(h.rpg.state.inventory),before);
 h.rpg.onEconomyResult({ok:true,kind:'lootOpen',mobId:'dolgonog-0',life:1,loot});
 assert.equal(h.get('modal').dataset.kind,'loot');assert.equal(h.get('modal').hidden,false);
 const buttons=()=>descendants(h.get('mbody'));
 buttons().find(e=>e.className==='loot-item').click();
 assert.equal(sent.at(-1).kind,'lootTake');assert.equal(sent.at(-1).itemId,'feather');
 assert.equal(JSON.stringify(h.rpg.state.inventory),before);
 h.rpg.onEconomyResult({ok:true,kind:'lootTake',mobId:'dolgonog-0',life:1,loot:[loot[1]],taken:[loot[0]]});
 assert.equal(buttons().filter(e=>e.className==='loot-item').length,1);
 buttons().find(e=>e.textContent==='Забрать всё').click();
 assert.equal(sent.at(-1).kind,'lootTake');assert.equal(sent.at(-1).itemId,undefined);
 h.rpg.onEconomyResult({ok:false,kind:'lootTake',reason:'inventory_full'});
 assert.equal(h.get('modal').hidden,false);
 h.rpg.onEconomyResult({ok:true,kind:'lootTake',mobId:'dolgonog-0',life:1,loot:[],taken:[loot[1]]});
 assert.equal(h.get('modal').hidden,true);
});

test('loot sheet displays quality, quantity and prevents duplicate online take requests',()=>{
 const h=harness({x:-9,z:-24,authenticatedProfile:{nickname:'Герой',level:3,inventory:[],equipment:{}}});
 const sent=[];
 h.rpg.setMultiplayer({connected:true,economy:(kind,p)=>{sent.push({kind,...p});return true;}});
 h.rpg.onMobSnapshot([{index:0,phase:'corpse',life:2,hp:0,x:-9,z:-23}]);
 for(let i=0;i<20;i++)h.rpg.update(.1);
 const loot=[{id:'feather',qty:3},{id:'batteredBuckler',qty:1}];
 h.rpg.onEconomyResult({ok:true,kind:'lootOpen',mobId:'dolgonog-0',life:2,loot});
 const nodes=()=>descendants(h.get('mbody'));
 const first=nodes().filter(e=>e.className==='loot-item');
 assert.equal(first.length,2);
 assert.equal(first[0].dataset.rarity,'poor');
 assert.ok(first[0].children.some(c=>c.className==='loot-item-icon'));
 assert.equal(first[0].children.find(c=>c.className==='loot-item-count').textContent,'×3');
 assert.ok(nodes().some(e=>e.className==='planet-loot-summary'));
 first[0].click();first[0].click();
 assert.equal(sent.filter(x=>x.kind==='lootTake').length,1,'duplicate taps must not duplicate server loot');
 assert.ok(nodes().filter(e=>e.className==='loot-item').every(e=>e.disabled));
 assert.equal(nodes().find(e=>e.textContent==='Получаем добычу…').disabled,true);
 h.rpg.onEconomyResult({ok:false,kind:'lootTake',reason:'inventory_full'});
 assert.ok(nodes().filter(e=>e.className==='loot-item').every(e=>!e.disabled));
 assert.ok(nodes().some(e=>e.textContent.includes('Рюкзак заполнен')));
 nodes().find(e=>e.textContent==='Забрать всё').click();
 assert.equal(sent.filter(x=>x.kind==='lootTake').length,2);
 h.rpg.onEconomyResult({ok:true,kind:'lootTake',mobId:'dolgonog-0',life:2,loot:[],taken:loot});
 assert.equal(h.get('modal').hidden,true);
});

test('loot action appears at killing distance without stepping closer or waiting for fall',()=>{
 const h=harness({x:-9,z:-26.8,authenticatedProfile:{nickname:'Воин',level:10,health:100,inventory:[],equipment:{}}}),sent=[];
 h.rpg.setMultiplayer({connected:true,economy:(kind,args)=>{sent.push({kind,...args});return true}});
 h.rpg.onMobSnapshot([{index:0,phase:'corpse',life:11,hp:0,x:-9,z:-23}]);
 h.rpg.onEconomyResult({ok:true,kind:'lootAvailable',mobId:'dolgonog-0',life:11,loot:[{id:'feather',qty:1}]});
 h.rpg.draw();
 assert.equal(h.get('interact').hidden,false,'loot button available at last melee hit location');
 assert.equal(h.get('interact').textContent,'Обыскать');
 h.get('interact').click();
 assert.deepEqual(sent.at(-1),{kind:'lootOpen',mobId:'dolgonog-0',life:11});
 h.rpg.onEconomyResult({ok:true,kind:'lootOpen',mobId:'dolgonog-0',life:11,loot:[{id:'feather',qty:1}]});
 assert.equal(h.get('modal').dataset.kind,'loot');
 assert.equal(h.get('modal').hidden,false);
 h.get('modalClose').click();
 h.position(-9,-27.8);h.rpg.draw();
 assert.equal(h.get('interact').hidden,true,'cannot search beyond authorized distance');
});

test('monster levels are visible in target frame and scale with hero difficulty',()=>{
 const h=harness({x:-9,z:-25,authenticatedProfile:{nickname:'Герой',level:1,experience:0,inventory:[],equipment:{}}});
 h.rpg.targetNearest();
 assert.equal(h.get('targetName').textContent,'Равнинный долгоног');
 assert.equal(h.get('targetLevel').textContent,'ур. 1');
 assert.equal(h.get('targetLevel').hidden,false);
 assert.equal(h.get('targetName').style.color,'#f6d774');
});

test('server progress displays exact experience gained even across a level-up and warns for gray mobs',()=>{
 const profile={nickname:'Воин',level:1,experience:95,gold:30,health:120,
  inventory:Array(12).fill(null),equipment:{},quests:{}};
 const h=harness({authenticatedProfile:profile});
 h.rpg.applyServerProgress({...profile,level:2,experience:17,gold:30},'mob');
 assert.match(h.get('toast').textContent,/\+22 опыта\. Осмотри тело/);
 h.rpg.applyServerProgress({...profile,level:6,experience:0,gold:30},'welcome');
 h.rpg.applyServerProgress({...profile,level:6,experience:0,gold:30},'mob');
 assert.match(h.get('toast').textContent,/0 опыта\. Добыча остаётся на теле/);
});

test('server-approved coins appear as loot and are not added to wallet until collected',()=>{
 const profile={nickname:'Воин',level:3,gold:30,inventory:[],equipment:{},health:110};
 const h=harness({x:-9,z:-24,authenticatedProfile:profile}),sent=[];
 h.rpg.setMultiplayer({connected:true,economy:(kind,params)=>{
  sent.push({kind,...params});return true;
 }});
 h.rpg.onMobSnapshot([{index:0,phase:'corpse',life:25,hp:0,x:-9,z:-23}]);
 h.rpg.onEconomyResult({ok:true,kind:'lootOpen',mobId:'dolgonog-0',life:25,
  loot:[{id:'coins',qty:13}]});
 assert.equal(h.rpg.state.gold,30);
 assert.ok(descendants(h.get('mbody')).some(x=>x.textContent==='Монеты'));
 descendants(h.get('mbody')).find(x=>x.className==='loot-item').click();
 assert.deepEqual(sent.at(-1),{kind:'lootTake',mobId:'dolgonog-0',life:25,itemId:'coins'});
 assert.equal(h.rpg.state.gold,30);
 h.rpg.applyServerProgress({...profile,revision:2,gold:43},'lootTake');
 assert.equal(h.rpg.state.gold,43);
 h.rpg.onEconomyResult({ok:true,kind:'lootTake',mobId:'dolgonog-0',life:25,
  loot:[],taken:[{id:'coins',qty:13}]});
 assert.equal(h.get('modal').hidden,true);
});

test('level badge is separate, and a boss keeps the complete name inside a fixed size target slot',()=>{
 const h=harness({x:39,z:43,authenticatedProfile:{nickname:'Герой',level:3,experience:0,inventory:[],equipment:{}}});
 h.rpg.targetNearest();
 assert.equal(h.get('targetName').textContent,'Грозоклюв');
 assert.equal(h.get('targetLevel').textContent,'ур. 3');
 assert.match(h.get('targetLevel').title,/Элитный/);
 assert.equal(h.get('targetName').style.color,'#f6d774');
});

test('server XP after a killing blow rises on screen and deduplicates the same revision',()=>{
 const profile={nickname:'Воин',level:1,experience:95,gold:30,health:120,
  inventory:Array(12).fill(null),equipment:{},quests:{}};
 const h=harness({authenticatedProfile:profile});
 const xp=h.get('xpFeedback');
 assert.equal(xp.children.length,0);
 const event={...profile,revision:1,level:2,experience:17};
 h.rpg.applyServerProgress(event,'mob');
 assert.equal(xp.children.length,1);
 assert.match(xp.children[0].textContent,/\+ 22 опыта.*Новый уровень!/);
 assert.match(xp.children[0].className,/ngw-xp-positive/);
 h.rpg.applyServerProgress(event,'mob');
 assert.equal(xp.children.length,1,'same server revision must not produce another popup');
 h.rpg.applyServerProgress({...event,revision:2,level:2,experience:43},'mob');
 assert.equal(xp.children.length,2);
 assert.equal(xp.children[1].textContent,'+ 26 опыта');
});
test('gray monster gives a muted 0 XP float and non-kill progress does not animate',()=>{
 const profile={nickname:'Воин',level:6,experience:0,gold:30,health:120,
  inventory:Array(12).fill(null),equipment:{},quests:{}};
 const h=harness({authenticatedProfile:profile});
 const xp=h.get('xpFeedback');
 h.rpg.applyServerProgress({...profile,revision:1,experience:0},'welcome');
 assert.equal(xp.children.length,0);
 h.rpg.applyServerProgress({...profile,revision:2,experience:0},'mob');
 assert.equal(xp.children.length,1);
 assert.equal(xp.children[0].textContent,'0 опыта');
 assert.match(xp.children[0].className,/ngw-xp-gray/);
 h.rpg.applyServerProgress({...profile,revision:3,experience:0},'lootTake');
 assert.equal(xp.children.length,1,'taking loot is not a kill');
});
test('the overlay never expands the target HUD or intercepts touch interactions',async()=>{
 const {readFileSync}=await import('node:fs');
 const css=readFileSync(new URL('../xp-feedback.css',import.meta.url),'utf8');
 const target=readFileSync(new URL('../target-hud.css',import.meta.url),'utf8');
 const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(css,/#xpFeedback[\s\S]*?pointer-events:none/);
 assert.match(css,/@keyframes ngw-xp-rise/);
 assert.match(css, /prefers-reduced-motion:reduce/);
 assert.match(target,/height:29px;min-height:29px/);
 assert.doesNotMatch(target,/#targetFrame\{[^}]*width:/);
 assert.match(page,/id="targetLevel"/);
 assert.match(page,/id="xpFeedback"/);
});

test('a corpse can be inspected even if asynchronous loot notification was missed',()=>{
 const h=harness({x:-9,z:-24,authenticatedProfile:{nickname:'Воин',level:4,inventory:[],equipment:{}}}),sent=[];
 h.rpg.setMultiplayer({connected:true,economy:(kind,args)=>{sent.push({kind,...args});return true;}});
 h.rpg.onMobSnapshot([{index:0,phase:'corpse',life:33,hp:0,x:-9,z:-23}]);
 // No lootAvailable packet. The corpse still must expose the authoritative
 // lootOpen action, even during the falling animation.
 h.rpg.draw();
 assert.equal(h.get('interact').hidden,false);
 assert.equal(h.get('interact').textContent,'Обыскать');
 h.get('interact').click();
 assert.ok(sent.some(e=>e.kind==='lootOpen'&&e.mobId==='dolgonog-0'&&e.life===33));
 h.rpg.onEconomyResult({ok:true,kind:'lootOpen',mobId:'dolgonog-0',life:33,
  loot:[{id:'feather',qty:1}]});
 assert.equal(h.get('modal').dataset.kind,'loot');
 assert.ok(descendants(h.get('mbody')).some(e=>e.textContent==='Перо долгонога'));
});

test('an empty corpse can be confirmed and does not repeatedly advertise loot',()=>{
 const h=harness({x:-9,z:-24,authenticatedProfile:{nickname:'Воин',level:4,inventory:[],equipment:{}}}),sent=[];
 h.rpg.setMultiplayer({connected:true,economy:(kind,args)=>{sent.push({kind,...args});return true;}});
 h.rpg.onMobSnapshot([{index:0,phase:'corpse',life:34,hp:0,x:-9,z:-23}]);
 h.rpg.draw();
 assert.equal(h.get('interact').hidden,false);
 h.rpg.onEconomyResult({ok:true,kind:'lootInspect',mobId:'dolgonog-0',life:34,loot:[]});
 h.rpg.draw();
 assert.equal(h.get('interact').hidden,true);
 h.rpg.onEconomyResult({ok:true,kind:'lootOpen',mobId:'dolgonog-0',life:34,loot:[]});
 assert.ok(descendants(h.get('mbody')).some(e=>e.textContent==='Нет добычи'));
});
