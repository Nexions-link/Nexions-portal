import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,descendants} from './harness.mjs';
import {BANDIT_QUEST_GIVER} from '../creature-registry.js';
import {ITEM_CATALOG} from '../../items.js';

function prepare(){
 const hero={level:5,experience:25,gold:80,health:210,resource:0,revision:7,
  inventory:Array(12).fill(null),equipment:{},
  quests:{mentor:{step:0,kills:0},gather:{stage:0},bandit:{stage:3,kills:3},
   banditWeapons:{stage:2},banditChief:{stage:2}},actionBar:[]};
 const h=harness({x:BANDIT_QUEST_GIVER.x,z:BANDIT_QUEST_GIVER.z,authenticatedProfile:hero});
 const calls=[];
 h.rpg.setMultiplayer({connected:true,economy:(kind,args)=>{calls.push({kind,args});return true;}});
 h.rpg.interact();
 assert.equal(h.get('modal').dataset.kind,'banditQuest');
 const controls=()=>descendants(h.get('mbody'));
 const cards=()=>controls().filter(n=>n.className.includes('ngw-quest-reward-card'));
 const confirm=()=>controls().find(n=>n.className.includes('ngw-quest-reward-submit'));
 return {h,hero,calls,controls,cards,confirm};
}

test('portrait quest reward cards show original pictures and level 5 equipment',()=>{
 const {cards,confirm,controls}=prepare();
 assert.equal(cards().length,2);
 assert.deepEqual(cards().map(c=>c.dataset.rewardId),['trailbreakerAxe','trailwardenShield']);
 assert.ok(cards().every(c=>c.attributes['aria-checked']==='false'));
 assert.ok(cards().every(c=>c.children.some(x=>x.className==='ngw-reward-art')));
 assert.deepEqual(cards().map(c=>c.children.find(x=>x.className==='ngw-reward-art').children[0].src),
  ['./reward-art/trailbreaker-axe.svg','./reward-art/trailwarden-shield.svg']);
 assert.ok(controls().some(n=>n.textContent==='Выберите одну награду'));
 assert.equal(confirm().disabled,true);
 assert.equal(ITEM_CATALOG.trailbreakerAxe.requiredLevel,5);
 assert.equal(ITEM_CATALOG.trailwardenShield.requiredLevel,5);
 assert.equal(ITEM_CATALOG.trailbreakerAxe.rarity,'uncommon');
 assert.equal(ITEM_CATALOG.trailwardenShield.rarity,'uncommon');
});

test('choice survives HUD redraw, grants only selected reward once, retries after failure',()=>{
 const {h,hero,calls,cards,confirm}=prepare();
 confirm().click();
 assert.equal(calls.length,0,'cannot finish before selecting');
 cards()[0].click();
 assert.equal(cards()[0].attributes['aria-checked'],'true');
 assert.equal(cards()[1].attributes['aria-checked'],'false');
 assert.equal(confirm().disabled,false);
 cards()[1].click();
 assert.equal(cards()[0].attributes['aria-checked'],'false');
 assert.equal(cards()[1].attributes['aria-checked'],'true');
 h.rpg.draw();h.rpg.update(.21);
 assert.equal(cards()[1].attributes['aria-checked'],'true');
 confirm().click();confirm().click();
 assert.equal(calls.length,1,'double tap must send one quest turn-in');
 assert.equal(calls[0].kind,'banditChiefTurnIn');
 assert.deepEqual(calls[0].args,{rewardItemId:'trailwardenShield'});
 assert.equal(confirm().disabled,true);
 h.rpg.onEconomyResult({ok:false,kind:'banditChiefTurnIn',reason:'stale_revision'});
 assert.equal(confirm().disabled,false,'failed response allows retry with same selection');
 assert.equal(cards()[1].attributes['aria-checked'],'true');
 confirm().click();
 assert.equal(calls.length,2);
 assert.equal(calls[1].args.rewardItemId,'trailwardenShield');
 const inventory=hero.inventory.slice();inventory[3]={id:'trailwardenShield',qty:1};
 h.rpg.applyServerProgress({...hero,revision:8,inventory,
  quests:{...hero.quests,banditChief:{stage:3}}},'banditChiefTurnIn');
 h.rpg.onEconomyResult({ok:true,kind:'banditChiefTurnIn'});
 assert.equal(h.rpg.state.inventory.filter(x=>x.id==='trailwardenShield').length,1);
 assert.equal(h.rpg.state.inventory.some(x=>x.id==='trailbreakerAxe'),false);
 assert.equal(h.rpg.state.banditChiefQuest.stage,3);
 assert.equal(cards().length,0,'after completion no reward selection remains');
});
