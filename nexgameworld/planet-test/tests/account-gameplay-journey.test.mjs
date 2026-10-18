import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,descendants} from './harness.mjs';
import {OFFLINE_CHEST} from '../gather-world.js';

test('authenticated quest, corpse loot, equipment, shared storage and return to world',()=>{
 const bag=Array(12).fill(null);bag[1]={id:'wornAxe',qty:1};
 const profile={nickname:'Путник',level:10,experience:20,gold:40,health:90,resource:0,
  inventory:bag,equipment:{},quests:{mentor:{step:0,kills:0},gather:{stage:0}},actionBar:[]};
 const h=harness({x:-9,z:-24,authenticatedProfile:profile}),sent=[];
 h.rpg.setMultiplayer({connected:true,
  economy:(kind,p)=>{sent.push({kind,...p});return true},
  openChest:()=>true,closeChest:()=>true,moveChest:(...args)=>{sent.push({kind:'chestMove',args});return true}});
 const quest={...profile,revision:1,quests:{mentor:{step:1,kills:0},gather:{stage:0}}};
 h.rpg.applyServerProgress(quest,'mentorAccept');
 assert.equal(h.rpg.state.quest,1);
 h.get('journal').click();
 assert.equal(h.get('modal').dataset.kind,'quests');
 assert.ok(descendants(h.get('mbody')).some(n=>n.textContent==='Текущие'));
 h.get('modalClose').click();
 h.rpg.onMobSnapshot([{index:0,phase:'corpse',life:1,hp:0,x:-9,z:-23}]);
 for(let i=0;i<20;i++)h.rpg.update(.1);
 const loot=[{id:'batteredBuckler',qty:1}];
 h.rpg.onEconomyResult({ok:true,kind:'lootAvailable',mobId:'dolgonog-0',life:1,loot});
 h.rpg.onEconomyResult({ok:true,kind:'lootOpen',mobId:'dolgonog-0',life:1,loot});
 assert.equal(h.get('modal').dataset.kind,'loot');
 descendants(h.get('mbody')).find(n=>n.className==='loot-item').click();
 assert.equal(sent.at(-1).kind,'lootTake');
 const withLoot=Array(12).fill(null);withLoot[1]={id:'wornAxe',qty:1};
 withLoot[4]={id:'feather',qty:2};withLoot[9]={id:'batteredBuckler',qty:1};
 const progressed={...quest,revision:2,experience:42,gold:44,inventory:withLoot,
  quests:{mentor:{step:1,kills:1},gather:{stage:0}}};
 h.rpg.applyServerProgress(progressed,'lootTake');
 h.rpg.onEconomyResult({ok:true,kind:'lootTake',mobId:'dolgonog-0',life:1,loot:[],taken:loot});
 assert.equal(h.get('modal').hidden,true);
 h.get('bag').click();
 const cells=descendants(h.get('mbody')).filter(n=>n.className.includes('inventory-slot'));
 cells[2].click();
 descendants(h.get('mbody')).find(n=>n.textContent==='Надеть').click();
 assert.deepEqual(sent.at(-1),{kind:'equip',bagSlot:9,equipmentSlot:'shield'});
 const equippedBag=withLoot.map((row,i)=>i===9?null:row);
 const equipped={...progressed,revision:3,inventory:equippedBag,
  equipment:{shield:{id:'batteredBuckler'}}};
 h.rpg.applyServerProgress(equipped,'equip');
 assert.equal(h.rpg.state.equipment.shield.id,'batteredBuckler');
 h.get('modalClose').click();
 h.position(OFFLINE_CHEST.x,OFFLINE_CHEST.z);
 h.rpg.interact();
 assert.equal(h.get('modal').dataset.kind,'chest');
 const chest=Array(18).fill(null);
 h.rpg.onChestState({slots:chest,revision:5,inventory:equippedBag});
 const tab=descendants(h.get('mbody')).find(n=>n.className==='chest-tabs');
 tab.children[1].click();
 const grid=descendants(h.get('mbody')).find(n=>n.className==='inventory-grid chest-sheet-grid');
 grid.children[4].click();
 descendants(h.get('mbody')).find(n=>n.textContent==='Положить').click();
 assert.deepEqual(sent.at(-1).args.slice(0,2),['deposit',4]);
 const deposited=equippedBag.map((row,i)=>i===4?null:row);
 chest[0]={id:'feather',qty:2};
 h.rpg.applyServerProgress({...equipped,revision:4,inventory:deposited},'chestMove');
 h.rpg.onChestResult({ok:true,requestId:sent.at(-1).args[2],
  inventory:deposited,slots:chest,revision:6});
 assert.equal(h.rpg.state.inventory.some(n=>n.id==='feather'),false);
 h.get('modalClose').click();
 const next=harness({authenticatedProfile:{...equipped,revision:4,inventory:deposited}});
 assert.equal(next.rpg.state.equipment.shield.id,'batteredBuckler');
 assert.equal(next.rpg.state.xp,42);
 assert.equal(next.rpg.state.gold,44);
 assert.equal(next.rpg.state.quest,1);
 assert.deepEqual(next.rpg.state.inventory,[{id:'wornAxe',qty:1}]);
});
