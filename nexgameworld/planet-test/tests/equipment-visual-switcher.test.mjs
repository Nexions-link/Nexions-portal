import test from 'node:test';
import assert from 'node:assert/strict';
import {createEquipmentVisualSwitcher} from '../equipment-visual-switcher.js';
const deferred=()=>{
 let resolve,reject;
 const promise=new Promise((yes,no)=>{resolve=yes;reject=no});
 return {promise,resolve,reject};
};
test('frequent server checkpoints keep Battlefury visible without GLB reload',async()=>{
 const models=new Map(),loads=[],removed=[];
 const switcher=createEquipmentVisualSwitcher({
  load:spec=>{loads.push(spec.key);return Promise.resolve({name:spec.key})},
  swap:(slot,gltf)=>models.set(slot,gltf.name),
  clear:slot=>{removed.push(slot);models.delete(slot)}
 });
 await switcher.update('weapon','adminBattlefury|path',{key:'battlefury'});
 for(let i=0;i<400;i++){
  assert.equal(await switcher.update('weapon','adminBattlefury|path',{key:'battlefury'}),false);
  assert.equal(models.get('weapon'),'battlefury');
 }
 assert.equal(loads.length,1);
 assert.deepEqual(removed,[]);
});
test('old weapon stays attached until new GLB is decoded and prepared',async()=>{
 const old=deferred(),next=deferred(),mounted=[];
 const switcher=createEquipmentVisualSwitcher({
  load:spec=>spec.key==='old'?old.promise:next.promise,
  swap:(slot,gltf)=>mounted.splice(0,mounted.length,gltf.name),
  clear:()=>mounted.splice(0)
 });
 const first=switcher.update('weapon','old',{key:'old'});
 old.resolve({name:'old'});await first;
 const second=switcher.update('weapon','new',{key:'new'});
 assert.deepEqual(mounted,['old'],'never detach before replacement is available');
 for(let i=0;i<20;i++)await switcher.update('weapon','new',{key:'new'});
 next.resolve({name:'new'});await second;
 assert.deepEqual(mounted,['new']);
});
test('stale async load cannot replace freshly equipped item',async()=>{
 const slow=deferred(),changed=[];
 const switcher=createEquipmentVisualSwitcher({
  load:spec=>spec.key==='slow'?slow.promise:Promise.resolve({name:spec.key}),
  swap:(_slot,gltf)=>changed.push(gltf.name),
  clear:()=>changed.push('cleared')
 });
 const obsolete=switcher.update('weapon','slow',{key:'slow'});
 await switcher.update('weapon','fast',{key:'fast'});
 slow.resolve({name:'slow'});await obsolete;
 assert.deepEqual(changed,['fast']);
 await switcher.update('weapon',null);
 assert.deepEqual(changed,['fast','cleared']);
});
test('shield state changes never reload weapon model',async()=>{
 const loaded=[],removed=[];
 const switcher=createEquipmentVisualSwitcher({
  load:spec=>{loaded.push(spec.key);return Promise.resolve(spec)},
  swap:()=>{},
  clear:slot=>removed.push(slot)
 });
 await switcher.update('weapon','battlefury',{key:'battlefury'});
 await switcher.update('shield','shield-a',{key:'shield-a'});
 await switcher.update('shield','shield-b',{key:'shield-b'});
 await switcher.update('shield',null);
 await switcher.update('weapon','battlefury',{key:'battlefury'});
 assert.deepEqual(loaded,['battlefury','shield-a','shield-b']);
 assert.deepEqual(removed,['shield']);
});
test('load errors preserve the old weapon and can be retried',async()=>{
 let attempts=0,shown='none',errors=0;
 const switcher=createEquipmentVisualSwitcher({
  load:async spec=>{
   if(spec.key==='new'&&++attempts===1)throw Error('offline');
   return {name:spec.key};
  },
  swap:(_slot,gltf)=>{shown=gltf.name},
  clear:()=>{shown='none'},
  onError:()=>errors++
 });
 await switcher.update('weapon','original',{key:'original'});
 await switcher.update('weapon','new',{key:'new'});
 assert.equal(shown,'original');assert.equal(errors,1);
 await switcher.update('weapon','new',{key:'new'});
 assert.equal(shown,'new');
});
