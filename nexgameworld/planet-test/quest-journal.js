// Original parchment journal. Selection and pane scroll are presentation state;
// accepting, completing and rewarding quests remain with the existing world rules.
const TABS={current:'Текущие',available:'Доступные',completed:'Выполненные'};
const keyOf=entry=>String(entry.id);
const routeOf=entry=>entry.routeId||keyOf(entry);
const groupOf=entry=>entry.region||'Начальные земли';
export function createQuestJournal({document:doc,onTab=()=>{},onTrack=()=>{},onClose=()=>{},isOpen=()=>false}){
 const make=(tag,classes,text)=>{
  const node=doc.createElement(tag);node.className=classes||'';
  if(text!==undefined)node.textContent=text;
  return node;
 };
 const root=make('section','ngw-journal');
 const tabs=make('div','planet-journal-tabs ngw-journal-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Разделы журнала');
 const tabNodes=new Map();
 for(const [id,label] of Object.entries(TABS)){
  const button=make('button','choice',label);button.type='button';button.dataset.journalTab=id;button.id='ngwJournalTab-'+id;
  button.setAttribute('role','tab');button.setAttribute('aria-controls','ngwJournalPages');
  button.addEventListener('click',()=>onTab(id));tabNodes.set(id,button);tabs.append(button);
 }
 const columns=make('div','ngw-journal-columns');columns.id='ngwJournalPages';
 columns.setAttribute('role','tabpanel');
 const sidebar=make('section','ngw-journal-sidebar');sidebar.setAttribute('aria-label','Список заданий');
 const count=make('div','ngw-journal-count');
 const list=make('div','ngw-journal-list');
 const empty=make('p','ngw-journal-empty');
 sidebar.append(count,list,empty);
 const detail=make('article','ngw-journal-detail');detail.tabIndex=0;detail.setAttribute('aria-label','Описание выбранного задания');
 const detailCategory=make('div','ngw-journal-category');
 const heading=make('h3','ngw-journal-title');
 const status=make('div','ngw-journal-status');
 const descriptionTitle=make('h4','','Описание');
 const description=make('p','ngw-journal-description');
 const objectiveTitle=make('h4','','Цели задания');
 const objective=make('p','ngw-journal-objective');
 const progress=make('p','ngw-journal-progress');progress.setAttribute('aria-live','polite');
 const giver=make('p','ngw-journal-giver');
 const rewardsTitle=make('h4','','Награды');
 const rewards=make('div','ngw-journal-rewards');
 detail.append(detailCategory,heading,status,descriptionTitle,description,objectiveTitle,objective,progress,giver,rewardsTitle,rewards);
 const footer=make('div','ngw-journal-footer');
 const track=make('button','wow-button ngw-journal-track');track.type='button';track.dataset.journalControl='track';
 const help=make('small','ngw-journal-help');
 const close=make('button','wow-button ngw-journal-close','Закрыть');close.type='button';close.dataset.journalControl='close';
 close.addEventListener('click',onClose);
 footer.append(track,help,close);columns.append(sidebar,detail);root.append(tabs,columns,footer);
 let model={tab:'current',entries:[],trackedIds:[]},visible=[],rows=new Map(),groups=new Map(),listSignature='';
 const selected=new Map(),collapsed=new Map();
 const current=()=>visible.find(entry=>keyOf(entry)===selected.get(model.tab))||null;
 const collapsedHere=()=>collapsed.get(model.tab)||new Set();
 const focusNode=node=>node?.focus?.({preventScroll:true});
 function paintDetail(){
  const entry=current(),tracked=entry&&model.trackedIds.includes(routeOf(entry));
  for(const [id,row] of rows){
   const item=visible.find(e=>keyOf(e)===id),chosen=entry&&id===keyOf(entry);
   row.select.classList.toggle('is-selected',!!chosen);
   row.select.setAttribute('aria-pressed',String(!!chosen));
   row.select.tabIndex=chosen?0:-1;
   const pinned=!!item&&model.trackedIds.includes(routeOf(item));
   if(row.track){
    row.track.textContent=pinned?'✓ Выключить':'Отслеживать';
    row.track.classList.toggle('is-tracked',pinned);row.track.setAttribute('aria-pressed',String(pinned));
    row.track.setAttribute('aria-label',(pinned?'Не отслеживать: ':'Отслеживать: ')+(item?.title||''));
    row.track.title=pinned?'Не отслеживать':'Отслеживать';
   }
  }
  if(!entry){
   detailCategory.textContent='Журнал приключений';heading.textContent='Нет заданий';status.textContent='';
   description.textContent=model.tab==='current'?'Поговори с жителями лагеря, чтобы получить новое задание.':
    model.tab==='completed'?'Здесь появятся задания после получения награды.':'Новые поручения открываются по мере путешествия.';
   objective.textContent='Выбери другой раздел журнала.';progress.textContent='';giver.textContent='';rewards.replaceChildren();rewards.dataset.signature='__empty__';
   track.hidden=true;help.textContent='L / J — закрыть журнал';return;
  }
  detailCategory.textContent=entry.chain||groupOf(entry);
  heading.textContent=entry.title;
  status.textContent=entry.status==='completed'?'Завершено':entry.status==='locked'?'Пока недоступно':
   entry.status==='available'?'Задание не принято':entry.ready?'Цели выполнены — доложи о результате':'Выполняется';
  status.classList.toggle('is-ready',!!entry.ready||entry.status==='completed');
  description.textContent=entry.description||entry.objective;
  objective.textContent=entry.objective;
  progress.textContent=entry.progress;
  progress.classList.toggle('is-ready',!!entry.ready||entry.status==='completed');
  giver.textContent=(entry.status==='completed'?'Задание завершено у: ':'Задание выдаёт: ')+(entry.npc||'');
  const rewardParts=String(entry.reward||'').split(' · ').filter(Boolean);
  // Reward data is taken verbatim from the quest; do not invent payouts.
  const signature=rewardParts.join('|');
  if(rewards.dataset.signature!==signature){
   rewards.dataset.signature=signature;rewards.replaceChildren();
   for(const part of rewardParts){
    const line=make('span',/\d+\s+монет/.test(part)?'ngw-journal-reward wow-money':'ngw-journal-reward',part);rewards.append(line);
   }
   if(!rewardParts.length)rewards.append(make('span','ngw-journal-no-reward','Награда не предусмотрена.'));
  }
  track.hidden=entry.status!=='current'||!entry.trackable;
  track.textContent=tracked?'Не отслеживать':'Отслеживать задание';
  track.setAttribute('aria-pressed',String(!!tracked));
  help.textContent=entry.status==='current'?`Отслеживается ${model.trackedIds.length} / 3 · Shift + щелчок по заданию`:
   entry.status==='available'?'Поговори с указанным персонажем, чтобы принять задание.':
   entry.status==='locked'?entry.progress:'Награда за это задание уже получена.';
 }
 function select(id){
  if(!visible.some(entry=>keyOf(entry)===id))return;
  const changed=selected.get(model.tab)!==id;selected.set(model.tab,id);paintDetail();
  if(changed)detail.scrollTop=0;
 }
 track.addEventListener('click',()=>{const entry=current();if(entry?.trackable&&entry.status==='current')onTrack(routeOf(entry));});
 function rebuildList(){
  const scroll=list.scrollTop;list.replaceChildren();rows=new Map();groups=new Map();
  const grouped=new Map();for(const entry of visible){const group=groupOf(entry);if(!grouped.has(group))grouped.set(group,[]);grouped.get(group).push(entry);}
  for(const [group,entries] of grouped){
   const section=make('section','ngw-journal-group');
   const title=make('button','ngw-journal-group-title',group);title.type='button';title.dataset.journalGroup=group;
   const children=make('div','ngw-journal-group-rows');
   const applyCollapse=()=>{const closed=collapsedHere().has(group);children.hidden=closed;title.setAttribute('aria-expanded',String(!closed));};
   title.addEventListener('click',()=>{
    const state=new Set(collapsedHere());if(state.has(group))state.delete(group);else state.add(group);
    collapsed.set(model.tab,state);applyCollapse();
   });
   groups.set(group,{title,children,applyCollapse});section.append(title,children);list.append(section);applyCollapse();
   for(const entry of entries){
    const id=keyOf(entry),row=make('div','ngw-journal-row');row.dataset.questId=id;
    const button=make('button','ngw-journal-select');button.type='button';button.dataset.journalQuest=id;
    const glyph=make('span','ngw-journal-glyph');glyph.setAttribute('aria-hidden','true');
    const title=make('span','ngw-journal-row-title');
    const level=make('span','ngw-journal-level');
    button.append(glyph,title,level);
    button.addEventListener('click',event=>{select(id);if(event.shiftKey&&entry.status==='current'&&entry.trackable)onTrack(routeOf(entry));});
    row.append(button);let pin=null;
    if(entry.status==='current'&&entry.trackable){
     pin=make('button','ngw-journal-row-track');pin.type='button';pin.dataset.journalPin=id;
     pin.addEventListener('click',()=>onTrack(routeOf(entry)));row.append(pin);
    }
    children.append(row);rows.set(id,{select:button,track:pin,glyph,title,level});
   }
  }
  list.scrollTop=scroll;
 }
 function render(body,next){
  const active=doc.activeElement;
  const listHadFocus=[...rows.values()].some(row=>row.select===active||row.track===active)||
   [...groups.values()].some(group=>group.title===active);
  const priorQuest=active?.dataset?.journalQuest,priorPin=active?.dataset?.journalPin,priorGroup=active?.dataset?.journalGroup;
  if(model.tab!==next.tab){list.scrollTop=0;detail.scrollTop=0;}
  model=next;
  visible=model.entries.filter(entry=>entry.status===model.tab||(model.tab==='available'&&entry.status==='locked'));
  if(!visible.some(entry=>keyOf(entry)===selected.get(model.tab)))selected.set(model.tab,visible.length?keyOf(visible[0]):null);
  if(body.querySelector?.('.ngw-journal')!==root)body.append(root);
  for(const [id,tab] of tabNodes){
   tab.setAttribute('aria-selected',String(id===model.tab));tab.tabIndex=id===model.tab?0:-1;
   tab.classList.toggle('is-selected',id===model.tab);
  }
  columns.setAttribute('aria-labelledby','ngwJournalTab-'+model.tab);
  count.textContent=model.tab==='current'?`Заданий: ${visible.length}`:model.tab==='available'?'Доступные поручения':'Завершённые задания';
  empty.hidden=visible.length>0;empty.textContent='В этом разделе пока пусто.';
  const signature=model.tab+'|'+visible.map(entry=>[keyOf(entry),groupOf(entry),entry.status,!!entry.trackable].join(':')).join('|');
  const changedList=signature!==listSignature;
  if(changedList){rebuildList();listSignature=signature;}
  for(const entry of visible){
   const row=rows.get(keyOf(entry));row.title.textContent=entry.title;row.level.textContent=entry.level?'['+entry.level+']':'';
   row.glyph.textContent=entry.status==='available'?'!':entry.status==='locked'?'·':entry.status==='completed'?'✓':entry.ready?'?':'';
   row.select.classList.toggle('is-complete',entry.status==='completed'||!!entry.ready);
   row.select.classList.toggle('is-locked',entry.status==='locked');
  }
  paintDetail();
  if(changedList&&listHadFocus){
   const id=priorQuest||priorPin||selected.get(model.tab),entry=visible.find(item=>keyOf(item)===id);
   if(entry&&collapsedHere().has(groupOf(entry)))focusNode(groups.get(groupOf(entry))?.title);
   else if(entry)focusNode(priorPin&&rows.get(id).track?rows.get(id).track:rows.get(id).select);
   else if(priorGroup&&groups.has(priorGroup))focusNode(groups.get(priorGroup).title);
   else focus();
  }
  return root;
 }
 function keyboard(event){
  if(!isOpen()||event.defaultPrevented)return;
  const key=String(event.key||'').toLowerCase(),code=event.code;
  const consume=()=>{event.preventDefault();event.stopImmediatePropagation?.();event.stopPropagation?.();};
  if(key==='escape'||(!event.ctrlKey&&!event.metaKey&&!event.altKey&&(['KeyL','KeyJ'].includes(code)||['l','j'].includes(key)))){
   consume();onClose();return;
  }
  if(key==='tab'){
   const host=doc.getElementById?.('modal')||root;
   const controls=[...(host.querySelectorAll?.('button:not([disabled]), [tabindex="0"]')||[])].filter(node=>node.tabIndex!==-1&&!node.hidden&&(!node.getClientRects||node.getClientRects().length));
   if(controls.length){const index=controls.indexOf(doc.activeElement);focusNode(controls[(index+(event.shiftKey?-1:1)+controls.length)%controls.length]);}
   consume();return;
  }
  const tab=event.target?.dataset?.journalTab;
  if(tab&&['arrowleft','arrowright','home','end'].includes(key)){
   const ids=Object.keys(TABS),index=ids.indexOf(tab);
   const next=key==='home'?ids[0]:key==='end'?ids.at(-1):ids[(index+(key==='arrowright'?1:-1)+ids.length)%ids.length];
   consume();onTab(next);focusNode(tabNodes.get(next));return;
  }
  const id=event.target?.dataset?.journalQuest;
  if(id&&['arrowup','arrowdown','home','end'].includes(key)){
   // Regions group interleaved source rows; keyboard order follows the actual
   // displayed list, rather than the source quest registry's insertion order.
   const byId=new Map(visible.map(entry=>[keyOf(entry),entry]));
   const navigable=[...rows.keys()].map(key=>byId.get(key)).filter(entry=>entry&&!collapsedHere().has(groupOf(entry))),
    index=navigable.findIndex(entry=>keyOf(entry)===id);
   const next=key==='home'?navigable[0]:key==='end'?navigable.at(-1):navigable[Math.max(0,Math.min(navigable.length-1,index+(key==='arrowdown'?1:-1)))];
   if(next){select(keyOf(next));focusNode(rows.get(keyOf(next))?.select);}
   consume();
  }
 }
 doc.addEventListener?.('keydown',keyboard,true);
 function focus(){
  const entry=current();
  focusNode(entry&&collapsedHere().has(groupOf(entry))?groups.get(groupOf(entry))?.title:
   rows.get(selected.get(model.tab))?.select||tabNodes.get(model.tab));
 }
 return {render,focus,
  get selectedId(){return selected.get(model.tab)||null;}};
}
