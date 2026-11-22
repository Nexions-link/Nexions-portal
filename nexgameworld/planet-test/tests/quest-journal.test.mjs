import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuestJournal} from '../quest-journal.js';
import {harness,installDom,descendants} from './harness.mjs';

function setup(){
 installDom();
 const create=document.createElement,events={},actions=[];
 document.createElement=tag=>{const node=create(tag);node.focus=()=>{document.activeElement=node;};return node;};
 document.addEventListener=(name,fn)=>{events[name]=fn;};
 const body=document.getElementById('mbody');
 const journal=createQuestJournal({document,isOpen:()=>true,
  onTab:tab=>actions.push(['tab',tab]),onTrack:id=>actions.push(['track',id]),onClose:()=>actions.push(['close'])});
 const find=selector=>descendants(body).find(selector);
 const cls=name=>find(node=>node.className.split(' ').includes(name));
 const quest=id=>find(node=>node.dataset.journalQuest===id);
 const key=(value,target,code)=>{
  const event={key:value,code,target,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};
  events.keydown(event);return event;
 };
 return {journal,body,actions,find,cls,quest,key};
}
const mentor={id:1,routeId:'mentor',title:'Обряд силы',region:'Начальные земли',status:'current',
 objective:'Победить трёх долгоногов.',progress:'1 / 3',description:'Докажи свою силу.',reward:'25 монет · 80 опыта',npc:'Каменный Рог',trackable:true};
const gather={id:'gather-1',title:'Цветы',region:'Начальные земли',status:'current',
 objective:'Собрать 4 цветка.',progress:'0 / 4',reward:'12 монет · 30 опыта',npc:'Травница',trackable:true};
const model=(entries=[mentor,gather],trackedIds=['mentor'])=>({tab:'current',entries,trackedIds});

