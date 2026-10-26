import test from 'node:test';
import assert from 'node:assert/strict';
import {
 MOUNT_COLLECTION_CATALOG,mountCollectionRows,mountCollectionAction,mountCollectionHint,
 renderMountCollection
} from '../mount-collection.js';

class Node {
 constructor(tag='div'){
  this.tagName=tag;this.children=[];this.className='';this.dataset={};
  this.attributes={};this.disabled=false;this.events={};this.textContent='';
 }
 append(...items){this.children.push(...items)}
 replaceChildren(...items){this.children=items}
 setAttribute(name,value){this.attributes[name]=String(value)}
 addEventListener(name,callback){this.events[name]=callback}
 click(){this.events.click?.()}
}
const document={createElement:tag=>new Node(tag)};
const find=(parent,predicate)=>{
 if(predicate(parent))return parent;
 for(const child of parent.children||[]){
  const matched=find(child,predicate);
  if(matched)return matched;
 }
 return null;
};
const byClass=(root,name)=>find(root,node=>node.className?.split(' ').includes(name));
const byAction=(root,name)=>find(root,node=>node.dataset?.action===name);
test('catalogue has one available species and is expandable',()=>{
 assert.equal(MOUNT_COLLECTION_CATALOG.length,1);
 assert.equal(MOUNT_COLLECTION_CATALOG[0].id,'forest_wolf');
 const [wolf]=mountCollectionRows(['forest_wolf'],10,{stage:3,traces:[true,true]});
 assert.equal(wolf.owned,true);
 assert.equal(wolf.speedBonus,60);
 assert.equal(wolf.castSeconds,2);
 assert.equal(mountCollectionRows(['forged_mount'],20)[0].owned,false);
 const expanded=mountCollectionRows(['forest_wolf','horse'],20,null,{catalog:[
  ...MOUNT_COLLECTION_CATALOG,{id:'horse',requiredLevel:15}
 ]});
 assert.equal(expanded.length,2);
 assert.equal(expanded[1].owned,true);
});
test('ownership is not inferred from level or quest stage',()=>{
 assert.equal(mountCollectionRows([],60,{stage:3,traces:[true,true]})[0].owned,false);
 assert.match(mountCollectionHint(mountCollectionRows([],8)[0]),/10-м уровне/);
 assert.match(mountCollectionHint(mountCollectionRows([],10,{stage:1,traces:[false,false]})[0]),/следа/);
 assert.equal(mountCollectionAction({owned:false},{connected:true}).enabled,false);
});
test('authoritative mount action states and connectivity',()=>{
 const row=mountCollectionRows(['forest_wolf'],10)[0];
 assert.deepEqual(mountCollectionAction(row,{connected:false}),{
  label:'Нет соединения',enabled:false,kind:'offline'});
 assert.equal(mountCollectionAction(row,{connected:true}).kind,'summon');
 assert.equal(mountCollectionAction(row,{connected:true,mountState:'casting',activeMountId:'forest_wolf'}).kind,'dismount');
 assert.equal(mountCollectionAction(row,{connected:true,mountState:'riding',activeMountId:'forest_wolf'}).label,'Спешиться');
 assert.equal(mountCollectionAction(row,{connected:true,mountState:'riding',activeMountId:'horse'}).enabled,false);
});
test('locked card is visible without server reward, quest button navigates',()=>{
 const body=new Node(),calls=[];
 const view=renderMountCollection(document,body,{level:10,mountQuest:{stage:0,traces:[false,false]},
  ownedMountIds:[],connected:true,onQuest:id=>calls.push(['quest',id]),
  onToggle:id=>calls.push(['toggle',id])});
 assert.equal(view.earned,0);assert.equal(view.shown,1);
 assert.equal(byAction(body,'locked').disabled,true);
 byAction(body,'locked').click();
 assert.deepEqual(calls,[]);
 byClass(body,'ngw-mount-quest').click();
 assert.deepEqual(calls,[['quest','forest_wolf']]);
 assert.match(byClass(body,'ngw-mount-overview-count').textContent,/0 \/ 1/);
});
test('owned mount can be summoned and dismounted from collection',()=>{
 const calls=[],body=new Node();
 const render=(mountState,activeMountId)=>renderMountCollection(document,body,{
  level:10,mountQuest:{stage:3,traces:[true,true]},
  ownedMountIds:['forest_wolf'],connected:true,mountState,activeMountId,
  onToggle:(id,action)=>calls.push([id,action])
 });
 render('foot',null);
 assert.equal(byClass(body,'ngw-mount-status').textContent,'Получен');
 assert.equal(byAction(body,'summon').disabled,false);
 byAction(body,'summon').click();
 render('riding','forest_wolf');
 byAction(body,'dismount').click();
 assert.deepEqual(calls,[['forest_wolf','summon'],['forest_wolf','dismount']]);
});
test('owned-only filter shows empty state, never invents a mount',()=>{
 const body=new Node(),selected=[];
 renderMountCollection(document,body,{filter:'owned',ownedMountIds:[],onFilter:filter=>selected.push(filter)});
 assert.match(byClass(body,'ngw-mount-empty').textContent,/нет полученных/);
 assert.equal(byClass(body,'ngw-mount-card'),null);
 const filterButton=find(body,node=>node.textContent==='Все');
 filterButton.click();
 assert.deepEqual(selected,['all']);
});
