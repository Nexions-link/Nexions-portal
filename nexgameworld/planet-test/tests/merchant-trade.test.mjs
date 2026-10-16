import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BUYBACK_LIMIT,sellInventorySlot,buyBackFromMerchant,restoreBuyback} from '../merchant-trade.js';

test('sell stack for its real catalog price and buy back without loss',()=>{
 const state={inventory:[{id:'feather',qty:3},{id:'wornAxe',qty:1}],gold:10,buyback:[]};
 const sold=sellInventorySlot(state,0);
 assert.equal(sold.ok,true);assert.equal(sold.item.price,3);
 assert.equal(state.gold,13);assert.equal(state.inventory.length,1);
 assert.equal(buyBackFromMerchant(state,0).ok,true);
 assert.equal(state.gold,10);assert.deepEqual(state.inventory[1],{id:'feather',qty:3});
 assert.deepEqual(state.buyback,[]);
});
test('quest items and potions without a sale value may not be sold',()=>{
 const state={inventory:[{id:'meadowFlower',qty:1},{id:'healingPotion',qty:3}],gold:10,buyback:[]};
 assert.equal(sellInventorySlot(state,0).ok,false);
 assert.equal(sellInventorySlot(state,1).ok,false);
 assert.equal(state.inventory.length,2);
});
test('buyback without enough money is atomic',()=>{
 const state={inventory:[],gold:0,buyback:[{id:'feather',qty:2,price:2}]};
 assert.deepEqual(buyBackFromMerchant(state,0).reason,'gold');
 assert.equal(state.inventory.length,0);assert.equal(state.buyback.length,1);
});
test('buyback with a full bag is atomic',()=>{
 const state={inventory:Array.from({length:12},()=>({id:'wornAxe',qty:1})),
  gold:100,buyback:[{id:'feather',qty:1,price:1}]};
 assert.deepEqual(buyBackFromMerchant(state,0).reason,'full');
 assert.equal(state.gold,100);assert.equal(state.inventory.length,12);
 assert.equal(state.buyback.length,1);
});
test('buyback merges existing stacks and splits only after capacity validation',()=>{
 const state={inventory:[{id:'feather',qty:19}],gold:100,buyback:[{id:'feather',qty:4,price:4}]};
 assert.equal(buyBackFromMerchant(state,0).ok,true);
 assert.deepEqual(state.inventory,[{id:'feather',qty:20},{id:'feather',qty:3}]);
 assert.equal(state.gold,96);
});
test('buyback history is bounded and sanitized on restore',()=>{
 const state={inventory:[{id:'feather',qty:1}],gold:0,buyback:[]};
 for(let i=0;i<BUYBACK_LIMIT+4;i++){
  assert.equal(sellInventorySlot(state,0).ok,true);
  state.inventory.push({id:'feather',qty:1});
 }
 assert.equal(state.buyback.length,BUYBACK_LIMIT);
 assert.deepEqual(restoreBuyback([{id:'unknown',qty:1,price:2},
  {id:'feather',qty:1,price:1},{id:'meadowFlower',qty:1,price:0}]),[{id:'feather',qty:1,price:1}]);
});