test('selection and track actions use separate row identity and authoritative route identity',()=>{
 const h=setup();h.journal.render(h.body,model());
 assert.equal(h.journal.selectedId,'1');assert.equal(h.cls('ngw-journal-title').textContent,'Обряд силы');
 const pin=h.find(node=>node.dataset.journalPin==='1');pin.click();
 assert.deepEqual(h.actions,[['track','mentor']]);
 h.quest('gather-1').click();assert.equal(h.journal.selectedId,'gather-1');
 assert.equal(h.cls('ngw-journal-objective').textContent,'Собрать 4 цветка.');
 h.cls('ngw-journal-track').click();assert.deepEqual(h.actions.at(-1),['track','gather-1']);
 assert.equal(h.cls('ngw-journal-track').textContent,'Отслеживать задание');
});
test('ordinary verified progress refresh preserves selected nodes, focus and both scroll positions',()=>{
 const h=setup();h.journal.render(h.body,model());h.quest('gather-1').click();
 const selected=h.quest('gather-1'),detail=h.cls('ngw-journal-detail'),list=h.cls('ngw-journal-list');
 selected.focus();detail.scrollTop=67;list.scrollTop=21;
 h.journal.render(h.body,model([mentor,{...gather,progress:'3 / 4'}],['gather-1','mentor']));
 assert.equal(h.quest('gather-1'),selected);assert.equal(document.activeElement,selected);
 assert.equal(h.journal.selectedId,'gather-1');assert.equal(detail.scrollTop,67);assert.equal(list.scrollTop,21);
 assert.equal(h.cls('ngw-journal-progress').textContent,'3 / 4');
 assert.equal(h.cls('ngw-journal-track').textContent,'Не отслеживать');
});
test('a confirmed hand-in removes the old row and transfers its focus to the surviving selection',()=>{
 const h=setup();h.journal.render(h.body,model());h.quest('gather-1').click();h.quest('gather-1').focus();
 h.journal.render(h.body,model([mentor,{...gather,status:'completed',trackable:false}]));
 assert.equal(h.journal.selectedId,'1');assert.equal(document.activeElement,h.quest('1'));
 assert.equal(h.quest('gather-1'),undefined);
});
test('group collapse keeps selection and reopening focuses a visible group control',()=>{
 const h=setup();h.journal.render(h.body,model());
 const group=h.find(node=>node.dataset.journalGroup==='Начальные земли');group.click();h.journal.focus();
 assert.equal(document.activeElement,group);assert.equal(group.attributes['aria-expanded'],'false');
 assert.equal(h.journal.selectedId,'1');group.click();h.journal.focus();assert.equal(document.activeElement,h.quest('1'));
});
test('list arrow navigation and journal close keys are contained; accepted progress is never changed',()=>{
 const h=setup();h.journal.render(h.body,model());
 const arrow=h.key('ArrowDown',h.quest('1'));assert.equal(arrow.prevented,true);assert.equal(arrow.stopped,true);
 assert.equal(h.journal.selectedId,'gather-1');assert.equal(document.activeElement,h.quest('gather-1'));
 const escape=h.key('Escape',h.quest('gather-1'));assert.equal(escape.prevented,true);assert.deepEqual(h.actions,[['close']]);
 const physical=h.key('д',h.quest('1'),'KeyL');assert.equal(physical.prevented,true);assert.deepEqual(h.actions.at(-1),['close']);
});
test('arrow keys follow displayed grouped rows when the quest registry interleaves regions',()=>{
 const h=setup(),forest={...mentor,id:'expedition',routeId:'expedition',region:'Шепчущий лес'};
 h.journal.render(h.body,model([mentor,forest,gather]));
 const displayed=descendants(h.cls('ngw-journal-list')).filter(node=>node.dataset.journalQuest).map(node=>node.dataset.journalQuest);
 assert.deepEqual(displayed,['1','gather-1','expedition']);
 h.quest('gather-1').click();h.key('ArrowDown',h.quest('gather-1'));
 assert.equal(h.journal.selectedId,'expedition');assert.equal(document.activeElement,h.quest('expedition'));
 h.key('ArrowUp',h.quest('expedition'));assert.equal(h.journal.selectedId,'gather-1');
 h.key('Home',h.quest('gather-1'));assert.equal(h.journal.selectedId,'1');
 h.key('End',h.quest('1'));assert.equal(h.journal.selectedId,'expedition');
 h.find(node=>node.dataset.journalGroup==='Начальные земли').click();
 h.key('Home',h.quest('expedition'));assert.equal(h.journal.selectedId,'expedition','collapsed rows are excluded');
});
test('available, locked and completed entries never offer acceptance, rewards or tracking actions',()=>{
 const h=setup(),available={...gather,id:'offered',title:'Предложение',status:'available',trackable:false},locked={...mentor,id:'locked',status:'locked',trackable:false};
 h.journal.render(h.body,{tab:'available',entries:[available,locked],trackedIds:[]});
 assert.equal(h.cls('ngw-journal-track').hidden,true);assert.equal(h.cls('ngw-journal-status').textContent,'Задание не принято');
 h.quest('locked').click();assert.equal(h.cls('ngw-journal-status').textContent,'Пока недоступно');
 h.journal.render(h.body,{tab:'completed',entries:[{...mentor,id:0,status:'completed',trackable:false}],trackedIds:[]});
 assert.equal(h.journal.selectedId,'0');assert.equal(h.cls('ngw-journal-track').hidden,true);
 assert.equal(h.cls('ngw-journal-status').textContent,'Завершено');assert.deepEqual(h.actions,[]);
});
test('reward display recovers after an empty tab and quest text is treated as text',()=>{
 const h=setup();h.journal.render(h.body,model());
 h.journal.render(h.body,{tab:'completed',entries:[],trackedIds:[]});
 h.journal.render(h.body,model([{...mentor,title:'<img src=x onerror=alert(1)>'}]));
 assert.equal(h.cls('ngw-journal-title').textContent,'<img src=x onerror=alert(1)>');
 assert.ok(descendants(h.cls('ngw-journal-rewards')).some(node=>node.textContent==='25 монет'));
 assert.equal(h.find(node=>node.tagName==='img'),undefined);
});

test('reopening the journal after the merchant restores journal content with unchanged quest data',()=>{
 const h=harness({x:6,z:11,save:{quest:1}});
 h.get('journal').click();assert.equal(h.get('mtitle').textContent,'Журнал заданий');
 h.get('modalClose').click();h.rpg.interact();
 assert.equal(h.get('modal').dataset.kind,'merchant');assert.equal(h.get('mtitle').textContent,'Торговец');
 h.get('modalClose').click();h.get('journal').click();
 assert.equal(h.get('modal').dataset.kind,'quests');assert.equal(h.get('mtitle').textContent,'Журнал заданий');
 assert.ok(h.get('mbody').querySelector('.ngw-journal'));
 assert.equal(h.get('mbody').querySelector('.ngw-journal-title').textContent,'Обряд силы');
});
